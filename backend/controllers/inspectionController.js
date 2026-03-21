import Inspection from "../models/Inspection.js";
import InspectorApplication from "../models/InspectorApplication.js";
import InspectorProfile from "../models/InspectorProfile.js";
import Car from "../models/Car.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import { createInspectionOrder } from "../services/paymentService.js";

const QUALITY_BANDS = {
  high: { min: 75, max: 100 },
  medium: { min: 50, max: 74 },
  low: { min: 0, max: 49 },
};

const SKILL_POINTS = {
  engine_diagnosis: 8,
  electrical_systems: 8,
  suspension_brakes: 5,
  body_paint: 3,
  report_writing: 3,
  customer_communication: 3,
};

const REJECTION_REASONS = {
  insufficient_experience: "Experience level does not meet onboarding requirements.",
  missing_documents: "Required documents are missing from the application.",
  invalid_documents: "Uploaded documents could not be verified.",
  poor_skill_match: "The listed skills are not enough for inspection jobs.",
  profile_mismatch: "Profile information could not be validated.",
  other: "The application needs more information before approval.",
};

const createTimelineEvent = (type, label, user, note = "") => ({
  type,
  label,
  actorId: user?.id || "",
  actorRole: user?.role || "",
  note,
  createdAt: new Date(),
});

const normalizeSkills = (skills) => {
  if (Array.isArray(skills)) return skills.filter(Boolean);
  if (typeof skills === "string") return skills.split(",").map((skill) => skill.trim()).filter(Boolean);
  return [];
};

const calculateApplicationScore = (experience = {}) => {
  const years = Number(experience.yearsOfExperience || 0);
  let experienceScore = 0;
  if (years >= 8) experienceScore = 40;
  else if (years >= 5) experienceScore = 25;
  else if (years >= 3) experienceScore = 15;

  const educationScoreMap = { iti: 15, diploma: 15, btech: 15, high_school: 5, other: 5 };
  const skillScore = Math.min(normalizeSkills(experience.skills).reduce((sum, skill) => sum + (SKILL_POINTS[skill] || 0), 0), 30);
  const obdScore = experience.obdFamiliarity ? 15 : 0;
  const educationScore = educationScoreMap[experience.educationLevel] || 5;
  const total = Math.min(experienceScore + educationScore + skillScore + obdScore, 100);

  let band = "low";
  if (total >= QUALITY_BANDS.high.min) band = "high";
  else if (total >= QUALITY_BANDS.medium.min) band = "medium";

  return {
    total,
    band,
    breakdown: {
      experience: experienceScore,
      education: educationScore,
      skills: skillScore,
      obd: obdScore,
    },
    calculatedAt: new Date(),
  };
};

const buildApplicationSummary = (application) => ({
  _id: application._id,
  applicationNumber: application.applicationNumber,
  status: application.status.current,
  rejectionCode: application.status.rejectionCode,
  rejectionReason: application.status.rejectionReason,
  applicantSnapshot: application.applicantSnapshot,
  basicInfo: application.basicInfo,
  experience: application.experience,
  documents: application.documents,
  score: application.score,
  review: application.review,
  timeline: application.timeline,
  draftCompletedSteps: application.draftCompletedSteps,
  submittedAt: application.submittedAt,
  createdAt: application.createdAt,
  updatedAt: application.updatedAt,
});

const uploadSingleDocument = (file, folder) =>
  new Promise((resolve, reject) => {
    const isPDF = file.mimetype === "application/pdf";
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: isPDF ? "raw" : "image" },
      (err, result) => {
        if (err) return reject(err);
        return resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type || (isPDF ? "raw" : "image"),
          format: result.format || "",
          bytes: result.bytes || 0,
          originalFilename: file.originalname || "",
          uploadedAt: new Date(),
        });
      }
    );
    stream.end(file.buffer);
  });

const ensureApprovedInspector = async (userId) => Boolean(await InspectorProfile.findOne({ userId, isActive: true }));

const getOrCreateDraftApplication = async (req) => {
  let application = await InspectorApplication.findOne({
    userId: req.user.id,
    "status.current": { $in: ["draft", "submitted", "under_review", "approved"] },
  });

  if (!application) {
    application = await InspectorApplication.create({
      applicationNumber: `INSP-${Date.now()}`,
      userId: req.user.id,
      applicantSnapshot: {
        name: req.user.name || "",
        email: req.user.email || "",
      },
      basicInfo: {
        name: req.user.name || "",
        email: req.user.email || "",
      },
      timeline: [createTimelineEvent("draft_saved", "Draft created", req.user)],
    });
  }

  return application;
};

const saveApplication = async (application, step, eventLabel, user) => {
  if (!application.draftCompletedSteps.includes(step)) {
    application.draftCompletedSteps.push(step);
  }
  application.status.current = "draft";
  application.score = calculateApplicationScore(application.experience);
  application.timeline.push(createTimelineEvent("draft_saved", eventLabel, user));
  await application.save();
};

export const requestInspection = async (req, res, next) => {
  try {
    const { inspection, payment, order } = await createInspectionOrder({
      buyer: req.user,
      carId: req.params.carId,
      preferredDate: req.body.preferredDate,
      preferredTime: req.body.preferredTime,
      location: req.body.location,
      notes: req.body.notes,
      requestedAmount: req.body.amount,
    });
    res.status(201).json({
      booking: inspection,
      payment,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

export const getMyInspections = async (req, res, next) => {
  try {
    const inspections = await Inspection.find({ buyerId: req.user.id }).populate("paymentId").sort({ createdAt: -1 });
    res.json(inspections);
  } catch (error) {
    next(error);
  }
};

export const cancelInspection = async (req, res, next) => {
  try {
    const inspection = await Inspection.findOne({ _id: req.params.id, buyerId: req.user.id });
    if (!inspection) { res.status(404); throw new Error("Inspection request not found"); }
    if (!["payment_created", "payment_pending", "confirmed", "accepted"].includes(inspection.status)) {
      res.status(400);
      throw new Error("Only active requests can be cancelled.");
    }
    inspection.status = "cancelled";
    await inspection.save();
    res.json({ message: "Inspection request cancelled", inspection });
  } catch (error) {
    next(error);
  }
};

export const getAvailableInspections = async (req, res, next) => {
  try {
    const inspections = await Inspection.find({ status: "confirmed", paymentStatus: "paid" }).sort({ createdAt: -1 });
    res.json(inspections);
  } catch (error) {
    next(error);
  }
};

export const acceptInspection = async (req, res, next) => {
  try {
    if (!(await ensureApprovedInspector(req.user.id))) {
      res.status(403);
      throw new Error("Only approved inspectors can accept jobs.");
    }

    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) { res.status(404); throw new Error("Inspection not found"); }
    if (inspection.paymentStatus !== "paid") {
      res.status(400);
      throw new Error("Payment must be completed before assignment.");
    }
    if (!["confirmed", "accepted"].includes(inspection.status)) {
      res.status(400);
      throw new Error("This inspection is no longer available.");
    }

    inspection.status = "accepted";
    inspection.inspectorId = req.user.id;
    inspection.inspectorName = req.user.name || "";
    inspection.inspectorEmail = req.user.email || "";
    await inspection.save();
    res.json(inspection);
  } catch (error) {
    next(error);
  }
};

export const getMyJobs = async (req, res, next) => {
  try {
    const inspections = await Inspection.find({
      inspectorId: req.user.id,
      status: { $in: ["accepted", "completed", "confirmed"] },
    }).sort({ createdAt: -1 });
    res.json(inspections);
  } catch (error) {
    next(error);
  }
};

export const submitReport = async (req, res, next) => {
  try {
    if (!(await ensureApprovedInspector(req.user.id))) {
      res.status(403);
      throw new Error("Only approved inspectors can upload reports.");
    }

    const inspection = await Inspection.findOne({
      _id: req.params.id,
      inspectorId: req.user.id,
      status: "accepted",
    });
    if (!inspection) { res.status(404); throw new Error("Inspection not found or not assigned to you"); }

    let report = req.body.report;
    if (typeof report === "string") {
      try { report = JSON.parse(report); } catch { report = {}; }
    }

    const photos = [];
    if (req.files?.photos?.length) {
      for (const file of req.files.photos) {
        const result = await uploadSingleDocument(file, `dreamcar/inspection-reports/${inspection._id}/photos`);
        photos.push({ url: result.url, publicId: result.publicId, caption: "" });
      }
    }

    inspection.report = report || {};
    inspection.inspectionPhotos = photos;
    inspection.inspectedAt = new Date();
    inspection.status = "completed";
    await inspection.save();

    res.json(inspection);
  } catch (error) {
    next(error);
  }
};

export const saveInspectorApplicationBasic = async (req, res, next) => {
  try {
    const application = await getOrCreateDraftApplication(req);
    if (application.status.current === "approved") {
      res.status(409);
      throw new Error("You are already an approved inspector.");
    }

    application.basicInfo = {
      name: req.body.name || req.user.name || "",
      email: req.body.email || req.user.email || "",
      phone: req.body.phone || "",
    };
    application.applicantSnapshot = {
      ...application.applicantSnapshot,
      name: application.basicInfo.name,
      email: application.basicInfo.email,
      phone: application.basicInfo.phone,
    };

    await saveApplication(application, "basic", "Basic information saved", req.user);
    res.json({ message: "Basic information saved", application: buildApplicationSummary(application) });
  } catch (error) {
    next(error);
  }
};

export const saveInspectorApplicationExperience = async (req, res, next) => {
  try {
    const application = await getOrCreateDraftApplication(req);
    if (application.status.current === "approved") {
      res.status(409);
      throw new Error("You are already an approved inspector.");
    }

    application.experience = {
      yearsOfExperience: Number(req.body.yearsOfExperience || 0),
      educationLevel: req.body.educationLevel || "other",
      educationText: req.body.educationText || "",
      skills: normalizeSkills(req.body.skills),
      obdFamiliarity: req.body.obdFamiliarity === true || req.body.obdFamiliarity === "true",
      reportWriting: req.body.reportWriting === true || req.body.reportWriting === "true",
      workshopType: req.body.workshopType || "",
      currentEmployer: req.body.currentEmployer || "",
      summary: req.body.summary || "",
      location: req.body.location || "",
    };
    application.applicantSnapshot.location = application.experience.location || application.applicantSnapshot.location;

    await saveApplication(application, "experience", "Experience and skills saved", req.user);
    res.json({ message: "Experience details saved", application: buildApplicationSummary(application) });
  } catch (error) {
    next(error);
  }
};

export const saveInspectorApplicationDocuments = async (req, res, next) => {
  try {
    const application = await getOrCreateDraftApplication(req);
    if (application.status.current === "approved") {
      res.status(409);
      throw new Error("You are already an approved inspector.");
    }

    const documentFields = [
      ["experienceCertificate", "Experience Certificate"],
      ["educationCertificate", "Educational Certificate"],
      ["idProof", "ID Proof"],
    ];

    for (const [field, label] of documentFields) {
      const file = req.files?.[field]?.[0];
      if (file) {
        application.documents[field] = {
          label,
          ...(await uploadSingleDocument(file, `dreamcar/inspector-applications/${req.user.id}/${field}`)),
        };
      }
    }

    await saveApplication(application, "documents", "Documents saved", req.user);
    res.json({ message: "Documents saved", application: buildApplicationSummary(application) });
  } catch (error) {
    next(error);
  }
};

export const submitInspectorApplication = async (req, res, next) => {
  try {
    const application = await InspectorApplication.findOne({
      userId: req.user.id,
      "status.current": { $in: ["draft", "rejected"] },
    });

    if (!application) {
      res.status(404);
      throw new Error("Application draft not found.");
    }
    if (Number(application.experience.yearsOfExperience || 0) < 3) {
      res.status(400);
      throw new Error("Minimum 3 years of experience required to apply as an inspector.");
    }
    if (!application.documents.experienceCertificate?.publicId || !application.documents.educationCertificate?.publicId) {
      res.status(400);
      throw new Error("Experience certificate and educational certificate are required.");
    }

    application.status.current = "submitted";
    application.status.rejectionCode = "";
    application.status.rejectionReason = "";
    application.review = { reviewedBy: "", reviewedAt: null, adminNotes: "" };
    application.submittedAt = new Date();
    application.score = calculateApplicationScore(application.experience);
    if (!application.draftCompletedSteps.includes("review")) application.draftCompletedSteps.push("review");
    application.timeline.push(createTimelineEvent("submitted", "Application submitted", req.user));
    await application.save();

    res.status(201).json({ message: "Application submitted successfully", application: buildApplicationSummary(application) });
  } catch (error) {
    next(error);
  }
};

export const getMyApplication = async (req, res, next) => {
  try {
    const application = await InspectorApplication.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(application ? buildApplicationSummary(application) : null);
  } catch (error) {
    next(error);
  }
};

export const getAllInspections = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const inspections = await Inspection.find(filter).sort({ createdAt: -1 });
    res.json(inspections);
  } catch (error) {
    next(error);
  }
};

export const getInspectionStats = async (req, res, next) => {
  try {
    const [total, created, pending, confirmed, accepted, completed, failed, applications] = await Promise.all([
      Inspection.countDocuments(),
      Inspection.countDocuments({ status: "payment_created" }),
      Inspection.countDocuments({ status: "payment_pending" }),
      Inspection.countDocuments({ status: "confirmed" }),
      Inspection.countDocuments({ status: "accepted" }),
      Inspection.countDocuments({ status: "completed" }),
      Inspection.countDocuments({ status: "payment_failed" }),
      InspectorApplication.countDocuments({ "status.current": { $in: ["submitted", "under_review"] } }),
    ]);
    res.json({ total, created, pending, confirmed, accepted, completed, failed, pendingApplications: applications });
  } catch (error) {
    next(error);
  }
};

export const updateInspectionStatus = async (req, res, next) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) { res.status(404); throw new Error("Inspection not found"); }
    if (req.body.status) inspection.status = req.body.status;
    if (req.body.adminNotes) inspection.adminNotes = req.body.adminNotes;
    await inspection.save();
    res.json(inspection);
  } catch (error) {
    next(error);
  }
};

export const getAllApplications = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(25, Math.max(1, Number(req.query.limit || 10)));
    const skip = (page - 1) * limit;
    const filter = {};

    if (req.query.status) filter["status.current"] = req.query.status;
    if (req.query.quality && QUALITY_BANDS[req.query.quality]) {
      const range = QUALITY_BANDS[req.query.quality];
      filter["score.total"] = { $gte: range.min, $lte: range.max };
    }

    const [applications, total] = await Promise.all([
      InspectorApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      InspectorApplication.countDocuments(filter),
    ]);

    res.json({
      applications: applications.map(buildApplicationSummary),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getApplicationDocumentPreview = async (req, res, next) => {
  try {
    const application = await InspectorApplication.findById(req.params.id);
    if (!application) {
      res.status(404);
      throw new Error("Application not found");
    }

    const document = application.documents?.[req.params.docType];
    if (!document?.url) {
      res.status(404);
      throw new Error("Document not found");
    }

    res.json(document);
  } catch (error) {
    next(error);
  }
};

export const reviewApplication = async (req, res, next) => {
  try {
    const application = await InspectorApplication.findById(req.params.id);
    if (!application) { res.status(404); throw new Error("Application not found"); }

    const { status, rejectionCode, rejectionReason, adminNotes } = req.body;
    if (!["approved", "rejected", "under_review"].includes(status)) {
      res.status(400);
      throw new Error("Status must be approved, rejected, or under_review");
    }

    application.review = {
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      adminNotes: adminNotes || "",
    };
    application.score = calculateApplicationScore(application.experience);

    if (status === "rejected") {
      application.status.current = "rejected";
      application.status.rejectionCode = rejectionCode || "other";
      application.status.rejectionReason = rejectionReason || REJECTION_REASONS[application.status.rejectionCode] || REJECTION_REASONS.other;
      application.timeline.push(createTimelineEvent("rejected", "Application rejected", req.user, application.status.rejectionReason));
    } else if (status === "under_review") {
      application.status.current = "under_review";
      application.timeline.push(createTimelineEvent("under_review", "Application moved to under review", req.user, adminNotes || ""));
    } else {
      application.status.current = "approved";
      application.status.rejectionCode = "";
      application.status.rejectionReason = "";
      application.timeline.push(createTimelineEvent("approved", "Application approved", req.user, adminNotes || ""));

      await User.findOneAndUpdate({ googleId: application.userId }, { role: "inspector" });
      await InspectorProfile.findOneAndUpdate(
        { userId: application.userId },
        {
          userId: application.userId,
          approvalSourceApplicationId: application._id,
          verificationLevel: application.score.total >= 85 ? "verified" : "basic",
          skills: application.experience.skills,
          yearsOfExperience: application.experience.yearsOfExperience,
          educationLevel: application.experience.educationLevel,
          serviceAreas: application.applicantSnapshot.location ? [{ city: application.applicantSnapshot.location }] : [],
          isActive: true,
          isAvailableForJobs: true,
        },
        { upsert: true, new: true }
      );
    }

    await application.save();
    res.json({ message: `Application ${status}`, application: buildApplicationSummary(application) });
  } catch (error) {
    next(error);
  }
};

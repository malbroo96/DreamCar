import Inspection from "../models/Inspection.js";
import InspectorApplication from "../models/InspectorApplication.js";
import Car from "../models/Car.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";

/* ════════════════════════════════════════
   BUYER CONTROLLERS
════════════════════════════════════════ */

/* POST /api/inspections/request/:carId */
export const requestInspection = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.carId);
    if (!car) { res.status(404); throw new Error("Car not found"); }

    if (car.ownerId === req.user.id) {
      res.status(400);
      throw new Error("You cannot request an inspection on your own listing.");
    }

    const existing = await Inspection.findOne({
      carId: car._id,
      buyerId: req.user.id,
      status: { $in: ["requested", "accepted"] },
    });
    if (existing) {
      res.status(409);
      throw new Error("You already have an active inspection request for this car.");
    }

    const inspection = await Inspection.create({
      carId:         car._id,
      carTitle:      car.title,
      carBrand:      car.brand,
      carModel:      car.model,
      carYear:       car.year,
      carImage:      car.images?.[0]?.url || "",
      buyerId:       req.user.id,
      buyerName:     req.user.name || "",
      buyerEmail:    req.user.email || "",
      sellerId:      car.ownerId || "",
      sellerName:    car.ownerName || "",
      preferredDate: req.body.preferredDate || null,
      preferredTime: req.body.preferredTime || "",
      location:      req.body.location || car.location || "",
      notes:         req.body.notes || "",
    });

    res.status(201).json(inspection);
  } catch (error) {
    next(error);
  }
};

/* GET /api/inspections/my */
export const getMyInspections = async (req, res, next) => {
  try {
    const inspections = await Inspection.find({ buyerId: req.user.id }).sort({ createdAt: -1 });
    res.json(inspections);
  } catch (error) {
    next(error);
  }
};

/* PATCH /api/inspections/cancel/:id */
export const cancelInspection = async (req, res, next) => {
  try {
    const inspection = await Inspection.findOne({ _id: req.params.id, buyerId: req.user.id });
    if (!inspection) { res.status(404); throw new Error("Inspection request not found"); }
    if (!["requested", "accepted"].includes(inspection.status)) {
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

/* ════════════════════════════════════════
   INSPECTOR CONTROLLERS
════════════════════════════════════════ */

/* GET /api/inspections/available — inspectors see open requests */
export const getAvailableInspections = async (req, res, next) => {
  try {
    const inspections = await Inspection.find({ status: "requested" }).sort({ createdAt: -1 });
    res.json(inspections);
  } catch (error) {
    next(error);
  }
};

/* PATCH /api/inspections/accept/:id */
export const acceptInspection = async (req, res, next) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) { res.status(404); throw new Error("Inspection not found"); }
    if (inspection.status !== "requested") {
      res.status(400);
      throw new Error("This inspection is no longer available.");
    }
    inspection.status        = "accepted";
    inspection.inspectorId   = req.user.id;
    inspection.inspectorName = req.user.name || "";
    inspection.inspectorEmail= req.user.email || "";
    await inspection.save();
    res.json(inspection);
  } catch (error) {
    next(error);
  }
};

/* GET /api/inspections/my-jobs — inspector sees their accepted jobs */
export const getMyJobs = async (req, res, next) => {
  try {
    const inspections = await Inspection.find({
      inspectorId: req.user.id,
      status: { $in: ["accepted", "completed"] },
    }).sort({ createdAt: -1 });
    res.json(inspections);
  } catch (error) {
    next(error);
  }
};

/* POST /api/inspections/submit-report/:id */
export const submitReport = async (req, res, next) => {
  try {
    const inspection = await Inspection.findOne({
      _id: req.params.id,
      inspectorId: req.user.id,
      status: "accepted",
    });
    if (!inspection) { res.status(404); throw new Error("Inspection not found or not assigned to you"); }

    /* Parse report from body */
    let report = req.body.report;
    if (typeof report === "string") {
      try { report = JSON.parse(report); } catch { report = {}; }
    }

    /* Upload photos if any */
    const photos = [];
    if (req.files?.photos?.length) {
      for (const file of req.files.photos) {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "dreamcar/inspection-photos", resource_type: "image" },
            (err, res) => err ? reject(err) : resolve(res)
          );
          stream.end(file.buffer);
        });
        photos.push({ url: result.secure_url, publicId: result.public_id, caption: "" });
      }
    }

    inspection.report           = report || {};
    inspection.inspectionPhotos = photos;
    inspection.inspectedAt      = new Date();
    inspection.status           = "completed";
    await inspection.save();

    res.json(inspection);
  } catch (error) {
    next(error);
  }
};

/* ════════════════════════════════════════
   INSPECTOR APPLICATION
════════════════════════════════════════ */

/* POST /api/inspections/apply */
export const applyAsInspector = async (req, res, next) => {
  try {
    /* Check if already applied */
    const existing = await InspectorApplication.findOne({
      userId: req.user.id,
      status: { $in: ["pending", "approved"] },
    });
    if (existing) {
      res.status(409);
      throw new Error(
        existing.status === "approved"
          ? "You are already an approved inspector."
          : "You already have a pending application."
      );
    }

    const years = Number(req.body.yearsOfExperience || 0);
    if (years < 3) {
      res.status(400);
      throw new Error("Minimum 3 years of experience required to apply as an inspector.");
    }

    /* Upload documents if any */
    const documents = [];
    if (req.files?.documents?.length) {
      for (const file of req.files.documents) {
        const isPDF = file.mimetype === "application/pdf";
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "dreamcar/inspector-docs", resource_type: isPDF ? "raw" : "image" },
            (err, res) => err ? reject(err) : resolve(res)
          );
          stream.end(file.buffer);
        });
        documents.push({ url: result.secure_url, publicId: result.public_id, name: file.originalname });
      }
    }

    const application = await InspectorApplication.create({
      userId:            req.user.id,
      userName:          req.user.name || "",
      userEmail:         req.user.email || "",
      yearsOfExperience: years,
      garageExperience:  req.body.garageExperience || "",
      obdToolKnowledge:  req.body.obdToolKnowledge === "true" || req.body.obdToolKnowledge === true,
      canCreateReports:  req.body.canCreateReports === "true" || req.body.canCreateReports === true,
      currentEmployment: req.body.currentEmployment || "",
      about:             req.body.about || "",
      location:          req.body.location || "",
      phone:             req.body.phone || "",
      documents,
    });

    res.status(201).json(application);
  } catch (error) {
    next(error);
  }
};

/* GET /api/inspections/my-application */
export const getMyApplication = async (req, res, next) => {
  try {
    const application = await InspectorApplication.findOne({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(application || null);
  } catch (error) {
    next(error);
  }
};

/* ════════════════════════════════════════
   ADMIN CONTROLLERS
════════════════════════════════════════ */

/* GET /api/inspections/admin/all */
export const getAllInspections = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const inspections = await Inspection.find(filter).sort({ createdAt: -1 });
    res.json(inspections);
  } catch (error) {
    next(error);
  }
};

/* GET /api/inspections/admin/stats */
export const getInspectionStats = async (req, res, next) => {
  try {
    const [total, requested, accepted, completed, rejected, applications] = await Promise.all([
      Inspection.countDocuments(),
      Inspection.countDocuments({ status: "requested" }),
      Inspection.countDocuments({ status: "accepted" }),
      Inspection.countDocuments({ status: "completed" }),
      Inspection.countDocuments({ status: "rejected" }),
      InspectorApplication.countDocuments({ status: "pending" }),
    ]);
    res.json({ total, requested, accepted, completed, rejected, pendingApplications: applications });
  } catch (error) {
    next(error);
  }
};

/* PATCH /api/inspections/admin/:id */
export const updateInspectionStatus = async (req, res, next) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) { res.status(404); throw new Error("Inspection not found"); }
    if (req.body.status)     inspection.status     = req.body.status;
    if (req.body.adminNotes) inspection.adminNotes = req.body.adminNotes;
    await inspection.save();
    res.json(inspection);
  } catch (error) {
    next(error);
  }
};

/* GET /api/inspections/admin/applications */
export const getAllApplications = async (req, res, next) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const applications = await InspectorApplication.find(filter).sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    next(error);
  }
};

/* PATCH /api/inspections/admin/applications/:id */
export const reviewApplication = async (req, res, next) => {
  try {
    const application = await InspectorApplication.findById(req.params.id);
    if (!application) { res.status(404); throw new Error("Application not found"); }

    const { status, adminNotes } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      res.status(400);
      throw new Error("Status must be approved or rejected");
    }

    application.status     = status;
    application.adminNotes = adminNotes || "";
    application.reviewedAt = new Date();
    await application.save();

    /* If approved — update user role to inspector */
    if (status === "approved") {
      await User.findOneAndUpdate(
        { googleId: application.userId },
        { role: "inspector" }
      );
    }

    res.json(application);
  } catch (error) {
    next(error);
  }
};
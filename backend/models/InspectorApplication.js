import mongoose from "mongoose";

const uploadedDocumentSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: "" },
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
    resourceType: { type: String, default: "image" },
    format: { type: String, default: "" },
    bytes: { type: Number, default: 0 },
    originalFilename: { type: String, trim: true, default: "" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const timelineEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["draft_saved", "submitted", "under_review", "approved", "rejected", "withdrawn"],
      required: true,
    },
    label: { type: String, trim: true, required: true },
    actorId: { type: String, trim: true, default: "" },
    actorRole: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const inspectorApplicationSchema = new mongoose.Schema(
  {
    applicationNumber: { type: String, trim: true, default: "", index: true },
    userId: { type: String, required: true },
    applicantSnapshot: {
      name: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      location: { type: String, trim: true, default: "" },
    },
    basicInfo: {
      name: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
    },
    experience: {
      yearsOfExperience: { type: Number, min: 0, default: 0 },
      educationLevel: {
        type: String,
        enum: ["high_school", "iti", "diploma", "btech", "other"],
        default: "other",
      },
      educationText: { type: String, trim: true, default: "" },
      skills: { type: [String], default: [] },
      obdFamiliarity: { type: Boolean, default: false },
      reportWriting: { type: Boolean, default: false },
      workshopType: { type: String, trim: true, default: "" },
      currentEmployer: { type: String, trim: true, default: "" },
      summary: { type: String, trim: true, default: "" },
      location: { type: String, trim: true, default: "" },
    },
    documents: {
      experienceCertificate: { type: uploadedDocumentSchema, default: () => ({ label: "Experience Certificate" }) },
      educationCertificate: { type: uploadedDocumentSchema, default: () => ({ label: "Educational Certificate" }) },
      idProof: { type: uploadedDocumentSchema, default: () => ({ label: "ID Proof" }) },
    },
    score: {
      total: { type: Number, default: 0 },
      band: { type: String, enum: ["high", "medium", "low"], default: "low", index: true },
      breakdown: {
        experience: { type: Number, default: 0 },
        education: { type: Number, default: 0 },
        skills: { type: Number, default: 0 },
        obd: { type: Number, default: 0 },
      },
      calculatedAt: { type: Date, default: Date.now },
    },
    status: {
      current: {
        type: String,
        enum: ["draft", "submitted", "under_review", "approved", "rejected", "withdrawn"],
        default: "draft",
        index: true,
      },
      rejectionCode: {
        type: String,
        enum: ["", "insufficient_experience", "missing_documents", "invalid_documents", "poor_skill_match", "profile_mismatch", "other"],
        default: "",
      },
      rejectionReason: { type: String, trim: true, default: "" },
    },
    review: {
      reviewedBy: { type: String, trim: true, default: "" },
      reviewedAt: { type: Date, default: null },
      adminNotes: { type: String, trim: true, default: "" },
    },
    draftCompletedSteps: { type: [String], default: [] },
    timeline: { type: [timelineEventSchema], default: [] },
    submittedAt: { type: Date, default: null },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

inspectorApplicationSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      "status.current": { $in: ["draft", "submitted", "under_review", "approved"] },
    },
  }
);

const InspectorApplication = mongoose.model("InspectorApplication", inspectorApplicationSchema);
export default InspectorApplication;

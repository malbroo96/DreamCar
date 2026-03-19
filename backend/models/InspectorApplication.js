import mongoose from "mongoose";

const inspectorApplicationSchema = new mongoose.Schema(
  {
    /* Applicant */
    userId:     { type: String, required: true, index: true },
    userName:   { type: String, trim: true, default: "" },
    userEmail:  { type: String, trim: true, default: "" },

    /* Application form */
    yearsOfExperience:  { type: Number, required: true, min: 0 },
    garageExperience:   { type: String, trim: true, default: "" },
    obdToolKnowledge:   { type: Boolean, default: false },
    canCreateReports:   { type: Boolean, default: false },
    currentEmployment:  { type: String, trim: true, default: "" },
    about:              { type: String, trim: true, default: "" },
    location:           { type: String, trim: true, default: "" },
    phone:              { type: String, trim: true, default: "" },

    /* Document uploads (Cloudinary) */
    documents: [
      {
        url:      { type: String },
        publicId: { type: String },
        name:     { type: String, trim: true, default: "" },
        _id: false,
      }
    ],

    /* Admin decision */
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    adminNotes: { type: String, trim: true, default: "" },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const InspectorApplication = mongoose.model("InspectorApplication", inspectorApplicationSchema);
export default InspectorApplication;
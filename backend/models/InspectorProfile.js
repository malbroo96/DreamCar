import mongoose from "mongoose";

const serviceAreaSchema = new mongoose.Schema(
  {
    city: { type: String, trim: true, default: "" },
    area: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  { _id: false }
);

const availabilitySlotSchema = new mongoose.Schema(
  {
    start: { type: String, trim: true, default: "" },
    end: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const inspectorProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    approvalSourceApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: "InspectorApplication", default: null },
    verificationLevel: { type: String, enum: ["basic", "verified"], default: "basic" },
    rating: {
      avg: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    serviceAreas: { type: [serviceAreaSchema], default: [] },
    availability: {
      timezone: { type: String, trim: true, default: "Asia/Calcutta" },
      workingDays: { type: [String], default: [] },
      slots: { type: [availabilitySlotSchema], default: [] },
    },
    skills: { type: [String], default: [] },
    yearsOfExperience: { type: Number, default: 0 },
    educationLevel: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    isAvailableForJobs: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const InspectorProfile = mongoose.model("InspectorProfile", inspectorProfileSchema);
export default InspectorProfile;

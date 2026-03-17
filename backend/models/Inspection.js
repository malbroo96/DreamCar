import mongoose from "mongoose";

const inspectionSchema = new mongoose.Schema(
  {
    carId:       { type: mongoose.Schema.Types.ObjectId, ref: "Car", required: true, index: true },
    carTitle:    { type: String, trim: true, default: "" },
    carBrand:    { type: String, trim: true, default: "" },
    carModel:    { type: String, trim: true, default: "" },
    carYear:     { type: Number, default: null },
    carImage:    { type: String, default: "" },

    buyerId:     { type: String, required: true, index: true },
    buyerName:   { type: String, trim: true, default: "" },
    buyerEmail:  { type: String, trim: true, default: "" },

    sellerId:    { type: String, default: "" },
    sellerName:  { type: String, trim: true, default: "" },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
      index: true,
    },

    preferredDate:  { type: Date, default: null },
    preferredTime:  { type: String, trim: true, default: "" },
    location:       { type: String, trim: true, default: "" },
    notes:          { type: String, trim: true, default: "" },
    adminNotes:     { type: String, trim: true, default: "" },
    inspectionDate: { type: Date, default: null },
  },
  { timestamps: true }
);

const Inspection = mongoose.model("Inspection", inspectionSchema);
export default Inspection;
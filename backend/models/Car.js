import mongoose from "mongoose";

const carImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

/* ── RC Document stored as private Cloudinary asset ── */
const rcDocumentSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true }, // Cloudinary public_id
    resourceType: { type: String, default: "image" }, // "image" for jpg/png, "raw" for pdf
    format: { type: String }, // "pdf", "jpg", "png"
  },
  { _id: false }
);

const carSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    price: { type: Number, required: true },
    fuelType: {
      type: String,
      required: true,
      enum: ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "LPG", "Other"],
    },
    transmission: {
      type: String,
      required: true,
      enum: ["Manual", "Automatic", "CVT", "AMT", "Other"],
    },
    kilometersDriven: { type: Number, required: true },
    description: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    ownerId: { type: String, index: true },
    ownerEmail: { type: String, trim: true, lowercase: true },
    ownerName: { type: String, trim: true },
    images: { type: [carImageSchema], default: [] },
    /* RC Document — stored privately, never exposed as a direct URL */
    rcDocument: {
      type: rcDocumentSchema,
      required: [true, "RC document is required"],
    },
    rcVerified: { type: Boolean, default: false }, // admin can mark as verified
    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

const Car = mongoose.model("Car", carSchema);

export default Car;

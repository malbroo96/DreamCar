import mongoose from "mongoose";

const carImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
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
    images: { type: [carImageSchema], default: [] },
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

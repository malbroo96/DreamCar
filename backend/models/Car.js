import mongoose from "mongoose";

const carImageSchema = new mongoose.Schema(
  { url: { type: String, required: true }, publicId: { type: String, required: true } },
  { _id: false }
);

const rcDocumentSchema = new mongoose.Schema(
  { publicId: { type: String, required: true }, resourceType: { type: String, default: "image" }, format: { type: String } },
  { _id: false }
);

const rcDetailsSchema = new mongoose.Schema(
  {
    registrationNumber: { type: String, trim: true, default: "" },
    ownerName:          { type: String, trim: true, default: "" },
    manufacturer:       { type: String, trim: true, default: "" },
    vehicleModel:       { type: String, trim: true, default: "" },
    fuelType:           { type: String, trim: true, default: "" },
    manufacturingYear:  { type: String, trim: true, default: "" },
    engineNumber:       { type: String, trim: true, default: "" },
    chassisNumber:      { type: String, trim: true, default: "" },
    vehicleColor:       { type: String, trim: true, default: "" },
    seatingCapacity:    { type: String, trim: true, default: "" },
    registrationDate:   { type: String, trim: true, default: "" },
    rtoOffice:          { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const healthCheckSchema = new mongoose.Schema(
  {
    engine:       { type: Number, min: 0, max: 5, default: null },
    transmission: { type: Number, min: 0, max: 5, default: null },
    brakes:       { type: Number, min: 0, max: 5, default: null },
    tyres:        { type: Number, min: 0, max: 5, default: null },
    ac:           { type: Number, min: 0, max: 5, default: null },
    electricals:  { type: Number, min: 0, max: 5, default: null },
    suspension:   { type: Number, min: 0, max: 5, default: null },
    body:         { type: Number, min: 0, max: 5, default: null },
    inspectedAt:  { type: Date, default: null },
    inspectedBy:  { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const carSchema = new mongoose.Schema(
  {
    title:            { type: String, required: true, trim: true },
    brand:            { type: String, required: true, trim: true },
    model:            { type: String, required: true, trim: true },
    year:             { type: Number, required: true },
    price:            { type: Number, required: true },
    fuelType:         { type: String, required: true, enum: ["Petrol","Diesel","Electric","Hybrid","CNG","LPG","Other"] },
    transmission:     { type: String, required: true, enum: ["Manual","Automatic","CVT","AMT","Other"] },
    kilometersDriven: { type: Number, required: true },
    description:      { type: String, required: true, trim: true },
    location:         { type: String, required: true, trim: true },
    city:             { type: String, trim: true, default: "" },
    area:             { type: String, trim: true, default: "" },
    ownerId:          { type: String },
    ownerEmail:       { type: String, trim: true, lowercase: true },
    ownerName:        { type: String, trim: true },
    images:           { type: [carImageSchema], default: [] },
    rcDocument:       { type: rcDocumentSchema, required: [true, "RC document is required"] },
    rcVerified:       { type: Boolean, default: false },
    rcDetails:        { type: rcDetailsSchema, default: () => ({}) },
    healthCheck:      { type: healthCheckSchema, default: () => ({}) },
    featured:         { type: Boolean, default: false },
    listingPaid:      { type: Boolean, default: false },
    paymentId:        { type: String, trim: true, default: "" },
    status:           { type: String, enum: ["approved","pending","rejected"], default: "approved" },
  },
  { timestamps: true }
);

/* ── Compound indexes for common query patterns ── */
carSchema.index({ status: 1, createdAt: -1 });           // default listing sort
carSchema.index({ status: 1, city: 1 });                 // city filter
carSchema.index({ status: 1, brand: 1 });                // brand filter
carSchema.index({ status: 1, fuelType: 1 });             // fuel filter
carSchema.index({ status: 1, price: 1 });                // price range
carSchema.index({ status: 1, featured: 1, createdAt: -1 }); // featured listings
carSchema.index({ ownerId: 1, createdAt: -1 });          // my listings
carSchema.index({ title: "text", brand: "text", model: "text", location: "text" }); // text search

const Car = mongoose.model("Car", carSchema);
export default Car;
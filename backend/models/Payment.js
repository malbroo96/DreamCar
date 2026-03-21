import mongoose from "mongoose";

const paymentAttemptSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["created", "pending", "paid", "failed"],
      required: true,
    },
    note: { type: String, trim: true, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const splitRuleSchema = new mongoose.Schema(
  {
    inspectorUserId: { type: String, default: "" },
    inspectorAccountId: { type: String, default: "" },
    platformFeeAmount: { type: Number, default: 0, min: 0 },
    inspectorPayoutAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR", uppercase: true, trim: true },
    transferStatus: {
      type: String,
      enum: ["not_applicable", "pending", "queued", "processed", "failed"],
      default: "not_applicable",
    },
    transferId: { type: String, default: "" },
    transferReference: { type: String, default: "" },
  },
  { _id: false }
);

const refundSchema = new mongoose.Schema(
  {
    refundId: { type: String, default: "" },
    amount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["none", "requested", "processing", "processed", "failed"],
      default: "none",
    },
    reason: { type: String, trim: true, default: "" },
    requestedAt: { type: Date, default: null },
    processedAt: { type: Date, default: null },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Inspection", required: true, index: true },
    bookingSnapshot: {
      carId: { type: mongoose.Schema.Types.ObjectId, ref: "Car", required: true },
      carTitle: { type: String, trim: true, default: "" },
      buyerId: { type: String, required: true, index: true },
      sellerId: { type: String, default: "" },
    },
    gateway: { type: String, default: "razorpay", immutable: true },
    status: {
      type: String,
      enum: ["created", "pending", "paid", "failed"],
      default: "created",
      index: true,
    },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "INR", uppercase: true, trim: true },
    receipt: { type: String, required: true, unique: true, trim: true },
    notes: { type: mongoose.Schema.Types.Mixed, default: {} },
    razorpay: {
      orderId: { type: String, required: true, unique: true, trim: true },
      paymentId: { type: String, default: "", index: true, trim: true },
      signature: { type: String, default: "", trim: true },
      capturedAt: { type: Date, default: null },
      method: { type: String, default: "", trim: true },
      contact: { type: String, default: "", trim: true },
      email: { type: String, default: "", trim: true },
    },
    splitRule: { type: splitRuleSchema, default: () => ({}) },
    refund: { type: refundSchema, default: () => ({}) },
    attempts: { type: [paymentAttemptSchema], default: () => [{ status: "created", note: "Order created" }] },
    webhook: {
      lastEventId: { type: String, default: "", trim: true },
      lastEventType: { type: String, default: "", trim: true },
      lastProcessedAt: { type: Date, default: null },
    },
    failure: {
      code: { type: String, default: "", trim: true },
      description: { type: String, default: "", trim: true },
      source: { type: String, default: "", trim: true },
      step: { type: String, default: "", trim: true },
      reason: { type: String, default: "", trim: true },
    },
  },
  { timestamps: true }
);

paymentSchema.index({ bookingId: 1, status: 1 });
paymentSchema.index(
  { bookingId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["created", "pending", "paid"] } },
  }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;

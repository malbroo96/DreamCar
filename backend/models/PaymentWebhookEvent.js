import mongoose from "mongoose";

const paymentWebhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    fingerprint: { type: String, required: true, trim: true },
    eventType: { type: String, required: true, trim: true },
    orderId: { type: String, default: "", trim: true },
    paymentId: { type: String, default: "", trim: true },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const PaymentWebhookEvent = mongoose.model("PaymentWebhookEvent", paymentWebhookEventSchema);
export default PaymentWebhookEvent;

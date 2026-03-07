import mongoose from "mongoose";

const messageThreadSchema = new mongoose.Schema(
  {
    carId: { type: mongoose.Schema.Types.ObjectId, ref: "Car", required: true, index: true },
    carTitle: { type: String, required: true },
    participants: { type: [String], required: true, index: true },
    buyerId: { type: String, required: true, index: true },
    buyerName: { type: String, required: true },
    buyerEmail: { type: String, required: true },
    sellerId: { type: String, required: true, index: true },
    sellerName: { type: String, required: true },
    sellerEmail: { type: String, required: true },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

messageThreadSchema.index({ carId: 1, buyerId: 1, sellerId: 1 }, { unique: true });

const MessageThread = mongoose.model("MessageThread", messageThreadSchema);

export default MessageThread;

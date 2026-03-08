import mongoose from "mongoose";

const messageThreadSchema = new mongoose.Schema(
  {
    threadType: { type: String, enum: ["listing", "direct"], default: "listing", index: true },
    directKey: { type: String, default: "", index: true },
    carId: { type: mongoose.Schema.Types.ObjectId, ref: "Car", index: true },
    carTitle: { type: String, required: true, default: "Direct message" },
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

messageThreadSchema.index(
  { carId: 1, buyerId: 1, sellerId: 1, threadType: 1 },
  { unique: true, partialFilterExpression: { threadType: "listing" } }
);
messageThreadSchema.index(
  { directKey: 1, threadType: 1 },
  { unique: true, partialFilterExpression: { threadType: "direct" } }
);

const MessageThread = mongoose.model("MessageThread", messageThreadSchema);

export default MessageThread;

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: "MessageThread", required: true, index: true },
    senderId: { type: String, required: true, index: true },
    senderName: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    readBy: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;

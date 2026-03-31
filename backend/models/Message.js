import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: "MessageThread", required: true, index: true },
    senderId: { type: String, required: true, index: true },
    senderName: { type: String, required: true },
    text: { type: String, default: "", trim: true },
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    readBy: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;

import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "application_approved",
        "application_rejected",
        "application_under_review",
        "new_inspection_job",
        "inspection_requested",
        "inspection_assigned",
        "inspection_completed",
      ],
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, read: 1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;

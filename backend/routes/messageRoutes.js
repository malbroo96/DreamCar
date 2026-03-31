import express from "express";
import {
  getMessageNotifications,
  getThreadMessages,
  getThreads,
  sendImageMessage,
  sendThreadMessage,
  startDirectConversation,
  startConversation,
} from "../controllers/messageController.js";
import { protect } from "../middleware/auth.js";
import { uploadChatImage } from "../middleware/upload.js";

const router = express.Router();

router.use(protect);
router.post("/start", startConversation);
router.post("/start-direct", startDirectConversation);
router.get("/threads", getThreads);
router.get("/notifications", getMessageNotifications);
router.get("/threads/:threadId", getThreadMessages);
router.post("/threads/:threadId/messages", sendThreadMessage);
router.post("/threads/:threadId/images", uploadChatImage, sendImageMessage);

export default router;

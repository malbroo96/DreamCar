import express from "express";
import {
  getThreadMessages,
  getThreads,
  sendThreadMessage,
  startConversation,
} from "../controllers/messageController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.post("/start", startConversation);
router.get("/threads", getThreads);
router.get("/threads/:threadId", getThreadMessages);
router.post("/threads/:threadId/messages", sendThreadMessage);

export default router;

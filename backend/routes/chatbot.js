import express from "express";
import { handleChatSupport } from "../controllers/chatController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
router.post("/support", protect, handleChatSupport);

export default router;

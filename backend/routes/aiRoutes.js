import express from "express";
import { extractVehicleDetails, handleUserChat } from "../controllers/aiController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.post("/chat", handleUserChat);
router.post("/extract-rc", extractVehicleDetails);

export default router;

import express from "express";
import { getMe, googleLogin } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/google", googleLogin);
router.get("/me", protect, getMe);

export default router;

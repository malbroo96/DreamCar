import express from "express";
import { getMyProfile, updateMyProfile } from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);

export default router;

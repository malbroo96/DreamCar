import express from "express";
import {
  getMyProfile,
  searchUsers,
  updateMyProfile,
  getPublicProfile,
} from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/me", getMyProfile);
router.get("/search", searchUsers);
router.put("/me", updateMyProfile);

/* Public dealer profile — any logged-in user can view */
router.get("/:id/profile", getPublicProfile);

export default router;
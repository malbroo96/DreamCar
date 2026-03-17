import express from "express";
import {
  requestInspection,
  getMyInspections,
  cancelInspection,
  getAllInspections,
  updateInspectionStatus,
  getInspectionStats,
} from "../controllers/inspectionController.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

/* Buyer routes */
router.post("/request/:carId",  requestInspection);
router.get("/my",               getMyInspections);
router.patch("/cancel/:id",     cancelInspection);

/* Admin routes */
router.get("/admin/all",        adminOnly, getAllInspections);
router.get("/admin/stats",      adminOnly, getInspectionStats);
router.patch("/admin/:id",      adminOnly, updateInspectionStatus);

export default router;
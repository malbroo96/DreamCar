import express from "express";
import {
  requestInspection, getMyInspections, cancelInspection,
  getAvailableInspections, acceptInspection, getMyJobs, submitReport,
  applyAsInspector, getMyApplication,
  getAllInspections, getInspectionStats, updateInspectionStatus,
  getAllApplications, reviewApplication,
} from "../controllers/inspectionController.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { uploadCarFilesFiltered } from "../middleware/upload.js";

const router = express.Router();
router.use(protect);

/* ── Inspector application (any logged-in user) ── */
router.post("/apply",          uploadCarFilesFiltered, applyAsInspector);
router.get("/my-application",  getMyApplication);

/* ── Buyer routes ── */
router.post("/request/:carId", requestInspection);
router.get("/my",              getMyInspections);
router.patch("/cancel/:id",    cancelInspection);

/* ── Inspector routes ── */
router.get("/available",          getAvailableInspections);
router.patch("/accept/:id",       acceptInspection);
router.get("/my-jobs",            getMyJobs);
router.post("/submit-report/:id", uploadCarFilesFiltered, submitReport);

/* ── Admin routes ── */
router.get("/admin/all",                adminOnly, getAllInspections);
router.get("/admin/stats",              adminOnly, getInspectionStats);
router.patch("/admin/:id",              adminOnly, updateInspectionStatus);
router.get("/admin/applications",       adminOnly, getAllApplications);
router.patch("/admin/applications/:id", adminOnly, reviewApplication);

export default router;
import express from "express";
import {
  requestInspection, getMyInspections, cancelInspection,
  getAvailableInspections, acceptInspection, getMyJobs, submitReport,
  saveInspectorApplicationBasic, saveInspectorApplicationExperience,
  saveInspectorApplicationDocuments, submitInspectorApplication, getMyApplication,
  getAllInspections, getInspectionStats, updateInspectionStatus,
  getAllApplications, reviewApplication, getApplicationDocumentPreview,
} from "../controllers/inspectionController.js";
import { protect, adminOnly, requireInspectorApproval } from "../middleware/auth.js";
import { uploadInspectorApplicationFiles } from "../middleware/upload.js";

const router = express.Router();
router.use(protect);

router.get("/my-application", getMyApplication);
router.put("/application/basic", saveInspectorApplicationBasic);
router.put("/application/experience", saveInspectorApplicationExperience);
router.put("/application/documents", uploadInspectorApplicationFiles, saveInspectorApplicationDocuments);
router.post("/application/submit", submitInspectorApplication);

router.post("/request/:carId", requestInspection);
router.get("/my", getMyInspections);
router.patch("/cancel/:id", cancelInspection);

router.get("/available", requireInspectorApproval, getAvailableInspections);
router.patch("/accept/:id", requireInspectorApproval, acceptInspection);
router.get("/my-jobs", requireInspectorApproval, getMyJobs);
router.post("/submit-report/:id", requireInspectorApproval, uploadInspectorApplicationFiles, submitReport);

router.get("/admin/all", adminOnly, getAllInspections);
router.get("/admin/stats", adminOnly, getInspectionStats);
router.patch("/admin/:id", adminOnly, updateInspectionStatus);
router.get("/admin/applications", adminOnly, getAllApplications);
router.patch("/admin/applications/:id", adminOnly, reviewApplication);
router.get("/admin/applications/:id/documents/:docType", adminOnly, getApplicationDocumentPreview);

export default router;

import express from "express";
import {
  createCar,
  deleteCar,
  extractCarFromRC,
  getCarById,
  getCars,
  getCarStats,
  updateCar,
  getRCDocumentUrl,
  verifyRCDocument,
} from "../controllers/carController.js";
import { uploadCarFilesFiltered, uploadRC } from "../middleware/upload.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.post("/rc-extract", uploadRC.single("rcDocument"), extractCarFromRC);
router.get("/stats/summary", getCarStats);

router.route("/")
  .get(getCars)
  .post(uploadCarFilesFiltered, createCar);

router.route("/:id")
  .get(getCarById)
  .put(uploadCarFilesFiltered, updateCar)
  .delete(deleteCar);

/* ── RC Document endpoints ── */
router.get("/:id/rc-url", getRCDocumentUrl);               // owner or admin: get signed URL
router.patch("/:id/rc-verify", adminOnly, verifyRCDocument); // admin only: mark as verified

export default router;

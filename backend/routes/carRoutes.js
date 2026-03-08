import express from "express";
import {
  createCar,
  deleteCar,
  getCarById,
  getCars,
  updateCar,
  getRCDocumentUrl,
  verifyRCDocument,
} from "../controllers/carController.js";
import { uploadCarFilesFiltered } from "../middleware/upload.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

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

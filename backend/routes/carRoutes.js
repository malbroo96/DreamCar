import express from "express";
import {
  createCar,
  deleteCar,
  extractCarFromRc,
  getRcExtractionHealth,
  getCarById,
  getCars,
  updateCar,
} from "../controllers/carController.js";
import { upload, uploadRc } from "../middleware/upload.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/rc-health", getRcExtractionHealth);
router.post("/rc-extract", uploadRc.single("rcBook"), extractCarFromRc);
router.route("/").get(getCars).post(upload.array("images", 8), createCar);
router.route("/:id").get(getCarById).put(upload.array("images", 8), updateCar).delete(deleteCar);

export default router;

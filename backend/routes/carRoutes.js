import express from "express";
import {
  createCar,
  deleteCar,
  getCarById,
  getCars,
  updateCar,
} from "../controllers/carController.js";
import { upload } from "../middleware/upload.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getCars).post(upload.array("images", 8), createCar);
router.route("/:id").get(getCarById).put(upload.array("images", 8), updateCar).delete(deleteCar);

export default router;

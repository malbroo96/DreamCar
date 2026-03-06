import express from "express";
import {
  deleteAdminCar,
  getAdminCars,
  updateAdminCar,
} from "../controllers/carController.js";
import { upload } from "../middleware/upload.js";
import { adminOnly, protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/cars", getAdminCars);
router.put("/cars/:id", upload.array("images", 8), updateAdminCar);
router.delete("/cars/:id", deleteAdminCar);

export default router;

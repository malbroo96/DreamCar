import express from "express";
import { createOrder, getMyPayments, handleWebhook, verifyPayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/webhook", handleWebhook);

router.use(protect);
router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.get("/my", getMyPayments);

export default router;

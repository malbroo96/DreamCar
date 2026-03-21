import {
  createInspectionOrder,
  finalizeCapturedPayment,
  markPaymentAsFailed,
  markPaymentAsPendingVerification,
} from "../services/paymentService.js";
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "../services/razorpayApiService.js";
import { createWebhookEventFingerprint } from "../utils/crypto.js";
import logger from "../utils/logger.js";

export const createOrder = async (req, res, next) => {
  try {
    const { carId, preferredDate, preferredTime, location, notes, amount } = req.body;
    const { inspection, payment, order } = await createInspectionOrder({
      buyer: req.user,
      carId,
      preferredDate,
      preferredTime,
      location,
      notes,
      requestedAmount: amount,
    });

    res.status(201).json({
      booking: inspection,
      payment,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    const isValid = verifyRazorpayPaymentSignature({ orderId, paymentId, signature });
    if (!isValid) {
      res.status(400);
      throw new Error("Invalid payment signature");
    }

    const { payment, inspection } = await markPaymentAsPendingVerification({
      orderId,
      paymentId,
      signature,
      buyerId: req.user.id,
    });

    res.json({
      message: "Payment signature verified. Awaiting webhook confirmation.",
      paymentStatus: payment.status,
      bookingStatus: inspection?.status || "payment_pending",
      bookingId: inspection?._id || payment.bookingId,
    });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

export const handleWebhook = async (req, res, next) => {
  try {
    const rawBody = req.rawBody || "";
    const signature = req.headers["x-razorpay-signature"];
    const eventId = req.headers["x-razorpay-event-id"] || `fingerprint_${createWebhookEventFingerprint(rawBody)}`;

    const isValid = verifyRazorpayWebhookSignature({
      rawBody,
      signature,
    });
    if (!isValid) {
      res.status(400);
      throw new Error("Invalid webhook signature");
    }

    const event = req.body?.event;
    const paymentEntity = req.body?.payload?.payment?.entity || {};
    const orderId = paymentEntity.order_id || "";
    const paymentId = paymentEntity.id || "";

    if (event === "payment.captured") {
      const result = await finalizeCapturedPayment({
        eventId,
        eventType: event,
        rawBody,
        orderId,
        paymentId,
        capturePayload: paymentEntity,
      });
      return res.json({ ok: true, duplicate: result.duplicate });
    }

    if (event === "payment.failed") {
      await markPaymentAsFailed({
        orderId,
        paymentId,
        errorData: paymentEntity.error_description
          ? {
              description: paymentEntity.error_description,
              source: paymentEntity.error_source,
              step: paymentEntity.error_step,
              reason: paymentEntity.error_reason,
              code: paymentEntity.error_code,
            }
          : {},
      });
      return res.json({ ok: true });
    }

    logger.info("Unhandled Razorpay webhook ignored", { eventId, eventType: event, orderId, paymentId });
    return res.json({ ok: true, ignored: true });
  } catch (error) {
    next(error);
  }
};

export const getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ "bookingSnapshot.buyerId": req.user.id })
      .populate("bookingId")
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

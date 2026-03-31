import Car from "../models/Car.js";
import Inspection from "../models/Inspection.js";
import Payment from "../models/Payment.js";
import PaymentWebhookEvent from "../models/PaymentWebhookEvent.js";
import { assignInspectorToInspection } from "./inspectionAssignmentService.js";
import { createAndEmitNotification } from "./notificationService.js";
import { createRazorpayOrder } from "./razorpayApiService.js";
import { createWebhookEventFingerprint } from "../utils/crypto.js";
import logger from "../utils/logger.js";

const DEFAULT_INSPECTION_PRICE = Number(process.env.DEFAULT_INSPECTION_PRICE || 2499);
const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT || 20);
const toMinorAmount = (value) => Math.round(Number(value || 0) * 100);

const makeReceiptId = (bookingId) => `insp_${bookingId}_${Date.now()}`.slice(0, 40);

const buildSplitRule = ({ amount, assignedInspectorId = "" }) => {
  const platformFeeAmount = Math.round((amount * PLATFORM_FEE_PERCENT) / 100);
  const inspectorPayoutAmount = Math.max(amount - platformFeeAmount, 0);
  return {
    inspectorUserId: assignedInspectorId,
    inspectorAccountId: "",
    platformFeeAmount,
    inspectorPayoutAmount,
    currency: "INR",
    transferStatus: "not_applicable",
    transferId: "",
    transferReference: "",
  };
};

export const calculateInspectionAmount = ({ car, requestedAmount }) => {
  const normalizedRequestedAmount = Number(requestedAmount || 0);
  if (normalizedRequestedAmount > 0) return toMinorAmount(normalizedRequestedAmount);
  const premiumMultiplier = Number(car?.featured ? 1.2 : 1);
  return toMinorAmount(DEFAULT_INSPECTION_PRICE * premiumMultiplier);
};

const findDuplicateActiveInspection = ({ carId, buyerId }) =>
  Inspection.findOne({
    carId,
    buyerId,
    status: { $in: ["payment_created", "payment_pending", "confirmed", "accepted", "completed"] },
  });

export const createInspectionOrder = async ({
  buyer,
  carId,
  preferredDate,
  preferredTime,
  location,
  notes,
  requestedAmount,
}) => {
  const car = await Car.findById(carId);
  if (!car) {
    const error = new Error("Car not found");
    error.statusCode = 404;
    throw error;
  }

  if (car.ownerId === buyer.id) {
    const error = new Error("You cannot request an inspection on your own listing.");
    error.statusCode = 400;
    throw error;
  }

  const existingInspection = await findDuplicateActiveInspection({ carId: car._id, buyerId: buyer.id });
  if (existingInspection) {
    const error = new Error("An active inspection booking already exists for this car.");
    error.statusCode = 409;
    throw error;
  }

  const amount = calculateInspectionAmount({ car, requestedAmount });
  const inspection = await Inspection.create({
    carId: car._id,
    carTitle: car.title,
    carBrand: car.brand,
    carModel: car.model,
    carYear: car.year,
    carImage: car.images?.[0]?.url || "",
    buyerId: buyer.id,
    buyerName: buyer.name || "",
    buyerEmail: buyer.email || "",
    sellerId: car.ownerId || "",
    sellerName: car.ownerName || "",
    preferredDate: preferredDate || null,
    preferredTime: preferredTime || "",
    location: location || car.location || "",
    notes: notes || "",
    status: "payment_created",
    pricing: {
      amount,
      currency: "INR",
      pricingType: Number(requestedAmount || 0) > 0 ? "dynamic" : "fixed",
    },
    paymentStatus: "created",
    paymentConfirmedAt: null,
    assignmentTriggeredAt: null,
  });

  try {
    const receipt = makeReceiptId(inspection._id.toString());
    const order = await createRazorpayOrder({
      amount,
      currency: "INR",
      receipt,
      notes: {
        bookingId: inspection._id.toString(),
        carId: car._id.toString(),
        buyerId: buyer.id,
        flow: "inspection_booking",
      },
    });

    const payment = await Payment.create({
      bookingId: inspection._id,
      bookingSnapshot: {
        carId: car._id,
        carTitle: car.title,
        buyerId: buyer.id,
        sellerId: car.ownerId || "",
      },
      amount,
      currency: "INR",
      receipt,
      notes: {
        preferredDate: preferredDate || "",
        preferredTime: preferredTime || "",
      },
      razorpay: {
        orderId: order.id,
      },
      splitRule: buildSplitRule({ amount }),
    });

    inspection.paymentId = payment._id;
    inspection.razorpayOrderId = order.id;
    await inspection.save();

    logger.info("Inspection payment order created", {
      bookingId: inspection._id.toString(),
      paymentId: payment._id.toString(),
      orderId: order.id,
      buyerId: buyer.id,
    });

    return { inspection, payment, order };
  } catch (error) {
    inspection.status = "payment_failed";
    inspection.paymentStatus = "failed";
    await inspection.save();
    throw error;
  }
};

export const markPaymentAsPendingVerification = async ({
  orderId,
  paymentId,
  signature,
  buyerId,
}) => {
  const payment = await Payment.findOne({ "razorpay.orderId": orderId }).populate("bookingId");
  if (!payment) {
    const error = new Error("Payment order not found");
    error.statusCode = 404;
    throw error;
  }

  if (buyerId && payment.bookingSnapshot.buyerId !== buyerId) {
    const error = new Error("You are not allowed to verify this payment");
    error.statusCode = 403;
    throw error;
  }

  if (payment.status === "paid") {
    return { payment, inspection: payment.bookingId };
  }

  payment.status = "pending";
  payment.razorpay.paymentId = paymentId;
  payment.razorpay.signature = signature;
  payment.attempts.push({
    status: "pending",
    note: "Checkout callback validated; awaiting webhook confirmation",
    metadata: { paymentId },
  });
  await payment.save();

  const inspection = await Inspection.findById(payment.bookingId._id);
  if (inspection) {
    inspection.paymentStatus = "pending";
    inspection.status = "payment_pending";
    inspection.razorpayPaymentId = paymentId;
    await inspection.save();
  }

  return { payment, inspection };
};

export const markPaymentAsFailed = async ({ orderId, paymentId = "", errorData = {} }) => {
  const payment = await Payment.findOne({ "razorpay.orderId": orderId });
  if (!payment) return null;

  payment.status = "failed";
  payment.razorpay.paymentId = paymentId || payment.razorpay.paymentId;
  payment.failure = {
    code: errorData.code || "",
    description: errorData.description || "",
    source: errorData.source || "",
    step: errorData.step || "",
    reason: errorData.reason || "",
  };
  payment.attempts.push({
    status: "failed",
    note: "Payment failed",
    metadata: errorData,
  });
  await payment.save();

  await Inspection.findByIdAndUpdate(payment.bookingId, {
    paymentStatus: "failed",
    status: "payment_failed",
    razorpayPaymentId: paymentId || "",
  });

  return payment;
};

export const finalizeCapturedPayment = async ({
  eventId,
  eventType,
  rawBody,
  orderId,
  paymentId,
  capturePayload = {},
}) => {
  const fingerprint = createWebhookEventFingerprint(rawBody);
  const existingEvent = await PaymentWebhookEvent.findOne({ eventId });
  if (existingEvent) {
    return { duplicate: true };
  }

  const payment = await Payment.findOne({ "razorpay.orderId": orderId });
  if (!payment) {
    const error = new Error("Payment not found for webhook order");
    error.statusCode = 404;
    throw error;
  }

  const inspection = await Inspection.findById(payment.bookingId);
  if (!inspection) {
    const error = new Error("Inspection booking not found for payment");
    error.statusCode = 404;
    throw error;
  }

  await PaymentWebhookEvent.create({
    eventId,
    fingerprint,
    eventType,
    orderId,
    paymentId,
  });

  if (payment.status !== "paid") {
    payment.status = "paid";
    payment.razorpay.paymentId = paymentId || payment.razorpay.paymentId;
    payment.razorpay.capturedAt = new Date();
    payment.razorpay.method = capturePayload.method || payment.razorpay.method;
    payment.razorpay.contact = capturePayload.contact || payment.razorpay.contact;
    payment.razorpay.email = capturePayload.email || payment.razorpay.email;
    payment.webhook = {
      lastEventId: eventId,
      lastEventType: eventType,
      lastProcessedAt: new Date(),
    };
    payment.attempts.push({
      status: "paid",
      note: "payment.captured webhook processed",
      metadata: { paymentId },
    });
    payment.splitRule = buildSplitRule({
      amount: payment.amount,
      assignedInspectorId: inspection.inspectorId || "",
    });
    await payment.save();
  }

  if (inspection.paymentStatus !== "paid") {
    inspection.paymentStatus = "paid";
    inspection.paymentConfirmedAt = new Date();
    inspection.status = "confirmed";
    inspection.razorpayPaymentId = paymentId || inspection.razorpayPaymentId;
    inspection.assignmentTriggeredAt = new Date();
    await inspection.save();
    await assignInspectorToInspection(inspection);
  }

  const finalizedInspection = await Inspection.findById(inspection._id);
  payment.splitRule = buildSplitRule({
    amount: payment.amount,
    assignedInspectorId: finalizedInspection?.inspectorId || "",
  });
  await payment.save();

  logger.info("Captured payment finalized", {
    bookingId: inspection._id.toString(),
    paymentId: payment._id.toString(),
    orderId,
    razorpayPaymentId: paymentId,
  });

  return { duplicate: false, payment, inspection: finalizedInspection };
};

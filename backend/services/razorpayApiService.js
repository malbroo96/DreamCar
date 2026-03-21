import { Buffer } from "buffer";
import { createHmacSha256, safeCompareSignatures } from "../utils/crypto.js";

const RAZORPAY_BASE_URL = "https://api.razorpay.com/v1";

const getRazorpayCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured");
  }
  return { keyId, keySecret };
};

const getBasicAuthHeader = () => {
  const { keyId, keySecret } = getRazorpayCredentials();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
};

const parseApiResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.description || payload?.error?.reason || "Razorpay API request failed";
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
};

export const createRazorpayOrder = async ({ amount, currency, receipt, notes }) => {
  const response = await fetch(`${RAZORPAY_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      payment_capture: 1,
      notes,
    }),
  });

  return parseApiResponse(response);
};

export const verifyRazorpayPaymentSignature = ({ orderId, paymentId, signature }) => {
  const { keySecret } = getRazorpayCredentials();
  const generatedSignature = createHmacSha256(`${orderId}|${paymentId}`, keySecret);
  return safeCompareSignatures(generatedSignature, signature);
};

export const verifyRazorpayWebhookSignature = ({ rawBody, signature }) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");
  }
  const generatedSignature = createHmacSha256(rawBody, webhookSecret);
  return safeCompareSignatures(generatedSignature, signature);
};

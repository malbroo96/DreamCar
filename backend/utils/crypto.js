import crypto from "crypto";

export const createHmacSha256 = (payload, secret) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

export const safeCompareSignatures = (expected, actual) => {
  if (!expected || !actual) return false;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

export const createWebhookEventFingerprint = (payload) =>
  crypto.createHash("sha256").update(payload).digest("hex");

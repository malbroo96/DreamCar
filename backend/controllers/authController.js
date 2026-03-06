import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const normalizeEmails = (value) =>
  (value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const isAdminEmail = (email) => normalizeEmails(process.env.ADMIN_EMAILS).includes(email.toLowerCase());

const signAuthToken = (payload) => {
  const secret = process.env.APP_JWT_SECRET;
  if (!secret) {
    throw new Error("APP_JWT_SECRET is not set");
  }

  return jwt.sign(payload, secret, { expiresIn: "7d" });
};

export const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body || {};

    if (!credential) {
      res.status(400);
      throw new Error("Google credential is required");
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      res.status(500);
      throw new Error("GOOGLE_CLIENT_ID is not configured");
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      res.status(401);
      throw new Error("Invalid Google token payload");
    }

    const user = {
      id: payload.sub,
      name: payload.name || "",
      email: payload.email.toLowerCase(),
      picture: payload.picture || "",
      role: isAdminEmail(payload.email) ? "admin" : "user",
    };

    const token = signAuthToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    res.json({ token, user });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

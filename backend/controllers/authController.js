import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

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

    const role = isAdminEmail(payload.email) ? "admin" : "user";
    const userDoc = await User.findOneAndUpdate(
      { googleId: payload.sub },
      {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        name: payload.name || "",
        picture: payload.picture || "",
        role,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const user = {
      id: userDoc.googleId,
      name: userDoc.name,
      email: userDoc.email,
      picture: userDoc.picture,
      role: userDoc.role,
      bio: userDoc.bio,
      phone: userDoc.phone,
      location: userDoc.location,
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
  const userDoc = await User.findOne({ googleId: req.user.id });
  if (!userDoc) {
    return res.json({ user: req.user });
  }

  return res.json({
    user: {
      id: userDoc.googleId,
      name: userDoc.name,
      email: userDoc.email,
      picture: userDoc.picture,
      role: userDoc.role,
      bio: userDoc.bio,
      phone: userDoc.phone,
      location: userDoc.location,
    },
  });
};

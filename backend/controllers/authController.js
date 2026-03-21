import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

const normalizeEmails = (value) =>
  String(value || "")
    .split(/[\n,]/)
    .map((entry) => entry.split("#")[0].trim().toLowerCase())
    .filter(Boolean);

const getAdminEmails = () => normalizeEmails(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL);

const isAdminBootstrapEmail = (email) => getAdminEmails().includes(normalizeEmail(email));

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

    const email = normalizeEmail(payload.email);
    const shouldBootstrapAdmin = isAdminBootstrapEmail(email);
    const baseRole = shouldBootstrapAdmin ? "admin" : "user";
    const googleName = payload.name || "";
    const defaultUsername = email.split("@")[0].trim().toLowerCase();
    let userDoc = await User.findOne({ googleId: payload.sub });

    console.log("[auth] Google login attempt", {
      email,
      adminEmails: getAdminEmails(),
      adminBootstrapMatch: shouldBootstrapAdmin,
      existingUser: Boolean(userDoc),
    });

    if (!userDoc) {
      userDoc = await User.create({
        googleId: payload.sub,
        email,
        name: googleName,
        googleName,
        username: defaultUsername,
        picture: payload.picture || "",
        role: baseRole,
      });

      console.log("[auth] New user created", {
        email,
        assignedRole: userDoc.role,
      });
    } else {
      userDoc.email = email;
      userDoc.picture = payload.picture || userDoc.picture;
      userDoc.googleName = googleName || userDoc.googleName;

      if (!userDoc.name?.trim() && googleName) {
        userDoc.name = googleName;
      }
      if (!userDoc.username?.trim() && defaultUsername) {
        userDoc.username = defaultUsername;
      }

      await userDoc.save();

      console.log("[auth] Existing user login", {
        email,
        storedRole: userDoc.role,
      });
    }

    const user = {
      id: userDoc.googleId,
      name: userDoc.name,
      username: userDoc.username,
      googleName: userDoc.googleName,
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
      username: userDoc.username,
      googleName: userDoc.googleName,
      email: userDoc.email,
      picture: userDoc.picture,
      role: userDoc.role,
      bio: userDoc.bio,
      phone: userDoc.phone,
      location: userDoc.location,
    },
  });
};

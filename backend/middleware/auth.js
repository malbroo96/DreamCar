import jwt from "jsonwebtoken";
import User from "../models/User.js";
import InspectorProfile from "../models/InspectorProfile.js";

const getBearerToken = (headerValue = "") => {
  if (!headerValue.startsWith("Bearer ")) return null;
  return headerValue.slice(7).trim();
};

export const protect = async (req, res, next) => {
  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401);
      throw new Error("Unauthorized");
    }

    const secret = process.env.APP_JWT_SECRET;
    if (!secret) {
      res.status(500);
      throw new Error("APP_JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, secret);
    const userDoc = await User.findOne({ googleId: decoded.sub });

    req.user = {
      id: decoded.sub,
      email: userDoc?.email || decoded.email,
      name: userDoc?.name || decoded.name,
      role: userDoc?.role || decoded.role,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const adminOnly = (req, res, next) => {
  if (!req.user) {
    res.status(401);
    return next(new Error("Unauthorized"));
  }

  if (req.user.role !== "admin") {
    res.status(403);
    return next(new Error("Admin access required"));
  }

  return next();
};

export const requireInspectorApproval = async (req, res, next) => {
  if (!req.user) {
    res.status(401);
    return next(new Error("Unauthorized"));
  }

  if (req.user.role !== "inspector") {
    res.status(403);
    return next(new Error("Inspector access required"));
  }

  const profile = await InspectorProfile.findOne({ userId: req.user.id, isActive: true });
  if (!profile) {
    res.status(403);
    return next(new Error("Only approved inspectors can access this feature"));
  }

  return next();
};

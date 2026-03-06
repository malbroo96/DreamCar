import jwt from "jsonwebtoken";

const getBearerToken = (headerValue = "") => {
  if (!headerValue.startsWith("Bearer ")) return null;
  return headerValue.slice(7).trim();
};

export const protect = (req, res, next) => {
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
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
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

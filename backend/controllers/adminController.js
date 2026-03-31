import Car from "../models/Car.js";
import Inspection from "../models/Inspection.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";

export const getAnalytics = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalCars,
      approvedCars,
      pendingCars,
      totalInspections,
      totalRevenue,
      brandStats,
      cityStats,
      inspectionsByStatus,
      recentActivity,
      monthlyListings,
    ] = await Promise.all([
      User.countDocuments(),
      Car.countDocuments(),
      Car.countDocuments({ status: "approved" }),
      Car.countDocuments({ status: "pending" }),
      Inspection.countDocuments(),
      Payment.aggregate([
        { $match: { status: "captured" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Car.aggregate([
        { $match: { status: "approved" } },
        { $group: { _id: "$brand", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Car.aggregate([
        { $match: { status: "approved" } },
        { $group: { _id: "$city", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Inspection.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      AuditLog.find().sort({ createdAt: -1 }).limit(20).lean(),
      Car.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 },
      ]),
    ]);

    res.json({
      overview: {
        totalUsers,
        totalCars,
        approvedCars,
        pendingCars,
        totalInspections,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
      brandStats: brandStats.map((b) => ({ name: b._id, count: b.count })),
      cityStats: cityStats.map((c) => ({ name: c._id, count: c.count })),
      inspectionsByStatus: inspectionsByStatus.map((s) => ({ status: s._id, count: s.count })),
      monthlyListings: monthlyListings
        .reverse()
        .map((m) => ({
          month: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
          count: m.count,
        })),
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { username: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    res.json({
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["user", "admin", "inspector"].includes(role)) {
      res.status(400);
      throw new Error("Invalid role");
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    user.role = role;
    await user.save();

    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name || req.user.email,
      action: "update_user_role",
      targetType: "User",
      targetId: user._id.toString(),
      details: { newRole: role, email: user.email },
      ip: req.ip,
    });

    res.json({ message: "Role updated", user });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(),
    ]);

    res.json({
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

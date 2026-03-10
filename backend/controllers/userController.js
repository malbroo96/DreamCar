import User from "../models/User.js";
import Car from "../models/Car.js";

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ googleId: req.user.id });
    if (!user) {
      res.status(404);
      throw new Error("Profile not found");
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ googleId: req.user.id });
    if (!user) {
      res.status(404);
      throw new Error("Profile not found");
    }

    if (req.body.name !== undefined) {
      const nextName = String(req.body.name).trim();
      if (!nextName) { res.status(400); throw new Error("Name is required"); }
      user.name = nextName;
    }
    if (req.body.username !== undefined) {
      const nextUsername = String(req.body.username).trim().toLowerCase();
      if (!nextUsername) { res.status(400); throw new Error("Username is required"); }
      const existing = await User.findOne({ _id: { $ne: user._id }, username: nextUsername }).select("_id");
      if (existing) { res.status(409); throw new Error("Username is already taken"); }
      user.username = nextUsername;
    }
    if (req.body.bio !== undefined) user.bio = String(req.body.bio).trim();
    if (req.body.phone !== undefined) user.phone = String(req.body.phone).trim();
    if (req.body.location !== undefined) user.location = String(req.body.location).trim();

    const updated = await user.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json([]);

    const users = await User.find({
      googleId: { $ne: req.user.id },
      $or: [
        { username: { $regex: escapeRegex(q.toLowerCase()), $options: "i" } },
        { name: { $regex: escapeRegex(q), $options: "i" } },
        { googleName: { $regex: escapeRegex(q), $options: "i" } },
      ],
    })
      .sort({ name: 1 })
      .limit(15)
      .select("googleId name username googleName email picture location");

    return res.json(
      users.map((u) => ({
        id: u.googleId,
        name: u.name,
        username: u.username,
        googleName: u.googleName,
        email: u.email,
        picture: u.picture,
        location: u.location,
      }))
    );
  } catch (error) {
    next(error);
  }
};

/* ══════════════════════════════════════════
   PUBLIC DEALER PROFILE
   GET /api/users/:id/profile
   - :id is the dealer's googleId
   - Returns safe public fields only (no email, no phone)
   - Also returns their active approved listings
══════════════════════════════════════════ */
export const getPublicProfile = async (req, res, next) => {
  try {
    const dealer = await User.findOne({ googleId: req.params.id })
      .select("googleId name username googleName picture bio location createdAt");

    if (!dealer) {
      res.status(404);
      throw new Error("Dealer profile not found");
    }

    /* Fetch their approved listings */
    const listings = await Car.find({ ownerId: req.params.id, status: "approved" })
      .sort({ createdAt: -1 })
      .select("_id title brand model year price location images fuelType transmission kilometersDriven rcVerified createdAt");

    res.json({
      id: dealer.googleId,
      name: dealer.name,
      username: dealer.username,
      googleName: dealer.googleName,
      picture: dealer.picture,
      bio: dealer.bio,
      location: dealer.location,
      memberSince: dealer.createdAt,
      totalListings: listings.length,
      listings,
    });
  } catch (error) {
    next(error);
  }
};
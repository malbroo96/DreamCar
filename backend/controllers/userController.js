import User from "../models/User.js";

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
      if (!nextName) {
        res.status(400);
        throw new Error("Name is required");
      }
      user.name = nextName;
    }
    if (req.body.username !== undefined) {
      const nextUsername = String(req.body.username).trim().toLowerCase();
      if (!nextUsername) {
        res.status(400);
        throw new Error("Username is required");
      }

      const existing = await User.findOne({
        _id: { $ne: user._id },
        username: nextUsername,
      }).select("_id");
      if (existing) {
        res.status(409);
        throw new Error("Username is already taken");
      }

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
    if (!q) {
      return res.json([]);
    }

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
      users.map((user) => ({
        id: user.googleId,
        name: user.name,
        username: user.username,
        googleName: user.googleName,
        email: user.email,
        picture: user.picture,
        location: user.location,
      }))
    );
  } catch (error) {
    next(error);
  }
};

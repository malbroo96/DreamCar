import User from "../models/User.js";

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

    if (req.body.name !== undefined) user.name = String(req.body.name).trim();
    if (req.body.bio !== undefined) user.bio = String(req.body.bio).trim();
    if (req.body.phone !== undefined) user.phone = String(req.body.phone).trim();
    if (req.body.location !== undefined) user.location = String(req.body.location).trim();

    const updated = await user.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

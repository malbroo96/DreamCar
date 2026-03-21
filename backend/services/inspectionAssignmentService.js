import Inspection from "../models/Inspection.js";
import InspectorProfile from "../models/InspectorProfile.js";
import User from "../models/User.js";

export const assignInspectorToInspection = async (inspection) => {
  if (!inspection || inspection.inspectorId) return inspection;

  const activeInspectors = await InspectorProfile.find({
    isActive: true,
    isAvailableForJobs: true,
  }).sort({ "rating.avg": -1, yearsOfExperience: -1, updatedAt: 1 });

  if (!activeInspectors.length) {
    inspection.status = "confirmed";
    await inspection.save();
    return inspection;
  }

  const workloads = await Promise.all(
    activeInspectors.map(async (profile) => ({
      profile,
      activeJobs: await Inspection.countDocuments({
        inspectorId: profile.userId,
        status: { $in: ["accepted", "confirmed"] },
      }),
    }))
  );

  workloads.sort((left, right) => {
    if (left.activeJobs !== right.activeJobs) return left.activeJobs - right.activeJobs;
    if ((right.profile.rating?.avg || 0) !== (left.profile.rating?.avg || 0)) {
      return (right.profile.rating?.avg || 0) - (left.profile.rating?.avg || 0);
    }
    return (right.profile.yearsOfExperience || 0) - (left.profile.yearsOfExperience || 0);
  });

  const selected = workloads[0]?.profile;
  if (!selected) {
    inspection.status = "confirmed";
    await inspection.save();
    return inspection;
  }

  const inspectorUser = await User.findOne({ googleId: selected.userId });
  inspection.inspectorId = selected.userId;
  inspection.inspectorName = inspectorUser?.name || "";
  inspection.inspectorEmail = inspectorUser?.email || "";
  inspection.status = "accepted";
  await inspection.save();
  return inspection;
};

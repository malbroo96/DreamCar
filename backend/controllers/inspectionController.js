import Inspection from "../models/Inspection.js";
import Car from "../models/Car.js";

/* ── Buyer: Request inspection ── */
export const requestInspection = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.carId);
    if (!car) { res.status(404); throw new Error("Car not found"); }

    /* Prevent owner from requesting inspection on own car */
    if (car.ownerId === req.user.id) {
      res.status(400);
      throw new Error("You cannot request an inspection on your own listing.");
    }

    /* Prevent duplicate pending request */
    const existing = await Inspection.findOne({
      carId: car._id,
      buyerId: req.user.id,
      status: "pending",
    });
    if (existing) {
      res.status(409);
      throw new Error("You already have a pending inspection request for this car.");
    }

    const inspection = await Inspection.create({
      carId:         car._id,
      carTitle:      car.title,
      carBrand:      car.brand,
      carModel:      car.model,
      carYear:       car.year,
      carImage:      car.images?.[0]?.url || "",
      buyerId:       req.user.id,
      buyerName:     req.user.name || "",
      buyerEmail:    req.user.email || "",
      sellerId:      car.ownerId || "",
      sellerName:    car.ownerName || "",
      preferredDate: req.body.preferredDate || null,
      preferredTime: req.body.preferredTime || "",
      location:      req.body.location || car.location || "",
      notes:         req.body.notes || "",
    });

    res.status(201).json(inspection);
  } catch (error) {
    next(error);
  }
};

/* ── Buyer: Get my inspection requests ── */
export const getMyInspections = async (req, res, next) => {
  try {
    const inspections = await Inspection.find({ buyerId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(inspections);
  } catch (error) {
    next(error);
  }
};

/* ── Buyer: Cancel inspection request ── */
export const cancelInspection = async (req, res, next) => {
  try {
    const inspection = await Inspection.findOne({
      _id: req.params.id,
      buyerId: req.user.id,
    });
    if (!inspection) { res.status(404); throw new Error("Inspection request not found"); }
    if (inspection.status !== "pending") {
      res.status(400);
      throw new Error("Only pending requests can be cancelled.");
    }
    inspection.status = "rejected";
    await inspection.save();
    res.json({ message: "Inspection request cancelled", inspection });
  } catch (error) {
    next(error);
  }
};

/* ── Admin: Get all inspections ── */
export const getAllInspections = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const inspections = await Inspection.find(filter).sort({ createdAt: -1 });
    res.json(inspections);
  } catch (error) {
    next(error);
  }
};

/* ── Admin: Update inspection status ── */
export const updateInspectionStatus = async (req, res, next) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) { res.status(404); throw new Error("Inspection not found"); }

    const { status, adminNotes, inspectionDate } = req.body;
    const validStatuses = ["pending", "approved", "rejected", "completed"];
    if (status && !validStatuses.includes(status)) {
      res.status(400);
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    if (status)         inspection.status = status;
    if (adminNotes)     inspection.adminNotes = adminNotes;
    if (inspectionDate) inspection.inspectionDate = new Date(inspectionDate);

    await inspection.save();
    res.json(inspection);
  } catch (error) {
    next(error);
  }
};

/* ── Admin: Get inspection stats ── */
export const getInspectionStats = async (req, res, next) => {
  try {
    const [total, pending, approved, completed, rejected] = await Promise.all([
      Inspection.countDocuments(),
      Inspection.countDocuments({ status: "pending" }),
      Inspection.countDocuments({ status: "approved" }),
      Inspection.countDocuments({ status: "completed" }),
      Inspection.countDocuments({ status: "rejected" }),
    ]);
    res.json({ total, pending, approved, completed, rejected });
  } catch (error) {
    next(error);
  }
};
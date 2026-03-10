import Car from "../models/Car.js";
import cloudinary from "../config/cloudinary.js";
import { extractRcDetailsFromBase64 } from "../services/geminiService.js";

/* ══════════════════════════════════════════
   CLOUDINARY CONFIG CHECK
══════════════════════════════════════════ */
const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
      process.env.CLOUDINARY_API_KEY !== "your_api_key" &&
      process.env.CLOUDINARY_API_SECRET !== "your_api_secret"
  );

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const parseNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const buildFilters = (query) => {
  const filters = { status: "approved" };

  if (query.brand) filters.brand = new RegExp(query.brand, "i");
  if (query.model) filters.model = new RegExp(query.model, "i");
  if (query.fuelType) filters.fuelType = query.fuelType;

  const year = parseNumber(query.year);
  if (year) filters.year = year;

  const minPrice = parseNumber(query.minPrice);
  const maxPrice = parseNumber(query.maxPrice);
  if (minPrice !== undefined || maxPrice !== undefined) {
    filters.price = {};
    if (minPrice !== undefined) filters.price.$gte = minPrice;
    if (maxPrice !== undefined) filters.price.$lte = maxPrice;
  }

  if (query.search) {
    const searchRegex = new RegExp(query.search, "i");
    filters.$or = [
      { title: searchRegex },
      { brand: searchRegex },
      { model: searchRegex },
      { location: searchRegex },
    ];
  }

  return filters;
};

const buildOwnerScopedQuery = (req, baseQuery = {}) => {
  if (req.user?.role === "admin") return { ...baseQuery };
  return { ...baseQuery, ownerId: req.user?.id };
};

const parseJsonFromText = (text = "") => {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const normalizeFuelType = (raw = "") => {
  const value = String(raw || "").toLowerCase();
  if (!value) return "";
  if (value.includes("petrol") || value.includes("gasoline")) return "Petrol";
  if (value.includes("diesel")) return "Diesel";
  if (value.includes("electric") || value.includes("ev")) return "Electric";
  if (value.includes("hybrid")) return "Hybrid";
  if (value.includes("cng")) return "CNG";
  if (value.includes("lpg")) return "LPG";
  return "Other";
};

const parseRcDetailsFromBody = (body = {}) => {
  const raw = body.rcDetails;
  if (!raw) return undefined;
  let parsed = null;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return undefined;
  }

  if (!parsed || typeof parsed !== "object") return undefined;
  return {
    registrationNumber: String(parsed.registrationNumber || "").trim(),
    ownerName: String(parsed.ownerName || "").trim(),
    manufacturer: String(parsed.manufacturer || "").trim(),
    vehicleModel: String(parsed.vehicleModel || "").trim(),
    fuelType: String(parsed.fuelType || "").trim(),
    manufacturingYear: String(parsed.manufacturingYear || "").trim(),
    registrationDate: String(parsed.registrationDate || "").trim(),
    engineNumber: String(parsed.engineNumber || "").trim(),
    chassisNumber: String(parsed.chassisNumber || "").trim(),
    vehicleColor: String(parsed.vehicleColor || "").trim(),
    seatingCapacity: String(parsed.seatingCapacity || "").trim(),
    rtoOffice: String(parsed.rtoOffice || "").trim(),
  };
};

const runGeminiExtraction = async ({ apiKey, mimeType, base64Data, prompt }) => {
  const preferredModel = String(process.env.GEMINI_MODEL || "").trim();
  const models = [preferredModel, "gemini-2.0-flash", "gemini-1.5-flash"].filter(Boolean);
  const uniqueModels = [...new Set(models)];
  let lastError = "Unknown Gemini error";

  for (const model of uniqueModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
        },
      }),
    });

    const bodyText = await response.text();
    if (!response.ok) {
      lastError = `${model}: ${bodyText || response.statusText}`;
      continue;
    }

    try {
      const parsed = JSON.parse(bodyText);
      const parts = parsed?.candidates?.[0]?.content?.parts || [];
      const textOutput = parts.map((part) => part.text).filter(Boolean).join("\n");
      if (!textOutput) {
        lastError = `${model}: Empty content returned by Gemini`;
        continue;
      }
      return textOutput;
    } catch {
      lastError = `${model}: Invalid JSON response from Gemini`;
    }
  }

  throw new Error(lastError);
};

/* ══════════════════════════════════════════
   IMAGE UPLOAD (public)
══════════════════════════════════════════ */
const uploadSingleImage = (file) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "dreamcar/cars", resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        return resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(file.buffer);
  });

const uploadImages = async (files = []) => {
  if (!files.length || !hasCloudinaryConfig()) return [];
  return Promise.all(files.map(uploadSingleImage));
};

/* ══════════════════════════════════════════
   RC DOCUMENT UPLOAD (private / authenticated)
   - Stored with type: "authenticated" in Cloudinary
   - Never returns a direct URL — only signed URLs on demand
══════════════════════════════════════════ */
const uploadRCDocument = (file) =>
  new Promise((resolve, reject) => {
    /* Determine resource_type: PDFs are "raw", images are "image" */
    const isPDF = file.mimetype === "application/pdf";
    const resourceType = isPDF ? "raw" : "image";

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "dreamcar/rc-documents",
        resource_type: resourceType,
        type: "authenticated",        // ← private, not publicly accessible
        access_mode: "authenticated", // ← requires signed URL to view
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve({
          publicId: result.public_id,
          resourceType,
          format: result.format || (isPDF ? "pdf" : file.mimetype.split("/")[1]),
        });
      }
    );
    stream.end(file.buffer);
  });

/* ══════════════════════════════════════════
   SIGNED URL GENERATOR
   - Generates a short-lived (10 min) signed URL
   - Called only by owner or admin via /api/cars/:id/rc-url
══════════════════════════════════════════ */
const generateSignedRCUrl = (publicId, resourceType = "image") => {
  const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 minutes

  const signedUrl = cloudinary.utils.private_download_url(publicId, null, {
    resource_type: resourceType,
    expires_at: expiresAt,
    attachment: false,
  });

  return { url: signedUrl, expiresAt };
};

/* ══════════════════════════════════════════
   DESTROY HELPERS
══════════════════════════════════════════ */
const destroyImages = async (images = []) => {
  await Promise.all(
    images
      .filter((img) => img.publicId)
      .map((img) => cloudinary.uploader.destroy(img.publicId))
  );
};

const destroyRCDocument = async (rcDocument) => {
  if (!rcDocument?.publicId) return;
  await cloudinary.uploader.destroy(rcDocument.publicId, {
    resource_type: rcDocument.resourceType || "image",
    type: "authenticated",
  });
};

const applyUpdatableFields = (target, source) => {
  const fieldMap = {
    title: source.title,
    brand: source.brand,
    model: source.model,
    year: parseNumber(source.year),
    price: parseNumber(source.price),
    fuelType: source.fuelType,
    transmission: source.transmission,
    kilometersDriven: parseNumber(source.kilometersDriven),
    description: source.description,
    location: source.location,
    status: source.status,
  };

  Object.entries(fieldMap).forEach(([key, value]) => {
    if (value !== undefined) target[key] = value;
  });
};

/* ══════════════════════════════════════════
   CONTROLLERS
══════════════════════════════════════════ */
export const getCars = async (req, res, next) => {
  try {
    const filters = buildFilters(req.query);
    if (req.query.mine === "true") {
      filters.ownerId = req.user.id;
      delete filters.status;
    }
    const cars = await Car.find(filters).sort({ createdAt: -1 });
    res.json(cars);
  } catch (error) {
    next(error);
  }
};

export const getCarById = async (req, res, next) => {
  try {
    const car = await Car.findOne({ _id: req.params.id, status: "approved" });
    if (!car) {
      res.status(404);
      throw new Error("Car not found");
    }
    res.json(car);
  } catch (error) {
    next(error);
  }
};

export const extractCarFromRC = async (req, res, next) => {
  try {
    const rcFile = req.file;
    if (!rcFile) {
      res.status(400);
      throw new Error("RC document is required for extraction");
    }

    const extracted = await extractRcDetailsFromBase64({
      base64Image: rcFile.buffer.toString("base64"),
      mimeType: rcFile.mimetype,
    });

    const fuelType = normalizeFuelType(extracted.fuel_type) || "Other";
    const inferredBrand = String(extracted.vehicle_class || "").trim() || "Vehicle";
    const inferredModel = String(extracted.registration_no || "").trim() || "RC Listing";
    const year = String(new Date().getFullYear());

    const rcDetails = {
      registrationNumber: String(extracted.registration_no || "").trim(),
      ownerName: String(extracted.owner_name || "").trim(),
      manufacturer: "",
      vehicleModel: "",
      fuelType: String(extracted.fuel_type || "").trim(),
      manufacturingYear: "",
      registrationDate: String(extracted.expiry_date || "").trim(),
      engineNumber: String(extracted.engine_no || "").trim(),
      chassisNumber: String(extracted.chassis_no || "").trim(),
      vehicleColor: "",
      seatingCapacity: "",
      rtoOffice: String(extracted.vehicle_class || "").trim(),
    };

    const autoFill = {
      title: [year, inferredBrand, inferredModel].filter(Boolean).join(" ").trim(),
      brand: inferredBrand,
      model: inferredModel,
      year,
      fuelType,
      location: rcDetails.rtoOffice || "India",
    };

    res.json({
      verified: true,
      autoFill,
      rcDetails,
    });
  } catch (error) {
    next(error);
  }
};

/* ── Create car listing ── */
export const createCar = async (req, res, next) => {
  try {
    /* Validate RC file present */
    const rcFile = req.files?.rcDocument?.[0];
    if (!rcFile) {
      res.status(400);
      throw new Error("RC document is required. Please upload the vehicle's Registration Certificate.");
    }

    /* Upload car images (public) */
    const imageFiles = req.files?.images || [];
    const uploadedImages = await uploadImages(imageFiles);

    /* Upload RC document (private/authenticated) */
    const rcDocumentData = await uploadRCDocument(rcFile);
    const rcDetails = parseRcDetailsFromBody(req.body);

    const car = await Car.create({
      title: req.body.title,
      brand: req.body.brand,
      model: req.body.model,
      year: parseNumber(req.body.year),
      price: parseNumber(req.body.price),
      fuelType: req.body.fuelType,
      transmission: req.body.transmission,
      kilometersDriven: parseNumber(req.body.kilometersDriven),
      description: req.body.description,
      location: req.body.location,
      status: req.body.status || "approved",
      ownerId: req.user.id,
      ownerEmail: req.user.email,
      ownerName: req.user.name,
      images: uploadedImages,
      rcDocument: rcDocumentData,
      rcDetails: rcDetails || undefined,
    });

    res.status(201).json(car);
  } catch (error) {
    next(error);
  }
};

/* ── Update car listing ── */
export const updateCar = async (req, res, next) => {
  try {
    const query = buildOwnerScopedQuery(req, { _id: req.params.id });
    const car = await Car.findOne(query);

    if (!car) {
      res.status(404);
      throw new Error("Car not found or access denied");
    }

    applyUpdatableFields(car, req.body);
    const rcDetails = parseRcDetailsFromBody(req.body);
    if (rcDetails) {
      car.rcDetails = rcDetails;
    }

    /* Handle keepImages — frontend sends publicIds of images to KEEP.
       Any existing image NOT in keepImages gets deleted from Cloudinary. */
    console.log("keepImages received:", req.body.keepImages);
    console.log("Car images from DB:", JSON.stringify(car.images, null, 2));
    if (req.body.keepImages !== undefined) {
      const keepIds = Array.isArray(req.body.keepImages)
        ? req.body.keepImages
        : [req.body.keepImages];

      /* Filter out the __none__ sentinel value */
      const validKeepIds = keepIds.filter((id) => id !== "__none__");

      /* Find images that were removed — check both publicId and public_id */
      const removedImages = car.images.filter(
        (img) => !validKeepIds.includes(img.publicId) && !validKeepIds.includes(img.public_id)
      );

      /* Delete removed images from Cloudinary */
      if (removedImages.length > 0) {
        await destroyImages(removedImages);
      }

      /* Keep only the images the user wants */
      car.images = car.images.filter(
        (img) => validKeepIds.includes(img.publicId) || validKeepIds.includes(img.public_id)
      );
    }

    /* Append new car images if provided */
    if (req.files?.images?.length) {
      const uploadedImages = await uploadImages(req.files.images);
      car.images = [...car.images, ...uploadedImages];
    }

    /* Replace RC document if a new one is uploaded */
    if (req.files?.rcDocument?.[0]) {
      if (car.rcDocument?.publicId) {
        await destroyRCDocument(car.rcDocument);
      }
      car.rcDocument = await uploadRCDocument(req.files.rcDocument[0]);
      car.rcVerified = false;
    }

    /* Remove RC if user explicitly removed it (and no new one uploaded) */
    if (req.body.removeRC === "true" && !req.files?.rcDocument?.[0]) {
      if (car.rcDocument?.publicId) {
        await destroyRCDocument(car.rcDocument);
      }
      car.rcDocument = undefined;
      car.rcVerified = false;
    }

    /* Validate RC is present */
    if (!car.rcDocument?.publicId) {
      res.status(400);
      throw new Error("RC document is required. Please upload the vehicle's Registration Certificate.");
    }

    const updatedCar = await car.save();
    res.json(updatedCar);
  } catch (error) {
    next(error);
  }
};

/* ── Delete car listing ── */
export const deleteCar = async (req, res, next) => {
  try {
    const query = buildOwnerScopedQuery(req, { _id: req.params.id });
    const car = await Car.findOne(query);

    if (!car) {
      res.status(404);
      throw new Error("Car not found or access denied");
    }

    await destroyImages(car.images);
    await destroyRCDocument(car.rcDocument);
    await car.deleteOne();

    res.json({ message: "Car deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/* ── Get signed RC URL (owner or admin only) ── */
export const getRCDocumentUrl = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      res.status(404);
      throw new Error("Car not found");
    }

    /* Only owner or admin can access RC */
    const isOwner = String(car.ownerId) === String(req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      res.status(403);
      throw new Error("Access denied. Only the car owner or admin can view the RC document.");
    }

    if (!car.rcDocument?.publicId) {
      res.status(404);
      throw new Error("No RC document found for this listing");
    }

    const { url, expiresAt } = generateSignedRCUrl(
      car.rcDocument.publicId,
      car.rcDocument.resourceType
    );

    res.json({ url, expiresAt, format: car.rcDocument.format });
  } catch (error) {
    next(error);
  }
};

/* ── Admin: mark RC as verified ── */
export const verifyRCDocument = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      res.status(404);
      throw new Error("Car not found");
    }
    car.rcVerified = true;
    await car.save();
    res.json({ message: "RC document verified", rcVerified: true });
  } catch (error) {
    next(error);
  }
};

/* ══════════════════════════════════════════
   ADMIN CONTROLLERS
══════════════════════════════════════════ */
export const getAdminCars = async (req, res, next) => {
  try {
    const cars = await Car.find({}).sort({ createdAt: -1 });
    res.json(cars);
  } catch (error) {
    next(error);
  }
};

export const updateAdminCar = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      res.status(404);
      throw new Error("Car not found");
    }

    applyUpdatableFields(car, req.body);
    const rcDetails = parseRcDetailsFromBody(req.body);
    if (rcDetails) {
      car.rcDetails = rcDetails;
    }

    if (req.files?.images?.length) {
      const uploadedImages = await uploadImages(req.files.images);
      car.images = [...car.images, ...uploadedImages];
    }

    if (req.files?.rcDocument?.[0]) {
      if (car.rcDocument?.publicId) await destroyRCDocument(car.rcDocument);
      car.rcDocument = await uploadRCDocument(req.files.rcDocument[0]);
      car.rcVerified = false;
    }

    const updatedCar = await car.save();
    res.json(updatedCar);
  } catch (error) {
    next(error);
  }
};

export const deleteAdminCar = async (req, res, next) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) {
      res.status(404);
      throw new Error("Car not found");
    }
    await destroyImages(car.images);
    await destroyRCDocument(car.rcDocument);
    await car.deleteOne();
    res.json({ message: "Car deleted successfully" });
  } catch (error) {
    next(error);
  }
};

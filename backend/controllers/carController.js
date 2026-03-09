import Car from "../models/Car.js";
import cloudinary from "../config/cloudinary.js";

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
      process.env.CLOUDINARY_API_KEY !== "your_api_key" &&
      process.env.CLOUDINARY_API_SECRET !== "your_api_secret"
  );

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

const uploadSingleImage = (file) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "dreamcar/cars",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    stream.end(file.buffer);
  });

const uploadImages = async (files = []) => {
  if (!files.length) return [];
  if (!hasCloudinaryConfig()) return [];
  const uploads = files.map((file) => uploadSingleImage(file));
  return Promise.all(uploads);
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
    if (value !== undefined) {
      target[key] = value;
    }
  });
};

const buildOwnerScopedQuery = (req, baseQuery = {}) => {
  if (req.user?.role === "admin") return { ...baseQuery };
  return { ...baseQuery, ownerId: req.user?.id };
};

const destroyImages = async (images = []) => {
  await Promise.all(
    images
      .filter((img) => img.publicId)
      .map((img) => cloudinary.uploader.destroy(img.publicId))
  );
};

const parseJsonFromText = (text = "") => {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const normalizeFuelType = (rawValue = "") => {
  const value = String(rawValue || "").trim().toLowerCase();
  if (!value) return "";
  if (value.includes("petrol") || value === "gasoline") return "Petrol";
  if (value.includes("diesel")) return "Diesel";
  if (value.includes("electric") || value.includes("ev")) return "Electric";
  if (value.includes("hybrid")) return "Hybrid";
  if (value.includes("cng")) return "CNG";
  if (value.includes("lpg")) return "LPG";
  return "Other";
};

const toPositiveInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  const intValue = Math.round(parsed);
  return intValue > 0 ? intValue : "";
};

const buildRcAutofill = (extracted = {}) => {
  const brand = String(extracted.brand || "").trim();
  const model = String(extracted.model || "").trim();
  const year = toPositiveInteger(extracted.year);
  const fuelType = normalizeFuelType(extracted.fuelType);

  const locationParts = [String(extracted.city || "").trim(), String(extracted.state || "").trim()].filter(Boolean);
  const location = locationParts.join(", ");

  const descriptionParts = [
    "Details extracted from RC book (verify before publishing):",
    extracted.registrationNumber ? `Registration No: ${extracted.registrationNumber}` : "",
    extracted.registrationDate ? `Registration Date: ${extracted.registrationDate}` : "",
    extracted.ownerName ? `Owner Name: ${extracted.ownerName}` : "",
    extracted.vehicleClass ? `Vehicle Class: ${extracted.vehicleClass}` : "",
    extracted.engineNumber ? `Engine No: ${extracted.engineNumber}` : "",
    extracted.chassisNumber ? `Chassis No: ${extracted.chassisNumber}` : "",
    extracted.color ? `Color: ${extracted.color}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: [year, brand, model].filter(Boolean).join(" ").trim(),
    brand,
    model,
    year,
    fuelType,
    location,
    description: descriptionParts,
  };
};

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

export const createCar = async (req, res, next) => {
  try {
    const uploadedImages = await uploadImages(req.files);

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
    });

    res.status(201).json(car);
  } catch (error) {
    next(error);
  }
};

export const extractCarFromRc = async (req, res, next) => {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      res.status(500);
      throw new Error("GEMINI_API_KEY is not configured");
    }

    if (!req.file) {
      res.status(400);
      throw new Error("RC book image is required");
    }

    const prompt = `You are an RC (Registration Certificate) OCR parser for Indian vehicles.
Read the uploaded RC book image and return ONLY valid JSON with this exact shape:
{
  "isRcBook": boolean,
  "registrationNumber": string,
  "ownerName": string,
  "brand": string,
  "model": string,
  "year": number,
  "fuelType": string,
  "registrationDate": string,
  "engineNumber": string,
  "chassisNumber": string,
  "vehicleClass": string,
  "color": string,
  "city": string,
  "state": string,
  "confidence": number,
  "notes": string
}
Rules:
- If a field is missing, use empty string for text fields, 0 for year/confidence, and false for isRcBook.
- Do not include markdown, code blocks, or extra keys.
- Try to infer brand/model correctly from RC data.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: req.file.mimetype,
                    data: req.file.buffer.toString("base64"),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      res.status(502);
      throw new Error(`Gemini request failed: ${errorBody || geminiResponse.statusText}`);
    }

    const data = await geminiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n") || "";
    const extracted = parseJsonFromText(text);

    if (!extracted) {
      res.status(502);
      throw new Error("Unable to parse Gemini RC extraction response");
    }

    const autoFill = buildRcAutofill(extracted);

    res.json({
      verified: Boolean(extracted.isRcBook),
      confidence: Number(extracted.confidence || 0),
      extracted,
      autoFill,
    });
  } catch (error) {
    next(error);
  }
};

export const getRcExtractionHealth = async (req, res, next) => {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(200).json({ connected: false, message: "GEMINI_API_KEY is not configured" });
    }

    const probe = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`,
      { method: "GET" }
    );

    if (!probe.ok) {
      const errorBody = await probe.text();
      return res.status(200).json({
        connected: false,
        message: `Gemini request failed: ${errorBody || probe.statusText}`,
      });
    }

    return res.status(200).json({ connected: true, message: "Gemini is connected" });
  } catch (error) {
    return next(error);
  }
};

export const updateCar = async (req, res, next) => {
  try {
    const query = buildOwnerScopedQuery(req, { _id: req.params.id, status: "approved" });
    const car = await Car.findOne(query);

    if (!car) {
      res.status(404);
      throw new Error("Car not found or access denied");
    }

    applyUpdatableFields(car, req.body);

    if (req.files && req.files.length) {
      const uploadedImages = await uploadImages(req.files);
      car.images = [...car.images, ...uploadedImages];
    }

    const updatedCar = await car.save();
    res.json(updatedCar);
  } catch (error) {
    next(error);
  }
};

export const deleteCar = async (req, res, next) => {
  try {
    const query = buildOwnerScopedQuery(req, { _id: req.params.id, status: "approved" });
    const car = await Car.findOne(query);

    if (!car) {
      res.status(404);
      throw new Error("Car not found or access denied");
    }

    await destroyImages(car.images);
    await car.deleteOne();

    res.json({ message: "Car deleted successfully" });
  } catch (error) {
    next(error);
  }
};

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

    if (req.files && req.files.length) {
      const uploadedImages = await uploadImages(req.files);
      car.images = [...car.images, ...uploadedImages];
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
    await car.deleteOne();

    res.json({ message: "Car deleted successfully" });
  } catch (error) {
    next(error);
  }
};

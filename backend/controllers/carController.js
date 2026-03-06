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

const destroyImages = async (images = []) => {
  await Promise.all(
    images
      .filter((img) => img.publicId)
      .map((img) => cloudinary.uploader.destroy(img.publicId))
  );
};

export const getCars = async (req, res, next) => {
  try {
    const filters = buildFilters(req.query);
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
      images: uploadedImages,
    });

    res.status(201).json(car);
  } catch (error) {
    next(error);
  }
};

export const updateCar = async (req, res, next) => {
  try {
    const car = await Car.findOne({ _id: req.params.id, status: "approved" });

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

export const deleteCar = async (req, res, next) => {
  try {
    const car = await Car.findOne({ _id: req.params.id, status: "approved" });

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

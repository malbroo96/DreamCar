import multer from "multer";

const storage = multer.memoryStorage();

/* ── Image filter (jpg/png/webp etc.) ── */
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

/* ── RC document filter (PDF, JPG, PNG only) ── */
const rcFileFilter = (req, file, cb) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("RC document must be a PDF, JPG, or PNG file"));
  }
};

/* ── Car images upload (up to 8 images) ── */
export const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
    files: 8,
  },
});

/* ── RC document upload (single file) ── */
export const uploadRC = multer({
  storage,
  fileFilter: rcFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1,
  },
});

/* ── Combined: images (up to 8) + RC document (1) ── */
export const uploadCarFiles = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).fields([
  { name: "images", maxCount: 8 },
  { name: "rcDocument", maxCount: 1 },
]);

/* ── Combined filter that validates per-field ── */
export const uploadCarFilesFiltered = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "images") {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Car images must be image files"));
      }
    } else if (file.fieldname === "rcDocument") {
      const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("RC document must be a PDF, JPG, or PNG file"));
      }
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).fields([
  { name: "images", maxCount: 8 },
  { name: "rcDocument", maxCount: 1 },
]);

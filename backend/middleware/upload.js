import multer from "multer";

const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const rcFileFilter = (req, file, cb) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("RC document must be a PDF, JPG, or PNG file"));
  }
};

export const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 8,
  },
});

export const uploadRC = multer({
  storage,
  fileFilter: rcFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

export const uploadCarFiles = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).fields([
  { name: "images", maxCount: 8 },
  { name: "rcDocument", maxCount: 1 },
]);

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

export const uploadInspectorApplicationFiles = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const docsAllowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (["experienceCertificate", "educationCertificate", "idProof"].includes(file.fieldname)) {
      if (docsAllowed.includes(file.mimetype)) return cb(null, true);
      return cb(new Error("Application documents must be PDF, JPG, or PNG files"));
    }

    if (file.fieldname === "photos") {
      if (file.mimetype.startsWith("image/")) return cb(null, true);
      return cb(new Error("Inspection photos must be image files"));
    }

    return cb(null, false);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).fields([
  { name: "experienceCertificate", maxCount: 1 },
  { name: "educationCertificate", maxCount: 1 },
  { name: "idProof", maxCount: 1 },
  { name: "photos", maxCount: 8 },
]);

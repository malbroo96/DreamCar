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
  const isImage = file.mimetype.startsWith("image/");
  const isPdf = file.mimetype === "application/pdf";
  if (isImage || isPdf) {
    cb(null, true);
  } else {
    cb(new Error("Only image or PDF files are allowed for RC upload"));
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

export const uploadRc = multer({
  storage,
  fileFilter: rcFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

import multer from "multer";

const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;

export const uploadHomestayImages = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxImageSize,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      cb(new Error("Unsupported file type. Please upload jpg, jpeg, png, or webp images only."));
      return;
    }

    cb(null, true);
  },
});

export function uploadErrorHandler(error, _req, res, next) {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ message: "Each image must be 5MB or smaller." });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({ message: error.message });
    return;
  }

  if (error?.message?.includes("Unsupported file type")) {
    res.status(400).json({ message: error.message });
    return;
  }

  next(error);
}

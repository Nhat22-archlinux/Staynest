import express from "express";
import {
  deleteHomestayImages as deleteController,
  uploadHomestayImages as uploadController,
} from "../controllers/uploadController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { uploadErrorHandler, uploadHomestayImages } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post(
  "/homestay-images",
  protect,
  requireRole("host"),
  uploadHomestayImages.array("images", 10),
  uploadErrorHandler,
  uploadController,
);

router.delete("/homestay-images", protect, requireRole("host"), deleteController);

export default router;

import express from "express";
import {
  createHomestay,
  deleteHomestay,
  getHomestayAvailability,
  getHomestayById,
  getHomestays,
  updateHomestay,
} from "../controllers/homestayController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(getHomestays).post(protect, requireRole("host"), createHomestay);
router.get("/:id/availability", getHomestayAvailability);
router.route("/:id").get(getHomestayById).put(protect, requireRole("host"), updateHomestay).delete(protect, requireRole("host"), deleteHomestay);

export default router;

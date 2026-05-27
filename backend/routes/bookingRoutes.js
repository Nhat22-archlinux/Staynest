import express from "express";
import { createBooking, getBookings, updateBookingStatus } from "../controllers/bookingController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getBookings).post(protect, createBooking);
router.patch("/:id/status", protect, requireRole("host"), updateBookingStatus);

export default router;

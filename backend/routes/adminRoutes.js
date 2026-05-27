import express from "express";
import {
  deleteAdminHomestay,
  getAdminBookings,
  getAdminHomestayById,
  getAdminHomestays,
  getAdminPayments,
  getAdminReviews,
  getAdminStats,
  getAdminUsers,
  updateAdminHomestay,
  updateAdminReview,
  updateAdminUser,
} from "../controllers/adminController.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/dashboard", getAdminStats);
router.get("/users", getAdminUsers);
router.patch("/users/:id", updateAdminUser);
router.get("/homestays", getAdminHomestays);
router.get("/homestays/:id", getAdminHomestayById);
router.patch("/homestays/:id", updateAdminHomestay);
router.delete("/homestays/:id", deleteAdminHomestay);
router.get("/bookings", getAdminBookings);
router.get("/payments", getAdminPayments);
router.get("/reviews", getAdminReviews);
router.patch("/reviews/:id", updateAdminReview);

export default router;

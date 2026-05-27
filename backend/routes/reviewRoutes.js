import express from "express";
import { createReview, getHomestayReviews, getHostReviews, replyToReview } from "../controllers/reviewController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/homestays/:homestayId", getHomestayReviews);
router.get("/host", protect, requireRole("host"), getHostReviews);
router.post("/", protect, requireRole("guest"), createReview);
router.patch("/:id/reply", protect, requireRole("host"), replyToReview);

export default router;

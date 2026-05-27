import express from "express";
import { createStripeCheckoutSession, finalizeStripeCheckoutSession } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-checkout-session", protect, createStripeCheckoutSession);
router.get("/success", protect, finalizeStripeCheckoutSession);

export default router;

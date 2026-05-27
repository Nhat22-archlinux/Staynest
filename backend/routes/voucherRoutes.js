import express from "express";
import { getMyVouchers } from "../controllers/voucherController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getMyVouchers);

export default router;

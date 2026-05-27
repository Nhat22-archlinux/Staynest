import express from "express";
import { getWishlist, removeWishlistItem, saveWishlistItem } from "../controllers/wishlistController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getWishlist);
router.post("/:homestayId", protect, requireRole("guest"), saveWishlistItem);
router.delete("/:homestayId", protect, requireRole("guest"), removeWishlistItem);

export default router;

import mongoose from "mongoose";
import { Wishlist } from "../models/Wishlist.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

async function getOrCreateWishlist(userId) {
  return Wishlist.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, homestays: [] } },
    { upsert: true, new: true },
  ).populate("homestays");
}

export const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user._id);
  res.json(wishlist.homestays);
});

export const saveWishlistItem = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.homestayId)) {
    res.status(400);
    throw new Error("Invalid homestay id");
  }

  await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $addToSet: { homestays: req.params.homestayId }, $setOnInsert: { user: req.user._id } },
    { upsert: true, new: true },
  );

  const wishlist = await getOrCreateWishlist(req.user._id);
  res.status(201).json(wishlist.homestays);
});

export const removeWishlistItem = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.homestayId)) {
    res.status(400);
    throw new Error("Invalid homestay id");
  }

  await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { homestays: req.params.homestayId } },
    { new: true },
  );

  const wishlist = await getOrCreateWishlist(req.user._id);
  res.json(wishlist.homestays);
});

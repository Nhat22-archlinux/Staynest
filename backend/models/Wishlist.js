import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    homestays: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Homestay",
      },
    ],
  },
  { timestamps: true },
);

export const Wishlist = mongoose.model("Wishlist", wishlistSchema);

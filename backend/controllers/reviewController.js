import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Homestay } from "../models/Homestay.js";
import { Review } from "../models/Review.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { createNotification } from "./notificationController.js";
import { publicHomestayPath } from "../utils/slug.js";

async function updateHomestayRating(homestayId) {
  const reviews = await Review.find({ homestay: homestayId, isHidden: { $ne: true } });
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount : 0;

  await Homestay.findByIdAndUpdate(homestayId, {
    rating: Number(averageRating.toFixed(2)),
    reviews: reviewCount,
  });
}

export const getHomestayReviews = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.homestayId)) {
    res.status(400);
    throw new Error("Invalid homestay id");
  }

  const reviews = await Review.find({ homestay: req.params.homestayId, isHidden: { $ne: true } }).sort({ createdAt: -1 });
  res.json(reviews);
});

export const getHostReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ host: req.user._id }).populate("homestay").sort({ createdAt: -1 });
  res.json(reviews);
});

export const createReview = asyncHandler(async (req, res) => {
  const { homestayId, bookingId, rating, comment } = req.body;

  if (req.user.role !== "guest") {
    res.status(403);
    throw new Error("Only guest users can leave reviews");
  }

  if (!mongoose.Types.ObjectId.isValid(homestayId) || !mongoose.Types.ObjectId.isValid(bookingId)) {
    res.status(400);
    throw new Error("Invalid review data");
  }

  const homestay = await Homestay.findById(homestayId);
  if (!homestay) {
    res.status(404);
    throw new Error("Homestay not found");
  }

  if (homestay.owner?.equals(req.user._id)) {
    res.status(403);
    throw new Error("Hosts cannot review their own homestays");
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    user: req.user._id,
    homestay: homestayId,
  });

  if (!booking) {
    res.status(403);
    throw new Error("Only guests who booked this homestay can leave a review");
  }

  if (booking.reviewed) {
    res.status(409);
    throw new Error("This booking has already been reviewed");
  }

  if (booking.status !== "completed") {
    res.status(403);
    throw new Error("Only completed stays can be reviewed");
  }

  const review = await Review.create({
    homestay: homestayId,
    booking: bookingId,
    user: req.user._id,
    host: homestay.owner,
    userName: req.user.name,
    rating,
    comment,
  });

  booking.reviewed = true;
  await booking.save();
  await updateHomestayRating(homestayId);
  await createNotification({
    user: homestay.owner,
    type: "new_review",
    message: `New review for ${homestay.title}`,
    messageEn: `New review for ${homestay.title}`,
    messageVi: `Có đánh giá mới cho ${homestay.title}`,
    link: `/host/homestays/${homestay._id}#reviews`,
    entityType: "review",
    entityId: String(review._id),
    homestay: homestay._id,
    booking: booking._id,
    review: review._id,
  });

  res.status(201).json(review);
});

export const replyToReview = asyncHandler(async (req, res) => {
  const { comment } = req.body;

  if (req.user.role !== "host") {
    res.status(403);
    throw new Error("Only hosts can reply to reviews");
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error("Invalid review id");
  }

  if (!comment?.trim()) {
    res.status(400);
    throw new Error("Reply comment is required");
  }

  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  const homestay = await Homestay.findById(review.homestay);
  if (!homestay?.owner?.equals(req.user._id)) {
    res.status(403);
    throw new Error("You can only reply to reviews on your own listings");
  }

  review.hostReply = {
    comment: comment.trim(),
    createdAt: new Date(),
  };
  await review.save();

  await createNotification({
    user: review.user,
    type: "host_replied_review",
    message: "The host replied to your review.",
    messageEn: "The host replied to your review.",
    messageVi: "Chủ nhà đã phản hồi đánh giá của bạn.",
    link: `${publicHomestayPath(homestay)}#reviews`,
    entityType: "review",
    entityId: String(review._id),
    homestay: homestay._id,
    review: review._id,
  });

  res.json(review);
});

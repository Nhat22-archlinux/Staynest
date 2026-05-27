import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Homestay } from "../models/Homestay.js";
import { Review } from "../models/Review.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

function textQuery(value) {
  return value ? { $regex: value, $options: "i" } : undefined;
}

export const getAdminStats = asyncHandler(async (_req, res) => {
  const { start, end } = monthRange();
  const [
    totalUsers,
    totalHosts,
    totalHomestays,
    totalBookings,
    pendingBookings,
    lowRatedListings,
    revenueRows,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "host" }),
    Homestay.countDocuments(),
    Booking.countDocuments(),
    Booking.countDocuments({ status: "pending" }),
    Homestay.find({ $or: [{ rating: { $lt: 4 } }, { isHidden: true }] }).limit(10).sort({ rating: 1 }),
    Booking.aggregate([
      {
        $match: {
          status: "completed",
          paymentStatus: "paid",
          updatedAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $ifNull: ["$finalTotal", "$totalPriceUsd"] } },
        },
      },
    ]),
  ]);

  res.json({
    totalUsers,
    totalHosts,
    totalHomestays,
    totalBookings,
    pendingBookings,
    monthlyPlatformRevenue: Number(revenueRows[0]?.revenue ?? 0),
    lowRatedListings,
  });
});

export const getAdminUsers = asyncHandler(async (req, res) => {
  const query = {};
  if (["guest", "host", "admin"].includes(req.query.role)) {
    query.role = req.query.role;
  }

  const search = textQuery(req.query.search);
  if (search) {
    query.$or = [{ name: search }, { email: search }];
  }

  const users = await User.find(query).select("-password -verificationCodeHash -resetPasswordCodeHash").sort({ createdAt: -1 });
  res.json(users);
});

export const updateAdminUser = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error("Invalid user id");
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (typeof req.body.isDisabled === "boolean") {
    if (user._id.equals(req.user._id) && req.body.isDisabled) {
      res.status(400);
      throw new Error("Admins cannot disable their own account");
    }
    user.isDisabled = req.body.isDisabled;
  }

  if (req.body.role) {
    if (!["guest", "host", "admin"].includes(req.body.role)) {
      res.status(400);
      throw new Error("Invalid role");
    }
    user.role = req.body.role;
  }

  await user.save();
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isDisabled: user.isDisabled,
    authProvider: user.authProvider,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  });
});

export const getAdminHomestays = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.host && mongoose.Types.ObjectId.isValid(req.query.host)) {
    query.owner = req.query.host;
  }

  const location = textQuery(req.query.location);
  if (location) {
    query.location = location;
  }

  if (req.query.status === "hidden") {
    query.isHidden = true;
  } else if (req.query.status === "visible") {
    query.isHidden = { $ne: true };
  }

  const homestays = await Homestay.find(query).populate("owner", "name email role").sort({ createdAt: -1 });
  res.json(homestays);
});

export const getAdminHomestayById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error("Invalid homestay id");
  }

  const homestay = await Homestay.findById(req.params.id).populate("owner", "name email role");
  if (!homestay) {
    res.status(404);
    throw new Error("Homestay not found");
  }

  res.json(homestay);
});

export const updateAdminHomestay = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error("Invalid homestay id");
  }

  const updates = {};
  if (typeof req.body.isHidden === "boolean") {
    updates.isHidden = req.body.isHidden;
  }

  const homestay = await Homestay.findByIdAndUpdate(req.params.id, updates, { new: true }).populate("owner", "name email role");
  if (!homestay) {
    res.status(404);
    throw new Error("Homestay not found");
  }

  res.json(homestay);
});

export const deleteAdminHomestay = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error("Invalid homestay id");
  }

  const homestay = await Homestay.findById(req.params.id);
  if (!homestay) {
    res.status(404);
    throw new Error("Homestay not found");
  }

  await homestay.deleteOne();
  res.json({ message: "Homestay deleted" });
});

export const getAdminBookings = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.status) {
    query.status = req.query.status;
  }
  if (req.query.paymentStatus) {
    query.paymentStatus = req.query.paymentStatus;
  }

  const bookings = await Booking.find(query)
    .populate("user", "name email role")
    .populate("host", "name email role")
    .populate("homestay", "title location")
    .sort({ createdAt: -1 });
  res.json(bookings);
});

export const getAdminPayments = asyncHandler(async (req, res) => {
  const query = {};
  if (["paid", "unpaid", "refunded"].includes(req.query.paymentStatus)) {
    query.paymentStatus = req.query.paymentStatus;
  }

  const payments = await Booking.find(query)
    .select("bookingCode paymentMethod paymentStatus stripeSessionId totalPriceUsd finalTotal discountAmount voucherCode status createdAt user host homestay homestayTitle")
    .populate("user", "name email")
    .populate("host", "name email")
    .populate("homestay", "title")
    .sort({ createdAt: -1 });
  res.json(payments);
});

export const getAdminReviews = asyncHandler(async (_req, res) => {
  const reviews = await Review.find()
    .populate("user", "name email")
    .populate("host", "name email")
    .populate("homestay", "title location")
    .sort({ createdAt: -1 });
  res.json(reviews);
});

export const updateAdminReview = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error("Invalid review id");
  }

  const updates = {};
  if (typeof req.body.isHidden === "boolean") {
    updates.isHidden = req.body.isHidden;
  }

  const review = await Review.findByIdAndUpdate(req.params.id, updates, { new: true })
    .populate("user", "name email")
    .populate("host", "name email")
    .populate("homestay", "title location");

  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  res.json(review);
});

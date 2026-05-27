import mongoose from "mongoose";
import { Homestay } from "../models/Homestay.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getDateRangeAvailability, hasValidDateRange } from "../utils/availability.js";

function sanitizeDiscount(discount) {
  if (!discount || discount.type === "none") {
    return { type: "none", percent: 0, isActive: false, schedules: [] };
  }

  if (discount.type === "manual") {
    const percent = Math.min(Math.max(Number(discount.percent) || 0, 0), 95);

    return {
      type: "manual",
      percent,
      isActive: percent > 0,
      schedules: [],
    };
  }

  const schedules = Array.isArray(discount.schedules)
    ? discount.schedules
    : Array.isArray(discount.ranges)
      ? discount.ranges
      : [];
  const cleanedSchedules = schedules
    .filter((schedule) => schedule.startAt && schedule.endAt && Number(schedule.percent) > 0)
    .map((schedule) => ({
      startAt: schedule.startAt,
      endAt: schedule.endAt,
      percent: Math.min(Math.max(Number(schedule.percent) || 0, 0), 95),
    }));

  return {
    type: "scheduled",
    percent: 0,
    isActive: cleanedSchedules.length > 0,
    schedules: cleanedSchedules,
  };
}

function positiveNumber(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function homestayPayload(body) {
  return {
    title: body.title,
    location: body.location,
    area: body.area,
    price: body.price,
    rating: body.rating,
    reviews: body.reviews,
    guests: body.guests,
    beds: body.beds,
    baths: body.baths,
    totalRooms: positiveNumber(body.totalRooms, 1),
    availableRooms: Math.min(nonNegativeNumber(body.availableRooms, 1), positiveNumber(body.totalRooms, 1)),
    image: body.image,
    gallery: body.gallery,
    amenities: body.amenities,
    type: body.type,
    description: body.description,
    discount: sanitizeDiscount(body.discount),
  };
}

export const getHomestays = asyncHandler(async (_req, res) => {
  const homestays = await Homestay.find({ isHidden: { $ne: true } }).sort({ createdAt: -1 });
  res.json(homestays);
});

export const getHomestayById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error("Invalid homestay id");
  }

  const homestay = await Homestay.findById(req.params.id);

  if (!homestay) {
    res.status(404);
    throw new Error("Homestay not found");
  }

  res.json(homestay);
});

export const getHomestayAvailability = asyncHandler(async (req, res) => {
  const { checkIn, checkOut } = req.query;

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error("Invalid homestay id");
  }

  if (!hasValidDateRange(checkIn, checkOut)) {
    res.status(400);
    throw new Error("Check-out must be after check-in");
  }

  const homestay = await Homestay.findById(req.params.id);
  if (!homestay) {
    res.status(404);
    throw new Error("Homestay not found");
  }

  const availability = await getDateRangeAvailability({ homestay, checkIn, checkOut });
  res.json({
    homestayId: homestay._id,
    totalRooms: homestay.totalRooms,
    availableRooms: homestay.availableRooms,
    ...availability,
  });
});

export const createHomestay = asyncHandler(async (req, res) => {
  const homestay = await Homestay.create({
    ...homestayPayload(req.body),
    owner: req.user._id,
    host: req.user.name,
  });
  res.status(201).json(homestay);
});

export const updateHomestay = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error("Invalid homestay id");
  }

  const existingHomestay = await Homestay.findById(req.params.id);

  if (!existingHomestay) {
    res.status(404);
    throw new Error("Homestay not found");
  }

  if (!existingHomestay.owner?.equals(req.user._id)) {
    res.status(403);
    throw new Error("You can only edit your own listings");
  }

  const homestay = await Homestay.findByIdAndUpdate(req.params.id, homestayPayload(req.body), {
    new: true,
    runValidators: true,
  });

  if (!homestay) {
    res.status(404);
    throw new Error("Homestay not found");
  }

  res.json(homestay);
});

export const deleteHomestay = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error("Invalid homestay id");
  }

  const homestay = await Homestay.findById(req.params.id);

  if (!homestay) {
    res.status(404);
    throw new Error("Homestay not found");
  }

  if (!homestay.owner?.equals(req.user._id)) {
    res.status(403);
    throw new Error("You can only delete your own listings");
  }

  await homestay.deleteOne();

  res.json({ message: "Homestay deleted" });
});

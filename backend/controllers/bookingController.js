import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Homestay } from "../models/Homestay.js";
import { Voucher } from "../models/Voucher.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { createNotification } from "./notificationController.js";
import { awardCompletedStayVoucher } from "./voucherController.js";
import { getDateRangeAvailability, hasValidDateRange } from "../utils/availability.js";

function generateBookingCode() {
  return `SN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function finalAmount(booking) {
  return typeof booking.finalTotal === "number" ? booking.finalTotal : booking.totalPriceUsd;
}

async function findDuplicateBooking({ userId, clientBookingRequestId, homestayId, checkIn, checkOut, guests, paymentMethod }) {
  if (clientBookingRequestId) {
    return Booking.findOne({ user: userId, clientBookingRequestId });
  }

  return Booking.findOne({
    user: userId,
    homestay: homestayId,
    checkIn: new Date(checkIn),
    checkOut: new Date(checkOut),
    guests: Number(guests),
    paymentMethod,
    status: "pending",
    createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
  });
}

export const createBooking = asyncHandler(async (req, res) => {
  const {
    homestayId,
    homestayTitle,
    guestName,
    checkIn,
    checkOut,
    guests,
    nights,
    totalPriceUsd,
    voucherCode,
    paymentMethod = "pay_at_property",
    clientBookingRequestId,
  } = req.body;
  let voucher;
  let voucherPercent = 0;
  let discountAmount = 0;
  let finalTotal = Number(totalPriceUsd);

  if (req.user.role !== "guest") {
    res.status(403);
    throw new Error("Only guest users can create bookings");
  }

  if (!homestayId || !mongoose.Types.ObjectId.isValid(homestayId)) {
    res.status(400);
    throw new Error("A valid homestay is required to create a booking");
  }

  const homestay = await Homestay.findById(homestayId);
  if (!homestay) {
    res.status(404);
    throw new Error("Homestay not found");
  }

  if (homestay.owner?.equals(req.user._id)) {
    res.status(403);
    throw new Error("Hosts cannot book their own homestays");
  }

  if (Number(homestay.availableRooms ?? 1) <= 0) {
    res.status(409);
    throw new Error("No rooms are currently available for this homestay");
  }

  if (!hasValidDateRange(checkIn, checkOut)) {
    res.status(400);
    throw new Error("Check-out must be after check-in");
  }

  const availability = await getDateRangeAvailability({ homestay, checkIn, checkOut });
  if (availability.availableForDateRange <= 0) {
    res.status(409);
    throw new Error("No rooms available for selected dates");
  }

  if (!["pay_at_property", "card"].includes(paymentMethod)) {
    res.status(400);
    throw new Error("Invalid payment method");
  }

  if (paymentMethod === "card") {
    res.status(400);
    throw new Error("Card bookings must be created through Stripe Checkout");
  }

  const duplicateBooking = await findDuplicateBooking({
    userId: req.user._id,
    clientBookingRequestId,
    homestayId: homestay._id,
    checkIn,
    checkOut,
    guests,
    paymentMethod,
  });
  if (duplicateBooking) {
    res.json(duplicateBooking);
    return;
  }

  if (voucherCode?.trim()) {
    voucher = await Voucher.findOne({
      code: voucherCode.trim().toUpperCase(),
      owner: req.user._id,
    });

    if (!voucher) {
      res.status(404);
      throw new Error("Voucher not found for this account");
    }

    if (voucher.isUsed) {
      res.status(409);
      throw new Error("Voucher has already been used");
    }

    if (voucher.expiresAt < new Date()) {
      res.status(410);
      throw new Error("Voucher has expired");
    }

    voucherPercent = Number(voucher.percent);
    discountAmount = Number(((Number(totalPriceUsd) * voucherPercent) / 100).toFixed(2));
    finalTotal = Math.max(Number((Number(totalPriceUsd) - discountAmount).toFixed(2)), 0);
  }

  const booking = await Booking.create({
    homestay: homestay._id,
    homestayTitle: homestay.title ?? homestayTitle,
    guestName: req.user.name ?? guestName,
    checkIn,
    checkOut,
    guests,
    nights,
    totalPriceUsd,
    user: req.user._id,
    host: homestay.owner,
    status: "pending",
    bookingCode: generateBookingCode(),
    paymentMethod,
    paymentStatus: "unpaid",
    voucherCode: voucher?.code,
    voucherPercent,
    discountAmount,
    finalTotal,
    clientBookingRequestId,
  });

  if (voucher) {
    voucher.isUsed = true;
    voucher.usedForBooking = booking._id;
    await voucher.save();
  }

  await createNotification({
    user: booking.user,
    type: "booking_created",
    message: `Booking created. Your booking code is ${booking.bookingCode}. Payment will be collected at property.`,
    messageEn: `Booking created. Your booking code is ${booking.bookingCode}. Payment will be collected at property.`,
    messageVi: `Đặt phòng thành công. Mã đặt phòng của bạn là ${booking.bookingCode}. Thanh toán sẽ được thu khi nhận phòng.`,
    homestay: homestay._id,
    booking: booking._id,
    link: "/booking-history",
    entityType: "booking",
    entityId: String(booking._id),
  });

  await createNotification({
    user: homestay.owner,
    type: "new_pending_booking",
    message: "New booking request received.",
    messageEn: "New booking request received.",
    messageVi: "Bạn có yêu cầu đặt phòng mới.",
    homestay: homestay._id,
    booking: booking._id,
    link: `/host/homestays/${homestay._id}`,
    entityType: "booking",
    entityId: String(booking._id),
  });

  res.status(201).json(booking);
});

export const getBookings = asyncHandler(async (req, res) => {
  const query = req.user.role === "host" ? { host: req.user._id } : { user: req.user._id };
  const bookings = await Booking.find(query).populate("homestay").sort({ createdAt: -1 });
  res.json(bookings);
});

export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ["confirmed", "rejected", "completed", "cancelled"];

  if (!allowedStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid booking status");
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error("Invalid booking id");
  }

  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  if (!booking.host?.equals(req.user._id)) {
    res.status(403);
    throw new Error("You can only manage bookings for your own listings");
  }

  const homestay = booking.homestay ? await Homestay.findById(booking.homestay) : null;
  if (status === "completed" && booking.status !== "confirmed") {
    res.status(400);
    throw new Error("Only confirmed bookings can be marked completed");
  }

  if (status === "rejected" && booking.status !== "pending") {
    res.status(400);
    throw new Error("Only pending bookings can be rejected");
  }

  if (status === "confirmed" && booking.status !== "confirmed") {
    if (homestay && Number(homestay.availableRooms ?? 0) <= 0) {
      res.status(409);
      throw new Error("No rooms are currently available for this homestay");
    }

    if (homestay) {
      const availability = await getDateRangeAvailability({
        homestay,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        excludeBookingId: booking._id,
      });

      if (availability.availableForDateRange <= 0) {
        res.status(409);
        throw new Error("No rooms available for selected dates");
      }
    }
  }

  booking.bookingCode = booking.bookingCode || generateBookingCode();
  booking.paymentMethod = booking.paymentMethod || "pay_at_property";
  booking.paymentStatus = booking.paymentStatus || (booking.paymentMethod === "card" ? "paid" : "unpaid");
  booking.finalTotal = finalAmount(booking);
  booking.status = status;
  if (status === "completed" && booking.paymentMethod === "pay_at_property") {
    booking.paymentStatus = "paid";
  }
  await booking.save();

  await createNotification({
    user: booking.user,
    type: `booking_${status}`,
    message: `Your booking for ${booking.homestayTitle} is ${status}`,
    messageEn: `Your booking for ${booking.homestayTitle} is ${status}`,
    messageVi: `Đặt phòng ${booking.homestayTitle} của bạn đã được cập nhật: ${status}`,
    homestay: booking.homestay,
    booking: booking._id,
    link: "/booking-history",
    entityType: "booking",
    entityId: String(booking._id),
  });

  if (status === "completed") {
    await awardCompletedStayVoucher({ user: booking.user, booking: booking._id });
    await createNotification({
      user: booking.user,
      type: "voucher_awarded",
      message: "You received a 5% voucher for your next booking.",
      messageEn: "You received a 5% voucher for your next booking.",
      messageVi: "Bạn đã nhận được voucher giảm 5% cho lần đặt phòng tiếp theo.",
      homestay: booking.homestay,
      booking: booking._id,
      link: "/account",
      entityType: "voucher",
      entityId: String(booking._id),
    });
  }

  if (status === "cancelled") {
    await createNotification({
      user: booking.host,
      type: "booking_cancelled",
      message: `Booking cancelled for ${booking.homestayTitle}`,
      messageEn: `Booking cancelled for ${booking.homestayTitle}`,
      messageVi: `Đặt phòng đã bị hủy cho ${booking.homestayTitle}`,
      homestay: booking.homestay,
      booking: booking._id,
      link: booking.homestay ? `/host/homestays/${booking.homestay}` : "/host/dashboard",
      entityType: "booking",
      entityId: String(booking._id),
    });
  }

  const updatedBooking = await Booking.findById(booking._id).populate("homestay");
  res.json(updatedBooking);
});

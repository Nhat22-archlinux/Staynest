import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Homestay } from "../models/Homestay.js";
import { Voucher } from "../models/Voucher.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getStripe } from "../config/stripe.js";
import { createNotification } from "./notificationController.js";
import { getFrontendUrl } from "../utils/env.js";
import { getDateRangeAvailability, hasValidDateRange } from "../utils/availability.js";

function generateBookingCode() {
  return `SN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function calculateVoucherTotals({ voucherCode, userId, totalPriceUsd }) {
  let voucher;
  let voucherPercent = 0;
  let discountAmount = 0;
  let finalTotal = Number(totalPriceUsd);

  if (voucherCode?.trim()) {
    voucher = await Voucher.findOne({
      code: voucherCode.trim().toUpperCase(),
      owner: userId,
    });

    if (!voucher) {
      const error = new Error("Voucher not found for this account");
      error.statusCode = 404;
      throw error;
    }

    if (voucher.isUsed) {
      const error = new Error("Voucher has already been used");
      error.statusCode = 409;
      throw error;
    }

    if (voucher.expiresAt < new Date()) {
      const error = new Error("Voucher has expired");
      error.statusCode = 410;
      throw error;
    }

    voucherPercent = Number(voucher.percent);
    discountAmount = Number(((Number(totalPriceUsd) * voucherPercent) / 100).toFixed(2));
    finalTotal = Math.max(Number((Number(totalPriceUsd) - discountAmount).toFixed(2)), 0);
  }

  return { voucher, voucherPercent, discountAmount, finalTotal };
}

function applyThrownStatus(error, res) {
  if (error.statusCode) {
    res.status(error.statusCode);
  }
}

export const createStripeCheckoutSession = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    res.status(500);
    throw new Error("Stripe is not configured");
  }

  if (req.user.role !== "guest") {
    res.status(403);
    throw new Error("Only guest users can create bookings");
  }

  const { homestayId, homestayTitle, checkIn, checkOut, guests, nights, totalPriceUsd, voucherCode, frontendOrigin, clientBookingRequestId } = req.body;

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

  let totals;
  try {
    totals = await calculateVoucherTotals({ voucherCode, userId: req.user._id, totalPriceUsd });
  } catch (error) {
    applyThrownStatus(error, res);
    throw error;
  }

  const frontendUrl = getFrontendUrl(frontendOrigin);
  const amountCents = Math.max(Math.round(totals.finalTotal * 100), 50);
  const successUrl = `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${frontendUrl}/payment/cancel`;

  if (process.env.NODE_ENV !== "production") {
    console.info(`[StayNest] Stripe successUrl: ${successUrl}`);
    console.info(`[StayNest] Stripe cancelUrl: ${cancelUrl}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    client_reference_id: String(req.user._id),
    customer_email: req.user.email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: homestay.title || homestayTitle || "StayNest booking",
            description: `${nights} night(s), ${guests} guest(s)`,
          },
        },
      },
    ],
    metadata: {
      userId: String(req.user._id),
      hostId: String(homestay.owner),
      homestayId: String(homestay._id),
      homestayTitle: homestay.title || homestayTitle || "StayNest booking",
      guestName: req.user.name,
      checkIn,
      checkOut,
      guests: String(guests),
      nights: String(nights),
      totalPriceUsd: String(totalPriceUsd),
      voucherCode: totals.voucher?.code ?? "",
      voucherPercent: String(totals.voucherPercent),
      discountAmount: String(totals.discountAmount),
      finalTotal: String(totals.finalTotal),
      clientBookingRequestId: clientBookingRequestId ?? "",
    },
  });

  res.status(201).json({ sessionId: session.id, url: session.url });
});

export const finalizeStripeCheckoutSession = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    res.status(500);
    throw new Error("Stripe is not configured");
  }

  const { session_id: sessionId } = req.query;
  if (!sessionId) {
    res.status(400);
    throw new Error("Stripe session id is required");
  }

  const existingBooking = await Booking.findOne({ stripeSessionId: sessionId });
  if (existingBooking) {
    if (!existingBooking.user?.equals(req.user._id)) {
      res.status(403);
      throw new Error("This payment session does not belong to the logged-in user");
    }

    res.json(existingBooking);
    return;
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    res.status(402);
    throw new Error("Stripe payment has not been completed");
  }

  if (String(session.client_reference_id) !== String(req.user._id)) {
    res.status(403);
    throw new Error("This payment session does not belong to the logged-in user");
  }

  const metadata = session.metadata ?? {};
  const homestay = await Homestay.findById(metadata.homestayId);
  if (!homestay) {
    res.status(404);
    throw new Error("Homestay not found");
  }

  if (Number(homestay.availableRooms ?? 1) <= 0) {
    res.status(409);
    throw new Error("No rooms are currently available for this homestay");
  }

  const availability = await getDateRangeAvailability({
    homestay,
    checkIn: metadata.checkIn,
    checkOut: metadata.checkOut,
  });
  if (availability.availableForDateRange <= 0) {
    res.status(409);
    throw new Error("No rooms available for selected dates");
  }

  let booking;
  try {
    booking = await Booking.create({
      homestay: homestay._id,
      user: req.user._id,
      host: homestay.owner,
      homestayTitle: metadata.homestayTitle || homestay.title,
      guestName: metadata.guestName || req.user.name,
      checkIn: metadata.checkIn,
      checkOut: metadata.checkOut,
      guests: Number(metadata.guests),
      nights: Number(metadata.nights),
      totalPriceUsd: Number(metadata.totalPriceUsd),
      bookingCode: generateBookingCode(),
      paymentMethod: "card",
      paymentStatus: "paid",
      stripeSessionId: session.id,
      status: "pending",
      voucherCode: metadata.voucherCode || undefined,
      voucherPercent: Number(metadata.voucherPercent ?? 0),
      discountAmount: Number(metadata.discountAmount ?? 0),
      finalTotal: Number(metadata.finalTotal ?? metadata.totalPriceUsd),
      clientBookingRequestId: metadata.clientBookingRequestId || undefined,
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateBooking = await Booking.findOne({ stripeSessionId: session.id });
      if (duplicateBooking) {
        res.json(duplicateBooking);
        return;
      }
    }

    throw error;
  }

  if (metadata.voucherCode) {
    const voucher = await Voucher.findOne({ code: metadata.voucherCode, owner: req.user._id });
    if (voucher && !voucher.isUsed) {
      voucher.isUsed = true;
      voucher.usedForBooking = booking._id;
      await voucher.save();
    }
  }

  await createNotification({
    user: booking.user,
    type: "payment_successful",
    message: `Payment successful. Your booking code is ${booking.bookingCode}`,
    messageEn: `Payment successful. Your booking code is ${booking.bookingCode}`,
    messageVi: `Thanh toán thành công. Mã đặt phòng của bạn là ${booking.bookingCode}`,
    link: "/booking-history",
    entityType: "booking",
    entityId: String(booking._id),
    homestay: booking.homestay,
    booking: booking._id,
  });

  await createNotification({
    user: booking.host,
    type: "new_pending_booking",
    message: "New booking request received",
    messageEn: "New booking request received",
    messageVi: "Bạn có yêu cầu đặt phòng mới",
    link: `/host/homestays/${booking.homestay}`,
    entityType: "booking",
    entityId: String(booking._id),
    homestay: booking.homestay,
    booking: booking._id,
  });

  res.status(201).json(booking);
});

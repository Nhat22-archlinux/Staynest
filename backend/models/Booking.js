import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    homestay: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Homestay",
      required: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    homestayTitle: {
      type: String,
      required: true,
      trim: true,
    },
    guestName: {
      type: String,
      default: "Guest",
      trim: true,
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },
    guests: {
      type: Number,
      required: true,
      min: 1,
    },
    nights: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPriceUsd: {
      type: Number,
      required: true,
      min: 0,
    },
    bookingCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ["pay_at_property", "card"],
      default: "pay_at_property",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    stripeSessionId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    clientBookingRequestId: {
      type: String,
      trim: true,
    },
    voucherCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    voucherPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalTotal: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "completed", "cancelled", "expired"],
      default: "pending",
    },
    reviewed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

bookingSchema.index(
  { user: 1, clientBookingRequestId: 1 },
  { unique: true, partialFilterExpression: { clientBookingRequestId: { $exists: true } } },
);

export const Booking = mongoose.model("Booking", bookingSchema);

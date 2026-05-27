import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    messageEn: {
      type: String,
      trim: true,
    },
    messageVi: {
      type: String,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    homestay: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Homestay",
      required: false,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
    },
    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      required: false,
    },
    link: {
      type: String,
      trim: true,
    },
    entityType: {
      type: String,
      trim: true,
    },
    entityId: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

export const Notification = mongoose.model("Notification", notificationSchema);

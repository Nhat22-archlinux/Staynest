import { Notification } from "../models/Notification.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export async function createNotification({ user, type, message, messageEn, messageVi, homestay, booking, review, link, entityType, entityId, metadata }) {
  if (!user) {
    return null;
  }

  return Notification.create({ user, type, message, messageEn, messageVi, homestay, booking, review, link, entityType, entityId, metadata });
}

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json(notifications);
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true },
  );

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  res.json(notification);
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json(notifications);
});

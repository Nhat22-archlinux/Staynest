import { Booking } from "../models/Booking.js";

const BLOCKING_STATUSES = ["confirmed", "completed"];

export function hasValidDateRange(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end;
}

export async function getDateRangeAvailability({ homestay, checkIn, checkOut, excludeBookingId }) {
  if (!hasValidDateRange(checkIn, checkOut)) {
    return {
      availableForDateRange: Number(homestay.availableRooms ?? homestay.totalRooms ?? 0),
      overlappingBookingsCount: 0,
      isValidDateRange: false,
    };
  }

  const query = {
    homestay: homestay._id,
    status: { $in: BLOCKING_STATUSES },
    checkIn: { $lt: new Date(checkOut) },
    checkOut: { $gt: new Date(checkIn) },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const overlappingBookingsCount = await Booking.countDocuments(query);
  const onlineRooms = Number(homestay.availableRooms ?? homestay.totalRooms ?? 0);

  return {
    availableForDateRange: Math.max(onlineRooms - overlappingBookingsCount, 0),
    overlappingBookingsCount,
    isValidDateRange: true,
  };
}

import { Homestay } from "../models/Homestay.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { createSlug } from "../utils/slug.js";

function fallbackHostId(homestay) {
  if (homestay.owner) {
    return String(homestay.owner);
  }

  return `host-${createSlug(homestay.host || "staynest")}`;
}

export const getHomestaysSitemap = asyncHandler(async (_req, res) => {
  const homestays = await Homestay.find({
    isHidden: { $ne: true },
    isDeleted: { $ne: true },
    deleted: { $ne: true },
    isApproved: { $ne: false },
    status: { $nin: ["hidden", "deleted", "draft", "unapproved", "rejected"] },
  })
    .select("_id title location area owner host updatedAt slug")
    .sort({ updatedAt: -1 })
    .lean();

  res.json(
    homestays.map((homestay) => ({
      id: String(homestay._id),
      title: homestay.title,
      location: homestay.location,
      area: homestay.area,
      hostId: fallbackHostId(homestay),
      updatedAt: homestay.updatedAt,
      slug: homestay.slug || createSlug(homestay.title),
    })),
  );
});

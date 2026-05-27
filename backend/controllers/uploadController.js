import { cloudinary } from "../config/cloudinary.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

function uploadBuffer(fileBuffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "staynest/homestays",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    stream.end(fileBuffer);
  });
}

function publicIdFromCloudinaryUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") {
    return null;
  }

  try {
    const url = new URL(imageUrl);
    if (!url.hostname.includes("res.cloudinary.com")) {
      return null;
    }

    const decodedPath = decodeURIComponent(url.pathname);
    const folderIndex = decodedPath.indexOf("/staynest/homestays/");
    if (folderIndex === -1) {
      return null;
    }

    const publicIdWithExtension = decodedPath.slice(folderIndex + 1);
    return publicIdWithExtension.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
}

export const uploadHomestayImages = asyncHandler(async (req, res) => {
  if (!req.files?.length) {
    res.status(400);
    throw new Error("Please select at least one image to upload.");
  }

  const uploads = await Promise.all(req.files.map((file) => uploadBuffer(file.buffer)));
  const images = uploads.map((image) => ({
    url: cloudinary.url(image.public_id, {
      secure: true,
      transformation: [{ fetch_format: "auto", quality: "auto" }],
    }),
    publicId: image.public_id,
  }));

  res.status(201).json({ images });
});

export const deleteHomestayImages = asyncHandler(async (req, res) => {
  const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
  const publicIds = Array.isArray(req.body?.publicIds) ? req.body.publicIds : [];
  const derivedPublicIds = urls.map(publicIdFromCloudinaryUrl).filter(Boolean);
  const idsToDelete = [...new Set([...publicIds, ...derivedPublicIds])];

  if (idsToDelete.length === 0) {
    res.json({ deleted: [] });
    return;
  }

  const deleted = await Promise.all(
    idsToDelete.map(async (publicId) => ({
      publicId,
      result: await cloudinary.uploader.destroy(publicId, { resource_type: "image" }),
    })),
  );

  res.json({ deleted });
});

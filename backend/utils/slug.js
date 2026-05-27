export function createSlug(title = "homestay") {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "homestay";
}

export function publicHomestayPath(homestay) {
  return `/hosts/${homestay.owner}/homestays/${homestay._id}/${createSlug(homestay.title)}`;
}

export function createSlug(title = "homestay") {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "homestay";
}

export function publicHomestayPath(homestay) {
  const hostId = homestay.owner || `host-${createSlug(homestay.host || "staynest")}`;
  return `/hosts/${encodeURIComponent(String(hostId))}/homestays/${encodeURIComponent(String(homestay._id))}/${createSlug(homestay.title)}`;
}

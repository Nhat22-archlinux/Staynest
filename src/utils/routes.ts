import type { Homestay } from "../types";

const legacyHomestayRoute = /^\/homestays\/([^/]+)$/;
const hostHomestayRoute = /^\/hosts\/([^/]+)\/homestays\/([^/]+)(?:\/([^/]+))?$/;

export function createSlug(title: string) {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "homestay";
}

export function getHomestayRoute(stay: Homestay) {
  const hostId = stay.owner || `host-${encodeURIComponent(stay.host.toLowerCase().replace(/\s+/g, "-"))}`;
  return `/hosts/${hostId}/homestays/${stay.id}/${createSlug(stay.title)}`;
}

export function parseHomestayRoute(pathname: string) {
  const hostRouteMatch = pathname.match(hostHomestayRoute);
  if (hostRouteMatch) {
    return {
      hostId: decodeURIComponent(hostRouteMatch[1]),
      homestayId: decodeURIComponent(hostRouteMatch[2]),
      slug: hostRouteMatch[3] ? decodeURIComponent(hostRouteMatch[3]) : "",
    };
  }

  const legacyRouteMatch = pathname.match(legacyHomestayRoute);
  if (legacyRouteMatch) {
    return {
      hostId: "",
      homestayId: decodeURIComponent(legacyRouteMatch[1]),
      slug: "",
    };
  }

  return null;
}

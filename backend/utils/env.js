export const DEFAULT_FRONTEND_URL = "https://staynest.nniisworking1606.id.vn";

function validOrigin(origin) {
  if (!origin) {
    return "";
  }

  try {
    const parsed = new URL(origin);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }

    return parsed.origin;
  } catch {
    return "";
  }
}

export function getFrontendUrl(frontendOrigin) {
  const requestOrigin = validOrigin(frontendOrigin);
  if (requestOrigin) {
    return requestOrigin;
  }

  return (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL).replace(/\/+$/, "");
}

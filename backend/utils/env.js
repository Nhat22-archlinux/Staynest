export const DEFAULT_FRONTEND_URL = "http://localhost:4173";

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

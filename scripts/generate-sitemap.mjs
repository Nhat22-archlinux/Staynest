import { mkdir, writeFile } from "node:fs/promises";

const siteUrl = process.env.SITE_URL || "https://staynest.nniisworking1606.id.vn";
const apiUrl = process.env.SITEMAP_API_URL || process.env.VITE_API_URL || "";
const sitemapPath = new URL("../public/sitemap.xml", import.meta.url);

function createSlug(title) {
  return String(title || "homestay")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "homestay";
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatLastmod(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function homestayUrl(stay) {
  const id = stay.id || stay._id;
  const hostId = stay.hostId || stay.owner || `host-${createSlug(stay.host || "staynest")}`;
  const slug = stay.slug || createSlug(stay.title);

  return `${siteUrl}/hosts/${encodeURIComponent(hostId)}/homestays/${encodeURIComponent(id)}/${slug}`;
}

function sitemapApiEndpoint() {
  if (!apiUrl || apiUrl.startsWith("/")) {
    return "";
  }

  const normalizedApiUrl = apiUrl.replace(/\/+$/, "");
  if (/\/homestays-sitemap$/.test(normalizedApiUrl)) {
    return normalizedApiUrl;
  }

  if (/\/api$/.test(normalizedApiUrl)) {
    return `${normalizedApiUrl}/public/homestays-sitemap`;
  }

  return `${normalizedApiUrl}/homestays-sitemap`;
}

async function loadHomestays() {
  const endpoint = sitemapApiEndpoint();

  if (!endpoint) {
    return [];
  }

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const homestays = await response.json();
    if (!Array.isArray(homestays)) {
      throw new Error("API returned a non-array sitemap payload");
    }

    return homestays;
  } catch (error) {
    console.warn(`[StayNest] Sitemap homestay fetch skipped: ${error.message}`);
    return [];
  }
}

const homestays = await loadHomestays();
const urls = [
  {
    loc: `${siteUrl}/`,
    changefreq: "daily",
    priority: "1.0",
  },
  {
    loc: `${siteUrl}/homestays`,
    changefreq: "daily",
    priority: "0.9",
  },
  ...homestays
    .filter((stay) => stay && !stay.isHidden && !stay.isDeleted && !stay.deleted && (stay._id || stay.id))
    .map((stay) => ({
      loc: homestayUrl(stay),
      changefreq: "weekly",
      priority: "0.8",
      lastmod: formatLastmod(stay.updatedAt),
    })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
${url.lastmod ? `    <lastmod>${escapeXml(url.lastmod)}</lastmod>\n` : ""}    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

await mkdir(new URL("../public", import.meta.url), { recursive: true });
await writeFile(sitemapPath, xml);
console.info(`[StayNest] Sitemap generated with ${urls.length} URL(s).`);

import type { Homestay, Review } from "../types";
import { getPriceBreakdown } from "./discount";
import { getHomestayRoute } from "./routes";

export const SITE_URL = "https://staynest.nniisworking1606.id.vn";
export const SITE_NAME = "StayNest";
export const DEFAULT_SEO_IMAGE = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85";

export function toAbsoluteUrl(pathOrUrl = "/") {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${normalizedPath}`;
}

export function canonicalUrl(path = "/") {
  return toAbsoluteUrl(path.split("?")[0].split("#")[0] || "/");
}

export function truncateMetaDescription(value: string, maxLength = 155) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

export function optimizeCloudinaryImage(url: string, width = 1200) {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  if (/\/upload\/[^/]*(f_auto|q_auto)[^/]*\//.test(url)) {
    return url;
  }

  return url.replace("/upload/", `/upload/f_auto,q_auto,c_fill,w_${width}/`);
}

export function homestayImageAlt(stay: Homestay, detail = "homestay") {
  return `${stay.title} ${detail} in ${stay.area}, ${stay.location}`;
}

export function buildHomeJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/?location={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      sameAs: [SITE_URL],
    },
  ];
}

export function buildHomestayDescription(stay: Homestay) {
  const price = getPriceBreakdown(stay);
  return truncateMetaDescription(
    `${stay.description} Book ${stay.title} in ${stay.area}, ${stay.location} from $${Math.round(price.nightlyPrice)} per night on StayNest.`,
  );
}

export function buildHomestayJsonLd(stay: Homestay, reviews: Review[] = []) {
  const price = getPriceBreakdown(stay);
  const route = getHomestayRoute(stay);
  const visibleReviews = reviews.filter((review) => !review.isHidden);
  const aggregateRating =
    visibleReviews.length > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: Number((visibleReviews.reduce((sum, review) => sum + review.rating, 0) / visibleReviews.length).toFixed(2)),
          reviewCount: visibleReviews.length,
        }
      : stay.reviews > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: stay.rating,
            reviewCount: stay.reviews,
          }
        : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: stay.title,
    description: buildHomestayDescription(stay),
    image: optimizeCloudinaryImage(stay.image || stay.gallery[0] || DEFAULT_SEO_IMAGE),
    url: canonicalUrl(route),
    address: {
      "@type": "PostalAddress",
      addressLocality: stay.area,
      addressRegion: stay.location,
    },
    priceRange: `$${Math.round(price.nightlyPrice)} per night`,
    amenityFeature: stay.amenities.map((amenity) => ({
      "@type": "LocationFeatureSpecification",
      name: amenity,
      value: true,
    })),
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(visibleReviews.length > 0
      ? {
          review: visibleReviews.slice(0, 10).map((review) => ({
            "@type": "Review",
            author: {
              "@type": "Person",
              name: review.userName,
            },
            datePublished: review.createdAt,
            reviewBody: review.comment,
            reviewRating: {
              "@type": "Rating",
              ratingValue: review.rating,
              bestRating: 5,
              worstRating: 1,
            },
          })),
        }
      : {}),
  };
}

export function buildHomestayBreadcrumbJsonLd(stay: Homestay) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Homestays",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: stay.title,
        item: canonicalUrl(getHomestayRoute(stay)),
      },
    ],
  };
}

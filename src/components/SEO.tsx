import { Helmet } from "react-helmet-async";
import { DEFAULT_SEO_IMAGE, SITE_NAME, canonicalUrl, toAbsoluteUrl } from "../utils/seo";

type SEOProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  type?: "website" | "article";
  robots?: string;
  jsonLd?: unknown | unknown[];
};

export function SEO({
  title,
  description,
  canonicalPath = "/",
  image = DEFAULT_SEO_IMAGE,
  type = "website",
  robots = "index,follow",
  jsonLd,
}: SEOProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonical = canonicalUrl(canonicalPath);
  const absoluteImage = toAbsoluteUrl(image);
  const jsonLdItems = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={absoluteImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />

      {jsonLdItems.map((item, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
}

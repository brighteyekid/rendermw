import type { RenderPayload } from './types.js';
import { buildJsonLd, buildBreadcrumbSchema } from './schema.js';

/**
 * Resolves an image URL to an absolute URL.
 * If the image already starts with "http", it is returned as-is.
 * Otherwise, `siteUrl` is prepended (with no double slashes).
 *
 * @param image   - The image path or URL.
 * @param siteUrl - The base site URL (e.g. "https://example.com").
 */
function resolveImageUrl(image: string, siteUrl: string): string {
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  const base = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
  const path = image.startsWith('/') ? image : `/${image}`;
  return `${base}${path}`;
}

/**
 * Builds a complete, valid HTML document string for serving to bots.
 *
 * Includes all required SEO elements:
 * - Charset, viewport, title, description, canonical
 * - Robots meta tag optimised for rich results
 * - Open Graph tags (og:title, og:description, og:url, og:type, og:image)
 * - Twitter Card tags
 * - JSON-LD structured data (user-provided schema + auto-generated BreadcrumbList)
 * - The semantic HTML body provided in `payload.html`
 *
 * @param payload  - The data returned by a route's `render()` function.
 * @param siteUrl  - The base site URL used to resolve relative image paths.
 * @returns A complete `<!DOCTYPE html>` string.
 */
export function buildShell(payload: RenderPayload, siteUrl: string): string {
  const lang = payload.lang ?? 'en';
  const ogType = payload.ogType ?? 'website';
  const absoluteOgImage = payload.ogImage
    ? resolveImageUrl(payload.ogImage, siteUrl)
    : null;

  // Collect all JSON-LD script tags
  const schemaTags: string[] = [];

  if (payload.schema) {
    schemaTags.push(buildJsonLd(payload.schema));
  }

  if (payload.breadcrumbs && payload.breadcrumbs.length > 0) {
    schemaTags.push(buildJsonLd(buildBreadcrumbSchema(payload.breadcrumbs)));
  }

  const ogImageMeta = absoluteOgImage
    ? `  <meta property="og:image" content="${absoluteOgImage}">\n`
    : '';

  const twitterImageMeta = absoluteOgImage
    ? `  <meta name="twitter:image" content="${absoluteOgImage}">\n`
    : '';

  const schemaBlock =
    schemaTags.length > 0
      ? schemaTags
          .map((tag) =>
            tag
              .split('\n')
              .map((line) => `  ${line}`)
              .join('\n')
          )
          .join('\n')
      : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${payload.title}</title>
  <meta name="description" content="${payload.description}">
  <link rel="canonical" href="${payload.canonical}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">

  <!-- Open Graph -->
  <meta property="og:title" content="${payload.title}">
  <meta property="og:description" content="${payload.description}">
  <meta property="og:url" content="${payload.canonical}">
  <meta property="og:type" content="${ogType}">
${ogImageMeta}
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${payload.title}">
  <meta name="twitter:description" content="${payload.description}">
${twitterImageMeta}${schemaBlock ? `\n${schemaBlock}\n` : ''}
</head>
<body>
${payload.html}
</body>
</html>`;
}

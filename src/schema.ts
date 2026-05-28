import type { Breadcrumb } from './types.js';

/**
 * Builds one or more `<script type="application/ld+json">` tags from a schema object or array.
 *
 * If an array is provided, each element is emitted as its own script tag so that
 * structured data validators can cleanly parse them independently.
 *
 * @param schema - A single JSON-LD object or an array of JSON-LD objects.
 * @returns A string of one or more JSON-LD script tags, ready to be embedded in `<head>`.
 *
 * @example
 * buildJsonLd({ "@type": "Product", name: "Shoes" });
 * // <script type="application/ld+json">\n{"@type":"Product","name":"Shoes"}\n</script>
 */
export function buildJsonLd(schema: object | object[]): string {
  if (Array.isArray(schema)) {
    return schema
      .map(
        (item) =>
          `<script type="application/ld+json">\n${JSON.stringify(item, null, 2)}\n</script>`
      )
      .join('\n');
  }

  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

/**
 * Builds a valid schema.org `BreadcrumbList` JSON-LD object from a breadcrumb array.
 *
 * The returned object can be included directly in the `schema` field of a `RenderPayload`,
 * or passed to `buildJsonLd()` independently.
 *
 * @param breadcrumbs - Ordered list of breadcrumb items with `name` and `url`.
 * @returns A `BreadcrumbList` JSON-LD object following the schema.org specification.
 *
 * @example
 * buildBreadcrumbSchema([
 *   { name: 'Home', url: 'https://example.com' },
 *   { name: 'Products', url: 'https://example.com/products' },
 * ]);
 */
export function buildBreadcrumbSchema(breadcrumbs: Breadcrumb[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

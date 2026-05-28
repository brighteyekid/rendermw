import { buildJsonLd, buildBreadcrumbSchema } from '../src/schema';

describe('buildJsonLd()', () => {
  it('wraps a single object in a script tag', () => {
    const result = buildJsonLd({ '@type': 'Product', name: 'Shoes' });
    expect(result).toContain('<script type="application/ld+json">');
    expect(result).toContain('"@type": "Product"');
    expect(result).toContain('"name": "Shoes"');
    expect(result).toContain('</script>');
  });

  it('emits one script tag per item when given an array', () => {
    const result = buildJsonLd([
      { '@type': 'Product', name: 'Shoes' },
      { '@type': 'Organization', name: 'Acme' },
    ]);
    const matches = result.match(/<script type="application\/ld\+json">/g);
    expect(matches).toHaveLength(2);
    expect(result).toContain('"@type": "Product"');
    expect(result).toContain('"@type": "Organization"');
  });

  it('outputs valid JSON inside the script tag', () => {
    const schema = { '@type': 'Article', headline: 'Test' };
    const result = buildJsonLd(schema);
    const jsonPart = result.replace(/<\/?script[^>]*>/g, '').trim();
    expect(() => JSON.parse(jsonPart)).not.toThrow();
    const parsed = JSON.parse(jsonPart);
    expect(parsed['@type']).toBe('Article');
  });

  it('handles an empty array without throwing', () => {
    expect(() => buildJsonLd([])).not.toThrow();
    expect(buildJsonLd([])).toBe('');
  });

  it('handles nested objects correctly', () => {
    const schema = {
      '@type': 'Product',
      offers: { '@type': 'Offer', price: '29.99', priceCurrency: 'USD' },
    };
    const result = buildJsonLd(schema);
    expect(result).toContain('"price": "29.99"');
    expect(result).toContain('"priceCurrency": "USD"');
  });
});

describe('buildBreadcrumbSchema()', () => {
  const breadcrumbs = [
    { name: 'Home', url: 'https://example.com' },
    { name: 'Products', url: 'https://example.com/products' },
    { name: 'Nike Shoes', url: 'https://example.com/products/nike-shoes' },
  ];

  it('returns a BreadcrumbList object', () => {
    const result = buildBreadcrumbSchema(breadcrumbs) as Record<string, unknown>;
    expect(result['@type']).toBe('BreadcrumbList');
    expect(result['@context']).toBe('https://schema.org');
  });

  it('creates the correct number of ListItems', () => {
    const result = buildBreadcrumbSchema(breadcrumbs) as {
      itemListElement: unknown[];
    };
    expect(result.itemListElement).toHaveLength(3);
  });

  it('assigns correct position numbers (1-indexed)', () => {
    const result = buildBreadcrumbSchema(breadcrumbs) as {
      itemListElement: Array<{ position: number; name: string; item: string }>;
    };
    expect(result.itemListElement[0].position).toBe(1);
    expect(result.itemListElement[1].position).toBe(2);
    expect(result.itemListElement[2].position).toBe(3);
  });

  it('maps name and item (URL) correctly', () => {
    const result = buildBreadcrumbSchema(breadcrumbs) as {
      itemListElement: Array<{ name: string; item: string }>;
    };
    expect(result.itemListElement[0].name).toBe('Home');
    expect(result.itemListElement[0].item).toBe('https://example.com');
    expect(result.itemListElement[2].name).toBe('Nike Shoes');
    expect(result.itemListElement[2].item).toBe(
      'https://example.com/products/nike-shoes'
    );
  });

  it('handles a single breadcrumb', () => {
    const result = buildBreadcrumbSchema([
      { name: 'Home', url: 'https://example.com' },
    ]) as { itemListElement: Array<{ position: number }> };
    expect(result.itemListElement).toHaveLength(1);
    expect(result.itemListElement[0].position).toBe(1);
  });

  it('handles empty breadcrumbs without throwing', () => {
    const result = buildBreadcrumbSchema([]) as {
      itemListElement: unknown[];
    };
    expect(result.itemListElement).toHaveLength(0);
  });

  it('produces output that can be passed to buildJsonLd()', () => {
    const { buildJsonLd } = require('../src/schema');
    const schema = buildBreadcrumbSchema(breadcrumbs);
    const output = buildJsonLd(schema);
    expect(output).toContain('BreadcrumbList');
    expect(output).toContain('ListItem');
  });
});

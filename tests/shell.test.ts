import { buildShell } from '../src/shell';
import type { RenderPayload } from '../src/types';

const basePayload: RenderPayload = {
  title: 'Nike Air Max — My Store',
  description: 'Buy Nike Air Max sneakers at the best price.',
  canonical: 'https://example.com/products/nike-air-max',
  html: '<main><h1>Nike Air Max</h1><p>Best sneakers.</p></main>',
};

describe('buildShell()', () => {
  it('outputs a valid DOCTYPE and html element', () => {
    const result = buildShell(basePayload, 'https://example.com');
    expect(result).toMatch(/^<!DOCTYPE html>/);
    expect(result).toContain('<html lang="en">');
  });

  it('uses a custom lang attribute', () => {
    const result = buildShell({ ...basePayload, lang: 'fr' }, 'https://example.com');
    expect(result).toContain('<html lang="fr">');
  });

  it('includes charset and viewport meta tags', () => {
    const result = buildShell(basePayload, 'https://example.com');
    expect(result).toContain('<meta charset="UTF-8">');
    expect(result).toContain('<meta name="viewport"');
  });

  it('includes the title tag', () => {
    const result = buildShell(basePayload, 'https://example.com');
    expect(result).toContain('<title>Nike Air Max — My Store</title>');
  });

  it('includes the meta description', () => {
    const result = buildShell(basePayload, 'https://example.com');
    expect(result).toContain('name="description"');
    expect(result).toContain('Buy Nike Air Max sneakers at the best price.');
  });

  it('includes the canonical link', () => {
    const result = buildShell(basePayload, 'https://example.com');
    expect(result).toContain('<link rel="canonical" href="https://example.com/products/nike-air-max">');
  });

  it('includes the robots meta tag', () => {
    const result = buildShell(basePayload, 'https://example.com');
    expect(result).toContain('name="robots"');
    expect(result).toContain('index, follow');
    expect(result).toContain('max-image-preview:large');
  });

  it('includes Open Graph tags', () => {
    const result = buildShell(basePayload, 'https://example.com');
    expect(result).toContain('property="og:title"');
    expect(result).toContain('property="og:description"');
    expect(result).toContain('property="og:url"');
    expect(result).toContain('property="og:type"');
    expect(result).toContain('content="website"'); // default ogType
  });

  it('uses a custom ogType', () => {
    const result = buildShell({ ...basePayload, ogType: 'article' }, 'https://example.com');
    expect(result).toContain('content="article"');
  });

  it('includes Twitter Card tags', () => {
    const result = buildShell(basePayload, 'https://example.com');
    expect(result).toContain('name="twitter:card"');
    expect(result).toContain('content="summary_large_image"');
    expect(result).toContain('name="twitter:title"');
    expect(result).toContain('name="twitter:description"');
  });

  it('includes the body HTML', () => {
    const result = buildShell(basePayload, 'https://example.com');
    expect(result).toContain('<h1>Nike Air Max</h1>');
    expect(result).toContain('<body>');
    expect(result).toContain('</body>');
  });

  // --- OG Image ---
  it('includes og:image and twitter:image when ogImage is provided', () => {
    const result = buildShell(
      { ...basePayload, ogImage: 'https://cdn.example.com/img/shoes.jpg' },
      'https://example.com'
    );
    expect(result).toContain('property="og:image"');
    expect(result).toContain('name="twitter:image"');
    expect(result).toContain('https://cdn.example.com/img/shoes.jpg');
  });

  it('resolves a relative ogImage path against siteUrl', () => {
    const result = buildShell(
      { ...basePayload, ogImage: '/uploads/shoes.jpg' },
      'https://example.com'
    );
    expect(result).toContain('https://example.com/uploads/shoes.jpg');
  });

  it('resolves a relative ogImage path without leading slash', () => {
    const result = buildShell(
      { ...basePayload, ogImage: 'uploads/shoes.jpg' },
      'https://example.com'
    );
    expect(result).toContain('https://example.com/uploads/shoes.jpg');
  });

  it('does not double-slash when siteUrl has trailing slash', () => {
    const result = buildShell(
      { ...basePayload, ogImage: '/img/hero.jpg' },
      'https://example.com/'
    );
    expect(result).toContain('https://example.com/img/hero.jpg');
    expect(result).not.toContain('example.com//img');
  });

  it('omits og:image and twitter:image when ogImage is not provided', () => {
    const result = buildShell(basePayload, 'https://example.com');
    expect(result).not.toContain('og:image');
    expect(result).not.toContain('twitter:image');
  });

  // --- JSON-LD schema ---
  it('includes a JSON-LD script tag when schema is provided', () => {
    const result = buildShell(
      { ...basePayload, schema: { '@type': 'Product', name: 'Nike Air Max' } },
      'https://example.com'
    );
    expect(result).toContain('<script type="application/ld+json">');
    expect(result).toContain('"@type": "Product"');
  });

  it('includes a BreadcrumbList JSON-LD when breadcrumbs are provided', () => {
    const result = buildShell(
      {
        ...basePayload,
        breadcrumbs: [
          { name: 'Home', url: 'https://example.com' },
          { name: 'Nike Air Max', url: 'https://example.com/products/nike-air-max' },
        ],
      },
      'https://example.com'
    );
    expect(result).toContain('BreadcrumbList');
    expect(result).toContain('ListItem');
  });

  it('omits JSON-LD blocks when no schema or breadcrumbs provided', () => {
    const result = buildShell(basePayload, 'https://example.com');
    expect(result).not.toContain('application/ld+json');
  });

  it('returns a string', () => {
    const result = buildShell(basePayload, 'https://example.com');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(100);
  });
});

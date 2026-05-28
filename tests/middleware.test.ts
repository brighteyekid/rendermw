import express from 'express';
import request from 'supertest';
import rendermw from '../src/index';
import type { RenderPayload } from '../src/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const GOOGLEBOT_UA =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

const makePayload = (overrides: Partial<RenderPayload> = {}): RenderPayload => ({
  title: 'Nike Air Max',
  description: 'Best sneakers.',
  canonical: 'https://example.com/products/nike-air-max',
  html: '<h1>Nike Air Max</h1>',
  ...overrides,
});

// ── App factory ───────────────────────────────────────────────────────────────

function makeApp(options?: Parameters<typeof rendermw>[0]) {
  const app = express();

  app.use(
    rendermw(
      options ?? {
        siteUrl: 'https://example.com',
        routes: [
          {
            path: '/',
            render: async () =>
              makePayload({
                title: 'Home',
                canonical: 'https://example.com/',
                html: '<h1>Welcome</h1>',
              }),
          },
          {
            path: '/products/:slug',
            render: async ({ slug }) =>
              makePayload({
                title: slug,
                canonical: `https://example.com/products/${slug}`,
                html: `<h1>${slug}</h1>`,
              }),
          },
          {
            path: '/blog/:slug',
            render: async ({ slug }) =>
              makePayload({
                title: `Blog: ${slug}`,
                canonical: `https://example.com/blog/${slug}`,
                html: `<article>${slug}</article>`,
              }),
          },
        ],
      }
    )
  );

  // Fallback handler to distinguish "passed through" vs "handled by middleware"
  app.get('*', (_req, res) => {
    res.status(200).json({ passedThrough: true });
  });

  return app;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('rendermw middleware', () => {
  describe('Non-bot requests', () => {
    it('passes through a real browser request untouched', async () => {
      const app = makeApp();
      const res = await request(app)
        .get('/products/nike-shoes')
        .set('User-Agent', CHROME_UA);

      expect(res.status).toBe(200);
      expect(res.body.passedThrough).toBe(true);
    });

    it('does not add X-Render-MW header for real users', async () => {
      const app = makeApp();
      const res = await request(app)
        .get('/products/nike-shoes')
        .set('User-Agent', CHROME_UA);

      expect(res.headers['x-render-mw']).toBeUndefined();
    });

    it('passes through when no User-Agent header is set', async () => {
      const app = makeApp();
      const res = await request(app).get('/products/nike-shoes');
      expect(res.body.passedThrough).toBe(true);
    });
  });

  describe('Bot requests — matched routes', () => {
    it('returns HTML for a bot hitting a matched route', async () => {
      const app = makeApp();
      const res = await request(app)
        .get('/products/nike-shoes')
        .set('User-Agent', GOOGLEBOT_UA);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('<!DOCTYPE html>');
      expect(res.text).toContain('<h1>nike-shoes</h1>');
    });

    it('extracts path params and passes them to render()', async () => {
      const app = makeApp();
      const res = await request(app)
        .get('/products/jordan-1')
        .set('User-Agent', GOOGLEBOT_UA);

      expect(res.text).toContain('jordan-1');
    });

    it('handles the root "/" route', async () => {
      const app = makeApp();
      const res = await request(app)
        .get('/')
        .set('User-Agent', GOOGLEBOT_UA);

      expect(res.status).toBe(200);
      expect(res.text).toContain('<h1>Welcome</h1>');
    });

    it('sets X-Render-MW: fresh on cache miss', async () => {
      const app = makeApp();
      const res = await request(app)
        .get('/products/adidas-ultra')
        .set('User-Agent', GOOGLEBOT_UA);

      expect(res.headers['x-render-mw']).toBe('fresh');
    });

    it('sets X-Render-Route to the matched route pattern', async () => {
      const app = makeApp();
      const res = await request(app)
        .get('/products/puma-rs')
        .set('User-Agent', GOOGLEBOT_UA);

      expect(res.headers['x-render-route']).toBe('/products/:slug');
    });

    it('sets X-Render-MW: cache on second request (cache hit)', async () => {
      const app = makeApp();
      // First request — cache miss
      await request(app)
        .get('/products/reebok-club')
        .set('User-Agent', GOOGLEBOT_UA);

      // Second request — cache hit
      const res = await request(app)
        .get('/products/reebok-club')
        .set('User-Agent', GOOGLEBOT_UA);

      expect(res.headers['x-render-mw']).toBe('cache');
    });

    it('returns the same HTML on cache hit', async () => {
      const app = makeApp();
      const first = await request(app)
        .get('/blog/hello-world')
        .set('User-Agent', GOOGLEBOT_UA);
      const second = await request(app)
        .get('/blog/hello-world')
        .set('User-Agent', GOOGLEBOT_UA);

      expect(first.text).toBe(second.text);
    });
  });

  describe('Bot requests — unmatched routes', () => {
    it('passes through a bot hitting an unmatched route', async () => {
      const app = makeApp();
      const res = await request(app)
        .get('/this-route-does-not-exist')
        .set('User-Agent', GOOGLEBOT_UA);

      expect(res.body.passedThrough).toBe(true);
    });

    it('does not set X-Render-MW for unmatched bot routes', async () => {
      const app = makeApp();
      const res = await request(app)
        .get('/unknown')
        .set('User-Agent', GOOGLEBOT_UA);

      expect(res.headers['x-render-mw']).toBeUndefined();
    });
  });

  describe('Cache disabled', () => {
    it('still serves HTML when cache is disabled', async () => {
      const app = makeApp({
        siteUrl: 'https://example.com',
        cache: false,
        routes: [
          {
            path: '/products/:slug',
            render: async ({ slug }) =>
              makePayload({ html: `<h1>${slug}</h1>` }),
          },
        ],
      });

      const res = await request(app)
        .get('/products/vans-old-skool')
        .set('User-Agent', GOOGLEBOT_UA);

      expect(res.status).toBe(200);
      expect(res.text).toContain('vans-old-skool');
    });

    it('always sets X-Render-MW: fresh when cache is disabled', async () => {
      const app = makeApp({
        siteUrl: 'https://example.com',
        cache: false,
        routes: [
          {
            path: '/products/:slug',
            render: async ({ slug }) =>
              makePayload({ html: `<h1>${slug}</h1>` }),
          },
        ],
      });

      // First
      const r1 = await request(app)
        .get('/products/converse')
        .set('User-Agent', GOOGLEBOT_UA);
      // Second
      const r2 = await request(app)
        .get('/products/converse')
        .set('User-Agent', GOOGLEBOT_UA);

      expect(r1.headers['x-render-mw']).toBe('fresh');
      expect(r2.headers['x-render-mw']).toBe('fresh');
    });
  });

  describe('Error handling', () => {
    it('falls through to next() when render() throws', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const app = makeApp({
        siteUrl: 'https://example.com',
        routes: [
          {
            path: '/broken',
            render: async () => {
              throw new Error('DB connection failed');
            },
          },
        ],
      });

      const res = await request(app)
        .get('/broken')
        .set('User-Agent', GOOGLEBOT_UA);

      // Should fall through to the Express fallback handler
      expect(res.body.passedThrough).toBe(true);

      consoleSpy.mockRestore();
    });

    it('logs the error when render() throws', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const app = makeApp({
        siteUrl: 'https://example.com',
        routes: [
          {
            path: '/error-route',
            render: async () => {
              throw new Error('Something went wrong');
            },
          },
        ],
      });

      await request(app)
        .get('/error-route')
        .set('User-Agent', GOOGLEBOT_UA);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[rendermw] ERROR rendering'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Custom bot patterns', () => {
    it('detects a custom bot from the bots[] option', async () => {
      const app = makeApp({
        siteUrl: 'https://example.com',
        bots: ['my-internal-crawler'],
        routes: [
          {
            path: '/products/:slug',
            render: async ({ slug }) =>
              makePayload({ html: `<h1>${slug}</h1>` }),
          },
        ],
      });

      const res = await request(app)
        .get('/products/custom-bot-test')
        .set('User-Agent', 'my-internal-crawler/1.0');

      expect(res.headers['x-render-mw']).toBe('fresh');
      expect(res.text).toContain('<!DOCTYPE html>');
    });
  });

  describe('Query string handling', () => {
    it('passes query params to the render() function', async () => {
      let receivedQuery: Record<string, string> = {};

      const app = makeApp({
        siteUrl: 'https://example.com',
        routes: [
          {
            path: '/search',
            render: async (_params, query) => {
              receivedQuery = query;
              return makePayload({ html: `<p>Results for ${query.q}</p>` });
            },
          },
        ],
      });

      await request(app)
        .get('/search?q=sneakers&page=2')
        .set('User-Agent', GOOGLEBOT_UA);

      expect(receivedQuery.q).toBe('sneakers');
      expect(receivedQuery.page).toBe('2');
    });

    it('uses query string in cache key (different queries = different cache entries)', async () => {
      let callCount = 0;

      const app = makeApp({
        siteUrl: 'https://example.com',
        routes: [
          {
            path: '/search',
            render: async (_params, query) => {
              callCount++;
              return makePayload({ html: `<p>${query.q}</p>` });
            },
          },
        ],
      });

      await request(app)
        .get('/search?q=shoes')
        .set('User-Agent', GOOGLEBOT_UA);
      await request(app)
        .get('/search?q=hats')
        .set('User-Agent', GOOGLEBOT_UA);

      // Both are unique cache keys, so render() is called twice
      expect(callCount).toBe(2);
    });
  });
});

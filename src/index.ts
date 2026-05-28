import type { RequestHandler, Request, Response, NextFunction } from 'express';
import { isBot } from './detect.js';
import { RenderCache } from './cache.js';
import { buildShell } from './shell.js';
import type { RenderOptions, RenderRoute } from './types.js';

/**
 * Result of matching a request path against a route pattern.
 */
interface MatchResult {
  route: RenderRoute;
  params: Record<string, string>;
}

/**
 * Matches a concrete URL path against an Express-style route pattern.
 *
 * Supports `:param` segments. Returns extracted params on match, or `null` on mismatch.
 *
 * @param pattern - Route pattern e.g. "/products/:slug"
 * @param path    - Actual request path e.g. "/products/nike-shoes"
 * @returns Extracted params or `null` if no match.
 *
 * @example
 * matchPath('/products/:slug', '/products/nike-shoes'); // { slug: 'nike-shoes' }
 * matchPath('/products/:slug', '/blog/post');           // null
 */
export function matchPath(
  pattern: string,
  path: string
): Record<string, string> | null {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = path.split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const ps = patternSegments[i];
    const us = pathSegments[i];

    if (ps.startsWith(':')) {
      params[ps.slice(1)] = decodeURIComponent(us);
    } else if (ps !== us) {
      return null;
    }
  }

  return params;
}

/**
 * Finds the first route in `routes` that matches `path`.
 *
 * @param routes - Array of user-defined RenderRoutes.
 * @param path   - The request path to match.
 * @returns A MatchResult with the matched route and extracted params, or `null`.
 */
function findRoute(routes: RenderRoute[], path: string): MatchResult | null {
  for (const route of routes) {
    const params = matchPath(route.path, path);
    if (params !== null) {
      return { route, params };
    }
  }
  return null;
}

/**
 * rendermw — Express middleware factory for data-driven dynamic rendering.
 *
 * Returns an Express `RequestHandler` that:
 * 1. Immediately passes through non-bot requests (zero overhead).
 * 2. For bot requests, matches the URL against user-defined routes.
 * 3. Calls the route's `render()` function to get structured page data.
 * 4. Builds a complete SEO HTML document and returns it to the bot.
 * 5. Caches rendered HTML with a configurable TTL.
 *
 * No Puppeteer. No external services. No runtime dependencies.
 *
 * @param options - Configuration object (routes, cache, TTL, siteUrl, debug).
 * @returns An Express `RequestHandler`.
 *
 * @example
 * import express from 'express';
 * import rendermw from 'rendermw';
 *
 * const app = express();
 * app.use(rendermw({
 *   siteUrl: 'https://example.com',
 *   routes: [
 *     {
 *       path: '/products/:slug',
 *       render: async ({ slug }) => ({
 *         title: `${slug} — My Store`,
 *         description: 'Buy now.',
 *         canonical: `https://example.com/products/${slug}`,
 *         html: `<h1>${slug}</h1>`,
 *       }),
 *     },
 *   ],
 * }));
 */
export default function rendermw(options: RenderOptions): RequestHandler {
  const {
    routes,
    cache: cacheEnabled = true,
    cacheTTL = 86400,
    bots: extraBots,
    siteUrl,
    debug = false,
  } = options;

  const cache = new RenderCache();

  return async function rendermwHandler(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Step 1: Fast-path for non-bot requests — absolutely zero overhead.
    const ua = req.headers['user-agent'] ?? '';
    if (!isBot(ua, extraBots)) {
      next();
      return;
    }

    // Step 2: Try to match the request path against user-defined routes.
    const match = findRoute(routes, req.path);

    // Step 3: No matching route — let Express handle it normally.
    if (!match) {
      if (debug) {
        console.log(
          `[rendermw] ${new Date().toISOString()} | BOT | ${ua.slice(0, 80)} | ${req.path} | NO ROUTE`
        );
      }
      next();
      return;
    }

    const { route, params } = match;
    const query = req.query as Record<string, string>;
    const cacheKey = req.path + JSON.stringify(query);

    // Step 4: Cache hit — serve immediately.
    if (cacheEnabled) {
      const cached = cache.get(cacheKey);
      if (cached) {
        if (debug) {
          console.log(
            `[rendermw] ${new Date().toISOString()} | BOT | ${ua.slice(0, 80)} | ${req.path} | CACHE HIT | route: ${route.path}`
          );
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('X-Render-MW', 'cache');
        res.setHeader('X-Render-Route', route.path);
        res.send(cached);
        return;
      }
    }

    // Step 5–8: Cache miss — call render(), build shell, cache result, send.
    try {
      const payload = await route.render(params, query);
      const html = buildShell(payload, siteUrl);

      if (cacheEnabled) {
        cache.set(cacheKey, html, cacheTTL);
      }

      if (debug) {
        console.log(
          `[rendermw] ${new Date().toISOString()} | BOT | ${ua.slice(0, 80)} | ${req.path} | CACHE MISS | route: ${route.path}`
        );
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Render-MW', 'fresh');
      res.setHeader('X-Render-Route', route.path);
      res.send(html);
    } catch (err) {
      // Step 10: render() threw — log and fall through gracefully.
      console.error(
        `[rendermw] ERROR rendering ${req.path} (route: ${route.path}):`,
        err
      );
      next();
    }
  };
}

export { matchPath as _matchPath };
export type { RenderOptions, RenderRoute } from './types.js';
export type { RenderPayload, Breadcrumb } from './types.js';
export { isBot } from './detect.js';
export { RenderCache } from './cache.js';
export { buildJsonLd, buildBreadcrumbSchema } from './schema.js';
export { buildShell } from './shell.js';

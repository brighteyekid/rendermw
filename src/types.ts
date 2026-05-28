import type { Request } from 'express';

/**
 * Extends Express Request with a bot detection flag.
 */
export interface BotRequest extends Request {
  isBot: boolean;
}

/**
 * A single breadcrumb item used in BreadcrumbList schema and HTML.
 */
export interface Breadcrumb {
  name: string;
  url: string;
}

/**
 * The payload returned by a route's render() function.
 * Contains all data needed to build the full SEO HTML shell.
 */
export interface RenderPayload {
  /** Page title — used in <title> and OG/Twitter tags. */
  title: string;
  /** Meta description — used in <meta name="description"> and OG/Twitter tags. */
  description: string;
  /** Canonical URL — used in <link rel="canonical"> and og:url. */
  canonical: string;
  /** Optional OG/Twitter image. Relative paths are made absolute using siteUrl. */
  ogImage?: string;
  /** OG type — defaults to "website". */
  ogType?: string;
  /** Raw JSON-LD schema object or array of objects. */
  schema?: object | object[];
  /** Breadcrumbs — auto-converted to BreadcrumbList JSON-LD if provided. */
  breadcrumbs?: Breadcrumb[];
  /** The semantic HTML body content served to bots. */
  html: string;
  /** HTML lang attribute — defaults to "en". */
  lang?: string;
}

/**
 * Defines a route that rendermw handles for bot requests.
 */
export interface RenderRoute {
  /** Express-style route pattern e.g. "/products/:slug" */
  path: string;
  /**
   * Async function called when a bot hits this route.
   * @param params - Path parameters extracted from the URL (e.g. { slug: "nike-shoes" })
   * @param query  - Query string parameters (e.g. { page: "2" })
   * @returns A RenderPayload to build the HTML shell from.
   */
  render: (
    params: Record<string, string>,
    query: Record<string, string>
  ) => Promise<RenderPayload>;
}

/**
 * Options passed to the rendermw() middleware factory.
 */
export interface RenderOptions {
  /** Array of routes rendermw should handle for bots. */
  routes: RenderRoute[];
  /** Enable in-memory caching of rendered HTML. Default: true */
  cache?: boolean;
  /** Cache TTL in seconds. Default: 86400 (24 hours) */
  cacheTTL?: number;
  /** Additional bot user-agent substrings to detect beyond the built-in list. */
  bots?: string[];
  /** Base site URL — used to resolve relative OG image paths. e.g. "https://example.com" */
  siteUrl: string;
  /** Enable console logging of bot hits and cache status. Default: false */
  debug?: boolean;
}

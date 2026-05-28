# rendermw

Zero-dependency data-driven dynamic rendering middleware for Express. No Puppeteer. No external services. Bots get semantic HTML. Users get your SPA.

---

## Why it exists

Single-page applications are invisible to search engines and social crawlers. When Googlebot, Bingbot, or the Twitter card scraper hits your React, Vue, or Angular app, they see an empty `<div id="root"></div>`. Your content never makes it into the index.

**Existing solutions all have painful tradeoffs:**

| Solution | Problem |
|---|---|
| Puppeteer / Rendertron | Launches a Chrome instance per request. Slow, expensive, and a devops nightmare. |
| Prerender.io | $99–$449/month. Requires routing all bot traffic through a third-party service. |
| SSR (Next.js, Nuxt, etc.) | Rewrites your entire architecture. Not practical if you already have a running SPA. |

**rendermw is different.** You already know what data each page needs. You already have database queries. You already know what the page should look like to a bot. `rendermw` just asks you to describe that — as data — and it builds the complete SEO HTML document for you.

Zero chrome instances. Zero external requests. Zero cost. Zero overhead for real users.

---

## How it works

```
Incoming Request
      │
      ▼
 ┌────────────────────────────────────────────────────────┐
 │                   rendermw middleware                  │
 │                                                        │
 │  isBot(userAgent)?                                     │
 │     │                                                  │
 │     ├── NO  ──────────────────────────────► next()     │
 │     │          (real user, zero overhead)              │
 │     │                                                  │
 │     └── YES                                            │
 │            │                                           │
 │            ▼                                           │
 │     matchPath(req.path, routes)                        │
 │            │                                           │
 │            ├── NO MATCH ──────────────────► next()     │
 │            │                                           │
 │            └── MATCHED                                 │
 │                   │                                    │
 │                   ▼                                    │
 │            cache.get(key)?                             │
 │                   │                                    │
 │                   ├── HIT ─────────────────► HTML      │
 │                   │      X-Render-MW: cache            │
 │                   │                                    │
 │                   └── MISS                             │
 │                          │                             │
 │                          ▼                             │
 │                   route.render(params, query)          │
 │                          │                             │
 │                          ▼                             │
 │                   buildShell(payload, siteUrl)         │
 │                          │                             │
 │                          ▼                             │
 │                   cache.set(key, html, ttl)            │
 │                          │                             │
 │                          ▼                             │
 │                          ────────────────────► HTML    │
 │                                X-Render-MW: fresh      │
 └────────────────────────────────────────────────────────┘
```

---

## Installation

```bash
npm install rendermw
```

Express is required as a peer dependency:

```bash
npm install express
```

---

## Quick start

```js
const express = require('express');
const rendermw = require('rendermw');

const app = express();

app.use(rendermw({
  siteUrl: 'https://mystore.com',
  routes: [
    {
      path: '/products/:slug',
      render: async ({ slug }, query) => {
        const product = await db.products.findBySlug(slug); // your DB call

        return {
          title: `${product.name} — My Store`,
          description: product.description,
          canonical: `https://mystore.com/products/${slug}`,
          ogImage: product.imageUrl,
          schema: {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            offers: { '@type': 'Offer', price: product.price, priceCurrency: 'USD' },
          },
          breadcrumbs: [
            { name: 'Home', url: 'https://mystore.com' },
            { name: product.name, url: `https://mystore.com/products/${slug}` },
          ],
          html: `<main><h1>${product.name}</h1><p>${product.description}</p></main>`,
        };
      },
    },
  ],
}));

// Your SPA fallback
app.get('*', (_req, res) => res.sendFile('index.html', { root: './dist' }));

app.listen(3000);
```

---

## API Reference

### `rendermw(options)` → Express RequestHandler

The middleware factory. Call it with your options and `app.use()` the result.

#### `RenderOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `siteUrl` | `string` | **required** | Base URL of your site (e.g. `"https://example.com"`). Used to resolve relative OG image paths. |
| `routes` | `RenderRoute[]` | **required** | Routes rendermw should handle for bots. |
| `cache` | `boolean` | `true` | Enable in-memory caching of rendered HTML. |
| `cacheTTL` | `number` | `86400` | Cache time-to-live in seconds (default: 24 hours). |
| `bots` | `string[]` | `[]` | Additional bot user-agent substrings to detect beyond the built-in list. |
| `debug` | `boolean` | `false` | Log every bot hit (timestamp, UA, path, cache status, route). |

---

#### `RenderRoute`

| Field | Type | Description |
|---|---|---|
| `path` | `string` | Express-style route pattern e.g. `"/products/:slug"` |
| `render` | `(params, query) => Promise<RenderPayload>` | Async function called when a bot hits this route. |

The `render` function receives:
- `params` — `Record<string, string>` — path parameters extracted from the URL
- `query` — `Record<string, string>` — query string parameters

---

#### `RenderPayload`

The object your `render()` function must return:

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | ✅ | Page title — used in `<title>` and OG/Twitter tags. |
| `description` | `string` | ✅ | Meta description. |
| `canonical` | `string` | ✅ | Canonical URL. |
| `html` | `string` | ✅ | Semantic HTML body content for bots. |
| `ogImage` | `string` | ❌ | OG/Twitter image. Relative paths are resolved against `siteUrl`. |
| `ogType` | `string` | ❌ | OG type (default: `"website"`). Use `"article"` for blog posts, `"product"` for products. |
| `schema` | `object \| object[]` | ❌ | Raw JSON-LD schema object or array. Each item gets its own `<script>` tag. |
| `breadcrumbs` | `Breadcrumb[]` | ❌ | Auto-converted to a `BreadcrumbList` JSON-LD block. |
| `lang` | `string` | ❌ | HTML `lang` attribute (default: `"en"`). |

---

### `buildBreadcrumbSchema(breadcrumbs)` → object

Helper that returns a valid schema.org `BreadcrumbList` JSON-LD object. Useful if you want to include breadcrumbs in your `schema` array alongside other structured data.

```js
const { buildBreadcrumbSchema } = require('rendermw');

const schema = [
  { '@type': 'Product', name: 'Shoes' },
  buildBreadcrumbSchema([
    { name: 'Home', url: 'https://example.com' },
    { name: 'Shoes', url: 'https://example.com/products/shoes' },
  ]),
];
```

---

### `buildJsonLd(schema)` → string

Converts a schema object or array into one or more `<script type="application/ld+json">` tags. Used internally by rendermw but exported for direct use.

```js
const { buildJsonLd } = require('rendermw');
const tag = buildJsonLd({ '@type': 'Organization', name: 'Acme' });
```

---

### `isBot(userAgent, extraBots?)` → boolean

Exposes the bot detection function. Useful for custom middleware logic.

```js
const { isBot } = require('rendermw');
isBot('Googlebot/2.1'); // true
isBot('Mozilla/5.0 Chrome/120'); // false
```

---

## Route matching

rendermw supports Express-style `:param` segments. Segments are matched positionally — the number of segments must match exactly.

```
Pattern              Path                      Params extracted
──────────────────────────────────────────────────────────────────
/products/:slug      /products/nike-air-max    { slug: "nike-air-max" }
/blog/:slug          /blog/hello-world         { slug: "hello-world" }
/shop/:cat/:id       /shop/shoes/12345         { cat: "shoes", id: "12345" }
/                    /                         {}
/about               /about                    {}
/about               /contact                  no match → next()
```

URL-encoded characters in params are automatically decoded (`decodeURIComponent`).

---

## Breadcrumbs example

Pass a `breadcrumbs` array to get automatic `BreadcrumbList` JSON-LD in your HTML output:

```js
render: async ({ slug }) => ({
  title: 'Product Name',
  description: '...',
  canonical: `https://example.com/products/${slug}`,
  html: '<h1>Product</h1>',
  breadcrumbs: [
    { name: 'Home',     url: 'https://example.com' },
    { name: 'Products', url: 'https://example.com/products' },
    { name: 'Shoes',    url: `https://example.com/products/${slug}` },
  ],
})
```

This generates:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home",     "item": "https://example.com" },
    { "@type": "ListItem", "position": 2, "name": "Products", "item": "https://example.com/products" },
    { "@type": "ListItem", "position": 3, "name": "Shoes",    "item": "https://example.com/products/shoes" }
  ]
}
```

---

## Debug mode

Enable `debug: true` in your options to log every bot hit:

```
[rendermw] 2024-01-15T10:32:11.482Z | BOT | Googlebot/2.1 | /products/nike-air-max | CACHE MISS | route: /products/:slug
[rendermw] 2024-01-15T10:32:12.104Z | BOT | Googlebot/2.1 | /products/nike-air-max | CACHE HIT  | route: /products/:slug
```

---

## Cache

rendermw includes a zero-dependency in-memory TTL cache.

- Cache is **enabled by default** with a **24-hour TTL**.
- The **cache key** is `req.path + JSON.stringify(req.query)` — so `/search?q=shoes` and `/search?q=hats` are stored separately.
- Expired entries are **lazily evicted** on read — no background timers, no memory leaks.
- Set `cacheTTL: 300` (5 minutes) during development so changes are reflected quickly.
- Set `cache: false` to disable caching entirely (useful for debugging).

```js
rendermw({
  siteUrl: 'https://example.com',
  cache: true,
  cacheTTL: 3600, // 1 hour
  routes: [ /* ... */ ],
})
```

---

## Response headers

Every response served by rendermw includes these headers:

| Header | Values | Meaning |
|---|---|---|
| `Content-Type` | `text/html; charset=utf-8` | Always HTML. |
| `X-Render-MW` | `fresh` \| `cache` | `fresh` = rendered now, `cache` = served from cache. |
| `X-Render-Route` | e.g. `/products/:slug` | The route pattern that matched this request. |

These headers make it easy to verify rendermw is working in your logs or browser DevTools.

---

## Real world use case

A high-traffic e-commerce platform running a React SPA on an Express backend had zero organic search visibility — Googlebot was indexing empty HTML shells. Traditional SSR would have required rewriting thousands of components. Puppeteer-based prerendering was too slow and unstable under load.

With rendermw, they described each route's data shape — product details, breadcrumbs, schema markup — as a simple async function. Within a day, Googlebot was receiving complete, structured HTML documents with `Product`, `BreadcrumbList`, and `Offer` schema. Within three months, organic impressions increased significantly, with no changes to the React frontend.

No Puppeteer. No paid service. No architecture rewrite.

---

## FAQ

### Is this cloaking?

No. Google defines cloaking as showing different content to Googlebot than to users to manipulate rankings. rendermw shows bots the **same data that would be visible to a real user** — just pre-rendered as HTML rather than hydrated client-side. This is the same principle as Google's officially recommended [dynamic rendering](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering) approach. rendermw is a clean implementation of dynamic rendering as described in Google's documentation.

### Does it work with Vite / Create React App / custom builds?

Yes. rendermw is completely framework-agnostic. It intercepts requests at the Express middleware layer before your SPA bundle is ever served. It doesn't care whether your frontend is React, Vue, Angular, Svelte, or vanilla JS. It doesn't care how your frontend is built.

### Does it work with TypeScript?

Yes. rendermw is written in TypeScript and ships full type declarations (`.d.ts` files). All types — `RenderOptions`, `RenderRoute`, `RenderPayload`, `Breadcrumb` — are exported and available for import:

```ts
import rendermw from 'rendermw';
import type { RenderPayload, RenderOptions } from 'rendermw';
```

### What bots does it detect?

The built-in list includes 30+ crawlers covering all major search engines (Google, Bing, Yahoo, Baidu, Yandex, DuckDuckGo), social platforms (Facebook, Twitter/X, LinkedIn, WhatsApp, Telegram, Discord, Slack), SEO tools (Semrush, Ahrefs, Moz), and Google's specialised bots (AdsBot, APIs-Google, Google Favicon, Googlebot-Image, Google-InspectionTool, Lighthouse). You can add additional patterns via the `bots` option.

### What if my render() function throws?

rendermw catches errors in `render()`, logs them to `console.error`, and calls `next()`. Your normal Express handler then serves the request (typically your SPA shell). The server **never crashes**. The bot gets your SPA shell as a fallback, which is the same behaviour as not having rendermw at all.

---

## Built-in bot list

Googlebot, Bingbot, Slurp (Yahoo), DuckDuckBot, Baiduspider, YandexBot, Sogou, Exabot, facebot, facebookexternalhit, Twitterbot, LinkedInBot, WhatsApp, TelegramBot, Discordbot, Slackbot, Applebot, Pinterestbot, Semrushbot, Ahrefsbot, Mj12bot, DotBot, Screaming Frog, GTmetrix, Lighthouse, Google-InspectionTool, Googlebot-Image, Googlebot-Video, Mediapartners-Google, AdsBot-Google, APIs-Google, Google Favicon

---

## License

MIT — see [LICENSE](./LICENSE)

## Author

Chandra Bhayal / [brighteyekid](https://github.com/brighteyekid)

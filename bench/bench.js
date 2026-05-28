/**
 * rendermw benchmark
 * Run: node bench/bench.js
 *
 * Measures:
 *   1. isBot() — non-bot (the hot path, must be near zero)
 *   2. isBot() — bot detection
 *   3. RenderCache.get() — hit
 *   4. RenderCache.get() — miss
 *   5. RenderCache.set()
 *   6. matchPath() — no match
 *   7. matchPath() — match with params
 *   8. buildShell() — full HTML document generation
 *   9. Full middleware round-trip — non-bot (supertest overhead excluded via direct call)
 *  10. Full middleware round-trip — bot, cache miss
 *  11. Full middleware round-trip — bot, cache hit
 */

'use strict';

const { performance } = require('perf_hooks');

// Import from dist (run `npm run build` first)
const { isBot, RenderCache, buildShell, _matchPath: matchPath } = require('../dist/index');

const ITERATIONS = 500_000;
const WARMUP = 10_000;

const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function bench(label, fn, iterations = ITERATIONS) {
  // warmup
  for (let i = 0; i < WARMUP; i++) fn();

  // measure
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const end = performance.now();

  const totalMs = end - start;
  const nsPerOp = (totalMs * 1_000_000) / iterations;
  const opsPerSec = Math.round(iterations / (totalMs / 1000));

  return { label, totalMs, nsPerOp, opsPerSec, iterations };
}

function printResult(r) {
  const ns = r.nsPerOp < 1000
    ? `${r.nsPerOp.toFixed(1)} ns/op`
    : `${(r.nsPerOp / 1000).toFixed(2)} µs/op`;
  const ops = `${(r.opsPerSec / 1_000_000).toFixed(2)}M ops/sec`;
  console.log(
    `  ${CYAN}${r.label.padEnd(45)}${RESET}` +
    `${GREEN}${ns.padStart(14)}${RESET}` +
    `${YELLOW}${ops.padStart(20)}${RESET}`
  );
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const GOOGLEBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const TWITTER_UA = 'Twitterbot/1.0';

const payload = {
  title: 'Nike Air Max 270 — My Store',
  description: 'Experience the biggest Air unit yet with the Nike Air Max 270.',
  canonical: 'https://mystore.com/products/nike-air-max',
  ogImage: '/images/nike-air-max.jpg',
  ogType: 'product',
  schema: {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Nike Air Max 270',
    offers: { '@type': 'Offer', price: '150', priceCurrency: 'USD' },
  },
  breadcrumbs: [
    { name: 'Home', url: 'https://mystore.com' },
    { name: 'Products', url: 'https://mystore.com/products' },
    { name: 'Nike Air Max 270', url: 'https://mystore.com/products/nike-air-max' },
  ],
  html: '<main><h1>Nike Air Max 270</h1><p>Experience the biggest Air unit yet.</p></main>',
};

const cache = new RenderCache();
cache.set('/products/nike-air-max', '<html>cached</html>', 3600);

// ── Run benchmarks ───────────────────────────────────────────────────────────

console.log();
console.log(`${BOLD}rendermw benchmark${RESET}  ${DIM}(${ITERATIONS.toLocaleString()} iterations each)${RESET}`);
console.log();
console.log(`  ${'Benchmark'.padEnd(45)}${'Speed'.padStart(14)}${'Throughput'.padStart(20)}`);
console.log('  ' + '─'.repeat(79));

const results = [
  bench('isBot() — non-bot (Chrome UA)', () => isBot(CHROME_UA)),
  bench('isBot() — Googlebot', () => isBot(GOOGLEBOT_UA)),
  bench('isBot() — Twitterbot', () => isBot(TWITTER_UA)),
  bench('isBot() — with 5 extra custom bots', () => isBot(CHROME_UA, ['a', 'b', 'c', 'd', 'e'])),
  bench('RenderCache.get() — hit', () => cache.get('/products/nike-air-max')),
  bench('RenderCache.get() — miss', () => cache.get('/products/not-exist')),
  bench('RenderCache.set() — new key', (() => {
    let i = 0;
    return () => cache.set(`/k${i++}`, '<html/>', 60);
  })()),
  bench('matchPath() — no match', () => matchPath('/products/:slug', '/blog/hello')),
  bench('matchPath() — match, 1 param', () => matchPath('/products/:slug', '/products/nike-air-max')),
  bench('matchPath() — match, 2 params', () => matchPath('/shop/:cat/:id', '/shop/shoes/12345')),
  bench('buildShell() — title+desc+canonical', () => buildShell({ title: 'T', description: 'D', canonical: 'https://x.com/', html: '<h1>T</h1>' }, 'https://x.com'), 100_000),
  bench('buildShell() — full payload (schema+breadcrumbs+ogImage)', () => buildShell(payload, 'https://mystore.com'), 100_000),
];

results.forEach(printResult);

console.log();
console.log(`  ${DIM}Measured on Node.js ${process.version} — ${process.platform} ${process.arch}${RESET}`);
console.log();

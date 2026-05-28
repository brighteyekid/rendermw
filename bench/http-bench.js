/**
 * rendermw HTTP benchmark
 *
 * Real-world Express middleware benchmark using autocannon.
 *
 * Measures:
 *   1. Plain Express
 *   2. rendermw — non-bot request
 *   3. rendermw — bot request (cache miss)
 *   4. rendermw — bot request (cache hit)
 *
 * ------------------------------------------------------------
 * Install:
 *
 *   npm install -D autocannon
 *
 * Build:
 *
 *   npm run build
 *
 * Run:
 *
 *   node bench/http-bench.js
 *
 * Optional:
 *
 *   CONNECTIONS=200 DURATION=20 node bench/http-bench.js
 *
 * ------------------------------------------------------------
 */

'use strict';

const express = require('express');
const autocannon = require('autocannon');

const rendermwModule = require('../dist/index');
const rendermw = rendermwModule.default || rendermwModule;

const PORT = 3131;

const CONNECTIONS = Number(process.env.CONNECTIONS || 100);
const DURATION = Number(process.env.DURATION || 10);

const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const MAG = '\x1b[35m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatReqs(n) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
    return `${n}`;
}

function formatLatency(ms) {
    if (ms == null || isNaN(ms)) return 'N/A';
    if (ms < 1) return `${(ms * 1000).toFixed(2)} µs`;
    return `${ms.toFixed(2)} ms`;
}

async function runScenario(name, setup, headers = {}) {
    const app = express();

    await setup(app);

    const server = app.listen(PORT);

    await sleep(250);

    const result = await autocannon({
        url: `http://localhost:${PORT}/products/nike-air-max`,
        connections: CONNECTIONS,
        duration: DURATION,
        pipelining: 1,
        headers,
    });

    await new Promise(resolve => server.close(resolve));

    const stats = {
        name,
        reqSec: result.requests.average,
        latencyAvg: result.latency.average,
        latencyP95: result.latency.p95,
        latencyP99: result.latency.p99,
        throughput: result.throughput.average,
    };

    printScenario(stats);

    return stats;
}

function printScenario(r) {
    console.log();
    console.log(`${BOLD}${CYAN}${r.name}${RESET}`);
    console.log('  ' + '─'.repeat(72));

    console.log(
        `${YELLOW}Requests/sec${RESET}`.padEnd(24) +
        `${GREEN}${formatReqs(Math.round(r.reqSec))}${RESET}`
    );

    console.log(
        `${YELLOW}Avg latency${RESET}`.padEnd(24) +
        `${GREEN}${formatLatency(r.latencyAvg)}${RESET}`
    );

    console.log(
        `${YELLOW}p95 latency${RESET}`.padEnd(24) +
        `${GREEN}${formatLatency(r.latencyP95)}${RESET}`
    );

    console.log(
        `${YELLOW}p99 latency${RESET}`.padEnd(24) +
        `${GREEN}${formatLatency(r.latencyP99)}${RESET}`
    );

    console.log(
        `${YELLOW}Throughput${RESET}`.padEnd(24) +
        `${GREEN}${r.throughput ? (r.throughput / 1024 / 1024).toFixed(2) + ' MB/sec' : 'N/A'}${RESET}`
    );
}

const payload = {
    title: 'Nike Air Max 270 — My Store',
    description: 'Experience the biggest Air unit yet.',
    canonical: 'https://mystore.com/products/nike-air-max',
    ogImage: '/images/nike-air-max.jpg',
    ogType: 'product',

    schema: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Nike Air Max 270',
        offers: {
            '@type': 'Offer',
            price: '150',
            priceCurrency: 'USD',
        },
    },

    breadcrumbs: [
        {
            name: 'Home',
            url: 'https://mystore.com',
        },
        {
            name: 'Products',
            url: 'https://mystore.com/products',
        },
        {
            name: 'Nike Air Max 270',
            url: 'https://mystore.com/products/nike-air-max',
        },
    ],

    html: `
    <main>
      <h1>Nike Air Max 270</h1>
      <p>Experience the biggest Air unit yet.</p>
    </main>
  `,
};

(async () => {
    console.log();
    console.log(
        `${BOLD}${MAG}rendermw HTTP benchmark${RESET} ` +
        `${DIM}(Express + autocannon)${RESET}`
    );

    console.log();
    console.log(
        `${DIM}connections=${CONNECTIONS} duration=${DURATION}s${RESET}`
    );

    const results = [];

    // ------------------------------------------------------------
    // 1. Plain Express
    // ------------------------------------------------------------

    results.push(await runScenario(
        '1. Plain Express',
        async (app) => {
            app.get('/products/nike-air-max', (_req, res) => {
                res.send('<html><body><h1>Hello</h1></body></html>');
            });
        }
    ));

    // ------------------------------------------------------------
    // 2. rendermw — non-bot
    // ------------------------------------------------------------

    results.push(await runScenario(
        '2. rendermw — non-bot request',
        async (app) => {
            app.use(rendermw({
                siteUrl: 'https://mystore.com',

                routes: [
                    {
                        path: '/products/:slug',

                        render: async () => payload,
                    },
                ],
            }));

            app.get('/products/nike-air-max', (_req, res) => {
                res.send('<html><body><div id="root"></div></body></html>');
            });
        }
    ));

    // ------------------------------------------------------------
    // 3. rendermw — bot request (cache miss)
    // ------------------------------------------------------------

    results.push(await runScenario(
        '3. rendermw — bot request (cache miss)',
        async (app) => {
            app.use(rendermw({
                siteUrl: 'https://mystore.com',

                cache: false,

                routes: [
                    {
                        path: '/products/:slug',

                        render: async () => payload,
                    },
                ],
            }));

            app.get('/products/nike-air-max', (_req, res) => {
                res.send('<html><body><div id="root"></div></body></html>');
            });
        },

        {
            'user-agent': 'Googlebot/2.1',
        }
    ));

    // ------------------------------------------------------------
    // 4. rendermw — bot request (cache hit)
    // ------------------------------------------------------------

    results.push(await runScenario(
        '4. rendermw — bot request (cache hit)',
        async (app) => {
            app.use(rendermw({
                siteUrl: 'https://mystore.com',

                cache: true,
                cacheTTL: 3600,

                routes: [
                    {
                        path: '/products/:slug',

                        render: async () => payload,
                    },
                ],
            }));

            app.get('/products/nike-air-max', (_req, res) => {
                res.send('<html><body><div id="root"></div></body></html>');
            });
        },

        {
            'user-agent': 'Googlebot/2.1',
        }
    ));

    // ------------------------------------------------------------
    // Summary
    // ------------------------------------------------------------

    console.log();
    console.log(`${BOLD}${CYAN}Summary${RESET}`);
    console.log('  ' + '─'.repeat(100));

    console.log(
        '  ' +
        'Scenario'.padEnd(42) +
        'Req/sec'.padStart(14) +
        'Avg'.padStart(14) +
        'p95'.padStart(14) +
        'p99'.padStart(14)
    );

    console.log('  ' + '─'.repeat(100));

    for (const r of results) {
        console.log(
            '  ' +
            r.name.padEnd(42) +
            formatReqs(Math.round(r.reqSec)).padStart(14) +
            formatLatency(r.latencyAvg).padStart(14) +
            formatLatency(r.latencyP95).padStart(14) +
            formatLatency(r.latencyP99).padStart(14)
        );
    }

    console.log();
    console.log(
        `${DIM}Measured on Node.js ${process.version} • ${process.platform} ${process.arch}${RESET}`
    );
    console.log();
})();
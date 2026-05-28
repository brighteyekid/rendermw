/**
 * express-prisma example — rendermw with Prisma ORM
 *
 * This example shows how to wire rendermw to a real database via Prisma.
 * The actual Prisma client calls are shown in comments — replace the fake
 * data below with real Prisma queries once your schema is set up.
 *
 * Assumed Prisma schema (prisma/schema.prisma):
 *
 *   model Product {
 *     id          String   @id @default(cuid())
 *     slug        String   @unique
 *     name        String
 *     description String
 *     price       Decimal
 *     imageUrl    String?
 *   }
 *
 *   model Post {
 *     id          String   @id @default(cuid())
 *     slug        String   @unique
 *     title       String
 *     excerpt     String
 *     content     String
 *     author      String
 *     publishedAt DateTime
 *   }
 *
 * Setup:
 *   npm install @prisma/client
 *   npx prisma generate
 *   node examples/express-prisma/index.js
 */

const express = require('express');
// In your project: const rendermw = require('rendermw');
const rendermw = require('../../dist/index');

// Step 1: Import and instantiate the Prisma client.
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// ── Simulated Prisma responses (remove when using a real DB) ──────────────────

/**
 * Simulates: prisma.product.findUnique({ where: { slug } })
 */
async function findProductBySlug(slug) {
  // Replace this with: return prisma.product.findUnique({ where: { slug } });
  const fakeDb = {
    'nike-air-max': {
      slug: 'nike-air-max',
      name: 'Nike Air Max 270',
      description: 'Experience the biggest Air unit yet.',
      price: 150.0,
      imageUrl: '/images/nike-air-max.jpg',
    },
  };
  return fakeDb[slug] ?? null;
}

/**
 * Simulates: prisma.post.findUnique({ where: { slug } })
 */
async function findPostBySlug(slug) {
  // Replace this with: return prisma.post.findUnique({ where: { slug } });
  const fakeDb = {
    'how-to-choose-running-shoes': {
      slug: 'how-to-choose-running-shoes',
      title: 'How to Choose the Perfect Running Shoes',
      excerpt: 'Finding the right running shoes can make or break your training.',
      content: '<p>Full article content here...</p>',
      author: 'Chandra Bhayal',
      publishedAt: new Date('2024-01-15'),
    },
  };
  return fakeDb[slug] ?? null;
}

// ── rendermw middleware ───────────────────────────────────────────────────────

app.use(
  rendermw({
    siteUrl: 'https://mystore.com',
    debug: process.env.NODE_ENV !== 'production',
    cacheTTL: 86400, // 24 hours — set lower (e.g. 300) during development

    routes: [
      // ── Product page ──────────────────────────────────────────────────────
      {
        path: '/products/:slug',

        /**
         * Step 2: The render() function is called only when a bot visits this route.
         * It receives URL params and query string, then returns a RenderPayload.
         */
        render: async ({ slug }, query) => {
          // Step 3: Query your database. This is where Prisma shines.
          const product = await findProductBySlug(slug);

          // Step 4: Handle not-found gracefully.
          // The middleware will serve this minimal payload to the bot rather than crashing.
          if (!product) {
            return {
              title: 'Product Not Found',
              description: 'The requested product does not exist.',
              canonical: `https://mystore.com/products/${slug}`,
              html: '<h1>Product Not Found</h1><p>Try searching for another product.</p>',
            };
          }

          // Step 5: Build your RenderPayload from real data.
          const priceStr = product.price.toFixed(2);

          return {
            title: `${product.name} — Buy Now | My Store`,
            description: product.description,
            canonical: `https://mystore.com/products/${product.slug}`,
            ogImage: product.imageUrl ?? undefined,
            ogType: 'product',

            // Step 6: Provide structured data. This is what makes your product
            // eligible for Google's rich result features (price, availability, etc.)
            schema: {
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name,
              description: product.description,
              image: product.imageUrl
                ? `https://mystore.com${product.imageUrl}`
                : undefined,
              offers: {
                '@type': 'Offer',
                price: priceStr,
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                url: `https://mystore.com/products/${product.slug}`,
              },
            },

            // Step 7: Breadcrumbs are auto-converted to BreadcrumbList JSON-LD.
            breadcrumbs: [
              { name: 'Home', url: 'https://mystore.com' },
              { name: 'Products', url: 'https://mystore.com/products' },
              { name: product.name, url: `https://mystore.com/products/${product.slug}` },
            ],

            // Step 8: Semantic HTML for the bot to index.
            // Keep this lightweight — it only needs to be readable, not interactive.
            html: `
              <main itemscope itemtype="https://schema.org/Product">
                <h1 itemprop="name">${product.name}</h1>
                <p itemprop="description">${product.description}</p>
                <p><strong>$${priceStr}</strong></p>
                <a href="/products/${product.slug}/buy">Buy Now</a>
              </main>
            `,
          };
        },
      },

      // ── Blog post ─────────────────────────────────────────────────────────
      {
        path: '/blog/:slug',

        render: async ({ slug }) => {
          const post = await findPostBySlug(slug);

          if (!post) {
            return {
              title: 'Post Not Found',
              description: 'The requested blog post does not exist.',
              canonical: `https://mystore.com/blog/${slug}`,
              html: '<h1>Post Not Found</h1>',
            };
          }

          const dateStr = post.publishedAt.toISOString().split('T')[0];

          return {
            title: `${post.title} | My Store Blog`,
            description: post.excerpt,
            canonical: `https://mystore.com/blog/${post.slug}`,
            ogType: 'article',
            schema: {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: post.title,
              description: post.excerpt,
              author: {
                '@type': 'Person',
                name: post.author,
              },
              datePublished: dateStr,
              publisher: {
                '@type': 'Organization',
                name: 'My Store',
                url: 'https://mystore.com',
              },
            },
            breadcrumbs: [
              { name: 'Home', url: 'https://mystore.com' },
              { name: 'Blog', url: 'https://mystore.com/blog' },
              { name: post.title, url: `https://mystore.com/blog/${post.slug}` },
            ],
            html: `
              <article>
                <h1>${post.title}</h1>
                <p><em>By ${post.author} — ${dateStr}</em></p>
                <p>${post.excerpt}</p>
                ${post.content}
              </article>
            `,
          };
        },
      },
    ],
  })
);

const app = express();

// Step 9: Serve your SPA for all other routes.
// Bots that hit /products/:slug get SEO HTML from rendermw above.
// Real users get this — your React/Vue/Angular app takes over client-side.
app.get('*', (_req, res) => {
  res.sendFile('index.html', { root: './public' });
});

// Step 10: Start the server.
const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

// Step 11: Graceful shutdown — close Prisma connection when the process exits.
process.on('SIGTERM', async () => {
  // await prisma.$disconnect();
  process.exit(0);
});

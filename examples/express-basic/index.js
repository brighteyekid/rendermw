/**
 * express-basic example — rendermw with hardcoded fake data
 *
 * Run:  node examples/express-basic/index.js
 * Then: curl -A "Googlebot" http://localhost:3000/products/nike-air-max
 *
 * You'll get a complete SEO HTML document back. Regular browsers get {passedThrough: true}.
 */

const express = require('express');
// In your project: const rendermw = require('rendermw');
const rendermw = require('../../dist/index');

const app = express();

// ── Fake data store (no database needed for this example) ─────────────────────

const products = {
  'nike-air-max': {
    name: 'Nike Air Max 270',
    description: 'Experience the biggest Air unit yet with the Nike Air Max 270.',
    price: '$150',
    image: '/images/nike-air-max.jpg',
  },
  'adidas-ultraboost': {
    name: 'Adidas Ultraboost 23',
    description: 'Responsive Boost midsole cushioning for an incredible ride.',
    price: '$190',
    image: '/images/adidas-ultraboost.jpg',
  },
};

const posts = {
  'how-to-choose-running-shoes': {
    title: 'How to Choose the Perfect Running Shoes',
    excerpt: 'Finding the right running shoes can make or break your training.',
    author: 'Chandra Bhayal',
    date: '2024-01-15',
  },
  'best-sneakers-2024': {
    title: 'Best Sneakers of 2024',
    excerpt: 'Our editors pick the top sneakers for every occasion this year.',
    author: 'Chandra Bhayal',
    date: '2024-01-20',
  },
};

// ── rendermw middleware ───────────────────────────────────────────────────────

app.use(
  rendermw({
    siteUrl: 'https://mysneakerstore.com',
    debug: true,   // logs every bot hit to the console
    cacheTTL: 3600, // 1 hour
    routes: [
      // ── Homepage ────────────────────────────────────────────────────────────
      {
        path: '/',
        render: async () => ({
          title: 'My Sneaker Store — Premium Footwear',
          description: 'Shop the best sneakers from Nike, Adidas, and more. Free shipping.',
          canonical: 'https://mysneakerstore.com/',
          ogImage: '/images/og-home.jpg',
          schema: {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'My Sneaker Store',
            url: 'https://mysneakerstore.com',
          },
          breadcrumbs: [{ name: 'Home', url: 'https://mysneakerstore.com' }],
          html: `
            <main>
              <h1>My Sneaker Store</h1>
              <p>Premium footwear from the world's best brands.</p>
              <section>
                <h2>Featured Products</h2>
                <ul>
                  <li><a href="/products/nike-air-max">Nike Air Max 270</a></li>
                  <li><a href="/products/adidas-ultraboost">Adidas Ultraboost 23</a></li>
                </ul>
              </section>
            </main>
          `,
        }),
      },

      // ── Product page ─────────────────────────────────────────────────────────
      {
        path: '/products/:slug',
        render: async ({ slug }) => {
          const product = products[slug];

          if (!product) {
            // Return minimal payload for unknown products — middleware will serve it
            return {
              title: 'Product Not Found',
              description: 'This product could not be found.',
              canonical: `https://mysneakerstore.com/products/${slug}`,
              html: '<h1>Product Not Found</h1>',
            };
          }

          return {
            title: `${product.name} — My Sneaker Store`,
            description: product.description,
            canonical: `https://mysneakerstore.com/products/${slug}`,
            ogImage: product.image,
            ogType: 'product',
            schema: {
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name,
              description: product.description,
              image: `https://mysneakerstore.com${product.image}`,
              offers: {
                '@type': 'Offer',
                price: product.price.replace('$', ''),
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
              },
            },
            breadcrumbs: [
              { name: 'Home', url: 'https://mysneakerstore.com' },
              { name: 'Products', url: 'https://mysneakerstore.com/products' },
              { name: product.name, url: `https://mysneakerstore.com/products/${slug}` },
            ],
            html: `
              <main>
                <h1>${product.name}</h1>
                <p>${product.description}</p>
                <p><strong>Price: ${product.price}</strong></p>
                <a href="/cart/add/${slug}">Add to Cart</a>
              </main>
            `,
          };
        },
      },

      // ── Blog post ─────────────────────────────────────────────────────────────
      {
        path: '/blog/:slug',
        render: async ({ slug }) => {
          const post = posts[slug];

          if (!post) {
            return {
              title: 'Post Not Found',
              description: 'This blog post could not be found.',
              canonical: `https://mysneakerstore.com/blog/${slug}`,
              html: '<h1>Post Not Found</h1>',
            };
          }

          return {
            title: `${post.title} — My Sneaker Store Blog`,
            description: post.excerpt,
            canonical: `https://mysneakerstore.com/blog/${slug}`,
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
              datePublished: post.date,
            },
            breadcrumbs: [
              { name: 'Home', url: 'https://mysneakerstore.com' },
              { name: 'Blog', url: 'https://mysneakerstore.com/blog' },
              { name: post.title, url: `https://mysneakerstore.com/blog/${slug}` },
            ],
            html: `
              <article>
                <h1>${post.title}</h1>
                <p><em>By ${post.author} on ${post.date}</em></p>
                <p>${post.excerpt}</p>
              </article>
            `,
          };
        },
      },
    ],
  })
);

// ── SPA fallback — serve your React/Vue/Angular app here ──────────────────────

app.get('*', (_req, res) => {
  res.send('<html><body><div id="root"></div></body></html>');
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('');
  console.log('Test with:');
  console.log('  curl -A "Googlebot" http://localhost:3000/');
  console.log('  curl -A "Googlebot" http://localhost:3000/products/nike-air-max');
  console.log('  curl -A "Googlebot" http://localhost:3000/blog/best-sneakers-2024');
  console.log('  curl http://localhost:3000/products/nike-air-max  # real user — passes through');
});

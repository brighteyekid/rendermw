# rendermw website

This branch contains the source code for the single-page documentation and marketing website for `rendermw`.

The actual NPM package source code, tests, and examples are located on the [`main` branch](https://github.com/brighteyekid/rendermw/tree/main).

### Development

The website is a pure HTML, zero-build-step page located at `website/index.html`.

You can preview it locally by just opening `website/index.html` in your browser.

### Deployment

This branch is configured for automatic deployment on Vercel. Any pushes to this branch will trigger a static deployment of `website/index.html` at the root path.

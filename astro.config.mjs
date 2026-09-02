// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Deployed via Cloudflare's dashboard Git integration, which assigned this project the
// account-subdomain URL below rather than a *.pages.dev one — served from its domain
// root either way, so there is no base path. `base` is left at its default of '/'.
// src/lib/url.ts still mediates every internal link, so the site can move under a
// sub-path (or onto a custom domain, see docs/setup.md) by changing `site`/`base` here
// and nothing else.
export default defineConfig({
  site: 'https://cloudflare-blog.aumnidigital-work.workers.dev',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // /search/ is a client-side tool, not content, and is marked noindex.
      filter: (page) => !page.endsWith('/search/'),
    }),
  ],
  image: {
    // Remote featured images (a pasted stock-photo URL, say) are downloaded at
    // build time, resized and served from this origin — so they get the same
    // treatment as local uploads and cost the reader no third-party request.
    remotePatterns: [{ protocol: 'https' }],
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: true,
    },
  },
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TOOLS_CATALOG } from '../../src/data/toolsCatalog.js';
import { BLOG_POSTS } from '../../src/data/blogPosts.js';
import {
  DEFAULT_OG_IMAGE,
  PAGE_SEO,
  SITE_LOGO,
  SITE_URL,
  TOOL_SEO,
  buildBlogPostSchema,
  buildCanonicalUrl,
  buildHubSchema,
  buildToolPageSchema,
  getSitemapEntries,
  getToolSeoByRoute,
} from '../../src/data/seoMetadata.js';
import { buildSitemapXml } from '../../scripts/generate-sitemap.mjs';
import { renderRouteHtml } from '../../scripts/prerender-seo.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

describe('Sitemap, Robots & Website Visibility Assets', () => {
  it('public/sitemap.xml exists, matches generated XML, and contains every public route without duplicates', () => {
    const sitemapPath = path.join(ROOT_DIR, 'public', 'sitemap.xml');
    assert.ok(fs.existsSync(sitemapPath), 'Missing public/sitemap.xml');

    const xml = fs.readFileSync(sitemapPath, 'utf8');
    assert.equal(xml, buildSitemapXml(), 'public/sitemap.xml is out of sync; run npm run sitemap');

    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));

    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    assert.ok(locs.length >= 25, `Expected at least 25 sitemap URLs, got ${locs.length}`);
    assert.equal(new Set(locs).size, locs.length, 'Duplicate <loc> found in sitemap.xml');

    // Every tool in TOOLS_CATALOG must be present (including /image-extractor and /product-description)
    for (const tool of TOOLS_CATALOG) {
      const expectedLoc = buildCanonicalUrl(tool.route);
      assert.ok(locs.includes(expectedLoc), `Missing tool URL in sitemap.xml: ${expectedLoc}`);
    }

    // Every blog post in BLOG_POSTS must be present
    for (const post of BLOG_POSTS) {
      const expectedLoc = buildCanonicalUrl(`/blog/${post.slug}`);
      assert.ok(locs.includes(expectedLoc), `Missing blog URL in sitemap.xml: ${expectedLoc}`);
    }

    // Every informational/core route must be present
    for (const route of Object.keys(PAGE_SEO)) {
      const expectedLoc = buildCanonicalUrl(route);
      assert.ok(locs.includes(expectedLoc), `Missing page URL in sitemap.xml: ${expectedLoc}`);
    }

    // Validate date and priority formats
    const lastmods = [...xml.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map((m) => m[1]);
    assert.equal(lastmods.length, locs.length);
    for (const d of lastmods) {
      assert.match(d, /^\d{4}-\d{2}-\d{2}$/, `Invalid lastmod date: ${d}`);
    }

    const priorities = [...xml.matchAll(/<priority>(.*?)<\/priority>/g)].map((m) => Number(m[1]));
    assert.equal(priorities.length, locs.length);
    for (const p of priorities) {
      assert.ok(p >= 0 && p <= 1, `Invalid priority value: ${p}`);
    }
  });

  it('public/robots.txt declares sitemap and blocks private workspace endpoints', () => {
    const robotsPath = path.join(ROOT_DIR, 'public', 'robots.txt');
    const txt = fs.readFileSync(robotsPath, 'utf8');
    assert.ok(txt.includes('Allow: /'));
    assert.ok(txt.includes('Disallow: /api/'));
    assert.ok(txt.includes('Disallow: /gst-tool/admin'));
    assert.ok(txt.includes(`Sitemap: ${SITE_URL}/sitemap.xml`));
  });

  it('public/og-image.png, public/logo.png, and public/site.webmanifest exist and are valid', () => {
    const ogBuf = fs.readFileSync(path.join(ROOT_DIR, 'public', 'og-image.png'));
    const logoBuf = fs.readFileSync(path.join(ROOT_DIR, 'public', 'logo.png'));
    // PNG magic bytes: 89 50 4E 47
    assert.equal(ogBuf.subarray(0, 4).toString('hex'), '89504e47');
    assert.equal(logoBuf.subarray(0, 4).toString('hex'), '89504e47');
    assert.ok(ogBuf.length > 10_000, 'og-image.png looks unexpectedly small');
    assert.ok(logoBuf.length > 5_000, 'logo.png looks unexpectedly small');

    const manifest = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'public', 'site.webmanifest'), 'utf8')
    );
    assert.equal(manifest.start_url, '/');
    assert.ok(manifest.icons.some((icon) => icon.src === '/logo.png'));
  });
});

describe('SEO Metadata, Canonical URLs & Structured Data', () => {
  it('buildCanonicalUrl and getToolSeoByRoute normalize full URLs and trailing slashes', () => {
    assert.equal(buildCanonicalUrl('/'), `${SITE_URL}/`);
    assert.equal(buildCanonicalUrl('/cropper/'), `${SITE_URL}/cropper`);
    assert.equal(buildCanonicalUrl('/blog/thermal-printer-shipping-label-guide/?ref=1#top'), `${SITE_URL}/blog/thermal-printer-shipping-label-guide`);
    assert.equal(getToolSeoByRoute('https://tools.lyzov.com/image-resizer')?.id, 'image-resizer');
    assert.equal(getToolSeoByRoute('/image-extractor/')?.id, 'image-extractor');
  });

  it('defines TOOL_SEO metadata and WebApplication + BreadcrumbList + FAQPage JSON-LD for all 12 tools', () => {
    for (const tool of TOOLS_CATALOG) {
      const seo = TOOL_SEO[tool.route];
      assert.ok(seo, `Missing TOOL_SEO entry for ${tool.route}`);
      assert.ok(seo.title.length >= 25);
      assert.ok(seo.description.length >= 80);
      assert.ok(seo.keywords.length >= 20);

      const schema = buildToolPageSchema(seo);
      assert.ok(Array.isArray(schema['@graph']));
      const types = schema['@graph'].map((node) => node['@type']);
      assert.ok(types.includes('WebApplication'));
      assert.ok(types.includes('BreadcrumbList'));
      assert.ok(types.includes('FAQPage'));
    }
  });

  it('builds valid Hub @graph and BlogPosting JSON-LD using real brand image assets', () => {
    const hub = buildHubSchema(TOOLS_CATALOG, [{ q: 'Is it free?', a: 'Yes.' }]);
    const hubTypes = hub['@graph'].map((n) => n['@type']);
    assert.deepEqual(hubTypes, ['Organization', 'WebSite', 'CollectionPage', 'FAQPage']);

    const postSchema = buildBlogPostSchema(BLOG_POSTS[0]);
    const blogPosting = postSchema['@graph'].find((n) => n['@type'] === 'BlogPosting');
    assert.equal(blogPosting.publisher.logo.url, SITE_LOGO);
    assert.equal(blogPosting.image, DEFAULT_OG_IMAGE);
  });

  it('renderRouteHtml injects unique head tags, JSON-LD, and literal dollar prices safely without regex corruption', () => {
    const templateHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
    const entries = getSitemapEntries();
    assert.ok(entries.length >= 25);

    const blogHtml = renderRouteHtml(templateHtml, '/blog/thermal-printer-shipping-label-guide');
    assert.ok(blogHtml.includes('<link rel="canonical" href="https://tools.lyzov.com/blog/thermal-printer-shipping-label-guide" />'));
    assert.ok(blogHtml.includes('<meta property="og:type" content="article" />'));
    assert.ok(blogHtml.includes('($2–$3)'), 'Dollar signs in article text must not be corrupted by String.replace');
    assert.ok(blogHtml.includes('"@type":"BlogPosting"'));

    const extractorHtml = renderRouteHtml(templateHtml, '/image-extractor');
    assert.ok(extractorHtml.includes('<link rel="canonical" href="https://tools.lyzov.com/image-extractor" />'));
    assert.ok(extractorHtml.includes('Product Image Extractor'));
  });
});

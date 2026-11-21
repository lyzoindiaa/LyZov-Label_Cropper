import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOLS_CATALOG, TOOL_CATEGORIES } from '../src/data/toolsCatalog.js';
import { BLOG_POSTS } from '../src/data/blogPosts.js';
import {
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  PAGE_SEO,
  TOOL_SEO,
  buildCanonicalUrl,
  buildHubSchema,
  buildToolPageSchema,
  buildBlogListSchema,
  buildBlogPostSchema,
  buildBreadcrumbSchema,
  getSitemapEntries,
} from '../src/data/seoMetadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function serializeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function replaceOrInsert(html, pattern, replacement) {
  if (pattern.test(html)) {
    return html.replace(pattern, () => replacement);
  }
  return html.replace('</head>', () => `    ${replacement}\n  </head>`);
}

function renderSharedNavAndFooter(contentHtml) {
  const toolLinks = TOOLS_CATALOG.map(
    (t) => `<li><a href="${escapeHtml(t.route)}">${escapeHtml(t.name)} — ${escapeHtml(t.tagline)}</a></li>`
  ).join('\n');

  const infoLinks = [
    { route: '/', label: 'All Tools Hub' },
    { route: '/blog', label: 'Seller Blog & Guides' },
    { route: '/how-to-use', label: 'How to Use' },
    { route: '/faq', label: 'FAQ' },
    { route: '/about', label: 'About Us' },
    { route: '/contact', label: 'Contact Us' },
    { route: '/privacy-policy', label: 'Privacy Policy' },
    { route: '/terms', label: 'Terms of Service' },
    { route: '/disclaimer', label: 'Disclaimer' },
  ]
    .map((l) => `<a href="${escapeHtml(l.route)}">${escapeHtml(l.label)}</a>`)
    .join(' · ');

  return `<main style="max-width:980px;margin:0 auto;padding:36px 20px;line-height:1.65;">
  <header style="margin-bottom:28px;border-bottom:1px solid rgba(148,163,184,0.25);padding-bottom:14px;">
    <a href="/" style="font-weight:800;font-size:1.15rem;text-decoration:none;color:inherit;">${escapeHtml(SITE_NAME)}</a>
  </header>
  ${contentHtml}
  <section style="margin-top:40px;padding-top:24px;border-top:1px solid rgba(148,163,184,0.25);">
    <h2 style="font-size:1.1rem;margin-bottom:12px;">Explore All Browser Tools</h2>
    <ul style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;padding-left:18px;">
      ${toolLinks}
    </ul>
  </section>
  <footer style="margin-top:28px;padding-top:16px;border-top:1px solid rgba(148,163,184,0.25);font-size:0.9rem;">
    ${infoLinks}
  </footer>
</main>`;
}

function buildRouteMetaAndBody(route) {
  if (route === '/') {
    const seo = PAGE_SEO['/'];
    const catHtml = TOOL_CATEGORIES.map((cat) => {
      const catTools = TOOLS_CATALOG.filter((t) => t.categoryId === cat.id);
      const items = catTools
        .map(
          (t) =>
            `<li><a href="${escapeHtml(t.route)}"><strong>${escapeHtml(t.name)}</strong></a>: ${escapeHtml(t.description)}</li>`
        )
        .join('\n');
      return `<section><h2>${escapeHtml(cat.name)}</h2><p>${escapeHtml(cat.description)}</p><ul>${items}</ul></section>`;
    }).join('\n');

    return {
      ...seo,
      ogType: 'website',
      schema: buildHubSchema(TOOLS_CATALOG, []),
      bodyHtml: renderSharedNavAndFooter(`
        <h1>LyZov Tools — Free Browser-Based Image, PDF &amp; E-Commerce Tools</h1>
        <p>${escapeHtml(seo.description)}</p>
        ${catHtml}
      `),
    };
  }

  if (TOOL_SEO[route]) {
    const toolSeo = TOOL_SEO[route];
    const highlightsHtml = (toolSeo.highlights || [])
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('\n');
    const faqHtml = (toolSeo.faqs || [])
      .map((f) => `<div><h3>${escapeHtml(f.q)}</h3><p>${escapeHtml(f.a)}</p></div>`)
      .join('\n');

    return {
      title: toolSeo.title,
      description: toolSeo.description,
      keywords: toolSeo.keywords,
      ogType: 'website',
      schema: buildToolPageSchema(toolSeo),
      bodyHtml: renderSharedNavAndFooter(`
        <article>
          <h1>${escapeHtml(toolSeo.h1)}</h1>
          <p>${escapeHtml(toolSeo.description)}</p>
          <p>${escapeHtml(toolSeo.overview)}</p>
          <h2>Key Highlights</h2>
          <ul>${highlightsHtml}</ul>
          ${faqHtml ? `<h2>Frequently Asked Questions</h2>${faqHtml}` : ''}
        </article>
      `),
    };
  }

  if (route === '/blog') {
    const seo = PAGE_SEO['/blog'];
    const postsHtml = BLOG_POSTS.map(
      (post) =>
        `<article><h2><a href="/blog/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h2><p>${escapeHtml(post.excerpt)}</p></article>`
    ).join('\n');

    return {
      ...seo,
      ogType: 'website',
      schema: buildBlogListSchema(BLOG_POSTS),
      bodyHtml: renderSharedNavAndFooter(`
        <h1>E-Commerce Seller Blog &amp; Guides</h1>
        <p>${escapeHtml(seo.description)}</p>
        ${postsHtml}
      `),
    };
  }

  if (route.startsWith('/blog/')) {
    const slug = route.replace('/blog/', '');
    const post = BLOG_POSTS.find((p) => p.slug === slug);
    if (post) {
      const blocksHtml = (post.content || [])
        .map((block) => {
          if (block.type === 'intro' || block.type === 'paragraph') {
            return `<p>${escapeHtml(block.text)}</p>`;
          }
          if (block.type === 'heading') {
            return `<h2>${escapeHtml(block.text)}</h2>`;
          }
          if (block.type === 'callout') {
            return `<aside><strong>${escapeHtml(block.title || '')}</strong><p>${escapeHtml(block.text)}</p></aside>`;
          }
          if (block.type === 'steps' && Array.isArray(block.items)) {
            return `<ol>${block.items.map((s) => `<li><strong>${escapeHtml(s.title)}</strong>: ${escapeHtml(s.desc)}</li>`).join('')}</ol>`;
          }
          if (block.type === 'table' && Array.isArray(block.headers)) {
            const th = block.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
            const trs = (block.rows || [])
              .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
              .join('');
            return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
          }
          return '';
        })
        .join('\n');

      return {
        title: `${post.title} | LyZov Guides`,
        description: post.excerpt,
        keywords: Array.isArray(post.tags) ? post.tags.join(', ') : '',
        ogType: 'article',
        schema: buildBlogPostSchema(post),
        bodyHtml: renderSharedNavAndFooter(`
          <article>
            <nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/blog">Blog &amp; Guides</a> / <span>${escapeHtml(post.category)}</span></nav>
            <h1>${escapeHtml(post.title)}</h1>
            <p>${escapeHtml(post.excerpt)}</p>
            ${blocksHtml}
          </article>
        `),
      };
    }
  }

  const pageSeo = PAGE_SEO[route] || PAGE_SEO['/'];
  const pageTitle = pageSeo.title.split('|')[0].trim();
  const schema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: pageTitle, path: route },
  ]);

  return {
    ...pageSeo,
    ogType: 'website',
    schema,
    bodyHtml: renderSharedNavAndFooter(`
      <article>
        <h1>${escapeHtml(pageTitle)}</h1>
        <p>${escapeHtml(pageSeo.description)}</p>
      </article>
    `),
  };
}

export function renderRouteHtml(templateHtml, route) {
  const meta = buildRouteMetaAndBody(route);
  const canonicalUrl = buildCanonicalUrl(route);

  let html = templateHtml;
  html = replaceOrInsert(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);
  html = replaceOrInsert(
    html,
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta\s+name=["']keywords["'][^>]*>/i,
    `<meta name="keywords" content="${escapeHtml(meta.keywords || '')}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta\s+name=["']robots["'][^>]*>/i,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`
  );
  html = replaceOrInsert(
    html,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta\s+property=["']og:type["'][^>]*>/i,
    `<meta property="og:type" content="${escapeHtml(meta.ogType || 'website')}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta\s+property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta\s+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta\s+property=["']og:image["'][^>]*>/i,
    `<meta property="og:image" content="${escapeHtml(DEFAULT_OG_IMAGE)}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta\s+name=["']twitter:card["'][^>]*>/i,
    `<meta name="twitter:card" content="summary_large_image" />`
  );
  html = replaceOrInsert(
    html,
    /<meta\s+name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta\s+name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta\s+name=["']twitter:image["'][^>]*>/i,
    `<meta name="twitter:image" content="${escapeHtml(DEFAULT_OG_IMAGE)}" />`
  );

  if (meta.schema) {
    html = replaceOrInsert(
      html,
      /<script[^>]*id=["']page-jsonld["'][^>]*>[\s\S]*?<\/script>/i,
      `<script id="page-jsonld" type="application/ld+json">${serializeJsonLd(meta.schema)}</script>`
    );
  }

  html = html.replace(
    /<div\s+id=["']root["']\s*>[\s\S]*?<\/div>/i,
    () => `<div id="root">${meta.bodyHtml}</div>`
  );

  return html;
}

export function prerenderDistRoutes(distDir = DIST_DIR) {
  const indexHtmlPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error(`Missing built index.html at ${indexHtmlPath}. Run vite build first.`);
  }

  const templateHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  const entries = getSitemapEntries();
  const writtenFiles = [];

  for (const entry of entries) {
    const html = renderRouteHtml(templateHtml, entry.route);
    const outPath =
      entry.route === '/'
        ? indexHtmlPath
        : path.join(distDir, `${entry.route.replace(/^\/+/, '')}.html`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, 'utf8');
    writtenFiles.push(outPath);
  }

  return writtenFiles;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const files = prerenderDistRoutes();
  console.log(`Pre-rendered ${files.length} SEO route HTML files in dist/.`);
}

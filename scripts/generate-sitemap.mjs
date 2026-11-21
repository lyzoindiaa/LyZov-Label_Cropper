import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSitemapEntries } from '../src/data/seoMetadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SITEMAP_PATH = path.join(ROOT_DIR, 'public', 'sitemap.xml');

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeXmlComment(str) {
  return String(str).replace(/--+/g, '-');
}

export function buildSitemapXml() {
  const entries = getSitemapEntries();
  const blocks = entries.map((entry) => {
    const commentLine = entry.comment ? `  <!-- ${escapeXmlComment(entry.comment)} -->\n` : '';
    return `${commentLine}  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n    <changefreq>${escapeXml(entry.changefreq)}</changefreq>\n    <priority>${escapeXml(entry.priority)}</priority>\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n${blocks.join('\n\n')}\n\n</urlset>\n`;
}

export function writeSitemapFile(targetPath = SITEMAP_PATH) {
  const xml = buildSitemapXml();
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, xml, 'utf8');
  return targetPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const out = writeSitemapFile();
  const count = getSitemapEntries().length;
  console.log(`Generated ${out} with ${count} URLs.`);
}

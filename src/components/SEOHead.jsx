import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DEFAULT_OG_IMAGE,
  PAGE_SEO,
  SITE_NAME,
  buildCanonicalUrl,
} from '../data/seoMetadata';

function upsertMeta(selector, attrName, attrValue, content) {
  if (!content) return null;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
  return el;
}

/**
 * SEOHead - Dynamic head manager for titles, meta tags, robots directives,
 * canonical URLs, Open Graph / Twitter cards, and JSON-LD structured data.
 */
export default function SEOHead({
  title,
  description,
  keywords,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  noIndex = false,
  schema,
  articleMeta,
}) {
  const location = useLocation();
  const serializedSchema = schema ? JSON.stringify(schema) : '';
  const serializedArticle = articleMeta ? JSON.stringify(articleMeta) : '';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const fullTitle = title
      ? title.includes('LyZov')
        ? title
        : `${title} | ${SITE_NAME}`
      : PAGE_SEO['/'].title;

    document.title = fullTitle;

    const resolvedDescription = description || PAGE_SEO['/'].description;
    const resolvedKeywords = keywords || PAGE_SEO['/'].keywords;
    const canonicalUrl = canonical
      ? buildCanonicalUrl(canonical)
      : buildCanonicalUrl(location.pathname);

    // Core SEO meta tags
    upsertMeta('meta[name="description"]', 'name', 'description', resolvedDescription);
    upsertMeta('meta[name="keywords"]', 'name', 'keywords', resolvedKeywords);
    upsertMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noIndex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );

    // Canonical URL
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalUrl);

    // Open Graph tags
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', ogType);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', resolvedDescription);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', ogImage);

    // Article meta tags (for blog posts)
    const existingPubTime = document.querySelector('meta[property="article:published_time"]');
    const existingSection = document.querySelector('meta[property="article:section"]');
    if (ogType === 'article' && serializedArticle) {
      const parsedArticle = JSON.parse(serializedArticle);
      if (parsedArticle.publishedTime) {
        upsertMeta(
          'meta[property="article:published_time"]',
          'property',
          'article:published_time',
          parsedArticle.publishedTime
        );
      }
      if (parsedArticle.section) {
        upsertMeta(
          'meta[property="article:section"]',
          'property',
          'article:section',
          parsedArticle.section
        );
      }
    } else {
      if (existingPubTime) existingPubTime.remove();
      if (existingSection) existingSection.remove();
    }

    // Twitter Cards
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', resolvedDescription);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);

    // JSON-LD structured data
    let jsonLdScript = document.getElementById('page-jsonld');
    if (serializedSchema) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script');
        jsonLdScript.id = 'page-jsonld';
        jsonLdScript.type = 'application/ld+json';
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = serializedSchema;
    } else if (jsonLdScript) {
      jsonLdScript.remove();
    }
  }, [
    title,
    description,
    keywords,
    canonical,
    ogType,
    ogImage,
    noIndex,
    serializedSchema,
    serializedArticle,
    location.pathname,
  ]);

  return null;
}

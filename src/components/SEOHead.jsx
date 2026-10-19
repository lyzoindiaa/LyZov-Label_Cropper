import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SEOHead - Reusable dynamic head manager for titles, descriptions, canonical links, and JSON-LD schema.
 */
export default function SEOHead({
  title,
  description,
  canonical,
  schema,
}) {
  const location = useLocation();

  useEffect(() => {
    // 1. Title
    const baseSiteName = 'LyZov Tools';
    if (title) {
      document.title = title.includes('LyZov') ? title : `${title} | ${baseSiteName}`;
    }

    // 2. Meta description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);

      // Also sync og:description
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (!ogDesc) {
        ogDesc = document.createElement('meta');
        ogDesc.setAttribute('property', 'og:description');
        document.head.appendChild(ogDesc);
      }
      ogDesc.setAttribute('content', description);
    }

    // 3. Sync og:title
    if (title) {
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.setAttribute('content', title);
    }

    // 4. Canonical URL
    const canonicalUrl = canonical || `https://tools.lyzov.com${location.pathname === '/' ? '' : location.pathname}`;
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalUrl);

    // Also sync og:url
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', canonicalUrl);
    }

    // 5. JSON-LD structured data
    let jsonLdScript = document.getElementById('page-jsonld');
    if (schema) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script');
        jsonLdScript.id = 'page-jsonld';
        jsonLdScript.type = 'application/ld+json';
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = JSON.stringify(schema);
    } else if (jsonLdScript) {
      jsonLdScript.remove();
    }

    window.scrollTo(0, 0);
  }, [title, description, canonical, schema, location.pathname]);

  return null;
}

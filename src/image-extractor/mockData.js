/**
 * Dynamic Mock Data & Extraction Simulator for Product Link to Image Extractor
 * Designed for Step 1 Prototype: 100% Client-Side with zero backend dependencies.
 *
 * Dynamically parses product title and category from any real-world e-commerce URL
 * (e.g. Flipkart, Amazon, Meesho, Myntra) so pasted links reflect their true product
 * rather than a static placeholder.
 */

export const PLATFORMS = {
  amazon: {
    id: 'amazon',
    name: 'Amazon',
    color: '#ff9900',
    bgColor: 'rgba(255, 153, 0, 0.12)',
    borderColor: 'rgba(255, 153, 0, 0.35)',
    domains: ['amazon.in', 'amazon.com', 'amzn.in', 'amzn.to'],
    icon: '📦',
  },
  flipkart: {
    id: 'flipkart',
    name: 'Flipkart',
    color: '#2874f0',
    bgColor: 'rgba(40, 116, 240, 0.12)',
    borderColor: 'rgba(40, 116, 240, 0.35)',
    domains: ['flipkart.com', 'fkrt.it'],
    icon: '⚡',
  },
  meesho: {
    id: 'meesho',
    name: 'Meesho',
    color: '#9c27b0',
    bgColor: 'rgba(156, 39, 176, 0.12)',
    borderColor: 'rgba(156, 39, 176, 0.35)',
    domains: ['meesho.com'],
    icon: '🛍️',
  },
  myntra: {
    id: 'myntra',
    name: 'Myntra',
    color: '#ff3f6c',
    bgColor: 'rgba(255, 63, 108, 0.12)',
    borderColor: 'rgba(255, 63, 108, 0.35)',
    domains: ['myntra.com'],
    icon: '👗',
  },
  generic: {
    id: 'generic',
    name: 'E-Commerce Store',
    color: '#00c9ff',
    bgColor: 'rgba(0, 201, 255, 0.12)',
    borderColor: 'rgba(0, 201, 255, 0.35)',
    domains: [],
    icon: '🌐',
  },
};

/**
 * Escapes raw strings for safe SVG / XML embedding.
 */
function escapeXml(unsafe = '') {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Encodes SVG string to Base64 safely in both browser and Node environments.
 */
function toBase64Svg(svgString) {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svgString)))}`;
  }
  // Node.js fallback
  return `data:image/svg+xml;base64,${Buffer.from(svgString, 'utf-8').toString('base64')}`;
}

// Vector Product Artworks (Clean, high-visibility, studio rendered)
export const SNEAKER_ART = `
  <!-- Athletic Running Shoe Artwork -->
  <path d="M-80,30 C-60,30 -15,32 25,32 C60,32 95,30 110,24 C116,21 117,15 110,11 C98,5 80,-3 62,-11 C50,-17 32,-23 14,-25 C2,-26 -10,-21 -22,-13 C-34,-5 -52,10 -64,19 C-76,25 -80,28 -80,30 Z" fill="#ff4757" />
  <path d="M-86,30 C-35,36 35,36 115,26 C119,32 112,39 98,42 C45,49 -45,49 -86,41 C-90,39 -90,33 -86,30 Z" fill="#f8fafc" />
  <path d="M-12,12 C12,10 42,4 60,-7" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" fill="none" />
  <path d="M-6,21 C18,19 48,13 66,2" stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none" />
  <line x1="8" y1="-10" x2="-1" y2="-5" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
  <line x1="16" y1="-15" x2="7" y2="-10" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
  <line x1="24" y1="-20" x2="15" y2="-15" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
`;

export const WATCH_ART = `
  <!-- Smartwatch Artwork -->
  <rect x="-42" y="-42" width="84" height="84" rx="24" fill="#1e293b" stroke="#38bdf8" stroke-width="4"/>
  <rect x="-18" y="-72" width="36" height="30" rx="6" fill="#475569"/>
  <rect x="-18" y="42" width="36" height="30" rx="6" fill="#475569"/>
  <circle cx="0" cy="0" r="26" fill="#0f172a" stroke="#0ea5e9" stroke-width="2"/>
  <polyline points="0,-12 0,0 8,8" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" fill="none"/>
`;

export const HEADPHONES_ART = `
  <!-- Headphones Artwork -->
  <path d="M-40,-8 C-40,-35 40,-35 40,-8" fill="none" stroke="#a78bfa" stroke-width="8" stroke-linecap="round"/>
  <rect x="-48" y="-12" width="16" height="42" rx="8" fill="#8b5cf6"/>
  <rect x="32" y="-12" width="16" height="42" rx="8" fill="#8b5cf6"/>
  <rect x="-44" y="0" width="10" height="28" rx="5" fill="#c4b5fd"/>
  <rect x="34" y="0" width="10" height="28" rx="5" fill="#c4b5fd"/>
`;

export const SHIRT_ART = `
  <!-- Fashion Apparel Artwork -->
  <path d="M-45,-40 L-22,-48 L0,-32 L22,-48 L45,-40 L38,-15 L26,-18 L26,48 L-26,48 L-26,-18 L-38,-15 Z" fill="#f59e0b"/>
  <path d="M-22,-48 C-15,-32 15,-32 22,-48" fill="#0f172a"/>
  <line x1="0" y1="-25" x2="0" y2="48" stroke="#ffffff" stroke-width="2" stroke-dasharray="4 4"/>
`;

export const GENERIC_ART = `
  <!-- Product Box Artwork -->
  <polygon points="0,-48 44,-24 44,24 0,48 -44,24 -44,-24" fill="#1e293b" stroke="#00c9ff" stroke-width="4"/>
  <line x1="0" y1="-48" x2="0" y2="48" stroke="#00c9ff" stroke-width="3"/>
  <line x1="0" y1="0" x2="44" y2="-24" stroke="#00c9ff" stroke-width="3"/>
  <line x1="0" y1="0" x2="-44" y2="-24" stroke="#00c9ff" stroke-width="3"/>
`;

/**
 * Creates an SVG Data URI representing an ultra-clean product graphic.
 */
export function createMockSvgImage(title, category, primaryColor, accentColor, artworkSvg) {
  const cleanTitle = escapeXml(
    (title || 'Product Photo').length > 44 
      ? (title.slice(0, 42) + '...') 
      : title
  );
  const cleanCategory = escapeXml((category || 'PRODUCT').toUpperCase());

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#080c18" />
        <stop offset="50%" stop-color="#0e172a" />
        <stop offset="100%" stop-color="#050811" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="45%" r="42%">
        <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.35" />
        <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0" />
      </radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000000" flood-opacity="0.6"/>
      </filter>
    </defs>
    
    <!-- Background Canvas -->
    <rect width="1200" height="1200" fill="url(#bg)"/>
    <circle cx="600" cy="520" r="440" fill="url(#glow)"/>
    
    <!-- Grid Accent Lines -->
    <g stroke="rgba(255,255,255,0.04)" stroke-width="1.5">
      <line x1="100" y1="0" x2="100" y2="1200" />
      <line x1="600" y1="0" x2="600" y2="1200" stroke-dasharray="8 8" />
      <line x1="1100" y1="0" x2="1100" y2="1200" />
      <line x1="0" y1="600" x2="1200" y2="600" stroke-dasharray="8 8" />
    </g>

    <!-- Product Pod Card -->
    <rect x="220" y="180" width="760" height="740" rx="40" fill="#0f192e" stroke="rgba(255,255,255,0.08)" stroke-width="2" filter="url(#shadow)" />
    
    <!-- Central Product Artwork -->
    <g transform="translate(600, 480) scale(2.6)">
      ${artworkSvg}
    </g>
    
    <!-- Category Badge -->
    <rect x="280" y="230" width="240" height="42" rx="10" fill="${primaryColor}" fill-opacity="0.2" stroke="${primaryColor}" stroke-opacity="0.5" />
    <text x="400" y="258" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="15" font-weight="bold" fill="${primaryColor}" text-anchor="middle" letter-spacing="1">${cleanCategory}</text>
    
    <!-- Title and Subtitle -->
    <text x="600" y="785" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="32" font-weight="800" fill="#ffffff" text-anchor="middle">${cleanTitle}</text>
    <text x="600" y="835" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="18" fill="#94a3b8" text-anchor="middle">Studio Quality • Original Resolution • Ready to Export</text>
    
    <!-- Watermark / LyZov Badge -->
    <rect x="475" y="960" width="250" height="46" rx="23" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/>
    <circle cx="505" cy="983" r="8" fill="${accentColor}" />
    <text x="605" y="990" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="14" font-weight="bold" fill="#cbd5e1" text-anchor="middle">LyZov Image Extractor</text>
  </svg>`;

  return toBase64Svg(svg);
}

/**
 * Intelligent parser that extracts the actual product title and category from any e-commerce link.
 */
export function parseProductFromUrl(rawUrl = '') {
  try {
    const parsed = new URL(rawUrl.trim());
    const pathname = parsed.pathname;
    const parts = pathname.split('/').filter(Boolean);

    let rawSlug = '';

    // Flipkart pattern: /red-tape-sports-shoes-men-walking/p/itmc3ba08
    if (parsed.hostname.includes('flipkart') || parsed.hostname.includes('fkrt')) {
      if (parts[1] === 'p' && parts[0]) {
        rawSlug = parts[0];
      } else if (parts[0]) {
        rawSlug = parts[0];
      }
    }
    // Amazon pattern: /product-title-slug/dp/B0XXXXX
    else if (parsed.hostname.includes('amazon') || parsed.hostname.includes('amzn')) {
      if (parts[1] === 'dp' && parts[0]) {
        rawSlug = parts[0];
      } else if (parts[0] !== 'dp') {
        rawSlug = parts[0];
      }
    }
    // Myntra pattern: /shoes/brand/product-title-slug/id/buy
    else if (parsed.hostname.includes('myntra')) {
      rawSlug = parts.find(p => p !== 'shoes' && p !== 'buy' && !/^\d+$/.test(p)) || parts[parts.length - 2] || parts[0];
    }
    // Meesho pattern: /s/p/1234 or /product-title/p/1234
    else if (parsed.hostname.includes('meesho')) {
      rawSlug = parts[0] !== 's' ? parts[0] : parts[parts.length - 1];
    }
    // Generic fallback
    else if (parts.length > 0) {
      rawSlug = parts[0] !== 'p' && parts[0] !== 'dp' ? parts[0] : parts[1] || parts[0];
    }

    if (rawSlug) {
      const words = decodeURIComponent(rawSlug)
        .replace(/[._\-+]+/g, ' ')
        .split(' ')
        .filter(w => w && !/^[0-9a-f]{8,}$/i.test(w) && !/^itm[0-9a-z]{6,}$/i.test(w))
        .map(w => {
          const lower = w.toLowerCase();
          if (['red', 'tape', 'boat', 'nike', 'apple', 'puma', 'adidas', 'sony'].includes(lower)) {
            return w.toUpperCase();
          }
          return w.charAt(0).toUpperCase() + lower.slice(1);
        });

      if (words.length > 0) {
        return words.join(' ');
      }
    }
  } catch {
    // If not a valid standard URL, fallback
  }

  return null;
}

export const REAL_CATEGORY_GALLERIES = {
  shoes: [
    '/products/shoes.jpg',
    '/products/shoes_2.jpg',
    '/products/shoes_3.jpg',
    '/products/shoes_4.jpg',
  ],
  sneakers: [
    '/products/shoes.jpg',
    '/products/shoes_2.jpg',
    '/products/shoes_3.jpg',
    '/products/shoes_4.jpg',
  ],
  watch: [
    '/products/watch.jpg',
    '/products/watch_2.jpg',
  ],
  smartwatch: [
    '/products/watch.jpg',
    '/products/watch_2.jpg',
  ],
  apparel: [
    '/products/shirt.jpg',
    '/products/shirt_2.jpg',
  ],
  audio: [
    '/products/headphones.jpg',
  ],
  backpack: [
    '/products/generic.jpg',
  ],
  electronics: [
    '/products/generic.jpg',
  ],
  generic: [
    '/products/generic.jpg',
  ],
};

/**
 * Detects the category and authentic high-resolution product photos from product title or URL.
 */
export function detectCategoryAndIcon(titleOrUrl = '') {
  const text = (titleOrUrl || '').toLowerCase();

  // Footwear / Shoes
  if (/shoe|sneaker|footwear|sandal|boot|loafer|heel|clog|runner|walking|trainer|slides|red tape/i.test(text)) {
    return {
      category: 'Footwear / Shoes',
      artwork: SNEAKER_ART,
      photoUrl: REAL_CATEGORY_GALLERIES.shoes[0],
      gallery: REAL_CATEGORY_GALLERIES.shoes,
      accentColor: '#ff4757',
    };
  }

  // Watches & Wearables
  if (/watch|smartwatch|band|chronograph|dial|boat storm/i.test(text)) {
    return {
      category: 'Wearables / Smartwatches',
      artwork: WATCH_ART,
      photoUrl: REAL_CATEGORY_GALLERIES.watch[0],
      gallery: REAL_CATEGORY_GALLERIES.watch,
      accentColor: '#00d68f',
    };
  }

  // Apparel & Fashion
  if (/shirt|t-shirt|saree|kurti|dress|pant|jeans|hoodie|jacket|cloth|apparel|top|trouser/i.test(text)) {
    return {
      category: 'Clothing / Fashion',
      artwork: SHIRT_ART,
      photoUrl: REAL_CATEGORY_GALLERIES.apparel[0],
      gallery: REAL_CATEGORY_GALLERIES.apparel,
      accentColor: '#f5a623',
    };
  }

  // Electronics & Gadgets
  if (/phone|mobile|iphone|samsung|pixel|earbuds|headphone|audio|speaker|echo|laptop|tablet/i.test(text)) {
    return {
      category: 'Electronics / Audio',
      artwork: HEADPHONES_ART,
      photoUrl: REAL_CATEGORY_GALLERIES.audio[0],
      gallery: REAL_CATEGORY_GALLERIES.audio,
      accentColor: '#a78bfa',
    };
  }

  return {
    category: 'E-Commerce Product',
    artwork: GENERIC_ART,
    photoUrl: REAL_CATEGORY_GALLERIES.generic[0],
    gallery: REAL_CATEGORY_GALLERIES.generic,
    accentColor: '#00c9ff',
  };
}

/**
 * Quick Test Samples for clicking and testing
 */
export const SAMPLE_LINKS = [
  { label: 'Flipkart Shoes', url: 'https://www.flipkart.com/red-tape-sports-shoes-men-walking/p/itmc3ba08', platform: 'flipkart' },
  { label: 'Amazon Alexa', url: 'https://www.amazon.in/dp/B09B8W5FW7', platform: 'amazon' },
  { label: 'Flipkart Watch', url: 'https://www.flipkart.com/boat-storm-call-3-smartwatch/p/itm12345', platform: 'flipkart' },
  { label: 'Meesho Saree', url: 'https://www.meesho.com/kanjivaram-soft-silk-saree/p/4v91a', platform: 'meesho' },
  { label: 'Myntra Sneaker', url: 'https://www.myntra.com/shoes/nike/nike-air-max-excee/12345/buy', platform: 'myntra' },
  { label: 'Simulate 404', url: 'https://www.amazon.in/dp/EXPIRED_PRODUCT_404', platform: 'amazon' },
];

/**
 * Detects the platform identifier from a raw URL.
 */
export function detectPlatform(rawUrl = '') {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim().toLowerCase();

  for (const [key, plat] of Object.entries(PLATFORMS)) {
    if (plat.domains.some((d) => trimmed.includes(d))) {
      return plat;
    }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return PLATFORMS.generic;
  }
  return null;
}

/**
 * Simulates extraction with true-to-life latency, dynamic slug parsing,
 * and edge-case handling.
 */
export async function simulateExtract(url, format = 'png', quality = 90) {
  // Artificial latency for smooth spinner demonstration
  await new Promise((r) => setTimeout(r, 650));

  if (!url || !url.trim()) {
    const err = new Error('Please enter a product URL to extract.');
    err.code = 'INVALID_URL';
    throw err;
  }

  const trimmed = url.trim();

  // Basic URL shape validation
  if (!/^https?:\/\//i.test(trimmed)) {
    const err = new Error('Invalid URL format. Please make sure the link starts with http:// or https://');
    err.code = 'INVALID_URL';
    throw err;
  }

  // Edge Case Simulation triggers
  if (trimmed.includes('EXPIRED_PRODUCT_404') || trimmed.includes('404')) {
    const err = new Error('Product not found or has been delisted by the seller (HTTP 404).');
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (trimmed.includes('timeout-test') || trimmed.includes('timeout')) {
    const err = new Error('Marketplace response timed out after 8,000ms. Please check link and try again.');
    err.code = 'TIMEOUT';
    throw err;
  }

  if (trimmed.includes('unsupported') || trimmed.includes('blocked-site.xyz')) {
    const err = new Error('Unsupported e-commerce platform. We support Amazon, Flipkart, Meesho, Myntra, and custom stores.');
    err.code = 'UNSUPPORTED_PLATFORM';
    throw err;
  }

  // Detect platform
  const platformObj = detectPlatform(trimmed) || PLATFORMS.generic;

  // Extract actual product title from URL slug
  const parsedTitle = parseProductFromUrl(trimmed);
  const title = parsedTitle || `${platformObj.name} Verified Product`;

  // Detect proper category and photo based on the actual title
  const { category, photoUrl, gallery, artwork, accentColor } = detectCategoryAndIcon(title + ' ' + trimmed);

  // Use authentic high-resolution studio photo for realistic product visualization
  const imageUrl = photoUrl || createMockSvgImage(title, category, platformObj.color, accentColor, artwork);
  const images = gallery && gallery.length > 0 ? gallery : [imageUrl];

  // Extract or generate SKU
  const skuMatch = trimmed.match(/(?:dp\/|p\/|buy\/|item\/|d\/)([a-zA-Z0-9_-]+)/i);
  const sku = skuMatch ? skuMatch[1].toUpperCase() : `SKU-${Math.floor(100000 + Math.random() * 900000)}`;

  return {
    success: true,
    platform: platformObj.id,
    platformInfo: platformObj,
    title,
    category,
    dimensions: '2048 × 2048 px',
    fileSizeEstimate: '2.6 MB',
    imageUrl,
    images,
    sourceUrl: trimmed,
    sku,
    format,
    quality,
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Browser-Side Multi-Platform Rich Product Description & Listing Generator Engine.
 * Pure JS ESM module with zero browser/DOM dependencies so Node unit tests run directly.
 */

import {
  PRODUCT_CATEGORIES,
  HSN_ENTRIES,
  resolveEffectiveGst,
  findBestHsnMatches,
} from '../data/hsnCatalog.js';

const UTF8_ENCODER = new TextEncoder();

export const LISTING_TONES = [
  {
    id: 'professional',
    name: 'Professional',
    label: 'Professional & Trustworthy',
    description: 'Clear specifications, dependable benefits, and marketplace-compliant structure.',
  },
  {
    id: 'trendy',
    name: 'Trendy',
    label: 'Trendy & Modern D2C',
    description: 'Energetic lifestyle hooks, modern phrasing, and social-ready engagement.',
  },
  {
    id: 'budget',
    name: 'Budget',
    label: 'Value & Smart Buy',
    description: 'Practical everyday utility, durability per rupee, and clear value highlights.',
  },
  {
    id: 'luxury',
    name: 'Luxury',
    label: 'Premium & Refined',
    description: 'Craftsmanship-led storytelling, tactile material detail, and elevated tone.',
  },
];

export const LISTING_PLATFORMS = [
  // ── Marketplaces (8) ──────────────────────────────────────────────────────
  {
    id: 'amazon',
    name: 'Amazon.in',
    shortName: 'Amazon',
    group: 'marketplace',
    accent: '#ff9900',
    titleMaxChars: 200,
    bulletsCount: 5,
    bulletMaxChars: 250,
    descriptionMaxChars: 2000,
    keywordsMaxBytes: 250,
    plainTextOnly: false,
    ruleSummary: 'Title ≤200 chars • 5 bullets • HTML + Text • Backend keywords ≤250 bytes (space-separated)',
  },
  {
    id: 'flipkart',
    name: 'Flipkart',
    shortName: 'Flipkart',
    group: 'marketplace',
    accent: '#2874f0',
    titleMaxChars: 150,
    bulletsCount: 6,
    bulletMaxChars: 180,
    descriptionMaxChars: 2000,
    keywordsCount: 10,
    plainTextOnly: false,
    ruleSummary: 'Title ≤150 chars • 6 spec highlights • HTML + Text • 10 search tags',
  },
  {
    id: 'meesho',
    name: 'Meesho',
    shortName: 'Meesho',
    group: 'marketplace',
    accent: '#f43397',
    titleMaxChars: 100,
    bulletsCount: 5,
    bulletMaxChars: 140,
    descriptionMaxChars: 1500,
    keywordsCount: 10,
    plainTextOnly: true,
    ruleSummary: 'Title ≤100 chars • Plain text only (zero HTML) • Simple buyer-friendly copy',
  },
  {
    id: 'myntra',
    name: 'Myntra / Ajio',
    shortName: 'Myntra',
    group: 'marketplace',
    accent: '#ff3f6c',
    titleMaxChars: 120,
    bulletsCount: 5,
    bulletMaxChars: 160,
    descriptionMaxChars: 1500,
    keywordsCount: 10,
    plainTextOnly: false,
    ruleSummary: 'Title ≤120 chars • Style & fabric storytelling • Care & fit bullets',
  },
  {
    id: 'shopify',
    name: 'Shopify / D2C Store',
    shortName: 'Shopify',
    group: 'marketplace',
    accent: '#96bf48',
    titleMaxChars: 120,
    seoTitleMaxChars: 60,
    metaDescMaxChars: 160,
    bulletsCount: 5,
    bulletMaxChars: 220,
    descriptionMaxChars: 4000,
    keywordsCount: 12,
    plainTextOnly: false,
    ruleSummary: 'SEO Title ≤60 chars • Meta Desc ≤160 chars • Rich D2C HTML + Plain Text',
  },
  {
    id: 'jiomart',
    name: 'JioMart',
    shortName: 'JioMart',
    group: 'marketplace',
    accent: '#0078ad',
    titleMaxChars: 150,
    bulletsCount: 5,
    bulletMaxChars: 180,
    descriptionMaxChars: 1800,
    keywordsCount: 10,
    plainTextOnly: false,
    ruleSummary: 'Title ≤150 chars • 5 clear retail highlights • Practical household framing',
  },
  {
    id: 'quick_commerce',
    name: 'Blinkit / Zepto',
    shortName: 'Quick Commerce',
    group: 'marketplace',
    accent: '#eab308',
    titleMaxChars: 80,
    bulletsCount: 4,
    bulletMaxChars: 110,
    descriptionMaxChars: 600,
    keywordsCount: 8,
    plainTextOnly: true,
    ruleSummary: 'Snappy title ≤80 chars • 4 quick-scan bullets • Plain text ≤600 chars',
  },
  {
    id: 'etsy',
    name: 'Etsy',
    shortName: 'Etsy',
    group: 'marketplace',
    accent: '#f1641e',
    titleMaxChars: 140,
    bulletsCount: 5,
    bulletMaxChars: 180,
    descriptionMaxChars: 3000,
    tagsCount: 13,
    tagMaxChars: 20,
    plainTextOnly: true,
    ruleSummary: 'Title ≤140 chars • Plain text story • Up to 13 tags (each ≤20 chars)',
  },

  // ── Social Media (4) ──────────────────────────────────────────────────────
  {
    id: 'instagram',
    name: 'Instagram (Post & Reels)',
    shortName: 'Instagram',
    group: 'social',
    accent: '#e1306c',
    titleMaxChars: 100,
    bulletsCount: 4,
    bulletMaxChars: 140,
    descriptionMaxChars: 2200,
    hashtagsCount: 20,
    plainTextOnly: true,
    ruleSummary: 'Post caption + short Reels caption • Plain text • Up to 20 #hashtags',
  },
  {
    id: 'facebook',
    name: 'Facebook Marketplace / Shop',
    shortName: 'Facebook',
    group: 'social',
    accent: '#1877f2',
    titleMaxChars: 100,
    bulletsCount: 5,
    bulletMaxChars: 160,
    descriptionMaxChars: 1500,
    keywordsCount: 10,
    plainTextOnly: true,
    ruleSummary: 'Title ≤100 chars • Conversational plain text • Price & DM CTA',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Catalog / Broadcast',
    shortName: 'WhatsApp',
    group: 'social',
    accent: '#25d366',
    titleMaxChars: 100,
    bulletsCount: 5,
    bulletMaxChars: 150,
    descriptionMaxChars: 1000,
    keywordsCount: 6,
    plainTextOnly: true,
    ruleSummary: 'Clean *bold* formatting • Price & savings line • Quick-reply CTA',
  },
  {
    id: 'youtube',
    name: 'YouTube Shorts / Video',
    shortName: 'YouTube',
    group: 'social',
    accent: '#ff0000',
    titleMaxChars: 100,
    bulletsCount: 4,
    bulletMaxChars: 160,
    descriptionMaxChars: 2000,
    tagsMaxChars: 500,
    plainTextOnly: true,
    ruleSummary: 'Title ≤100 chars • Chapter timestamps • Plain text • Tags ≤500 chars',
  },
];

export const SAMPLE_PRODUCTS = [
  {
    id: 'sample-oversized-tshirt',
    label: "Men's Oversized Cotton T-Shirt",
    productName: "Men's Oversized Cotton T-Shirt",
    brand: 'UrbanThread',
    categoryId: 'apparel',
    mrp: 1299,
    sellingPrice: 799,
    material: '100% Combed Ring-Spun Cotton (240 GSM French Terry)',
    color: 'Jet Black',
    sizeOrCapacity: 'S, M, L, XL, XXL',
    keyFeatures: [
      'Drop-shoulder relaxed streetwear fit with ribbed crew neckline',
      'Breathable 240 GSM bio-washed cotton fabric that stays soft after washes',
      'Double-needle reinforced shoulder and hem stitching for daily durability',
      'Pre-shrunk and colorfast dye suited for Indian summer and layering',
    ],
    targetAudience: 'Men & Unisex Streetwear Lovers',
    careOrUsage: 'Machine wash cold inside out; tumble dry low; do not bleach',
    packageContents: '1 x Oversized Cotton T-Shirt',
    warranty: '7-Day Easy Size Exchange & Quality Assurance',
    countryOfOrigin: 'India',
    tone: 'trendy',
    extraKeywords: 'oversized tee, streetwear tshirt, drop shoulder, heavy gsm cotton, casual wear',
  },
  {
    id: 'sample-anc-earbuds',
    label: 'Wireless ANC Bluetooth Earbuds',
    productName: 'Wireless ANC Bluetooth Earbuds',
    brand: 'SonicPulse',
    categoryId: 'electronics',
    mrp: 3999,
    sellingPrice: 1799,
    material: 'Matte ABS Acoustic Housing with Medical-Grade Silicone Tips',
    color: 'Midnight Slate',
    sizeOrCapacity: '42 Hours Total Playtime • IPX5 Sweat Resistant',
    keyFeatures: [
      '32dB Active Noise Cancellation (ANC) + Transparency Mode for clear focus',
      '13mm dynamic titanium-coated drivers delivering deep punchy bass',
      'Quad-mic Environmental Noise Cancellation (ENC) for crisp voice calls',
      'Bluetooth 5.3 ultra-low 45ms gaming latency and Type-C 10-min fast charge',
    ],
    targetAudience: 'Commuters, Remote Workers, Students & Mobile Gamers',
    careOrUsage: 'Charge via USB Type-C cable (5V/1A); wipe ear tips after workouts',
    packageContents: '2 x Earbuds, 1 x Charging Case, 3 Pairs Ear Tips, 1 x USB-C Cable, Manual',
    warranty: '1 Year Brand Replacement Warranty',
    countryOfOrigin: 'India',
    tone: 'professional',
    extraKeywords: 'tws earbuds, anc earphones, bluetooth headphones, gaming earbuds, mic calling',
  },
  {
    id: 'sample-steel-bottle',
    label: 'Insulated Stainless Steel Bottle 1L',
    productName: 'Insulated Stainless Steel Bottle 1L',
    brand: 'HydroCraft',
    categoryId: 'home_kitchen',
    mrp: 1199,
    sellingPrice: 699,
    material: 'Food-Grade 304 Stainless Steel (Double-Wall Copper-Coated Vacuum)',
    color: 'Brushed Steel',
    sizeOrCapacity: '1000 ml (1 Litre)',
    keyFeatures: [
      'Keeps beverages ice-cold up to 24 hours and piping hot up to 18 hours',
      '100% rust-proof, BPA-free 18/8 inner steel wall with zero metallic taste',
      'Leak-proof silicone-gasket screw cap fits backpacks and car cup holders',
      'Sweat-free exterior finish stays dry on office desks and inside gym bags',
    ],
    targetAudience: 'Office Professionals, Gym Goers, Travellers & School Students',
    careOrUsage: 'Hand wash with mild soap and bottle brush; do not freeze or microwave',
    packageContents: '1 x 1L Insulated Stainless Steel Flask with Leak-Proof Cap',
    warranty: '1 Year Warranty Against Manufacturing & Vacuum Seal Defects',
    countryOfOrigin: 'India',
    tone: 'professional',
    extraKeywords: 'thermosteel bottle, vacuum flask, gym water bottle, hot cold flask, 1 litre steel',
  },
];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into',
  'is', 'it', 'of', 'on', 'or', 'per', 'that', 'the', 'this', 'to', 'use', 'with',
  'your', 'you', 'all', 'day', 'pack', 'set', 'pcs', 'piece',
]);

const CATEGORY_KEYWORD_BOOSTS = {
  apparel: ['clothing', 'fashion', 'casual', 'dailywear', 'breathable', 'comfort', 'wardrobe', 'gift'],
  footwear: ['walking', 'running', 'comfort', 'cushioned', 'lightweight', 'grip', 'outdoor', 'daily'],
  electronics: ['gadget', 'wireless', 'portable', 'charging', 'travel', 'office', 'study', 'gift'],
  home_kitchen: ['kitchen', 'home', 'reusable', 'durable', 'travel', 'office', 'eco', 'hygienic'],
  beauty: ['skincare', 'grooming', 'gentle', 'paraben', 'daily', 'routine', 'selfcare', 'gift'],
  jewellery: ['festive', 'ethnic', 'wedding', 'partywear', 'lightweight', 'fashion', 'gift', 'women'],
  bags: ['travel', 'college', 'office', 'commute', 'organizer', 'lightweight', 'storage', 'unisex'],
  grocery: ['natural', 'fresh', 'pantry', 'roasted', 'breakfast', 'gourmet', 'aromatic', 'healthy'],
  health_fitness: ['workout', 'fitness', 'homegym', 'recovery', 'training', 'wellness', 'exercise'],
  books_stationery: ['reading', 'study', 'office', 'journal', 'exam', 'student', 'gift', 'desk'],
  toys_gifts: ['kids', 'birthday', 'playtime', 'learning', 'creative', 'festive', 'hamper', 'returngift'],
  general: ['utility', 'essential', 'home', 'office', 'organizer', 'compact', 'durable', 'everyday'],
};

const TONE_PROFILES = {
  professional: {
    hookVerb: 'Engineered for reliable everyday performance',
    storyLead: 'Designed with practical attention to detail,',
    ctaPhrase: 'Order now for dependable everyday utility.',
    socialHook: 'Upgrade your daily essentials with smart, reliable quality.',
    metaAction: 'Shop verified quality today.',
  },
  trendy: {
    hookVerb: 'Built for effortless modern style and all-day comfort',
    storyLead: 'Made to stand out without trying too hard,',
    ctaPhrase: 'Refresh your daily lineup today.',
    socialHook: 'Your new everyday favourite is finally here.',
    metaAction: 'Explore the latest drop now.',
  },
  budget: {
    hookVerb: 'Delivers lasting everyday value at a smart price',
    storyLead: 'Crafted to give you maximum utility per rupee,',
    ctaPhrase: 'Add practical, durable value to your cart today.',
    socialHook: 'Smart quality that respects your budget.',
    metaAction: 'Grab honest everyday value.',
  },
  luxury: {
    hookVerb: 'Crafted with refined attention to finish, feel, and longevity',
    storyLead: 'Curated for discerning taste and understated elegance,',
    ctaPhrase: 'Experience signature craftsmanship today.',
    socialHook: 'Elevated design meets timeless everyday indulgence.',
    metaAction: 'Discover the signature collection.',
  },
};

const PROMO_SPAM_PHRASES = [
  /\b100%\s*(?:original|authentic|genuine|guaranteed|satisfaction|money\s*back)\b/gi,
  /(?:^|\s)#\s*1(?=\s|$|[!.,\-|])/gi,
  /\b(?:no\.?\s*1|number\s*1)\b/gi,
  /\b(?:free\s+shipping|free\s+delivery|cash\s+on\s+delivery|cod\s+available)\b/gi,
  /\b(?:best\s+seller|bestseller|best\s+selling|best\s+quality|best\s+price)\b/gi,
  /\b(?:top\s+rated|hot\s+deal|lowest\s+price|mega\s+offer|bumper\s+offer|limited\s+time\s+offer|special\s+offer|flash\s+sale|money\s+back\s+guarantee)\b/gi,
  /\b(?:best|cheap|cheapest|guaranteed|unbeatable)\b/gi,
];

/**
 * Returns the exact UTF-8 byte length of any string.
 *
 * @param {string} text
 * @returns {number}
 */
export function getUtf8ByteLength(text) {
  if (text === null || text === undefined) return 0;
  return UTF8_ENCODER.encode(String(text)).length;
}

/**
 * Counts whitespace-separated words in a string.
 *
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  const cleaned = String(text ?? '').trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

/**
 * Escapes HTML special characters for safe inclusion inside generated HTML descriptions.
 *
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Converts HTML fragments to clean, readable plain text with zero raw HTML tags.
 *
 * @param {string} html
 * @returns {string}
 */
export function stripHtmlToPlainText(html) {
  if (html === null || html === undefined) return '';
  let text = String(html);

  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|ul|ol|section|article|blockquote)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#8377;|&rupee;/gi, '₹');

  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Removes promotional spam words and excessive punctuation from marketplace titles.
 *
 * @param {string} title
 * @returns {string}
 */
export function sanitizeMarketplaceTitle(title) {
  let clean = String(title ?? '').trim();
  if (!clean) return '';

  for (const pattern of PROMO_SPAM_PHRASES) {
    clean = clean.replace(pattern, ' ');
  }

  clean = clean
    .replace(/[!?*]+/g, ' ')
    .replace(/\(\s*\)|\[\s*\]/g, ' ')
    .replace(/\s*([|,\-/])\s*\1+/g, ' $1 ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s|,\-:/]+|[\s|,\-:/]+$/g, '')
    .trim();

  return clean;
}

/**
 * Trims text strictly to `maxChars` UTF-16 code units without breaking surrogate pairs
 * or mid-word when a clean boundary exists.
 *
 * @param {string} text
 * @param {number} maxChars
 * @returns {string}
 */
export function trimToMaxChars(text, maxChars) {
  const limit = Math.max(0, Math.floor(Number(maxChars) || 0));
  if (limit === 0) return '';

  const str = String(text ?? '').trim();
  if (!str || str.length <= limit) return str;

  let cut = str.slice(0, limit);
  const lastCode = cut.charCodeAt(cut.length - 1);
  if (lastCode >= 0xd800 && lastCode <= 0xdbff) {
    cut = cut.slice(0, -1);
  }

  const nextChar = str[cut.length];
  if (nextChar && !/\s/.test(nextChar)) {
    const lastSpace = cut.lastIndexOf(' ');
    if (lastSpace >= Math.floor(limit * 0.6)) {
      cut = cut.slice(0, lastSpace);
    }
  }

  const trimmed = cut.replace(/[\s,|:\-/]+$/, '').trim();
  return trimmed.length <= limit ? trimmed : cut.slice(0, limit);
}

/**
 * Trims text strictly to `maxBytes` UTF-8 bytes by iterating full Unicode code points
 * so multi-byte characters (₹, emojis, Devanagari, accented letters) are never split.
 *
 * @param {string} text
 * @param {number} maxBytes
 * @returns {string}
 */
export function trimToMaxBytes(text, maxBytes) {
  const limit = Math.max(0, Math.floor(Number(maxBytes) || 0));
  if (limit === 0) return '';

  const str = String(text ?? '').trim();
  if (!str) return '';
  if (getUtf8ByteLength(str) <= limit) return str;

  let out = '';
  let usedBytes = 0;

  for (const char of str) {
    const charBytes = UTF8_ENCODER.encode(char).length;
    if (usedBytes + charBytes > limit) {
      break;
    }
    out += char;
    usedBytes += charBytes;
  }

  const nextChar = str.slice(out.length)[0];
  if (nextChar && !/\s/.test(nextChar)) {
    const lastSpace = out.lastIndexOf(' ');
    if (lastSpace > 0 && lastSpace >= Math.floor(out.length * 0.55)) {
      out = out.slice(0, lastSpace);
    }
  }

  let cleaned = out.replace(/[\s,]+$/, '').trim();
  while (cleaned && getUtf8ByteLength(cleaned) > limit) {
    const chars = Array.from(cleaned);
    chars.pop();
    cleaned = chars.join('').trim();
  }
  return cleaned;
}

/**
 * Formats candidate phrases into up to `maxTags` unique Etsy tags,
 * strictly enforcing `<= maxTagChars` characters per tag.
 *
 * @param {string[] | string} candidates
 * @param {number} [maxTags=13]
 * @param {number} [maxTagChars=20]
 * @returns {string[]}
 */
export function formatEtsyTags(candidates, maxTags = 13, maxTagChars = 20) {
  const rawList = Array.isArray(candidates)
    ? candidates
    : String(candidates ?? '').split(/[,\n]+/);

  const seen = new Set();
  const tags = [];

  const tryPush = (candidate) => {
    if (tags.length >= maxTags) return;
    const cleaned = String(candidate || '')
      .toLowerCase()
      .replace(/[&/_]+/g, ' ')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s-]+|[\s-]+$/g, '')
      .trim();

    if (cleaned.length < 2) return;

    const finalTag =
      cleaned.length <= maxTagChars ? cleaned : trimToMaxChars(cleaned, maxTagChars);

    if (finalTag.length >= 2 && finalTag.length <= maxTagChars && !seen.has(finalTag)) {
      seen.add(finalTag);
      tags.push(finalTag);
    }
  };

  for (const item of rawList) {
    if (tags.length >= maxTags) break;
    const raw = String(item || '').trim();
    if (!raw) continue;

    if (raw.length <= maxTagChars) {
      tryPush(raw);
    } else {
      tryPush(raw);
      // Also extract shorter meaningful 2-word / 1-word tags from oversized phrases
      const words = raw
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
      for (let i = 0; i < words.length && tags.length < maxTags; i += 1) {
        if (i + 1 < words.length && `${words[i]} ${words[i + 1]}`.length <= maxTagChars) {
          tryPush(`${words[i]} ${words[i + 1]}`);
        } else {
          tryPush(words[i]);
        }
      }
    }
  }

  return tags;
}

/**
 * Normalizes and validates caller input for listing generation.
 *
 * @param {object} rawInput
 * @returns {object}
 */
function normalizeProductInput(rawInput) {
  const input = rawInput && typeof rawInput === 'object' ? rawInput : {};
  const productName = String(input.productName ?? '').trim();
  if (!productName) {
    throw new Error('Product name is required to generate marketplace listings.');
  }

  const brand = String(input.brand ?? input.brandName ?? '').trim();
  const validCategory = PRODUCT_CATEGORIES.some((c) => c.id === input.categoryId);
  const categoryId = validCategory ? input.categoryId : 'general';

  const mrpNum = Number(input.mrp);
  const sellingNum = Number(input.sellingPrice);
  const mrp = Number.isFinite(mrpNum) && mrpNum > 0 ? mrpNum : 0;
  const sellingPrice = Number.isFinite(sellingNum) && sellingNum > 0 ? sellingNum : 0;

  const rawFeatures = Array.isArray(input.keyFeatures)
    ? input.keyFeatures
    : String(input.keyFeatures ?? '').split(/\r?\n|•|;/);
  const keyFeatures = rawFeatures
    .map((f) => stripHtmlToPlainText(String(f || '')).replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean);

  const rawExtraKeywords = Array.isArray(input.extraKeywords ?? input.keywords)
    ? (input.extraKeywords ?? input.keywords)
    : String(input.extraKeywords ?? input.keywords ?? '').split(/[,\n]+/);
  const extraKeywords = rawExtraKeywords.map((k) => k.trim()).filter(Boolean);

  const toneId = TONE_PROFILES[input.tone] ? input.tone : 'professional';

  return {
    productName,
    brand,
    categoryId,
    hsnCodeOverride: String(input.hsnCode ?? '').trim(),
    gstRateOverride:
      input.gstRate !== undefined && input.gstRate !== null && input.gstRate !== ''
        ? Number(input.gstRate)
        : null,
    mrp,
    sellingPrice,
    material: String(input.material ?? '').trim(),
    color: String(input.color ?? '').trim(),
    sizeOrCapacity: String(input.sizeOrCapacity ?? '').trim(),
    keyFeatures,
    targetAudience: String(input.targetAudience ?? '').trim(),
    careOrUsage: String(input.careOrUsage ?? input.careInstructions ?? '').trim(),
    packageContents: String(input.packageContents ?? input.packQty ?? '').trim(),
    warranty: String(input.warranty ?? '').trim(),
    countryOfOrigin: String(input.countryOfOrigin ?? 'India').trim() || 'India',
    offerText: String(input.offerText ?? '').trim(),
    tone: toneId,
    extraKeywords,
  };
}

/**
 * Computes inclusive GST breakdown when `sellingPrice > 0`.
 *
 * @param {number} sellingPrice
 * @param {number} gstRate
 * @param {number} mrp
 * @returns {object | null}
 */
function computeTaxBreakdown(sellingPrice, gstRate, mrp) {
  if (!sellingPrice || sellingPrice <= 0) return null;

  const rate = Number.isFinite(Number(gstRate)) ? Number(gstRate) : 18;
  const baseTaxableValue = Number((sellingPrice / (1 + rate / 100)).toFixed(2));
  const gstAmount = Number((sellingPrice - baseTaxableValue).toFixed(2));
  const cgstAmount = Number((gstAmount / 2).toFixed(2));
  const sgstAmount = Number((gstAmount - cgstAmount).toFixed(2));
  const igstAmount = gstAmount;
  const discountPercent =
    mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;

  return {
    sellingPrice,
    mrp: mrp > 0 ? mrp : null,
    discountPercent,
    gstRate: rate,
    baseTaxableValue,
    gstAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
  };
}

/**
 * Builds fallback key features when a user provides minimal product fields.
 *
 * @param {object} product
 * @param {object} toneProfile
 * @returns {string[]}
 */
function resolveFeaturesList(product, toneProfile) {
  const features = [...product.keyFeatures];
  if (features.length < 4 && product.material) {
    features.push(`Crafted from ${product.material} for reliable long-term use`);
  }
  if (features.length < 4 && product.sizeOrCapacity) {
    features.push(`Thoughtful sizing (${product.sizeOrCapacity}) tailored for daily convenience`);
  }
  if (features.length < 4 && product.targetAudience) {
    features.push(`Designed for ${product.targetAudience}`);
  }
  if (features.length < 4 && product.careOrUsage) {
    features.push(`Easy maintenance: ${product.careOrUsage}`);
  }
  if (features.length < 4) {
    features.push(`${toneProfile.hookVerb} with consistent quality finishing`);
  }
  if (features.length < 5 && product.packageContents) {
    features.push(`Complete box contents: ${product.packageContents}`);
  }
  if (features.length < 6 && product.warranty) {
    features.push(`Backed by ${product.warranty}`);
  }
  return features;
}

/**
 * Gathers rich phrase keywords tailored to the product and HSN catalog match.
 *
 * @param {object} product
 * @param {object | null} primaryHsn
 * @returns {string[]}
 */
function buildCandidateKeywordPhrases(product, primaryHsn) {
  const seen = new Set();
  const list = [];

  const addPhrase = (raw) => {
    const cleaned = String(raw || '')
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (cleaned.length >= 2 && !seen.has(cleaned)) {
      seen.add(cleaned);
      list.push(cleaned);
    }
  };

  addPhrase(product.productName);
  if (product.brand) addPhrase(`${product.brand} ${product.productName}`);
  for (const kw of product.extraKeywords) addPhrase(kw);
  for (const kw of primaryHsn?.keywords || []) addPhrase(kw);
  if (product.material) addPhrase(product.material.split('(')[0]);
  if (product.color) addPhrase(`${product.color} ${product.productName}`);
  if (product.targetAudience) addPhrase(product.targetAudience);
  for (const boost of CATEGORY_KEYWORD_BOOSTS[product.categoryId] || []) {
    addPhrase(boost);
  }

  return list;
}

/**
 * Builds Amazon backend search terms strictly <= 250 UTF-8 bytes:
 * space-separated unique lowercase words, no commas, excluding title words and brand name.
 *
 * @param {object} product
 * @param {object | null} primaryHsn
 * @param {string} amazonTitle
 * @returns {{ words: string[], text: string }}
 */
function buildAmazonBackendKeywords(product, primaryHsn, amazonTitle) {
  const excluded = new Set(STOP_WORDS);
  const extractWords = (str) =>
    String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

  for (const w of extractWords(amazonTitle)) excluded.add(w);
  for (const w of extractWords(product.brand)) excluded.add(w);

  const rawPool = [
    ...product.extraKeywords,
    ...(primaryHsn?.keywords || []),
    product.material,
    product.color,
    product.sizeOrCapacity,
    product.targetAudience,
    product.careOrUsage,
    ...product.keyFeatures,
    ...(CATEGORY_KEYWORD_BOOSTS[product.categoryId] || []),
  ];

  const uniqueWords = [];
  const seenWords = new Set();

  for (const phrase of rawPool) {
    for (const word of extractWords(phrase)) {
      if (word.length < 2 || excluded.has(word) || seenWords.has(word)) continue;
      seenWords.add(word);
      uniqueWords.push(word);
    }
  }

  const trimmedText = trimToMaxBytes(uniqueWords.join(' '), 250)
    .replace(/,/g, '')
    .toLowerCase()
    .trim();

  return {
    words: trimmedText ? trimmedText.split(/\s+/) : [],
    text: trimmedText,
  };
}

/**
 * Builds Instagram & YouTube hashtags without duplicates.
 *
 * @param {object} product
 * @param {object | null} primaryHsn
 * @param {number} maxCount
 * @returns {string[]}
 */
function buildHashtags(product, primaryHsn, maxCount = 20) {
  const seen = new Set();
  const tags = [];

  const pushHash = (phrase) => {
    if (tags.length >= maxCount) return;
    const slug = String(phrase || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (slug.length < 3 || slug.length > 28) return;
    const tag = `#${slug}`;
    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  };

  if (product.brand) pushHash(product.brand);
  pushHash(product.productName);
  for (const word of product.productName.split(/\s+/)) {
    if (!STOP_WORDS.has(word.toLowerCase())) pushHash(word);
  }
  for (const kw of product.extraKeywords) pushHash(kw);
  for (const kw of (primaryHsn?.keywords || []).slice(0, 8)) pushHash(kw);
  if (product.color) pushHash(product.color);
  for (const boost of CATEGORY_KEYWORD_BOOSTS[product.categoryId] || []) pushHash(boost);
  pushHash('indianbrands');
  pushHash('shopindia');
  pushHash('d2cindia');

  return tags.slice(0, maxCount);
}

/**
 * Formats INR price text cleanly for social/D2C copy.
 *
 * @param {object} product
 * @returns {string}
 */
function formatPriceSummary(product) {
  if (!product.sellingPrice) return '';
  const sell = `₹${product.sellingPrice.toLocaleString('en-IN')}`;
  if (product.mrp > product.sellingPrice) {
    const mrp = `₹${product.mrp.toLocaleString('en-IN')}`;
    const pct = Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100);
    return `${sell} (MRP ${mrp} • Save ${pct}%)`;
  }
  return sell;
}

/**
 * Generates platform-specific title respecting sanitation and character caps.
 *
 * @param {object} platform
 * @param {object} product
 * @returns {string}
 */
function buildPlatformTitle(platform, product) {
  const cleanName = sanitizeMarketplaceTitle(product.productName) || product.productName;
  const brandPrefix = product.brand ? `${sanitizeMarketplaceTitle(product.brand)} ` : '';
  const materialShort = product.material ? product.material.split('(')[0].trim() : '';
  const specs = [materialShort, product.color, product.sizeOrCapacity].filter(Boolean);

  let rawTitle = '';
  switch (platform.id) {
    case 'amazon':
      rawTitle = `${brandPrefix}${cleanName}${specs.length ? ` - ${specs.join(', ')}` : ''}${product.targetAudience ? ` | Ideal for ${product.targetAudience}` : ''}`;
      break;
    case 'flipkart':
      rawTitle = `${brandPrefix}${cleanName}${product.color || product.sizeOrCapacity ? ` (${[product.color, product.sizeOrCapacity].filter(Boolean).join(', ')})` : ''}`;
      break;
    case 'meesho':
      rawTitle = `${cleanName}${product.color ? ` - ${product.color}` : ''}${materialShort ? ` | ${materialShort}` : ''}`;
      break;
    case 'myntra':
      rawTitle = `${brandPrefix}${product.color ? `${product.color} ` : ''}${cleanName}${materialShort ? ` in ${materialShort}` : ''}`;
      break;
    case 'shopify':
      rawTitle = `${brandPrefix}${cleanName}${product.color ? ` — ${product.color}` : ''}`;
      break;
    case 'jiomart':
      rawTitle = `${brandPrefix}${cleanName}${specs.slice(0, 2).length ? ` (${specs.slice(0, 2).join(', ')})` : ''}`;
      break;
    case 'quick_commerce':
      rawTitle = `${brandPrefix}${cleanName}${product.sizeOrCapacity ? ` (${product.sizeOrCapacity.split('•')[0].trim()})` : product.color ? ` - ${product.color}` : ''}`;
      break;
    case 'etsy':
      rawTitle = `${cleanName}${materialShort ? `, ${materialShort}` : ''}${product.color ? `, ${product.color}` : ''}${product.targetAudience ? ` - Gift for ${product.targetAudience}` : ''}`;
      break;
    case 'instagram':
      rawTitle = `${brandPrefix}${cleanName}${product.color ? ` • ${product.color}` : ''}`;
      break;
    case 'facebook':
      rawTitle = `${brandPrefix}${cleanName}${product.sellingPrice ? ` - ₹${product.sellingPrice.toLocaleString('en-IN')}` : ''}${product.color ? ` (${product.color})` : ''}`;
      break;
    case 'whatsapp':
      rawTitle = `${brandPrefix}${cleanName}${product.sizeOrCapacity ? ` • ${product.sizeOrCapacity.split('•')[0].trim()}` : ''}`;
      break;
    case 'youtube':
      rawTitle = `${brandPrefix}${cleanName} Review & Key Features${product.sellingPrice ? ` (₹${product.sellingPrice.toLocaleString('en-IN')})` : ''}`;
      break;
    default:
      rawTitle = `${brandPrefix}${cleanName}`;
  }

  const sanitized = sanitizeMarketplaceTitle(stripHtmlToPlainText(rawTitle)) || cleanName;
  return trimToMaxChars(sanitized, platform.titleMaxChars);
}

/**
 * Generates platform-specific bullet points within count and character caps.
 *
 * @param {object} platform
 * @param {object} product
 * @param {string[]} features
 * @returns {string[]}
 */
function buildPlatformBullets(platform, product, features) {
  const leadIns = [
    'MATERIAL & BUILD',
    'KEY PERFORMANCE',
    'DESIGN & COMFORT',
    'EVERYDAY UTILITY',
    'CARE & PACKAGE',
    'ORIGIN & ASSURANCE',
  ];

  const pool = [...features];
  if (product.packageContents) pool.push(`In the Box: ${product.packageContents}`);
  if (product.careOrUsage) pool.push(`Care Guide: ${product.careOrUsage}`);
  if (product.warranty) pool.push(`Warranty & Support: ${product.warranty}`);
  pool.push(`Country of Origin: ${product.countryOfOrigin}`);

  const bullets = [];
  for (let i = 0; i < platform.bulletsCount && i < pool.length; i += 1) {
    let text = stripHtmlToPlainText(pool[i]);
    if (platform.id === 'amazon') {
      const lead = leadIns[i] || 'HIGHLIGHT';
      text = `${lead}: ${text}`;
    } else if (platform.id === 'quick_commerce') {
      text = text.replace(/^[^:]+:\s*/, '');
    }
    bullets.push(trimToMaxChars(text, platform.bulletMaxChars));
  }
  return bullets;
}

/**
 * Builds rich HTML + plain-text descriptions for marketplaces supporting HTML.
 *
 * @param {object} platform
 * @param {object} product
 * @param {string[]} bullets
 * @param {object} toneProfile
 * @returns {{ descriptionHtml: string, description: string }}
 */
function buildHtmlAndPlainDescription(platform, product, bullets, toneProfile) {
  const nameHtml = escapeHtml(product.productName);
  const brandHtml = product.brand ? `${escapeHtml(product.brand)} ` : '';
  const specsRows = [
    product.material && ['Material / Build', product.material],
    product.color && ['Color / Finish', product.color],
    product.sizeOrCapacity && ['Size / Capacity', product.sizeOrCapacity],
    product.targetAudience && ['Ideal For', product.targetAudience],
    product.packageContents && ['Package Contents', product.packageContents],
    product.careOrUsage && ['Care & Usage', product.careOrUsage],
    product.warranty && ['Warranty', product.warranty],
    ['Country of Origin', product.countryOfOrigin],
  ].filter(Boolean);

  const buildHtmlDoc = (activeBullets, activeSpecs) => {
    if (platform.id === 'shopify') {
      return [
        `<h2>Meet the ${brandHtml}${nameHtml}</h2>`,
        `<p>${escapeHtml(toneProfile.storyLead)} the <strong>${brandHtml}${nameHtml}</strong> ${escapeHtml(toneProfile.hookVerb.toLowerCase())}.</p>`,
        activeBullets.length ? `<h3>Why You Will Love It</h3>` : '',
        activeBullets.length ? `<ul>${activeBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : '',
        activeSpecs.length ? `<h3>Product Specifications</h3>` : '',
        activeSpecs.length
          ? `<ul>${activeSpecs.map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</li>`).join('')}</ul>`
          : '',
        `<p>${escapeHtml(toneProfile.ctaPhrase)}</p>`,
      ]
        .filter(Boolean)
        .join('\n');
    }
    if (platform.id === 'myntra') {
      return [
        `<p><strong>Style &amp; Craftsmanship:</strong> ${escapeHtml(toneProfile.storyLead)} this <strong>${brandHtml}${nameHtml}</strong> brings together modern versatility and reliable comfort.</p>`,
        activeBullets.length ? `<p><strong>Key Highlights:</strong></p>` : '',
        activeBullets.length ? `<ul>${activeBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : '',
        activeSpecs.length
          ? `<p><strong>Material &amp; Care:</strong> ${escapeHtml(activeSpecs.map(([k, v]) => `${k}: ${v}`).join(' | '))}</p>`
          : '',
      ]
        .filter(Boolean)
        .join('\n');
    }
    return [
      `<p><strong>${brandHtml}${nameHtml}</strong> — ${escapeHtml(toneProfile.hookVerb)}.</p>`,
      activeBullets.length ? `<ul>${activeBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : '',
      activeSpecs.length
        ? `<p><strong>Specifications:</strong> ${escapeHtml(activeSpecs.map(([k, v]) => `${k}: ${v}`).join(' • '))}</p>`
        : '',
      `<p>${escapeHtml(toneProfile.ctaPhrase)}</p>`,
    ]
      .filter(Boolean)
      .join('\n');
  };

  let html = buildHtmlDoc(bullets, specsRows);
  if (html.length > platform.descriptionMaxChars) {
    html = buildHtmlDoc(bullets.slice(0, 3), specsRows.slice(0, 4));
  }
  if (html.length > platform.descriptionMaxChars) {
    const safeText = trimToMaxChars(
      stripHtmlToPlainText(html),
      Math.max(0, platform.descriptionMaxChars - 7)
    );
    html = `<p>${escapeHtml(safeText)}</p>`;
  }

  const descriptionHtml = html;
  const plainFromHtml = stripHtmlToPlainText(html);
  const description = trimToMaxChars(plainFromHtml, platform.descriptionMaxChars);

  return { descriptionHtml, description };
}

/**
 * Builds strict plain-text description for plain-text marketplaces and social channels.
 *
 * @param {object} platform
 * @param {object} product
 * @param {string[]} bullets
 * @param {object} toneProfile
 * @param {string[]} hashtags
 * @returns {{ description: string, reelsCaption?: string }}
 */
function buildPlainTextDescription(platform, product, bullets, toneProfile, hashtags) {
  const titleName = product.brand ? `${product.brand} ${product.productName}` : product.productName;
  const priceLine = formatPriceSummary(product);
  const specsLine = [
    product.material && `Material: ${product.material}`,
    product.color && `Color: ${product.color}`,
    product.sizeOrCapacity && `Size/Capacity: ${product.sizeOrCapacity}`,
    product.packageContents && `In the Box: ${product.packageContents}`,
    product.careOrUsage && `Care: ${product.careOrUsage}`,
    `Origin: ${product.countryOfOrigin}`,
  ]
    .filter(Boolean)
    .join('\n');

  let raw = '';
  let reelsCaption;

  switch (platform.id) {
    case 'meesho':
      raw = [
        `${titleName} — ${toneProfile.hookVerb}.`,
        '',
        'Key Highlights:',
        ...bullets.map((b) => `• ${b}`),
        '',
        'Product Details:',
        specsLine,
        product.warranty ? `Assurance: ${product.warranty}` : '',
      ]
        .filter((line) => line !== undefined)
        .join('\n');
      break;

    case 'quick_commerce':
      raw = [
        `${titleName}: ${toneProfile.hookVerb}.`,
        ...bullets.slice(0, 3).map((b) => `• ${b}`),
        product.packageContents ? `Pack: ${product.packageContents}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      break;

    case 'etsy':
      raw = [
        `${toneProfile.storyLead} ${titleName} is thoughtfully prepared for everyday use and meaningful gifting.`,
        '',
        'What Makes It Special:',
        ...bullets.map((b) => `- ${b}`),
        '',
        'Details & Care:',
        specsLine,
        product.targetAudience ? `Perfect Gift For: ${product.targetAudience}` : '',
        '',
        toneProfile.ctaPhrase,
      ]
        .filter((line) => line !== undefined)
        .join('\n');
      break;

    case 'instagram': {
      const hashLine = hashtags.join(' ');
      const reelTags = hashtags.slice(0, 7).join(' ');
      raw = [
        `${toneProfile.socialHook} ✨`,
        '',
        `Meet the ${titleName}${priceLine ? ` — ${priceLine}` : ''}.`,
        '',
        ...bullets.map((b) => `✅ ${b}`),
        '',
        product.offerText ? `🔥 ${product.offerText}` : '',
        '👇 Tap link in bio or DM us "ORDER" to shop yours today!',
        '',
        hashLine,
      ]
        .filter((line) => line !== undefined && line !== '')
        .join('\n');

      reelsCaption = trimToMaxChars(
        stripHtmlToPlainText(
          `${toneProfile.socialHook} Meet ${titleName}${priceLine ? ` (${priceLine})` : ''}. Save this Reel & comment "LINK" to grab yours! ${reelTags}`
        ),
        400
      );
      break;
    }

    case 'facebook':
      raw = [
        `${titleName}`,
        priceLine ? `Price: ${priceLine}` : '',
        product.offerText ? `Offer: ${product.offerText}` : '',
        '',
        `${toneProfile.hookVerb}.`,
        ...bullets.map((b) => `• ${b}`),
        '',
        specsLine,
        '',
        'Message us directly to check availability, delivery options, or bulk orders.',
      ]
        .filter((line) => line !== undefined && line !== '')
        .join('\n');
      break;

    case 'whatsapp':
      raw = [
        `*${titleName}*`,
        priceLine ? `*Price:* ${priceLine}` : '',
        product.offerText ? `*Special Offer:* ${product.offerText}` : '',
        '',
        '*Why Buyers Love It:*',
        ...bullets.map((b) => `• ${b}`),
        '',
        product.packageContents ? `*Includes:* ${product.packageContents}` : '',
        product.color ? `*Color:* ${product.color}` : '',
        product.sizeOrCapacity ? `*Size / Variant:* ${product.sizeOrCapacity}` : '',
        '',
        '*Reply YES or send your pincode to order now!*',
      ]
        .filter((line) => line !== undefined && line !== '')
        .join('\n');
      break;

    case 'youtube': {
      const ytHash = hashtags.slice(0, 5).join(' ');
      raw = [
        `Looking at the ${titleName} — ${toneProfile.hookVerb}.`,
        priceLine ? `Current Price: ${priceLine}` : '',
        '',
        'Highlights Covered in This Video:',
        ...bullets.map((b) => `• ${b}`),
        '',
        'Video Chapters:',
        '0:00 First Look & Unboxing',
        '0:15 Material & Build Quality',
        '0:35 Key Features & Real-World Use',
        '0:50 Pricing, Box Contents & Final Verdict',
        '',
        specsLine,
        '',
        ytHash,
      ]
        .filter((line) => line !== undefined && line !== '')
        .join('\n');
      break;
    }

    default:
      raw = [titleName, ...bullets.map((b) => `• ${b}`), specsLine].filter(Boolean).join('\n');
  }

  const description = trimToMaxChars(stripHtmlToPlainText(raw), platform.descriptionMaxChars);
  return reelsCaption ? { description, reelsCaption } : { description };
}

/**
 * Formats YouTube comma-separated video tags strictly under `maxChars` (500).
 *
 * @param {string[]} candidates
 * @param {number} maxChars
 * @returns {{ tags: string[], text: string }}
 */
function buildYouTubeTags(candidates, maxChars = 500) {
  const tags = [];
  let text = '';

  for (const item of candidates) {
    const clean = String(item || '').replace(/,/g, '').trim();
    if (!clean) continue;
    const candidateText = text ? `${text}, ${clean}` : clean;
    if (candidateText.length > maxChars) break;
    tags.push(clean);
    text = candidateText;
  }

  return { tags, text };
}

const PLATFORM_GUIDELINES = {
  amazon: [
    'Keep titles free of promotional words ("Best", "Free Shipping") to avoid suppression.',
    'Backend search terms are space-separated, lowercase, ≤250 UTF-8 bytes, and exclude title/brand words.',
  ],
  flipkart: [
    'Fill all 6 key highlights and match color/size attributes cleanly in Seller Hub.',
    'Avoid watermarks or promotional overlays on main catalog images.',
  ],
  meesho: [
    'Meesho supports plain text only — all HTML tags are stripped automatically.',
    'Keep titles crisp (≤100 chars) and state exact pack/color details up front.',
  ],
  myntra: [
    'Lead with fabric composition, fit, and wash care for fashion approval.',
    'Avoid pricing or discount mentions inside the product story.',
  ],
  shopify: [
    'SEO Title (≤60 chars) and Meta Description (≤160 chars) are sized for Google SERPs without truncation.',
    'Use the HTML tab for rich storefront sections or plain text for quick editors.',
  ],
  jiomart: [
    'Include clear dimensions, pack quantity, and Indian origin details.',
    'Maintain consistent attribute naming across title and bullet highlights.',
  ],
  quick_commerce: [
    'Blinkit / Zepto cards truncate long titles — kept strictly ≤80 characters.',
    'Plain text only with instant-scan benefits for 10-minute buyers.',
  ],
  etsy: [
    'Etsy uses plain text descriptions and up to 13 tags (each strictly ≤20 characters).',
    'Highlight material, craft details, and gifting occasion clearly.',
  ],
  instagram: [
    'Keep the first hook line punchy before the "...more" fold; copy the dedicated Reels caption for short videos.',
    'Plain text with up to 20 targeted #hashtags.',
  ],
  facebook: [
    'Conversational plain text works best in Marketplace & Shop tabs with clear pricing and DM CTA.',
  ],
  whatsapp: [
    'Uses WhatsApp *bold* syntax for instant mobile scanning in Broadcasts and Catalog.',
  ],
  youtube: [
    'Includes chapter timestamps for higher retention and comma-separated tags within 500 characters.',
  ],
};

/**
 * Generates listings across all 12 platforms (or a filtered subset) with HSN & GST estimation.
 *
 * @param {object} productInput
 * @param {string[]} [selectedPlatformIds]
 * @returns {{
 *   product: object,
 *   tone: string,
 *   primaryHsn: object | null,
 *   hsnMatches: object[],
 *   taxBreakdown: object | null,
 *   listings: object[],
 *   listingsById: Record<string, object>,
 *   listingsByPlatform: Record<string, object>,
 *   generatedAt: string,
 * }}
 */
export function generateMultiPlatformListings(productInput, selectedPlatformIds) {
  const product = normalizeProductInput(productInput);
  const toneProfile = TONE_PROFILES[product.tone] || TONE_PROFILES.professional;

  const queryParts = [
    product.productName,
    product.material,
    product.color,
    ...product.extraKeywords,
  ]
    .filter(Boolean)
    .join(' ');

  const autoMatches = findBestHsnMatches({
    query: queryParts,
    categoryId: product.categoryId,
    sellingPrice: product.sellingPrice,
    limit: 5,
  });

  let primaryHsn = autoMatches[0] || null;
  if (product.hsnCodeOverride) {
    const matchedEntry = HSN_ENTRIES.find((e) => e.hsnCode === product.hsnCodeOverride);
    if (matchedEntry) {
      const cat = PRODUCT_CATEGORIES.find((c) => c.id === matchedEntry.categoryId);
      primaryHsn = {
        ...matchedEntry,
        categoryName: cat?.name || 'General',
        ...resolveEffectiveGst(matchedEntry, product.sellingPrice),
        confidence: 'High',
        matchedKeywords: [matchedEntry.hsnCode],
      };
    }
  }

  const effectiveGstRate =
    product.gstRateOverride !== null && Number.isFinite(product.gstRateOverride)
      ? product.gstRateOverride
      : (primaryHsn?.gstRate ?? 18);

  const taxBreakdown = computeTaxBreakdown(
    product.sellingPrice,
    effectiveGstRate,
    product.mrp
  );

  const selectedSet =
    Array.isArray(selectedPlatformIds) && selectedPlatformIds.length > 0
      ? new Set(selectedPlatformIds)
      : null;

  const platforms = selectedSet
    ? LISTING_PLATFORMS.filter((p) => selectedSet.has(p.id))
    : LISTING_PLATFORMS;

  const features = resolveFeaturesList(product, toneProfile);
  const candidateKeywords = buildCandidateKeywordPhrases(product, primaryHsn);
  const hashtags = buildHashtags(product, primaryHsn, 20);

  const listings = platforms.map((platform) => {
    const title = buildPlatformTitle(platform, product);
    const bullets = buildPlatformBullets(platform, product, features);

    let description = '';
    let descriptionHtml = null;
    let reelsCaption;

    if (platform.plainTextOnly) {
      const plainOut = buildPlainTextDescription(platform, product, bullets, toneProfile, hashtags);
      description = plainOut.description;
      reelsCaption = plainOut.reelsCaption;
    } else {
      const richOut = buildHtmlAndPlainDescription(platform, product, bullets, toneProfile);
      descriptionHtml = richOut.descriptionHtml;
      description = richOut.description;
    }

    let seoTitle;
    let metaTitle;
    let metaDescription;
    let urlSlug;
    if (platform.id === 'shopify') {
      const brandSuffix = product.brand ? ` | ${product.brand}` : '';
      seoTitle = trimToMaxChars(
        sanitizeMarketplaceTitle(`${product.productName}${brandSuffix}`),
        platform.seoTitleMaxChars
      );
      metaTitle = seoTitle;
      const metaBase = `${product.brand ? `${product.brand} ` : ''}${product.productName}${product.material ? ` in ${product.material.split('(')[0].trim()}` : ''}. ${toneProfile.metaAction}`;
      metaDescription = trimToMaxChars(stripHtmlToPlainText(metaBase), platform.metaDescMaxChars);
      urlSlug = [product.brand, product.productName, product.color]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    let keywords = [];
    let keywordsText = '';
    let tags;
    let tagsText;
    let platformHashtags;
    let hashtagsText;

    if (platform.id === 'amazon') {
      const backend = buildAmazonBackendKeywords(product, primaryHsn, title);
      keywords = backend.words;
      keywordsText = backend.text;
    } else if (platform.id === 'etsy') {
      tags = formatEtsyTags(candidateKeywords, platform.tagsCount, platform.tagMaxChars);
      tagsText = tags.join(', ');
      keywords = tags;
      keywordsText = tagsText;
    } else if (platform.id === 'instagram') {
      platformHashtags = hashtags.slice(0, platform.hashtagsCount);
      hashtagsText = platformHashtags.join(' ');
      keywords = platformHashtags;
      keywordsText = hashtagsText;
    } else if (platform.id === 'youtube') {
      const yt = buildYouTubeTags(candidateKeywords, platform.tagsMaxChars);
      tags = yt.tags;
      tagsText = yt.text;
      keywords = yt.tags;
      keywordsText = yt.text;
    } else {
      const countCap = platform.keywordsCount || 10;
      keywords = candidateKeywords.slice(0, countCap);
      keywordsText = keywords.join(', ');
    }

    return {
      platformId: platform.id,
      platformName: platform.name,
      shortName: platform.shortName,
      group: platform.group,
      accent: platform.accent,
      ruleSummary: platform.ruleSummary,
      notes: PLATFORM_GUIDELINES[platform.id] || [],
      title,
      ...(seoTitle !== undefined ? { seoTitle, metaTitle } : {}),
      ...(metaDescription !== undefined ? { metaDescription } : {}),
      ...(urlSlug !== undefined ? { urlSlug } : {}),
      bullets,
      description,
      descriptionHtml,
      ...(reelsCaption !== undefined ? { reelsCaption } : {}),
      keywords,
      keywordsText,
      ...(tags !== undefined ? { tags, tagsText } : {}),
      ...(platformHashtags !== undefined ? { hashtags: platformHashtags, hashtagsText } : {}),
      limits: {
        titleMaxChars: platform.titleMaxChars,
        bulletsCount: platform.bulletsCount,
        bulletMaxChars: platform.bulletMaxChars,
        descriptionMaxChars: platform.descriptionMaxChars,
        keywordsMaxBytes: platform.keywordsMaxBytes ?? null,
        keywordsCount: platform.keywordsCount ?? null,
        seoTitleMaxChars: platform.seoTitleMaxChars ?? null,
        metaDescMaxChars: platform.metaDescMaxChars ?? null,
        tagsCount: platform.tagsCount ?? null,
        tagMaxChars: platform.tagMaxChars ?? null,
        tagsMaxChars: platform.tagsMaxChars ?? null,
        hashtagsCount: platform.hashtagsCount ?? null,
        plainTextOnly: Boolean(platform.plainTextOnly),
      },
      stats: {
        titleChars: title.length,
        titleWords: countWords(title),
        descriptionChars: description.length,
        descriptionWords: countWords(description),
        keywordsBytes: getUtf8ByteLength(keywordsText),
        keywordsChars: keywordsText.length,
        bulletsCount: bullets.length,
      },
    };
  });

  const listingsById = Object.fromEntries(listings.map((item) => [item.platformId, item]));

  return {
    product,
    tone: product.tone,
    primaryHsn,
    hsnMatches: autoMatches,
    taxBreakdown,
    listings,
    listingsById,
    listingsByPlatform: listingsById,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Formats a single platform's listing plus optional HSN/GST summary into clean paste-ready text.
 *
 * @param {object} listing
 * @param {object | null} [primaryHsn]
 * @param {object | null} [taxBreakdown]
 * @returns {string}
 */
export function formatSinglePlatformCopyText(listing, primaryHsn = null, taxBreakdown = null) {
  if (!listing) return '';

  const lines = [
    `=== ${listing.platformName} ===`,
    `Title (${listing.stats.titleChars}/${listing.limits.titleMaxChars} chars):`,
    listing.title,
  ];

  if (listing.seoTitle) {
    lines.push('', `SEO Title (${listing.seoTitle.length}/${listing.limits.seoTitleMaxChars}):`, listing.seoTitle);
  }
  if (listing.metaDescription) {
    lines.push('', `Meta Description (${listing.metaDescription.length}/${listing.limits.metaDescMaxChars}):`, listing.metaDescription);
  }

  if (listing.bullets?.length) {
    lines.push('', 'Key Bullet Points:', ...listing.bullets.map((b) => `• ${b}`));
  }

  lines.push('', 'Description (Plain Text):', listing.description);

  if (listing.descriptionHtml) {
    lines.push('', 'Description (HTML):', listing.descriptionHtml);
  }

  if (listing.reelsCaption) {
    lines.push('', 'Reels Caption:', listing.reelsCaption);
  }

  if (listing.keywordsText) {
    const label =
      listing.platformId === 'amazon'
        ? `Backend Search Terms (${listing.stats.keywordsBytes}/250 bytes)`
        : listing.platformId === 'etsy'
          ? `Etsy Tags (${listing.tags?.length || 0}/13)`
          : listing.platformId === 'instagram'
            ? `Hashtags (${listing.hashtags?.length || 0})`
            : 'Keywords / Tags';
    lines.push('', `${label}:`, listing.keywordsText);
  }

  if (primaryHsn) {
    lines.push(
      '',
      `Suggested HSN: ${primaryHsn.hsnCode} (${primaryHsn.gstRate}% GST — ${primaryHsn.title})`
    );
  }
  if (taxBreakdown) {
    lines.push(
      `Tax Estimate on ₹${taxBreakdown.sellingPrice}: Base ₹${taxBreakdown.baseTaxableValue} + GST ₹${taxBreakdown.gstAmount} (CGST ₹${taxBreakdown.cgstAmount} + SGST ₹${taxBreakdown.sgstAmount})`
    );
  }

  return lines.join('\n');
}

/**
 * Exports all generated platform listings as a formatted plain-text document.
 *
 * @param {object} result
 * @param {object} [productInput]
 * @returns {string}
 */
export function exportAllListingsAsText(result, productInput) {
  const productName = productInput?.productName || result?.product?.productName || 'Product';
  const sections = [
    `LyZov Product Listing Pack — ${productName}`,
    `Generated: ${result?.generatedAt || new Date().toISOString()}`,
    `Tone: ${result?.tone || 'professional'}`,
  ];

  if (result?.primaryHsn) {
    sections.push(
      `Recommended HSN: ${result.primaryHsn.hsnCode} (${result.primaryHsn.gstRate}% GST) — ${result.primaryHsn.title}`
    );
  }
  if (result?.taxBreakdown) {
    const tb = result.taxBreakdown;
    sections.push(
      `Price & Tax Breakdown: Selling ₹${tb.sellingPrice} | Base Taxable ₹${tb.baseTaxableValue} | GST (${tb.gstRate}%) ₹${tb.gstAmount}`
    );
  }

  for (const listing of result?.listings || []) {
    sections.push('', formatSinglePlatformCopyText(listing, null, null));
  }

  return sections.join('\n');
}

/**
 * Escapes a single CSV cell with formula-injection protection (=, +, -, @, tab, CR).
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeCsvCell(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  const trimmedLeading = raw.replace(/^[\s\u00A0]+/, '');
  const safe = /^[=+\-@\t\r]/.test(raw) || /^[=+\-@]/.test(trimmedLeading) ? `'${raw}` : raw;
  if (/[",\r\n]/.test(safe) || safe.startsWith("'")) {
    return `"${safe.replaceAll('"', '""')}"`;
  }
  return safe;
}

/**
 * Exports all generated platform listings as an Excel-safe UTF-8 CSV (with BOM and formula guard).
 *
 * @param {object} result
 * @param {object} [productInput]
 * @returns {string}
 */
export function exportAllListingsAsCsv(result, productInput) {
  const productName = productInput?.productName || result?.product?.productName || '';
  const hsnCode = result?.primaryHsn?.hsnCode || '';
  const gstRate = result?.taxBreakdown?.gstRate ?? result?.primaryHsn?.gstRate ?? '';
  const sellingPrice = result?.taxBreakdown?.sellingPrice ?? result?.product?.sellingPrice ?? '';

  const headers = [
    'Platform',
    'Group',
    'Product Name',
    'HSN Code',
    'GST Rate (%)',
    'Selling Price (INR)',
    'Title',
    'Title Chars',
    'SEO Title',
    'Meta Description',
    'Bullets',
    'Description (Plain Text)',
    'Description (HTML)',
    'Reels Caption',
    'Keywords / Tags',
  ];

  const rows = [headers.map(escapeCsvCell).join(',')];

  for (const listing of result?.listings || []) {
    const row = [
      listing.platformName,
      listing.group,
      productName,
      hsnCode,
      gstRate,
      sellingPrice,
      listing.title,
      listing.stats?.titleChars ?? listing.title.length,
      listing.seoTitle || '',
      listing.metaDescription || '',
      (listing.bullets || []).join(' | '),
      listing.description,
      listing.descriptionHtml || '',
      listing.reelsCaption || '',
      listing.keywordsText || '',
    ];
    rows.push(row.map(escapeCsvCell).join(','));
  }

  return `\uFEFF${rows.join('\r\n')}`;
}

/**
 * Exports all generated platform listings, HSN classification, and tax breakdown as formatted JSON.
 *
 * @param {object} result
 * @param {object} [productInput]
 * @returns {string}
 */
export function exportAllListingsAsJson(result, productInput) {
  return JSON.stringify(
    {
      generatedAt: result?.generatedAt || new Date().toISOString(),
      productInput: productInput || result?.product || {},
      tone: result?.tone || 'professional',
      primaryHsn: result?.primaryHsn || null,
      taxBreakdown: result?.taxBreakdown || null,
      listings: result?.listings || [],
    },
    null,
    2
  );
}

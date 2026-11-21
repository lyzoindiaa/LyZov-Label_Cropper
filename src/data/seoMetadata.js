import { TOOLS_CATALOG } from './toolsCatalog.js';
import { BLOG_POSTS } from './blogPosts.js';

export const SITE_URL = 'https://tools.lyzov.com';
export const SITE_NAME = 'LyZov Tools';
export const ORG_NAME = 'LyZov India';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
export const SITE_LOGO = `${SITE_URL}/logo.png`;
export const DEFAULT_LASTMOD = '2026-11-21';

/**
 * Normalizes a pathname or URL into a clean canonical URL on tools.lyzov.com
 * without trailing slashes on subpaths.
 */
export function buildCanonicalUrl(path = '/') {
  if (!path) return `${SITE_URL}/`;
  const clean = String(path).split('#')[0].split('?')[0].trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    const parsed = new URL(clean);
    const normalizedPath = parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/+$/, '');
    return `${SITE_URL}${normalizedPath}`;
  }
  const withLeadingSlash = clean.startsWith('/') ? clean : `/${clean}`;
  if (withLeadingSlash === '/') return `${SITE_URL}/`;
  return `${SITE_URL}${withLeadingSlash.replace(/\/+$/, '')}`;
}

export function buildBreadcrumbSchema(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: buildCanonicalUrl(item.path || item.url || '/'),
    })),
  };
}

export function buildWebAppSchema({
  name,
  description,
  route,
  category = 'UtilitiesApplication',
  featureList = [],
  price = '0',
}) {
  const url = buildCanonicalUrl(route);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    url,
    description,
    applicationCategory: category,
    operatingSystem: 'All',
    browserRequirements: 'Requires JavaScript in a modern web browser',
    image: DEFAULT_OG_IMAGE,
    offers: {
      '@type': 'Offer',
      price: String(price),
      priceCurrency: 'INR',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: SITE_LOGO,
      },
    },
    ...(featureList.length > 0 ? { featureList } : {}),
  };
}

export const TOOL_SEO = {
  '/image-resizer': {
    id: 'image-resizer',
    route: '/image-resizer',
    title: 'Free Bulk Image Resizer Online — Exact Pixels, Presets & ZIP | LyZov Tools',
    h1: 'Image Resizer',
    description:
      'Resize single or bulk JPG, PNG, and WEBP photos to exact pixel dimensions, marketplace presets, or percentages directly in your browser. Zero uploads.',
    keywords:
      'image resizer online, bulk photo resizer, resize image in pixels, product photo resizer amazon flipkart, free image resizer browser',
    applicationCategory: 'MultimediaApplication',
    changefreq: 'weekly',
    priority: '0.95',
    lastmod: DEFAULT_LASTMOD,
    overview:
      'Resize product photography, social graphics, and catalog images to exact pixel dimensions (such as 500x500, 1000x1000, or 1500x1500) or percentage scales without uploading files to external servers.',
    highlights: [
      'Aspect-ratio lock and custom pixel dimensions up to 10,000 px',
      'Preset marketplace sizes for Amazon, Flipkart, Meesho, and Shopify',
      'Bulk queue processing with one-click ZIP download',
    ],
    faqs: [
      {
        q: 'Are my photos uploaded to any server when resizing?',
        a: 'No. All image decoding and resizing run locally inside your browser using HTML5 Canvas, so your images never leave your device.',
      },
      {
        q: 'Can I resize multiple product photos at once?',
        a: 'Yes. Select multiple JPG, PNG, or WEBP files and export every resized image together inside a single ZIP archive.',
      },
    ],
    relatedToolIds: ['image-compressor', 'image-converter', 'background-remover'],
    relatedGuideSlug: null,
  },
  '/image-compressor': {
    id: 'image-compressor',
    route: '/image-compressor',
    title: 'Free Image Compressor Online — Reduce JPG, PNG & WEBP Size to Target KB | LyZov Tools',
    h1: 'Image Compressor',
    description:
      'Compress JPG, PNG, and WEBP images in your browser with quality slider or exact target KB/MB size limits. Fast, private, and bulk ZIP export ready.',
    keywords:
      'image compressor, reduce image size in kb, compress jpg png webp online, photo size reducer without losing quality',
    applicationCategory: 'MultimediaApplication',
    changefreq: 'weekly',
    priority: '0.95',
    lastmod: DEFAULT_LASTMOD,
    overview:
      'Shrink oversized product images and website photos while preserving crisp visual clarity. Choose manual quality control or specify an exact target KB/MB file limit.',
    highlights: [
      'Target KB/MB mode for portals, forms, and marketplace upload caps',
      'Lossless/palette optimization for PNG via UPNG plus smart JPEG/WEBP compression',
      'Live before/after size savings preview and bulk ZIP download',
    ],
    faqs: [
      {
        q: 'How do I compress an image under a specific KB limit?',
        a: 'Switch to Target Size mode, enter your desired KB or MB limit, and the compressor automatically finds the highest visual quality within that size.',
      },
      {
        q: 'Does compressing PNG keep transparency?',
        a: 'Yes. PNG compression preserves alpha transparency cleanly without adding unwanted solid backgrounds.',
      },
    ],
    relatedToolIds: ['image-resizer', 'image-converter', 'background-remover'],
    relatedGuideSlug: null,
  },
  '/image-converter': {
    id: 'image-converter',
    route: '/image-converter',
    title: 'Free Image Converter Online — Convert JPG, PNG, WEBP & BMP | LyZov Tools',
    h1: 'Image Converter',
    description:
      'Convert JPG, PNG, WEBP, and BMP images cleanly in your browser with custom or studio white transparency fills and batch ZIP download.',
    keywords:
      'image converter online, webp to jpg converter, png to jpg, jpg to webp, bulk image format converter free',
    applicationCategory: 'MultimediaApplication',
    changefreq: 'weekly',
    priority: '0.95',
    lastmod: DEFAULT_LASTMOD,
    overview:
      'Convert modern WEBP, transparent PNG, JPEG, or BMP files between formats instantly inside your browser with full control over transparency replacement colors.',
    highlights: [
      'Supports JPG, JPEG, PNG, WEBP, and BMP source files',
      'Clean white or custom color background fills when exporting to JPEG',
      'Batch convert multiple files and download all in one ZIP',
    ],
    faqs: [
      {
        q: 'What happens to transparent areas when converting PNG to JPG?',
        a: 'JPEG does not support transparency, so you can choose a crisp white or custom solid fill color instead of getting black artifacts.',
      },
      {
        q: 'Can I convert WEBP product images into standard JPG or PNG?',
        a: 'Yes. Drop any WEBP file, select JPG or PNG as the output format, and download instantly.',
      },
    ],
    relatedToolIds: ['image-compressor', 'image-resizer', 'background-remover'],
    relatedGuideSlug: null,
  },
  '/background-remover': {
    id: 'background-remover',
    route: '/background-remover',
    title: 'Free AI Background Remover — Transparent PNG & Pure White Studio Background | LyZov Tools',
    h1: 'AI Background Remover',
    description:
      'Remove photo backgrounds using on-device AI directly in your browser. Export transparent PNGs or marketplace-compliant pure white backgrounds with zero uploads.',
    keywords:
      'ai background remover free, remove background from image, transparent png maker, white background product photo maker',
    applicationCategory: 'MultimediaApplication',
    changefreq: 'weekly',
    priority: '0.95',
    lastmod: DEFAULT_LASTMOD,
    overview:
      'Create clean transparent cutouts or pure #FFFFFF studio white product photos for Amazon, Flipkart, and Meesho listings using on-device WebAssembly AI segmentation.',
    highlights: [
      'Runs 100% locally in your browser with zero image uploads',
      'Transparent PNG, studio white, or custom solid background fills',
      'Interactive before/after comparison slider and batch queue',
    ],
    faqs: [
      {
        q: 'Does the AI Background Remover upload my product images?',
        a: 'Never. After downloading the segmentation model locally into your browser cache, every pixel is processed on your own device.',
      },
      {
        q: 'Can I make Amazon-compliant pure white product backgrounds?',
        a: 'Yes. Select Pure White (#FFFFFF) as the background mode after cutout and download ready-to-upload marketplace photos.',
      },
    ],
    relatedToolIds: ['image-resizer', 'image-extractor', 'product-description'],
    relatedGuideSlug: null,
  },
  '/merge-pdf': {
    id: 'merge-pdf',
    route: '/merge-pdf',
    title: 'Merge PDF Online Free — Combine & Reorder Multiple PDFs Privately | LyZov Tools',
    h1: 'Merge PDF',
    description:
      'Combine and reorder multiple PDF documents into one clean PDF file directly in your browser. Live page thumbnails, zero uploads, completely free.',
    keywords:
      'merge pdf online free, combine pdf files, join pdf pages browser, reorder pdf pages privately',
    applicationCategory: 'UtilitiesApplication',
    changefreq: 'weekly',
    priority: '0.95',
    lastmod: DEFAULT_LASTMOD,
    overview:
      'Combine invoices, manifests, study notes, or reports into a single ordered PDF file in seconds without uploading confidential documents to external servers.',
    highlights: [
      'Drag or button reorder PDFs before assembling the final file',
      'Live page counts and visual page thumbnail verification',
      '100% client-side PDF assembly powered by pdf-lib',
    ],
    faqs: [
      {
        q: 'Is there any watermark added to merged PDFs?',
        a: 'No. Merged PDFs preserve original vector quality with zero watermarks or branding.',
      },
      {
        q: 'Can I combine Amazon or Flipkart shipping manifests before cropping?',
        a: 'Yes. Merge multiple label PDFs here first, or drop multiple PDFs directly into LyZov Cropper Studio.',
      },
    ],
    relatedToolIds: ['pdf-to-word', 'word-to-pdf', 'cropper'],
    relatedGuideSlug: 'crop-amazon-flipkart-labels-fast',
  },
  '/pdf-to-word': {
    id: 'pdf-to-word',
    route: '/pdf-to-word',
    title: 'Free PDF to Word Converter Online (OCR Ready) — PDF to Editable DOCX | LyZov Tools',
    h1: 'PDF to Word',
    description:
      'Convert digital or scanned PDFs into editable Microsoft Word (.docx) files privately in your browser with OCR support, tables, and multi-page layout preservation.',
    keywords:
      'pdf to word converter free, convert pdf to docx online, ocr pdf to word browser, editable word from pdf',
    applicationCategory: 'UtilitiesApplication',
    changefreq: 'weekly',
    priority: '0.95',
    lastmod: DEFAULT_LASTMOD,
    overview:
      'Extract text, headings, tables, and embedded images from digital or scanned PDF documents into clean, editable Microsoft Word (.docx) files locally in your browser.',
    highlights: [
      'Generates genuine OOXML .docx documents compatible with Word & Google Docs',
      'Built-in browser OCR support for scanned PDF pages',
      'Batch PDF conversion with instant ZIP download',
    ],
    faqs: [
      {
        q: 'Does PDF to Word work on scanned PDFs?',
        a: 'Yes. When pages contain scanned images instead of selectable text, on-device Tesseract OCR extracts readable text automatically.',
      },
      {
        q: 'Are confidential PDFs uploaded to the cloud?',
        a: 'No. Both PDF parsing and OCR run inside your browser sandbox.',
      },
    ],
    relatedToolIds: ['word-to-pdf', 'merge-pdf', 'cropper'],
    relatedGuideSlug: null,
  },
  '/word-to-pdf': {
    id: 'word-to-pdf',
    route: '/word-to-pdf',
    title: 'Free Word to PDF Converter Online — Private DOCX to Printable PDF | LyZov Tools',
    h1: 'Word to PDF',
    description:
      'Convert Microsoft Word (.docx) documents into clean, printable multi-page PDF files with live preview directly in your browser. Zero server uploads.',
    keywords:
      'word to pdf converter free, docx to pdf online, convert word document to pdf browser, private docx to pdf',
    applicationCategory: 'UtilitiesApplication',
    changefreq: 'weekly',
    priority: '0.95',
    lastmod: DEFAULT_LASTMOD,
    overview:
      'Turn Word (.docx) contracts, invoices, resumes, and reports into crisp, printable multi-page PDF documents with live preview right inside your browser.',
    highlights: [
      'Preserves headings, formatting, tables, and embedded graphics',
      'Interactive multi-page PDF preview before saving',
      'Zero uploads — fast client-side conversion for single or batch files',
    ],
    faqs: [
      {
        q: 'Which Word file format is supported?',
        a: 'Standard OOXML .docx files up to 25 MB each (up to 15 files per batch) are supported.',
      },
      {
        q: 'Can I preview the resulting PDF pages before downloading?',
        a: 'Yes. Every converted document opens in a live multi-page PDF viewer immediately before you download.',
      },
    ],
    relatedToolIds: ['pdf-to-word', 'merge-pdf', 'cropper'],
    relatedGuideSlug: null,
  },
  '/cropper': {
    id: 'cropper',
    route: '/cropper',
    title: 'Free Batch Shipping Label Cropper & 4x6 Thermal Printer Tool | LyZov Cropper Studio',
    h1: 'LyZov Cropper Studio',
    description:
      'Free, 100% private client-side batch PDF shipping label cropper for Meesho, Flipkart & Amazon. Auto-crop 4x6 thermal labels and tax invoices with zero uploads.',
    keywords:
      'shipping label cropper, meesho label cropper, flipkart label cropper, amazon label cropper, 4x6 thermal printer pdf crop, batch label cropper',
    applicationCategory: 'BusinessApplication',
    changefreq: 'weekly',
    priority: '0.95',
    lastmod: DEFAULT_LASTMOD,
    overview:
      'Automatically detect, crop, and separate shipping labels from tax invoices across Amazon, Flipkart, and Meesho PDF manifests — preserving vector barcode sharpness for thermal printing.',
    highlights: [
      'Auto-detects Amazon, Flipkart, and Meesho label layouts automatically',
      'Cleanly separates thermal shipping labels and A4 tax invoices',
      '100% client-side vector PDF cropping with zero server uploads',
    ],
    faqs: [
      {
        q: 'Which marketplaces does LyZov Cropper Studio support?',
        a: 'It automatically detects and crops shipping labels and invoices from Amazon Seller Central, Flipkart Seller Hub, and Meesho Supplier Panel PDFs.',
      },
      {
        q: 'Does cropping reduce barcode print clarity on thermal printers?',
        a: 'No. Labels are trimmed tightly around detected content and output as crisp PDFs compatible with 203 DPI and 300 DPI thermal printers.',
      },
    ],
    relatedToolIds: ['gst', 'pnl', 'merge-pdf'],
    relatedGuideSlug: 'crop-amazon-flipkart-labels-fast',
  },
  '/gst-tool': {
    id: 'gst',
    route: '/gst-tool',
    title: 'Free GSTR-1 Excel to JSON Converter & GST Return Generator | LyZov GST Tool',
    h1: 'LyZov GST Return Tool',
    description:
      'Convert Amazon MTR & Flipkart GST reports into GST portal-ready GSTR-1 JSON and CA Excel reconciliations in minutes. Includes GSTR-3B helper and error checks.',
    keywords:
      'gstr1 json generator, amazon mtr to gstr1, flipkart gst report to gstr1 json, ecommerce gst filing tool india, gstr3b reconcile',
    applicationCategory: 'FinanceApplication',
    changefreq: 'weekly',
    priority: '0.95',
    lastmod: DEFAULT_LASTMOD,
    overview:
      'Automate monthly GSTR-1 return preparation from Amazon Merchant Tax Reports (MTR) and Flipkart GST reports, complete with B2B, B2CS, CDNR, HSN summary, Table 14, and GSTR-3B reconciliation.',
    highlights: [
      'Supports Amazon MTR & Flipkart GST reports (Excel and CSV)',
      'Auto-splits B2B, B2CS, Credit/Debit Notes, HSN & Table 14 ECO supplies',
      'Generates GST Portal JSON + CA-ready Excel workbooks with GSTIN validation',
    ],
    faqs: [
      {
        q: 'Does the GST Tool support both B2B and B2C marketplace orders?',
        a: 'Yes. Invoices with valid buyer GSTINs map to B2B while consumer orders aggregate cleanly by Place of Supply and tax slab in B2CS.',
      },
      {
        q: 'Are Amazon and Flipkart return cancellations adjusted automatically?',
        a: 'Yes. Returns and cancellations are processed into CDNR / B2CS adjustments so you never over-report outward tax liability.',
      },
    ],
    relatedToolIds: ['pnl', 'cropper', 'product-description'],
    relatedGuideSlug: 'ecommerce-gst-compliance-gstr1-gstr3b',
  },
  '/pnl': {
    id: 'pnl',
    route: '/pnl',
    title: 'Seller P&L Analyzer & Marketplace Profit Calculator | LyZov Tools',
    h1: 'LyZov Seller P&L Analyzer',
    description:
      'Analyze exact net margins, marketplace fees, returns, and SKU-level profit across Flipkart, Amazon, Meesho & Shopify with period-scoped local analytics.',
    keywords:
      'ecommerce profit calculator, flipkart pnl analyzer, amazon seller profit loss calculator, meesho margin tracker, sku profit analyzer india',
    applicationCategory: 'FinanceApplication',
    changefreq: 'weekly',
    priority: '0.95',
    lastmod: DEFAULT_LASTMOD,
    overview:
      'Reconcile marketplace settlements, commissions, shipping deductions, RTOs, and product COGS to uncover exact SKU-level profitability across Amazon, Flipkart, Meesho, and Shopify.',
    highlights: [
      'Period-scoped local IndexedDB analytics with zero data mixing',
      'Full row audit trail (accepted vs rejected) and SKU alias mapping',
      'What-If price break-even & return-rate profit simulators',
    ],
    faqs: [
      {
        q: 'Where is my marketplace sales and cost data stored?',
        a: 'Order rows, product costs, and monthly expenses stay stored locally in your browser IndexedDB storage.',
      },
      {
        q: 'Can I compare August vs September profits separately?',
        a: 'Yes. Imports are cleanly partitioned by billing period so monthly returns and sales never mix.',
      },
    ],
    relatedToolIds: ['gst', 'cropper', 'product-description'],
    relatedGuideSlug: 'ecommerce-gst-compliance-gstr1-gstr3b',
  },
  '/image-extractor': {
    id: 'image-extractor',
    route: '/image-extractor',
    title: 'Product Link to HD Image Extractor — Amazon, Flipkart, Meesho & Myntra | LyZov Tools',
    h1: 'Product Image Extractor',
    description:
      'Extract high-resolution product photos from Amazon, Flipkart, Meesho, and Myntra product links, or convert local images cleanly to PNG or JPEG with batch ZIP export.',
    keywords:
      'product image extractor, amazon image downloader from link, flipkart product photo extractor, meesho image extractor, ecommerce product image tool',
    applicationCategory: 'MultimediaApplication',
    changefreq: 'weekly',
    priority: '0.95',
    lastmod: DEFAULT_LASTMOD,
    overview:
      'Paste any Amazon, Flipkart, Meesho, or Myntra product URL to extract clean, high-resolution product gallery photos and convert them to PNG or JPEG with custom quality or batch ZIP download.',
    highlights: [
      'Supports Amazon, Flipkart, Meesho, Myntra & OpenGraph product URLs',
      'Multi-angle gallery extraction with PNG & JPEG quality control',
      'Single link or batch multi-URL extraction with ZIP download',
    ],
    faqs: [
      {
        q: 'Which marketplace links work with Product Image Extractor?',
        a: 'Product URLs from Amazon, Flipkart, Meesho, Myntra, and general e-commerce storefronts with OpenGraph product metadata are supported.',
      },
      {
        q: 'Can I download all angles or multiple product links together?',
        a: 'Yes. Switch to Batch Multi-Link mode to process a list of URLs and export everything as a single ZIP archive.',
      },
    ],
    relatedToolIds: ['background-remover', 'image-resizer', 'product-description'],
    relatedGuideSlug: null,
  },
  '/product-description': {
    id: 'product-description',
    route: '/product-description',
    title: 'Rich Product Description, Multi-Platform Listing & HSN/GST Generator | LyZov Tools',
    h1: 'Rich Product Description & Listing Generator',
    description:
      'Generate marketplace-ready product titles, bullet points, HTML descriptions, search keywords, social captions, and Indian HSN/GST rate estimates for 12 channels.',
    keywords:
      'product description generator, amazon flipkart meesho listing generator, ecommerce seo keywords generator, indian hsn code gst rate finder, product copy generator',
    applicationCategory: 'BusinessApplication',
    changefreq: 'weekly',
    priority: '0.95',
    lastmod: DEFAULT_LASTMOD,
    overview:
      'Build compliant, high-converting product listings tailored to character and byte limits for Amazon, Flipkart, Meesho, Shopify, Blinkit, Etsy, Instagram, Facebook, WhatsApp, and YouTube — plus automatic Indian HSN & GST slab lookup.',
    highlights: [
      'Channel-specific copy for 12 e-commerce marketplaces & social platforms',
      'Enforces exact title lengths, 250-byte Amazon backend keywords & Etsy tags',
      'Auto-matched Indian HSN code and price-aware GST rate slabs (e.g., apparel ₹1,000 rule)',
    ],
    faqs: [
      {
        q: 'Does it follow Amazon backend keyword byte limits and Etsy tag rules?',
        a: 'Yes. Backend search terms strictly stay within 250 UTF-8 bytes and Etsy tags automatically format to 13 unique tags under 20 characters each.',
      },
      {
        q: 'How does the HSN code and GST rate suggestion work?',
        a: 'It matches your product title, category, and selling price against curated Indian GST HSN chapters (including price-threshold rules like apparel at ₹1,000) and includes a searchable manual HSN picker.',
      },
    ],
    relatedToolIds: ['image-extractor', 'background-remover', 'gst'],
    relatedGuideSlug: null,
  },
};

export const PAGE_SEO = {
  '/': {
    route: '/',
    title: 'LyZov Tools — Free Image, PDF, Document & E-Commerce Tools',
    description:
      'Free, fast, browser-based online tools: resize, compress, convert images, remove backgrounds with AI, merge PDFs, convert PDF & Word, crop shipping labels, generate product descriptions, and manage GST.',
    keywords:
      'lyzov tools, free online image tools, pdf tools browser, shipping label cropper, meesho flipkart amazon label crop, gstr1 json generator, ecommerce profit calculator, product description generator',
    changefreq: 'daily',
    priority: '1.0',
    lastmod: DEFAULT_LASTMOD,
  },
  '/how-to-use': {
    route: '/how-to-use',
    title: 'How to Use LyZov Cropper Studio — 4-Step Batch Label Cropping Guide | LyZov Tools',
    description:
      'Step-by-step interactive guide to using LyZov Cropper Studio: upload PDFs, calibrate coordinates, and download batch-cropped labels ready for thermal printing.',
    keywords:
      'how to crop shipping labels, thermal label cropper guide, batch pdf label cropper tutorial, 4x6 thermal printer setup',
    changefreq: 'monthly',
    priority: '0.9',
    lastmod: DEFAULT_LASTMOD,
  },
  '/faq': {
    route: '/faq',
    title: 'FAQ & Help Center — LyZov Tools & Label Cropper',
    description:
      'Frequently asked questions about LyZov Tools and Cropper Studio — browser-side privacy, supported thermal printers, batch limits, and file formats.',
    keywords:
      'lyzov faq, shipping label cropper help, client side pdf privacy, thermal printer compatibility',
    changefreq: 'monthly',
    priority: '0.85',
    lastmod: DEFAULT_LASTMOD,
  },
  '/blog': {
    route: '/blog',
    title: 'E-Commerce Seller Blog & Guides | LyZov Tools',
    description:
      'Practical guides, thermal printer setup tutorials, batch shipping label cropping tips, and GST return compliance guides for Amazon, Flipkart, and Meesho sellers.',
    keywords:
      'ecommerce seller blog india, thermal printing guide, amazon flipkart shipping label guide, gstr1 gstr3b compliance',
    changefreq: 'weekly',
    priority: '0.9',
    lastmod: DEFAULT_LASTMOD,
  },
  '/about': {
    route: '/about',
    title: 'About Us | LyZov Tools',
    description:
      'Learn about LyZov Tools & Cropper Studio — fast, 100% browser-private image, PDF, and e-commerce utilities built for shippers, sellers, and everyday teams.',
    keywords:
      'about lyzov tools, lyzov india, private browser tools, ecommerce seller utilities',
    changefreq: 'monthly',
    priority: '0.7',
    lastmod: DEFAULT_LASTMOD,
  },
  '/contact': {
    route: '/contact',
    title: 'Contact Us | LyZov Tools',
    description:
      'Get in touch with the LyZov Tools support team for bug reports, thermal printer compatibility help, GST format queries, or feature suggestions.',
    keywords:
      'contact lyzov, lyzov support email, label cropper support, gst tool help',
    changefreq: 'monthly',
    priority: '0.7',
    lastmod: DEFAULT_LASTMOD,
  },
  '/privacy-policy': {
    route: '/privacy-policy',
    title: 'Privacy Policy | LyZov Tools',
    description:
      'Read the LyZov Tools Privacy Policy. Everyday image, PDF, and label cropping tools execute 100% client-side in your browser with zero file uploads.',
    keywords: 'lyzov privacy policy, client side processing privacy, zero upload tools',
    changefreq: 'yearly',
    priority: '0.5',
    lastmod: '2026-10-19',
  },
  '/terms': {
    route: '/terms',
    title: 'Terms & Conditions | LyZov Tools',
    description:
      'Read the Terms and Conditions for using LyZov Tools — browser-based image, PDF, and e-commerce seller utilities with full commercial output ownership.',
    keywords: 'lyzov terms of service, terms and conditions',
    changefreq: 'yearly',
    priority: '0.5',
    lastmod: '2026-10-19',
  },
  '/disclaimer': {
    route: '/disclaimer',
    title: 'Disclaimer | LyZov Tools',
    description:
      'Read the Operational Disclaimer for LyZov Tools. Understand test print verification, barcode clarity checks, and compliance guidance.',
    keywords: 'lyzov disclaimer, shipping label barcode verification',
    changefreq: 'yearly',
    priority: '0.4',
    lastmod: '2026-10-19',
  },
};

export function getToolSeoByRoute(route) {
  if (!route) return null;
  let path = String(route).split('#')[0].split('?')[0].trim();
  if (path.startsWith('http://') || path.startsWith('https://')) {
    path = new URL(path).pathname;
  }
  const clean = path === '/' ? '/' : path.replace(/\/+$/, '');
  return TOOL_SEO[clean] || null;
}

export function buildToolPageSchema(toolSeo) {
  if (!toolSeo) return null;
  const url = buildCanonicalUrl(toolSeo.route);
  const schemas = [
    buildWebAppSchema({
      name: toolSeo.h1 || toolSeo.title,
      description: toolSeo.description,
      route: toolSeo.route,
      category: toolSeo.applicationCategory,
      featureList: toolSeo.highlights || [],
    }),
    buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: toolSeo.h1 || toolSeo.title, path: toolSeo.route },
    ]),
  ];

  if (Array.isArray(toolSeo.faqs) && toolSeo.faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: toolSeo.faqs.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': schemas.map(({ '@context': _ctx, ...rest }) => ({
      ...rest,
      '@id': rest['@type'] === 'WebApplication' ? `${url}#app` : undefined,
    })),
  };
}

export function buildHubSchema(tools = TOOLS_CATALOG, faqs = []) {
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      legalName: ORG_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: SITE_LOGO,
        width: 512,
        height: 512,
      },
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'lyzovindia@gmail.com',
        contactType: 'customer support',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      description: PAGE_SEO['/'].description,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-IN',
    },
    {
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/#webpage`,
      url: `${SITE_URL}/`,
      name: PAGE_SEO['/'].title,
      description: PAGE_SEO['/'].description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#organization` },
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
      },
      mainEntity: {
        '@type': 'ItemList',
        name: 'LyZov Browser Tools Directory',
        numberOfItems: tools.length,
        itemListElement: tools.map((tool, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: tool.name,
          description: tool.description,
          url: buildCanonicalUrl(tool.route),
        })),
      },
    },
  ];

  if (Array.isArray(faqs) && faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: faqs.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function buildBlogListSchema(posts = BLOG_POSTS) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        name: 'LyZov E-Commerce Seller Guides & Blog',
        url: buildCanonicalUrl('/blog'),
        description: PAGE_SEO['/blog'].description,
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: {
            '@type': 'ImageObject',
            url: SITE_LOGO,
          },
        },
        blogPost: posts.map((post) => ({
          '@type': 'BlogPosting',
          headline: post.title,
          url: buildCanonicalUrl(`/blog/${post.slug}`),
          datePublished: post.publishedAt,
          description: post.excerpt,
          author: {
            '@type': 'Organization',
            name: post.author?.name || SITE_NAME,
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog & Guides', item: buildCanonicalUrl('/blog') },
        ],
      },
    ],
  };
}

export function buildBlogPostSchema(post) {
  if (!post) return null;
  const url = buildCanonicalUrl(`/blog/${post.slug}`);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt || post.publishedAt || DEFAULT_LASTMOD,
        articleSection: post.category,
        keywords: Array.isArray(post.tags) ? post.tags.join(', ') : '',
        image: DEFAULT_OG_IMAGE,
        author: {
          '@type': 'Organization',
          name: post.author?.name || SITE_NAME,
          url: SITE_URL,
        },
        publisher: {
          '@type': 'Organization',
          name: ORG_NAME,
          url: SITE_URL,
          logo: {
            '@type': 'ImageObject',
            url: SITE_LOGO,
            width: 512,
            height: 512,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': url,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog & Guides', item: buildCanonicalUrl('/blog') },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      },
    ],
  };
}

/**
 * Generates the authoritative, deduplicated list of all public indexable URLs
 * for sitemap.xml and post-build static HTML pre-rendering.
 */
export function getSitemapEntries(tools = TOOLS_CATALOG, blogPosts = BLOG_POSTS) {
  const entries = [];
  const seen = new Set();

  const pushEntry = (entry) => {
    const loc = buildCanonicalUrl(entry.route);
    if (seen.has(loc)) return;
    seen.add(loc);
    entries.push({
      route: entry.route,
      loc,
      lastmod: entry.lastmod || DEFAULT_LASTMOD,
      changefreq: entry.changefreq || 'weekly',
      priority: entry.priority || '0.8',
      comment: entry.comment || '',
    });
  };

  // 1. Homepage Hub
  pushEntry({
    ...PAGE_SEO['/'],
    comment: 'Hub / Homepage',
  });

  // 2. All Tools from Catalog (guaranteed 100% coverage including /image-extractor & /product-description)
  for (const tool of tools) {
    const seo = getToolSeoByRoute(tool.route);
    pushEntry({
      route: tool.route,
      lastmod: seo?.lastmod || DEFAULT_LASTMOD,
      changefreq: seo?.changefreq || 'weekly',
      priority: seo?.priority || '0.95',
      comment: tool.name,
    });
  }

  // 3. Informational & Help Pages
  for (const route of ['/how-to-use', '/faq', '/about', '/contact', '/privacy-policy', '/terms', '/disclaimer']) {
    const seo = PAGE_SEO[route];
    pushEntry({
      ...seo,
      comment: seo.title.split('|')[0].trim(),
    });
  }

  // 4. Seller Blog Index & Articles
  pushEntry({
    ...PAGE_SEO['/blog'],
    comment: 'Seller Blog & Guides Index',
  });

  for (const post of blogPosts) {
    if (!post?.slug) continue;
    pushEntry({
      route: `/blog/${post.slug}`,
      lastmod: post.publishedAt || DEFAULT_LASTMOD,
      changefreq: 'monthly',
      priority: '0.85',
      comment: post.title,
    });
  }

  return entries;
}

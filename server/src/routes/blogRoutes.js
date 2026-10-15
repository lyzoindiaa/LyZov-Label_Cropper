import express from 'express';
import { BlogPost } from '../models/BlogPost.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Fallback seed data in case admin triggers seed without custom payload
const INITIAL_POSTS = [
  {
    slug: 'thermal-printer-shipping-label-guide',
    title: 'The Ultimate Guide to Thermal Printing for E-Commerce Shipping Labels (4x6 Setup & DPI Settings)',
    excerpt: 'Master thermal label printing for high-volume marketplace shipping. Learn optimal DPI settings, 4x6 inch label dimensions, darkness calibrations, and troubleshooting barcode blurriness.',
    category: 'Shipping & Printing',
    readTime: '6 min read',
    publishedAt: new Date('2026-10-14'),
    author: {
      name: 'Adarsh S.',
      role: 'Logistics & Printing Specialist',
      avatar: '📦',
    },
    tags: ['Thermal Printing', '4x6 Labels', 'Marketplace Logistics', 'Barcodes'],
    featured: true,
    isPublished: true,
    content: [
      {
        type: 'intro',
        text: 'For modern e-commerce sellers dispatching dozens or hundreds of parcels daily, standard A4 paper and inkjet cartridges quickly become an expensive bottleneck. Direct thermal printing has emerged as the universal standard for shipping manifests across Amazon, Flipkart, Meesho, Delhivery, and Bluedart.',
      },
      {
        type: 'heading',
        text: '1. Why Direct Thermal Printing Dominates Logistics',
      },
      {
        type: 'paragraph',
        text: 'Direct thermal printers utilize chemically treated, heat-sensitive media that blackens when passing under a thermal print head. Because direct thermal technology requires zero ink, ribbons, or toner cartridges, running costs drop to a fraction of traditional laser printing.',
      },
      {
        type: 'callout',
        variant: 'tip',
        title: 'Zero Ink Economics',
        text: 'A standard thermal roll of 500 self-adhesive 4x6 labels costs approximately ₹150–₹220 ($2–$3), which averages under 40 paise per shipment — saving up to 75% compared to ink cartridges and packaging tape.',
      },
      {
        type: 'heading',
        text: '2. Understanding 203 DPI vs. 300 DPI Thermal Print Heads',
      },
      {
        type: 'paragraph',
        text: 'When shopping for thermal printers (such as TSC, Zebra, Rollo, or Xprinter), you will primarily encounter two resolution specifications: 203 DPI (dots per inch) and 300 DPI.',
      },
      {
        type: 'table',
        headers: ['Specification', '203 DPI Printers', '300 DPI Printers'],
        rows: [
          ['Native Resolution', '8 dots per millimeter', '12 dots per millimeter'],
          ['Print Speed', 'Up to 152 mm/sec (6 inches/sec)', 'Up to 102 mm/sec (4 inches/sec)'],
          ['Ideal Use Case', 'Standard 1D barcodes & 4x6 courier labels', 'Small QR codes, jewelry tags, 2x1 labels'],
          ['Cost Profile', 'Economical & widely available', 'Premium pricing (20–40% higher)'],
          ['Courier Acceptance', '100% compliant with all carriers', '100% compliant with ultra-sharp text'],
        ],
      },
      {
        type: 'heading',
        text: '3. Optimal Driver Settings for Crisp Barcodes',
      },
      {
        type: 'paragraph',
        text: 'The number one reason shipping labels fail carrier automated sorting scanners is improper darkness and speed calibration. Follow these three steps in your printer driver preferences:',
      },
      {
        type: 'steps',
        items: [
          {
            title: 'Set Media Size to Exactly 4.00 x 6.00 Inches (100 x 150 mm)',
            desc: 'Avoid default Letter or A4 sizing. Ensure both page height and width match your physical roll stock exactly to prevent label drift.',
          },
          {
            title: 'Reduce Print Speed to 4.0 or 5.0 Inches Per Second',
            desc: 'Printing too fast does not give heat elements sufficient dwell time on the paper, resulting in faded barcode lines.',
          },
          {
            title: 'Calibrate Darkness / Density between 8 and 11 (Out of 15)',
            desc: 'Contrary to intuition, maximum darkness (15) causes thermal bleed, filling in narrow barcode white gaps and rendering them unreadable by laser scanners.',
          },
        ],
      },
      {
        type: 'heading',
        text: '4. Preparing Multi-Page PDFs for Direct 4x6 Printing',
      },
      {
        type: 'paragraph',
        text: 'Marketplace platforms frequently generate courier labels nested inside full-page A4 PDF manifests or invoice combos. Slicing these manually in photo editing tools degrades vector text and slows dispatch. Using a dedicated client-side crop tool like LyZov Cropper Studio allows you to draw your bounding box once and batch-export hundreds of pristine 4x6 vector thermal labels in seconds.',
      },
    ],
  },
  {
    slug: 'crop-amazon-flipkart-labels-fast',
    title: 'How to Batch Crop Amazon, Flipkart & Meesho Shipping Labels Without Quality Loss',
    excerpt: 'Step-by-step tutorial on extracting shipping labels from multi-page invoice PDFs in bulk without losing 300 DPI vector clarity or scanning sharpness.',
    category: 'E-Commerce',
    readTime: '5 min read',
    publishedAt: new Date('2026-10-12'),
    author: {
      name: 'LyZov Operations',
      role: 'E-Commerce Automation Team',
      avatar: '⚡',
    },
    tags: ['Amazon FBA', 'Flipkart Seller Hub', 'Meesho', 'Batch Cropping'],
    featured: false,
    isPublished: true,
    content: [
      {
        type: 'intro',
        text: 'When fulfilling customer orders on Indian e-commerce marketplaces, packing slips and courier labels are often packed together on single sheets or messy multi-page PDF documents. Manually taking screenshots or cropping one-by-one is slow and risks barcode blurriness.',
      },
      {
        type: 'heading',
        text: '1. The Problem with Screenshot-Based Label Cropping',
      },
      {
        type: 'paragraph',
        text: 'Many sellers resort to using the Windows Snipping Tool or screenshot utilities to capture each shipping label. Here is why this practice damages operations:',
      },
      {
        type: 'steps',
        items: [
          {
            title: 'Resolution Degradation (72 DPI vs 300 DPI)',
            desc: 'Screenshots rasterize vector PDF paths at your monitor display resolution (typically 72 to 96 DPI), producing pixelated barcodes when printed onto thermal paper.',
          },
          {
            title: 'High Labor Cost & Fatigue',
            desc: 'Cropping 100 orders individually at 30 seconds per label consumes nearly an hour of daily packing time.',
          },
          {
            title: 'Return to Origin (RTO) Risk',
            desc: 'Automated conveyor belts at logistics hubs scan barcodes at 2 meters per second. Faded or pixelated barcodes result in manual sorting delays or outright order rejections.',
          },
        ],
      },
      {
        type: 'heading',
        text: '2. The Vector Coordinate Approach (Zero Quality Loss)',
      },
      {
        type: 'paragraph',
        text: 'Unlike screenshot tools, modern browser tools leverage PDF vector math. Instead of converting pages into lossy JPG images, a visual crop box calculates precise geometric boundaries (x, y, width, height) and instructs the PDF renderer to crop the media box directly.',
      },
      {
        type: 'callout',
        variant: 'tip',
        title: 'Native Vector Preservation',
        text: 'Because vector paths remain unaltered, text, QR codes, and 1D Code128 barcodes retain 100% vector sharpness, regardless of how large or small they are scaled.',
      },
      {
        type: 'heading',
        text: '3. Workflow for Amazon & Flipkart Daily Manifests',
      },
      {
        type: 'steps',
        items: [
          {
            title: 'Download Unified PDF Manifest',
            desc: 'Export your daily schedule packing slip and label file from Amazon Seller Central or Flipkart Seller Hub.',
          },
          {
            title: 'Load into LyZov Cropper Studio',
            desc: 'Drag and drop your file into the canvas. All processing executes 100% locally in your web browser with zero server uploads.',
          },
          {
            title: 'Define Bounding Box on Page 1',
            desc: 'Drag the visual crop rectangle around the shipping label portion of the manifest.',
          },
          {
            title: 'Process Batch & Download Clean ZIP',
            desc: 'Click "Process & Crop". The tool slices every page at the exact coordinates and outputs individual 4x6 thermal-ready files or a combined document.',
          },
        ],
      },
    ],
  },
  {
    slug: 'ecommerce-gst-compliance-gstr1-gstr3b',
    title: 'Understanding GST Compliance for Indian E-Commerce Sellers: GSTR-1 & GSTR-3B Simplified',
    excerpt: 'A comprehensive beginner-to-pro walkthrough of monthly GST return filings, B2B vs B2C section mapping, TCS credit reconciliation, and avoiding portal penalties.',
    category: 'GST & Taxes',
    readTime: '8 min read',
    publishedAt: new Date('2026-10-10'),
    author: {
      name: 'CA Gaurav M.',
      role: 'Taxation Consultant',
      avatar: '📊',
    },
    tags: ['GST Compliance', 'GSTR-1', 'GSTR-3B', 'Flipkart Tax', 'Amazon TCS'],
    featured: false,
    isPublished: true,
    content: [
      {
        type: 'intro',
        text: 'Selling products across e-commerce platforms like Amazon, Flipkart, JioMart, and Meesho requires mandatory GST registration irrespective of your annual turnover. Navigating GSTR-1 sales declarations and GSTR-3B summary offsets is vital to staying compliant and avoiding interest penalties.',
      },
      {
        type: 'heading',
        text: '1. What is GSTR-1 vs GSTR-3B?',
      },
      {
        type: 'paragraph',
        text: 'GSTR-1 is a monthly or quarterly return of outward supplies (all sales and credit notes you have issued). GSTR-3B is a monthly self-assessed summary return where you declare total sales tax liability, claim eligible Input Tax Credit (ITC), and pay net tax owed.',
      },
      {
        type: 'table',
        headers: ['Return Form', 'Filing Frequency', 'Statutory Due Date', 'Key Objective'],
        rows: [
          ['GSTR-1', 'Monthly (or QRMP Quarterly)', '11th of succeeding month', 'Declare invoice-level B2B and state-wise B2C sales'],
          ['GSTR-2B', 'Automated Statement', '12th of succeeding month', 'Static view of eligible purchase ITC from suppliers'],
          ['GSTR-3B', 'Monthly', '20th of succeeding month', 'Tax liability offset & cash ledger payment'],
        ],
      },
      {
        type: 'heading',
        text: '2. Essential GSTR-1 Sections for Marketplace Sellers',
      },
      {
        type: 'steps',
        items: [
          {
            title: 'Table 7: B2C (Others) — Intra & Inter-State Retail Sales',
            desc: 'Most marketplace consumer orders belong here. Sales must be aggregated by Place of Supply (State Code) and applicable GST rate (5%, 12%, 18%, 28%).',
          },
          {
            title: 'Table 4: B2B Invoices — Business Customers with Valid GSTIN',
            desc: 'When an Amazon Business customer enters their GSTIN for ITC, you must declare the customer GSTIN, invoice number, taxable value, and tax breakdown.',
          },
          {
            title: 'Table 9: Credit/Debit Notes & Adjustments',
            desc: 'Customer product returns and cancelled orders must be adjusted against gross sales so you do not overpay output tax.',
          },
        ],
      },
      {
        type: 'heading',
        text: '3. Claiming TCS (Tax Collected at Source) Under GST Section 52',
      },
      {
        type: 'paragraph',
        text: 'Under Section 52 of the CGST Act, e-commerce operators automatically deduct 1% TCS (0.5% CGST + 0.5% SGST or 1% IGST) on net taxable supplies before disbursing payouts to your bank account. Sellers can accept these credits on the GST portal under the "TDS and TCS Credit Received" tab to credit their Electronic Cash Ledger.',
      },
      {
        type: 'callout',
        variant: 'tip',
        title: 'Automation Saves Days of CA Reconciliation',
        text: 'Instead of manually matching thousands of transaction lines from Flipkart Settlement Reports and Amazon Merchant Tax Reports, tools like LyZov GST Tool convert raw marketplace Excel files into GST portal-ready JSON tables in one click.',
      },
    ],
  },
  {
    slug: 'thermal-vs-laser-printer-for-sellers',
    title: 'Thermal vs Laser Printers for Marketplace Shippers: Speed, Cost & Barcode Scannability',
    excerpt: 'Detailed comparison between direct thermal and traditional desktop laser printers for packing stations. Calculate long-term ink, paper, and labor costs.',
    category: 'Shipping & Printing',
    readTime: '5 min read',
    publishedAt: new Date('2026-10-08'),
    author: {
      name: 'Adarsh S.',
      role: 'Logistics Specialist',
      avatar: '🖨️',
    },
    tags: ['Hardware Review', 'Thermal vs Laser', 'Shipping Station', 'Operational Efficiency'],
    featured: false,
    isPublished: true,
    content: [
      {
        type: 'intro',
        text: 'Starting sellers often ask: "Should I buy a thermal shipping label printer or just stick with my existing home office laser printer?" Below is an honest breakdown of the financial and practical differences.',
      },
      {
        type: 'heading',
        text: '1. Head-to-Head Comparison',
      },
      {
        type: 'table',
        headers: ['Feature', 'Direct Thermal Printer', 'Laser Printer'],
        rows: [
          ['Hardware Initial Cost', '₹5,500 – ₹11,000', '₹8,000 – ₹18,000'],
          ['Ongoing Consumables', 'Thermal paper rolls ONLY (Zero ink/toner)', 'Toner cartridges + A4 paper + Packing tape'],
          ['Print Speed', '1 label per second', '10–15 seconds per page warm-up'],
          ['Packing Time per Parcel', '15 seconds (Peel & stick)', '45–60 seconds (Cut with scissors & tape)'],
          ['Weather & Moisture Resistance', 'Waterproof thermal coating', 'Vulnerable to ink smearing in rain'],
        ],
      },
      {
        type: 'heading',
        text: '2. The Hidden Cost of Packing Tape & Paper',
      },
      {
        type: 'paragraph',
        text: 'With laser printers, each label requires cutting A4 sheets into fourths and applying multiple strips of clear bopp packing tape over the entire surface. Over 1,000 shipments, packing tape and toner cost roughly ₹2,200, whereas self-adhesive thermal rolls cost roughly ₹400 for the same volume.',
      },
      {
        type: 'callout',
        variant: 'tip',
        title: 'The Verdict for Shippers',
        text: 'If you dispatch more than 10 parcels per day, a dedicated 4x6 direct thermal printer pays for itself in consumable savings and saved packing labor within 60 to 90 days.',
      },
    ],
  },
];

// PUBLIC: Get all published blog posts
router.get('/', async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const filter = { isPublished: true };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: regex }, { excerpt: regex }, { tags: regex }];
    }

    // Auto-seed if database is currently empty
    const count = await BlogPost.countDocuments();
    if (count === 0) {
      await BlogPost.insertMany(INITIAL_POSTS);
    }

    const posts = await BlogPost.find(filter)
      .sort({ featured: -1, publishedAt: -1 })
      .lean();

    res.json({ success: true, posts, count: posts.length });
  } catch (error) {
    next(error);
  }
});

// PUBLIC: Get single blog post by slug
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    // Auto-seed if database is currently empty
    const count = await BlogPost.countDocuments();
    if (count === 0) {
      await BlogPost.insertMany(INITIAL_POSTS);
    }

    const post = await BlogPost.findOneAndUpdate(
      { slug: slug.toLowerCase(), isPublished: true },
      { $inc: { views: 1 } },
      { new: true }
    ).lean();

    if (!post) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    // Fetch up to 3 related posts
    const relatedPosts = await BlogPost.find({
      slug: { $ne: post.slug },
      isPublished: true,
      category: post.category,
    })
      .select('slug title excerpt readTime publishedAt author category')
      .limit(3)
      .lean();

    res.json({ success: true, post, relatedPosts });
  } catch (error) {
    next(error);
  }
});

// ADMIN: List all posts (including unpublished)
router.get('/admin/all', requireAdmin, async (req, res, next) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, posts });
  } catch (error) {
    next(error);
  }
});

// ADMIN: Seed posts
router.post('/admin/seed', requireAdmin, async (req, res, next) => {
  try {
    let seeded = 0;
    for (const postData of INITIAL_POSTS) {
      const existing = await BlogPost.findOne({ slug: postData.slug });
      if (!existing) {
        await BlogPost.create(postData);
        seeded++;
      }
    }
    res.json({ success: true, message: `Seeded ${seeded} new articles`, total: await BlogPost.countDocuments() });
  } catch (error) {
    next(error);
  }
});

// ADMIN: Create post
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { slug, title, excerpt, category, readTime, author, tags, featured, isPublished, content } = req.body;

    if (!slug || !title || !excerpt) {
      return res.status(400).json({ success: false, message: 'Slug, title, and excerpt are required' });
    }

    const existing = await BlogPost.findOne({ slug: slug.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An article with this slug already exists' });
    }

    const post = await BlogPost.create({
      slug: slug.toLowerCase(),
      title,
      excerpt,
      category: category || 'Shipping & Printing',
      readTime: readTime || '5 min read',
      author: author || { name: 'LyZov Editorial', role: 'Staff Writer', avatar: '✍️' },
      tags: Array.isArray(tags) ? tags : [],
      featured: Boolean(featured),
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      content: Array.isArray(content) ? content : [],
    });

    res.status(201).json({ success: true, post });
  } catch (error) {
    next(error);
  }
});

// ADMIN: Update post
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findByIdAndUpdate(id, { $set: req.body }, { new: true });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }
    res.json({ success: true, post });
  } catch (error) {
    next(error);
  }
});

// ADMIN: Delete post
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await BlogPost.findByIdAndDelete(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }
    res.json({ success: true, message: 'Article deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;

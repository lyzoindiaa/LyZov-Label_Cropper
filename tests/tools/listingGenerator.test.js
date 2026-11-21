import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_CATEGORIES,
  HSN_ENTRIES,
  resolveEffectiveGst,
  findBestHsnMatches,
  searchHsnCatalog,
} from '../../src/data/hsnCatalog.js';
import {
  LISTING_TONES,
  LISTING_PLATFORMS,
  SAMPLE_PRODUCTS,
  getUtf8ByteLength,
  countWords,
  stripHtmlToPlainText,
  sanitizeMarketplaceTitle,
  trimToMaxChars,
  trimToMaxBytes,
  formatEtsyTags,
  generateMultiPlatformListings,
  formatSinglePlatformCopyText,
  exportAllListingsAsText,
  exportAllListingsAsCsv,
  exportAllListingsAsJson,
} from '../../src/utils/listingGenerator.js';

describe('Indian GST HSN Reference Catalog', () => {
  it('defines all 12 expected product categories and ~45+ curated HSN entries', () => {
    assert.deepEqual(
      PRODUCT_CATEGORIES.map((c) => c.id),
      [
        'apparel',
        'footwear',
        'electronics',
        'home_kitchen',
        'beauty',
        'jewellery',
        'bags',
        'grocery',
        'health_fitness',
        'books_stationery',
        'toys_gifts',
        'general',
      ]
    );
    assert.ok(HSN_ENTRIES.length >= 45, `Expected at least 45 HSN entries, got ${HSN_ENTRIES.length}`);

    const validCategoryIds = new Set(PRODUCT_CATEGORIES.map((c) => c.id));
    for (const entry of HSN_ENTRIES) {
      assert.match(entry.hsnCode, /^\d{4}$/, `Expected 4-digit HSN code on ${entry.id}`);
      assert.ok(validCategoryIds.has(entry.categoryId), `Unknown categoryId on ${entry.id}`);
      assert.ok(Array.isArray(entry.keywords) && entry.keywords.length > 0);
    }
  });

  it('resolves apparel ₹1,000 GST threshold cleanly (₹799 -> 5%, ₹1,000 -> 5%, ₹1,499 -> 12%)', () => {
    const lowMatches = findBestHsnMatches({
      query: "Men's Oversized Cotton T-Shirt",
      categoryId: 'apparel',
      sellingPrice: 799,
    });
    assert.equal(lowMatches[0].hsnCode, '6109');
    assert.equal(lowMatches[0].confidence, 'High');
    assert.equal(lowMatches[0].gstRate, 5);
    assert.equal(lowMatches[0].cgstRate, 2.5);
    assert.equal(lowMatches[0].sgstRate, 2.5);
    assert.equal(lowMatches[0].igstRate, 5);
    assert.ok(lowMatches[0].appliedThresholdNote);

    const exactBoundaryMatches = findBestHsnMatches({
      query: "Men's Oversized Cotton T-Shirt",
      categoryId: 'apparel',
      sellingPrice: 1000,
    });
    assert.equal(exactBoundaryMatches[0].gstRate, 5);

    const highMatches = findBestHsnMatches({
      query: "Men's Oversized Cotton T-Shirt",
      categoryId: 'apparel',
      sellingPrice: 1499,
    });
    assert.equal(highMatches[0].hsnCode, '6109');
    assert.equal(highMatches[0].gstRate, 12);
    assert.equal(highMatches[0].cgstRate, 6);
    assert.equal(highMatches[0].sgstRate, 6);
    assert.equal(highMatches[0].igstRate, 12);
  });

  it('matches Electronics (18%), Jewellery (3%), Steel Bottle (12%), and Printed Books (0%) accurately', () => {
    const earbuds = findBestHsnMatches({
      query: 'Wireless ANC Bluetooth Earbuds',
      categoryId: 'electronics',
      sellingPrice: 1799,
    });
    assert.equal(earbuds[0].hsnCode, '8518');
    assert.equal(earbuds[0].gstRate, 18);
    assert.equal(earbuds[0].confidence, 'High');

    const jewellery = findBestHsnMatches({
      query: 'Imitation Gold Kundan Earrings Necklace Set',
      categoryId: 'jewellery',
      sellingPrice: 499,
    });
    assert.equal(jewellery[0].hsnCode, '7117');
    assert.equal(jewellery[0].gstRate, 3);
    assert.equal(jewellery[0].cgstRate, 1.5);
    assert.equal(jewellery[0].confidence, 'High');

    const book = findBestHsnMatches({
      query: 'Printed Paperback Novel Book',
      categoryId: 'books_stationery',
      sellingPrice: 350,
    });
    assert.equal(book[0].hsnCode, '4901');
    assert.equal(book[0].gstRate, 0);
    assert.equal(book[0].igstRate, 0);
    assert.equal(book[0].confidence, 'High');

    const steelBottle = findBestHsnMatches({
      query: 'Insulated Stainless Steel Bottle 1L',
      categoryId: 'home_kitchen',
      sellingPrice: 699,
    });
    assert.equal(steelBottle[0].hsnCode, '7323');
    assert.equal(steelBottle[0].gstRate, 12);
  });

  it('filters manual catalog search cleanly by keyword, HSN code, and category', () => {
    const allEntries = searchHsnCatalog('', 'all', 500);
    assert.equal(allEntries.length, HSN_ENTRIES.length);

    const byCode = searchHsnCatalog('7117', 'all', 500);
    assert.equal(byCode.length, 1);
    assert.equal(byCode[0].hsnCode, '7117');
    assert.equal(byCode[0].gstRate, 3);

    const apparelAbove1k = searchHsnCatalog('shirt', 'apparel', 1500);
    assert.ok(apparelAbove1k.length >= 2);
    assert.ok(apparelAbove1k.every((item) => item.categoryId === 'apparel'));
    assert.ok(apparelAbove1k.some((item) => item.hsnCode === '6109' && item.gstRate === 12));

    const split = resolveEffectiveGst(null, 500);
    assert.equal(split.gstRate, 18);
  });
});

describe('Listing Generator Pure Helpers', () => {
  it('strictly enforces trimToMaxBytes <= 250 UTF-8 bytes even with multi-byte Unicode', () => {
    const rupeeText = '₹'.repeat(100); // 300 UTF-8 bytes
    const trimmedRupee = trimToMaxBytes(rupeeText, 250);
    assert.ok(getUtf8ByteLength(trimmedRupee) <= 250);
    assert.equal(getUtf8ByteLength(trimmedRupee), 249);
    assert.ok(!trimmedRupee.includes('\uFFFD'));

    const emojiWords = Array.from({ length: 50 }, (_, idx) => `🔥deal${idx}`).join(' ');
    const trimmedEmoji = trimToMaxBytes(emojiWords, 250);
    assert.ok(getUtf8ByteLength(trimmedEmoji) <= 250);
    assert.ok(!trimmedEmoji.includes('\uFFFD'));

    const hindiMixed = 'कपड़ा कॉटन टीशर्ट प्रीमियम क्वालिटी '.repeat(12);
    const trimmedHindi = trimToMaxBytes(hindiMixed, 250);
    assert.ok(getUtf8ByteLength(trimmedHindi) <= 250);
    assert.ok(trimmedHindi.length > 0);
  });

  it('sanitizes promo spam from marketplace titles and strips HTML cleanly', () => {
    const dirtyTitle = 'Best No. 1 Cheap Cotton T-Shirt - Free Shipping 100% Guaranteed!!! #1';
    const clean = sanitizeMarketplaceTitle(dirtyTitle);
    assert.ok(!/\bbest\b/i.test(clean));
    assert.ok(!/\bno\.?\s*1\b/i.test(clean));
    assert.ok(!/#\s*1\b/i.test(clean));
    assert.ok(!/\bcheap\b/i.test(clean));
    assert.ok(!/free\s+shipping/i.test(clean));
    assert.ok(!/guaranteed/i.test(clean));
    assert.ok(!clean.includes('!'));
    assert.match(clean, /Cotton T-Shirt/i);

    const plain = stripHtmlToPlainText(
      '<h2>Title</h2><p>Soft &amp; breathable.</p><ul><li>Point A</li><li>Point B</li></ul>'
    );
    assert.ok(!/<[^>]+>/.test(plain));
    assert.ok(plain.includes('Soft & breathable.'));
    assert.ok(plain.includes('• Point A'));

    assert.equal(countWords('  one   two\nthree  '), 3);
    assert.equal(countWords(''), 0);

    const trimmedChars = trimToMaxChars('Classic Oversized Cotton T-Shirt for Men', 22);
    assert.ok(trimmedChars.length <= 22);
  });

  it('formats Etsy tags to <= 13 unique tags with every tag <= 20 characters', () => {
    const tags = formatEtsyTags([
      'Oversized Cotton T-Shirt For Men',
      'Streetwear Heavy GSM Tee',
      'oversized cotton t-shirt for men',
      'Breathable Summer Casual Top',
      'Minimalist Jet Black Tee',
      'Unisex Drop Shoulder Apparel',
      'Combed Cotton Loungewear',
      'Birthday Gift For Him',
      'Everyday College Fashion',
      'Relaxed Fit Graphic Blank',
      'Indian D2C Clothing Brand',
      'Soft Bio Washed Cotton',
      'Durable Reinforced Stitching',
      'Extra Fourteenth Tag Item',
      'Fifteenth Tag Item',
    ]);

    assert.ok(tags.length <= 13);
    assert.ok(tags.length >= 8);
    assert.equal(new Set(tags).size, tags.length);
    for (const tag of tags) {
      assert.ok(tag.length <= 20, `Tag "${tag}" exceeded 20 chars (${tag.length})`);
      assert.ok(!tag.includes(','));
    }
  });
});

describe('Multi-Platform Listing Generator Engine', () => {
  it('throws a readable Error when productName is missing or blank', () => {
    assert.throws(
      () => generateMultiPlatformListings({ brand: 'TestBrand' }),
      /product name is required/i
    );
    assert.throws(
      () => generateMultiPlatformListings({ productName: '   ' }),
      /product name is required/i
    );
  });

  it('generates all 12 platforms enforcing every length, byte, HTML, and tag constraint', () => {
    assert.equal(LISTING_PLATFORMS.length, 12);
    assert.deepEqual(
      LISTING_TONES.map((t) => t.id),
      ['professional', 'trendy', 'budget', 'luxury']
    );

    const result = generateMultiPlatformListings(SAMPLE_PRODUCTS[0]);
    assert.equal(result.listings.length, 12);
    assert.equal(result.primaryHsn.hsnCode, '6109');
    assert.equal(result.primaryHsn.gstRate, 5);
    assert.ok(result.taxBreakdown);
    assert.equal(result.taxBreakdown.gstRate, 5);
    assert.equal(result.taxBreakdown.sellingPrice, 799);
    assert.ok(
      Math.abs(
        result.taxBreakdown.baseTaxableValue + result.taxBreakdown.gstAmount - 799
      ) < 0.02
    );

    // Universal platform limit assertions
    for (const listing of result.listings) {
      assert.ok(
        listing.title.length > 0 && listing.title.length <= listing.limits.titleMaxChars,
        `${listing.platformId} title exceeded cap`
      );
      assert.ok(
        listing.bullets.length <= listing.limits.bulletsCount,
        `${listing.platformId} bullets count exceeded cap`
      );
      for (const bullet of listing.bullets) {
        assert.ok(
          bullet.length <= listing.limits.bulletMaxChars,
          `${listing.platformId} bullet exceeded cap`
        );
      }
      assert.ok(
        listing.description.length > 0 &&
          listing.description.length <= listing.limits.descriptionMaxChars,
        `${listing.platformId} description exceeded cap`
      );
    }

    // Amazon checks: <= 250 UTF-8 bytes, no commas, lowercase unique, excludes title words & brand, has HTML + plain text
    const amazon = result.listingsById.amazon;
    assert.ok(getUtf8ByteLength(amazon.keywordsText) <= 250);
    assert.ok(!amazon.keywordsText.includes(','));
    assert.equal(amazon.keywordsText, amazon.keywordsText.toLowerCase());
    assert.ok(amazon.descriptionHtml && amazon.descriptionHtml.includes('<p>'));
    assert.ok(!/<[^>]+>/.test(amazon.description));

    const amazonTitleWords = new Set(
      amazon.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
    );
    const brandWords = new Set(
      SAMPLE_PRODUCTS[0].brand
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
    );
    const amazonBackendWords = amazon.keywordsText.split(/\s+/).filter(Boolean);
    assert.equal(new Set(amazonBackendWords).size, amazonBackendWords.length);
    for (const word of amazonBackendWords) {
      assert.ok(!amazonTitleWords.has(word), `Amazon backend word "${word}" overlapped title`);
      assert.ok(!brandWords.has(word), `Amazon backend word "${word}" overlapped brand`);
    }

    // Meesho, Quick Commerce, Etsy, and all Social Media must have ZERO raw HTML tags
    for (const plainPlatformId of [
      'meesho',
      'quick_commerce',
      'etsy',
      'instagram',
      'facebook',
      'whatsapp',
      'youtube',
    ]) {
      const item = result.listingsById[plainPlatformId];
      assert.equal(item.descriptionHtml, null, `${plainPlatformId} should have null descriptionHtml`);
      assert.ok(!/<[^>]+>/.test(item.description), `${plainPlatformId} description leaked HTML`);
      assert.ok(!/<[^>]+>/.test(item.title), `${plainPlatformId} title leaked HTML`);
    }

    // Etsy checks: <= 13 tags each <= 20 chars
    const etsy = result.listingsById.etsy;
    assert.ok(etsy.tags.length > 0 && etsy.tags.length <= 13);
    for (const tag of etsy.tags) {
      assert.ok(tag.length <= 20, `Etsy tag "${tag}" exceeded 20 chars`);
    }

    // Shopify checks: seoTitle <= 60, metaDescription <= 160, rich HTML + plain text, urlSlug
    const shopify = result.listingsById.shopify;
    assert.ok(shopify.seoTitle.length > 0 && shopify.seoTitle.length <= 60);
    assert.equal(shopify.metaTitle, shopify.seoTitle);
    assert.ok(shopify.metaDescription.length > 0 && shopify.metaDescription.length <= 160);
    assert.ok(shopify.descriptionHtml && shopify.descriptionHtml.includes('<h2>'));
    assert.ok(shopify.urlSlug && !shopify.urlSlug.includes(' '));
    assert.equal(result.listingsByPlatform.shopify.platformId, 'shopify');
    assert.ok(Array.isArray(shopify.notes) && shopify.notes.length > 0);

    // Quick Commerce check: title <= 80 chars
    const qc = result.listingsById.quick_commerce;
    assert.ok(qc.title.length <= 80);

    // Instagram check: reelsCaption + hashtags <= 20
    const ig = result.listingsById.instagram;
    assert.ok(ig.reelsCaption && ig.reelsCaption.length > 0);
    assert.ok(!/<[^>]+>/.test(ig.reelsCaption));
    assert.ok(ig.hashtags.length > 0 && ig.hashtags.length <= 20);

    // WhatsApp bold check & YouTube tags <= 500 chars
    const wa = result.listingsById.whatsapp;
    assert.ok(wa.description.includes('*Price:*'));
    const yt = result.listingsById.youtube;
    assert.ok(yt.tagsText.length <= 500);
  });

  it('supports minimal product input without brand/price, UI alias fields, and platform subset filtering', () => {
    const minimal = generateMultiPlatformListings({ productName: 'Non-Slip Cotton Yoga Mat' });
    assert.equal(minimal.listings.length, 12);
    assert.equal(minimal.taxBreakdown, null);
    assert.equal(minimal.primaryHsn.hsnCode, '9506');
    assert.equal(minimal.primaryHsn.gstRate, 12);
    for (const listing of minimal.listings) {
      assert.ok(!listing.title.includes('undefined') && !listing.title.includes('null'));
      assert.ok(!listing.description.includes('undefined') && !listing.description.includes('null'));
      assert.ok(listing.bullets.length > 0);
    }

    const aliased = generateMultiPlatformListings(
      {
        productName: 'Cotton Bedsheet Set',
        brandName: 'LoomNest',
        categoryId: 'home_kitchen',
        sellingPrice: 899,
        packQty: '1 Queen Bedsheet + 2 Pillow Covers',
        careInstructions: 'Machine wash cold gentle cycle',
      },
      ['amazon']
    );
    assert.equal(aliased.product.brand, 'LoomNest');
    assert.equal(aliased.product.packageContents, '1 Queen Bedsheet + 2 Pillow Covers');
    assert.equal(aliased.product.careOrUsage, 'Machine wash cold gentle cycle');
    assert.match(aliased.listingsByPlatform.amazon.title, /LoomNest/);

    const subset = generateMultiPlatformListings(SAMPLE_PRODUCTS[1], ['amazon', 'shopify']);
    assert.equal(subset.listings.length, 2);
    assert.equal(subset.primaryHsn.hsnCode, '8518');
    assert.equal(subset.primaryHsn.gstRate, 18);

    const bottleLuxury = generateMultiPlatformListings({
      ...SAMPLE_PRODUCTS[2],
      tone: 'luxury',
    });
    assert.equal(bottleLuxury.primaryHsn.hsnCode, '7323');
    assert.equal(bottleLuxury.primaryHsn.gstRate, 12);
    assert.match(bottleLuxury.listingsById.shopify.description, /signature craftsmanship/i);
  });
});

describe('Listing Exporters & CSV Formula-Injection Guard', () => {
  it('formats single-platform text, full TXT, JSON, and BOM-prefixed safe CSV', () => {
    const dangerousInput = {
      productName: "=cmd|'/C calc'!A0",
      brand: '+SUM(1,2)',
      categoryId: 'general',
      sellingPrice: 500,
      extraKeywords: '@evil, -formula',
    };

    const result = generateMultiPlatformListings(dangerousInput, ['amazon', 'meesho']);
    const singleText = formatSinglePlatformCopyText(
      result.listingsById.amazon,
      result.primaryHsn,
      result.taxBreakdown
    );
    assert.ok(singleText.includes('Amazon.in'));
    assert.ok(singleText.includes('Suggested HSN:'));

    const allTxt = exportAllListingsAsText(result, dangerousInput);
    assert.ok(allTxt.includes('LyZov Product Listing Pack'));
    assert.ok(allTxt.includes('Meesho'));

    const jsonText = exportAllListingsAsJson(result, dangerousInput);
    const parsed = JSON.parse(jsonText);
    assert.equal(parsed.listings.length, 2);
    assert.equal(parsed.taxBreakdown.sellingPrice, 500);

    const csvText = exportAllListingsAsCsv(result, dangerousInput);
    assert.ok(csvText.startsWith('\uFEFF'), 'CSV should include UTF-8 BOM for Excel');
    assert.ok(csvText.includes("'=cmd|'/C calc'!A0"), 'Formula cell must be escaped with leading quote');
    assert.ok(!/,=cmd/.test(csvText) && !/,"=cmd/.test(csvText), 'Raw unescaped formula must not appear');

    const tabInput = { productName: '\t1+1' };
    const tabResult = generateMultiPlatformListings(tabInput, ['amazon']);
    const tabCsv = exportAllListingsAsCsv(tabResult, tabInput);
    assert.ok(tabCsv.includes("'\t1+1"), 'Leading tab cell must be escaped against CSV injection');
  });
});

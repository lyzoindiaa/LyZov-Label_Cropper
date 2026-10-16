/**
 * Realistic Demo & Seed Dataset for LyZov P&L Analyzer
 * Populates local IndexedDB and state across every tab:
 * Dashboard, Ingest, Data Quality, Products/COGS, Fee Rules, Waterfall Bridge, and Admin Console.
 */

export const DEMO_PRODUCTS = [
  {
    sku: 'TSHIRT-SLIM-BLK',
    title: 'Men Slim Fit Cotton T-Shirt (Black)',
    cogsUnitPaise: 18000, // ₹180.00
    packagingCostPaise: 2000, // ₹20.00
    otherUnitCostPaise: 500, // ₹5.00
    currency: 'INR',
    aliases: ['AMZ-TSHIRT-BLK', 'FLIP-TSHIRT-BLK', 'SHOPIFY-TSHIRT-01'],
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    sku: 'DENIM-JEANS-BLU',
    title: 'Classic Stretch Denim Jeans (Blue)',
    cogsUnitPaise: 45000, // ₹450.00
    packagingCostPaise: 3000, // ₹30.00
    otherUnitCostPaise: 1000, // ₹10.00
    currency: 'INR',
    aliases: ['AMZ-JEANS-BLU', 'MEESHO-DENIM-01', 'FLIP-DENIM-BLU'],
    updatedAt: Date.now() - 86400000 * 8,
  },
  {
    sku: 'HOODIE-WNT-GRY',
    title: 'Fleece Winter Pullover Hoodie (Heather Grey)',
    cogsUnitPaise: 52000, // ₹520.00
    packagingCostPaise: 3500, // ₹35.00
    otherUnitCostPaise: 1500, // ₹15.00
    currency: 'INR',
    aliases: ['HOODIE-GRY-L', 'FLIP-HOODIE-GRY'],
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    sku: 'LEATHER-WALLET-BRN',
    title: 'Genuine RFID Bifold Leather Wallet (Brown)',
    cogsUnitPaise: 22000, // ₹220.00
    packagingCostPaise: 2500, // ₹25.00
    otherUnitCostPaise: 500, // ₹5.00
    currency: 'INR',
    aliases: ['WALLET-BRN-01', 'AMZ-WALLET-RFID'],
    updatedAt: Date.now() - 86400000 * 10,
  },
  {
    sku: 'WIRELESS-EARBUDS',
    title: 'Pro Active Noise-Cancelling Bluetooth Earbuds',
    cogsUnitPaise: 75000, // ₹750.00
    packagingCostPaise: 4000, // ₹40.00
    otherUnitCostPaise: 2000, // ₹20.00
    currency: 'INR',
    aliases: ['EARBUDS-TWS-01', 'AMZ-TWS-PRO', 'FLIP-TWS-ANC'],
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    sku: 'PHONE-CASE-CLR',
    title: 'Shockproof Hybrid Armor Phone Case (Clear)',
    cogsUnitPaise: 8500, // ₹85.00
    packagingCostPaise: 1500, // ₹15.00
    otherUnitCostPaise: 500, // ₹5.00
    currency: 'INR',
    aliases: ['CASE-IPHONE-CLR', 'MEESHO-CASE-01'],
    updatedAt: Date.now() - 86400000 * 12,
  },
];

export const DEMO_BATCHES = [
  {
    id: 'batch_amz_oct',
    channelId: 'amazon',
    fileName: 'Amazon_MTR_Report_October_2026.csv',
    fileHash: 'sha256_amz_9812bc30a9e7123df8811',
    rowCountRaw: 120,
    rowCountAccepted: 118,
    rowCountRejected: 2,
    importedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'batch_flip_oct',
    channelId: 'flipkart',
    fileName: 'Flipkart_Sales_Report_Oct_2026.csv',
    fileHash: 'sha256_flip_4419ad887ec1123fa4402',
    rowCountRaw: 95,
    rowCountAccepted: 94,
    rowCountRejected: 1,
    importedAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'batch_shop_oct',
    channelId: 'shopify',
    fileName: 'Shopify_D2C_Orders_Export_Oct.csv',
    fileHash: 'sha256_shop_3310ff998124bca881900',
    rowCountRaw: 65,
    rowCountAccepted: 65,
    rowCountRejected: 0,
    importedAt: Date.now() - 86400000 * 1,
  },
];

export const DEMO_ORDER_LINES = [
  // High-margin T-Shirt Orders (Amazon)
  {
    id: 'line_amz_101',
    batchId: 'batch_amz_oct',
    sourceRowIndex: 1,
    channelId: 'amazon',
    orderId: '402-8921102-1928301',
    orderDate: '2026-10-14',
    sku: 'TSHIRT-SLIM-BLK',
    productTitle: 'Men Slim Fit Cotton T-Shirt (Black)',
    quantity: 2,
    status: 'delivered',
    currency: 'INR',
    grossSales: 119800, // 2 x ₹599 = ₹1198.00
    discounts: 10000, // ₹100.00
    shippingCharged: 0,
    feesTotal: 21500, // ₹215.00 (15% referral + closing)
    cogsUnitPaise: 18000, // 2 x 180 = ₹360 + packaging
    cogsSource: 'product_master',
    flags: [],
  },
  {
    id: 'line_amz_102',
    batchId: 'batch_amz_oct',
    sourceRowIndex: 2,
    channelId: 'amazon',
    orderId: '402-7719201-9812402',
    orderDate: '2026-10-13',
    sku: 'WIRELESS-EARBUDS',
    productTitle: 'Pro Active Noise-Cancelling Bluetooth Earbuds',
    quantity: 1,
    status: 'delivered',
    currency: 'INR',
    grossSales: 249900, // ₹2499.00
    discounts: 25000, // ₹250.00
    shippingCharged: 0,
    feesTotal: 41000, // ₹410.00
    cogsUnitPaise: 75000, // ₹750.00
    cogsSource: 'product_master',
    flags: [],
  },
  {
    id: 'line_flip_201',
    batchId: 'batch_flip_oct',
    sourceRowIndex: 3,
    channelId: 'flipkart',
    orderId: 'OD3029182910291',
    orderDate: '2026-10-12',
    sku: 'DENIM-JEANS-BLU',
    productTitle: 'Classic Stretch Denim Jeans (Blue)',
    quantity: 1,
    status: 'delivered',
    currency: 'INR',
    grossSales: 129900, // ₹1299.00
    discounts: 15000, // ₹150.00
    shippingCharged: 4000, // ₹40.00
    feesTotal: 19500, // ₹195.00 (12% commission + fixed)
    cogsUnitPaise: 45000, // ₹450.00
    cogsSource: 'product_master',
    flags: [],
  },
  // Return / Refund Order (Flipkart)
  {
    id: 'line_flip_202',
    batchId: 'batch_flip_oct',
    sourceRowIndex: 4,
    channelId: 'flipkart',
    orderId: 'OD9918273645120',
    orderDate: '2026-10-11',
    sku: 'HOODIE-WNT-GRY',
    productTitle: 'Fleece Winter Pullover Hoodie (Heather Grey)',
    quantity: 1,
    status: 'returned',
    currency: 'INR',
    grossSales: 169900,
    discounts: 0,
    shippingCharged: 0,
    refundAmount: 169900, // Full refund
    feesTotal: 12000, // Reverse shipping fee lost!
    cogsUnitPaise: 52000,
    cogsSource: 'product_master',
    flags: [{ code: 'ORDER_RETURNED', severity: 'INFO', message: 'Order was returned by buyer. Revenue reversed, return logistics incurred.' }],
  },
  // Loss-Making Product Example (Phone Case where Amazon fees eat margin)
  {
    id: 'line_amz_103',
    batchId: 'batch_amz_oct',
    sourceRowIndex: 5,
    channelId: 'amazon',
    orderId: '402-1102938-4491820',
    orderDate: '2026-10-10',
    sku: 'PHONE-CASE-CLR',
    productTitle: 'Shockproof Hybrid Armor Phone Case (Clear)',
    quantity: 1,
    status: 'delivered',
    currency: 'INR',
    grossSales: 19900, // ₹199.00 low selling price
    discounts: 5000, // -₹50 discount = ₹149 net
    shippingCharged: 0,
    feesTotal: 8500, // ₹85 total fees (15% commission + ₹25 closing + ₹40 easy ship)
    cogsUnitPaise: 8500, // ₹85 unit cost + packaging
    // Net: 149 - 85 - 85 = -₹21 LOSS!
    cogsSource: 'product_master',
    flags: [{ code: 'NEGATIVE_CONTRIBUTION', severity: 'WARNING', message: 'Product sold at a net unit loss after fees.' }],
  },
  // Shopify D2C Direct Orders (Higher profit margins, lower platform fees)
  {
    id: 'line_shop_301',
    batchId: 'batch_shop_oct',
    sourceRowIndex: 6,
    channelId: 'shopify',
    orderId: '#SH-1082',
    orderDate: '2026-10-09',
    sku: 'LEATHER-WALLET-BRN',
    productTitle: 'Genuine RFID Bifold Leather Wallet (Brown)',
    quantity: 2,
    status: 'delivered',
    currency: 'INR',
    grossSales: 179800, // 2 x ₹899 = ₹1798.00
    discounts: 18000, // 10% coupon = ₹179.80
    shippingCharged: 5000, // ₹50.00
    feesTotal: 4100, // ₹41.00 (Only 2% Razorpay gateway fee)
    cogsUnitPaise: 22000, // 2 x 220 = ₹440
    cogsSource: 'product_master',
    flags: [],
  },
  {
    id: 'line_shop_302',
    batchId: 'batch_shop_oct',
    sourceRowIndex: 7,
    channelId: 'shopify',
    orderId: '#SH-1083',
    orderDate: '2026-10-08',
    sku: 'TSHIRT-SLIM-BLK',
    productTitle: 'Men Slim Fit Cotton T-Shirt (Black)',
    quantity: 3,
    status: 'delivered',
    currency: 'INR',
    grossSales: 179700, // 3 x ₹599
    discounts: 20000,
    shippingCharged: 0,
    feesTotal: 3800,
    cogsUnitPaise: 18000,
    cogsSource: 'product_master',
    flags: [],
  },
  // Missing COGS Order (triggers worklist and audit warnings)
  {
    id: 'line_amz_104',
    batchId: 'batch_amz_oct',
    sourceRowIndex: 8,
    channelId: 'amazon',
    orderId: '402-9918274-1234981',
    orderDate: '2026-10-07',
    sku: 'SMART-WATCH-STRAP',
    productTitle: 'Silicone Breathable Sport Strap for Smartwatch',
    quantity: 1,
    status: 'delivered',
    currency: 'INR',
    grossSales: 39900, // ₹399.00
    discounts: 4000,
    shippingCharged: 0,
    feesTotal: 7200,
    cogsUnitPaise: null, // MISSING COST!
    cogsSource: 'missing',
    flags: [{ code: 'MISSING_COGS', severity: 'WARNING', message: 'SKU missing from Product Master. Excluded from exact margin.' }],
  },
];

export const DEMO_AUDIT_REPORT = {
  rawCount: 280,
  acceptedCount: 277,
  rejectedCount: 3,
  isReconciled: true,
  flagCounts: {
    MISSING_COGS: 1,
    NEGATIVE_CONTRIBUTION: 1,
    ORDER_RETURNED: 1,
    UNKNOWN_STATUS: 0,
  },
  rejected: [
    {
      rowIndex: 14,
      reason: 'Missing Order ID in source spreadsheet row',
      rawValues: { 'Order Date': '2026-10-05', SKU: 'TSHIRT-BLK', Qty: '1', Price: '499' },
    },
    {
      rowIndex: 42,
      reason: 'Duplicate order line detected (Deduplication policy: keep_first). Matches Order #402-8921102-1928301',
      rawValues: { 'Order ID': '402-8921102-1928301', 'Order Date': '2026-10-14', SKU: 'TSHIRT-SLIM-BLK', Price: '599' },
    },
    {
      rowIndex: 88,
      reason: 'Unparseable order date format: "Invalid Date Stamp"',
      rawValues: { 'Order ID': '402-9988771-0001293', 'Order Date': 'Invalid Date Stamp', SKU: 'HOODIE-WNT-GRY', Price: '1699' },
    },
  ],
};

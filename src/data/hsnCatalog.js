/**
 * Curated Indian GST HSN Reference Catalog & Smart Matcher for E-Commerce Sellers.
 * Pure JS module with zero browser/DOM dependencies.
 *
 * Note: GST slabs reflect common Indian GST rate schedules and price thresholds;
 * sellers should always verify final tax applicability on the official GST portal
 * or with their chartered accountant before filing.
 */

export const PRODUCT_CATEGORIES = [
  {
    id: 'apparel',
    name: 'Apparel & Clothing',
    description: 'T-shirts, shirts, kurtis, dresses, jeans, hoodies, innerwear & socks.',
    defaultGstRate: 5,
  },
  {
    id: 'footwear',
    name: 'Footwear',
    description: 'Sneakers, sports shoes, leather shoes, sandals, slippers & flip-flops.',
    defaultGstRate: 12,
  },
  {
    id: 'electronics',
    name: 'Electronics & Gadgets',
    description: 'Earbuds, speakers, smartwatches, chargers, cables & computer accessories.',
    defaultGstRate: 18,
  },
  {
    id: 'home_kitchen',
    name: 'Home & Kitchen',
    description: 'Steel bottles, cookware, storage containers, bedding, curtains & appliances.',
    defaultGstRate: 12,
  },
  {
    id: 'beauty',
    name: 'Beauty & Personal Care',
    description: 'Skincare serums, face wash, hair care, perfumes, soaps & grooming trimmers.',
    defaultGstRate: 18,
  },
  {
    id: 'jewellery',
    name: 'Jewellery & Watches',
    description: 'Imitation jewellery, earrings, necklaces, precious jewellery, watches & sunglasses.',
    defaultGstRate: 3,
  },
  {
    id: 'bags',
    name: 'Bags, Wallets & Luggage',
    description: 'Backpacks, laptop bags, handbags, travel suitcases, wallets & leather belts.',
    defaultGstRate: 18,
  },
  {
    id: 'grocery',
    name: 'Grocery, Tea, Coffee & Dry Fruits',
    description: 'Roasted coffee, tea leaves, almonds, cashews, spices, honey & supplements.',
    defaultGstRate: 5,
  },
  {
    id: 'health_fitness',
    name: 'Health, Fitness & Sports',
    description: 'Yoga mats, gym gear, medical monitors, orthopedic braces & posture supports.',
    defaultGstRate: 12,
  },
  {
    id: 'books_stationery',
    name: 'Books & Stationery',
    description: 'Printed books, notebooks, planners, diaries, pens & office stationery.',
    defaultGstRate: 12,
  },
  {
    id: 'toys_gifts',
    name: 'Toys, Games & Gifts',
    description: 'Educational toys, electronic toys, board games & scented gift candles.',
    defaultGstRate: 12,
  },
  {
    id: 'general',
    name: 'General & Packaging',
    description: 'Phone cases, plastic organizers, shipping boxes, tools & household hardware.',
    defaultGstRate: 18,
  },
];

export const HSN_ENTRIES = [
  // ── Apparel & Clothing ────────────────────────────────────────────────────
  {
    id: '6109-tshirts',
    hsnCode: '6109',
    categoryId: 'apparel',
    title: 'T-Shirts, Singlets & Vests (Knitted / Crocheted)',
    description: 'Cotton & blended knitted T-shirts, oversized tees, polo tees, tank tops & vests.',
    gstRate: 5,
    thresholdInr: 1000,
    aboveThresholdGstRate: 12,
    thresholdNote: '5% GST up to ₹1,000 sale value per piece; 12% GST above ₹1,000.',
    keywords: [
      't-shirt', 't shirt', 'tshirt', 'tee', 'oversized', 'cotton', 'round neck', 'crew neck',
      'polo', 'singlet', 'vest', 'tank top', 'men', 'women', 'unisex', 'topwear',
    ],
  },
  {
    id: '6205-mens-shirts',
    hsnCode: '6205',
    categoryId: 'apparel',
    title: "Men's & Boys' Shirts (Woven)",
    description: 'Formal shirts, casual linen shirts, denim shirts & checked cotton shirts.',
    gstRate: 5,
    thresholdInr: 1000,
    aboveThresholdGstRate: 12,
    thresholdNote: '5% GST up to ₹1,000 sale value per piece; 12% GST above ₹1,000.',
    keywords: [
      'shirt', 'mens shirt', 'formal shirt', 'casual shirt', 'linen', 'denim shirt',
      'oxford', 'button down', 'kurta shirt', 'men', 'boys',
    ],
  },
  {
    id: '6206-womens-tops',
    hsnCode: '6206',
    categoryId: 'apparel',
    title: "Women's & Girls' Blouses, Shirts & Tops",
    description: 'Woven tops, tunics, crop tops, formal blouses & casual shirts for women.',
    gstRate: 5,
    thresholdInr: 1000,
    aboveThresholdGstRate: 12,
    thresholdNote: '5% GST up to ₹1,000 sale value per piece; 12% GST above ₹1,000.',
    keywords: [
      'blouse', 'top', 'womens top', 'tunic', 'crop top', 'womens shirt',
      'georgette', 'chiffon', 'women', 'girls',
    ],
  },
  {
    id: '6204-womens-dresses-kurtis',
    hsnCode: '6204',
    categoryId: 'apparel',
    title: "Women's Kurtis, Dresses, Suits & Trousers",
    description: 'Ethnic kurtis, anarkali dresses, co-ord sets, skirts, palazzos & women trousers.',
    gstRate: 5,
    thresholdInr: 1000,
    aboveThresholdGstRate: 12,
    thresholdNote: '5% GST up to ₹1,000 sale value per piece; 12% GST above ₹1,000.',
    keywords: [
      'kurti', 'kurta', 'dress', 'gown', 'suit', 'palazzo', 'skirt', 'ethnic',
      'lehenga', 'leggings', 'trouser', 'women', 'co-ord',
    ],
  },
  {
    id: '6203-mens-trousers-jeans',
    hsnCode: '6203',
    categoryId: 'apparel',
    title: "Men's & Boys' Jeans, Trousers, Chinos & Shorts",
    description: 'Denim jeans, formal trousers, cargo pants, chinos, joggers & shorts.',
    gstRate: 5,
    thresholdInr: 1000,
    aboveThresholdGstRate: 12,
    thresholdNote: '5% GST up to ₹1,000 sale value per piece; 12% GST above ₹1,000.',
    keywords: [
      'jeans', 'denim', 'trouser', 'pants', 'chinos', 'cargo', 'shorts',
      'joggers', 'track pant', 'men', 'boys', 'bottomwear',
    ],
  },
  {
    id: '6110-hoodies-sweaters',
    hsnCode: '6110',
    categoryId: 'apparel',
    title: 'Hoodies, Sweatshirts, Sweaters & Cardigans',
    description: 'Fleece hoodies, zip-up sweatshirts, knitted pullovers, jumpers & winter cardigans.',
    gstRate: 5,
    thresholdInr: 1000,
    aboveThresholdGstRate: 12,
    thresholdNote: '5% GST up to ₹1,000 sale value per piece; 12% GST above ₹1,000.',
    keywords: [
      'hoodie', 'sweatshirt', 'sweater', 'pullover', 'cardigan', 'fleece',
      'winter wear', 'jumper', 'jacket',
    ],
  },
  {
    id: '6115-socks-hosiery',
    hsnCode: '6115',
    categoryId: 'apparel',
    title: 'Socks, Stockings & Hosiery',
    description: 'Cotton ankle socks, crew sports socks, compression socks & hosiery packs.',
    gstRate: 5,
    thresholdInr: 1000,
    aboveThresholdGstRate: 12,
    thresholdNote: '5% GST up to ₹1,000 sale value per pack/piece; 12% GST above ₹1,000.',
    keywords: [
      'socks', 'ankle socks', 'crew socks', 'sports socks', 'compression',
      'stockings', 'hosiery', 'loafers socks',
    ],
  },
  {
    id: '6211-tracksuits-ethnic-sets',
    hsnCode: '6211',
    categoryId: 'apparel',
    title: 'Tracksuits, Activewear & Traditional Kurta Sets',
    description: 'Sports tracksuits, gym co-ord sets, men kurtas, swimwear & nightwear sets.',
    gstRate: 5,
    thresholdInr: 1000,
    aboveThresholdGstRate: 12,
    thresholdNote: '5% GST up to ₹1,000 sale value per piece; 12% GST above ₹1,000.',
    keywords: [
      'tracksuit', 'activewear', 'sportswear', 'gym wear', 'kurta', 'pajama',
      'nightwear', 'swimwear', 'co-ord set',
    ],
  },

  // ── Footwear ──────────────────────────────────────────────────────────────
  {
    id: '6402-sports-sneakers',
    hsnCode: '6402',
    categoryId: 'footwear',
    title: 'Sports Shoes, Sneakers & EVA / Rubber Footwear',
    description: 'Running shoes, EVA clogs, rubber sandals, waterproof slides & molded sneakers.',
    gstRate: 12,
    thresholdInr: 1000,
    aboveThresholdGstRate: 18,
    thresholdNote: '12% GST up to ₹1,000 per pair; 18% GST for premium pairs above ₹1,000.',
    keywords: [
      'shoes', 'sneakers', 'sports shoes', 'running shoes', 'clogs', 'slides',
      'crocs', 'rubber', 'eva', 'gym shoes', 'walking shoes',
    ],
  },
  {
    id: '6403-leather-footwear',
    hsnCode: '6403',
    categoryId: 'footwear',
    title: 'Leather Shoes, Loafers & Formal Footwear',
    description: 'Genuine leather oxfords, brogues, loafers, Chelsea boots & leather sandals.',
    gstRate: 12,
    thresholdInr: 1000,
    aboveThresholdGstRate: 18,
    thresholdNote: '12% GST up to ₹1,000 per pair; 18% GST above ₹1,000.',
    keywords: [
      'leather shoes', 'formal shoes', 'loafers', 'boots', 'oxford', 'brogue',
      'mojari', 'jutti', 'leather sandals',
    ],
  },
  {
    id: '6404-canvas-textile-shoes',
    hsnCode: '6404',
    categoryId: 'footwear',
    title: 'Canvas Sneakers & Mesh Knit Running Shoes',
    description: 'Breathable mesh sneakers, canvas casual shoes & textile trainers.',
    gstRate: 12,
    thresholdInr: 1000,
    aboveThresholdGstRate: 18,
    thresholdNote: '12% GST up to ₹1,000 per pair; 18% GST above ₹1,000.',
    keywords: [
      'canvas shoes', 'mesh shoes', 'casual sneakers', 'trainers', 'slip-on',
      'textile shoes', 'womens sneakers',
    ],
  },
  {
    id: '6405-sandals-slippers',
    hsnCode: '6405',
    categoryId: 'footwear',
    title: 'Casual Sandals, Flip-Flops & Home Slippers',
    description: 'Daily wear slippers, bathroom flip-flops, cushioned chappals & flat sandals.',
    gstRate: 12,
    thresholdInr: 1000,
    aboveThresholdGstRate: 18,
    thresholdNote: '12% GST up to ₹1,000 per pair; 18% GST above ₹1,000.',
    keywords: [
      'slippers', 'flip-flops', 'flip flops', 'chappal', 'sandals', 'flats',
      'heels', 'orthopedic slipper', 'home footwear',
    ],
  },

  // ── Electronics & Gadgets ─────────────────────────────────────────────────
  {
    id: '8518-earbuds-speakers',
    hsnCode: '8518',
    categoryId: 'electronics',
    title: 'Wireless Earbuds, Headphones & Bluetooth Speakers',
    description: 'TWS earbuds, ANC headphones, neckbands, portable Bluetooth speakers & microphones.',
    gstRate: 18,
    keywords: [
      'earbuds', 'tws', 'anc', 'bluetooth', 'wireless', 'headphones', 'earphones',
      'neckband', 'speaker', 'soundbar', 'microphone', 'audio', 'gaming headset',
    ],
  },
  {
    id: '8517-mobile-smartwatch',
    hsnCode: '8517',
    categoryId: 'electronics',
    title: 'Smartphones, Smartwatches & Networking Devices',
    description: 'Mobile phones, Bluetooth calling smartwatches, Wi-Fi routers & mobile adapters.',
    gstRate: 18,
    keywords: [
      'smartphone', 'mobile', 'smartwatch', 'fitness band', 'router', 'wifi',
      'bluetooth calling', 'telecom', 'dongle',
    ],
  },
  {
    id: '8504-chargers-powerbanks',
    hsnCode: '8504',
    categoryId: 'electronics',
    title: 'Power Banks, Fast Chargers & GaN Adapters',
    description: 'USB-C PD fast chargers, magnetic wireless power banks, laptop adapters & UPS.',
    gstRate: 18,
    keywords: [
      'power bank', 'powerbank', 'charger', 'adapter', 'fast charger', 'gan',
      'magsafe', 'wireless charger', 'usb charger', 'car charger',
    ],
  },
  {
    id: '8544-cables-wires',
    hsnCode: '8544',
    categoryId: 'electronics',
    title: 'USB Cables, Type-C Cords, HDMI & Extension Boards',
    description: 'Braided Type-C charging cables, Lightning cables, HDMI cords & surge protectors.',
    gstRate: 18,
    keywords: [
      'cable', 'usb cable', 'type-c', 'type c', 'hdmi', 'aux', 'charging cord',
      'extension board', 'data cable', 'braided',
    ],
  },
  {
    id: '8471-computer-peripherals',
    hsnCode: '8471',
    categoryId: 'electronics',
    title: 'Keyboards, Mice, Laptops, Tablets & Storage Drives',
    description: 'Mechanical keyboards, wireless mice, USB hubs, laptops, tablets & SSDs.',
    gstRate: 18,
    keywords: [
      'keyboard', 'mouse', 'laptop', 'tablet', 'usb hub', 'ssd', 'pendrive',
      'webcam', 'computer', 'gaming mouse', 'laptop stand',
    ],
  },
  {
    id: '8525-cameras-security',
    hsnCode: '8525',
    categoryId: 'electronics',
    title: 'Webcams, Action Cameras & Wi-Fi CCTV Cameras',
    description: 'Smart home CCTV cameras, dashcams, action cameras & streaming webcams.',
    gstRate: 18,
    keywords: [
      'camera', 'cctv', 'dashcam', 'action camera', 'webcam', 'security camera',
      'baby monitor',
    ],
  },
  {
    id: '8539-led-lights',
    hsnCode: '8539',
    categoryId: 'electronics',
    title: 'LED Bulbs, Smart Lights & Strip Lighting',
    description: 'Smart Wi-Fi LED bulbs, RGB strip lights, desk lamps & rechargeable emergency lights.',
    gstRate: 12,
    keywords: [
      'led', 'bulb', 'smart light', 'ring light', 'strip light', 'desk lamp',
      'night light', 'rechargeable light',
    ],
  },

  // ── Home & Kitchen ────────────────────────────────────────────────────────
  {
    id: '7323-steel-kitchenware',
    hsnCode: '7323',
    categoryId: 'home_kitchen',
    title: 'Stainless Steel Bottles, Flasks, Tiffins & Kitchenware',
    description: 'Insulated stainless steel water bottles, thermosteel flasks, lunch boxes, kadhai & utensils.',
    gstRate: 12,
    keywords: [
      'bottle', 'water bottle', 'stainless steel', 'steel', 'insulated', 'flask',
      'thermos', 'sipper', 'tiffin', 'lunch box', 'utensils', 'kitchenware', '1l', 'litre',
    ],
  },
  {
    id: '3924-plastic-kitchenware',
    hsnCode: '3924',
    categoryId: 'home_kitchen',
    title: 'Plastic Storage Containers, Organizers & Tableware',
    description: 'Airtight kitchen jars, fridge organizer trays, BPA-free bottles & spice racks.',
    gstRate: 18,
    keywords: [
      'plastic', 'container', 'storage box', 'organizer', 'fridge tray', 'jar',
      'masala box', 'bpa free', 'plastic bottle', 'kitchen rack',
    ],
  },
  {
    id: '7615-aluminium-cookware',
    hsnCode: '7615',
    categoryId: 'home_kitchen',
    title: 'Aluminium & Non-Stick Cookware, Tawa & Cookers',
    description: 'Non-stick frying pans, dosa tawa, hard-anodized kadhai & pressure cookers.',
    gstRate: 12,
    keywords: [
      'cookware', 'non-stick', 'nonstick', 'pan', 'frying pan', 'tawa', 'kadhai',
      'pressure cooker', 'aluminium', 'cast iron',
    ],
  },
  {
    id: '6911-ceramic-mugs',
    hsnCode: '6911',
    categoryId: 'home_kitchen',
    title: 'Ceramic Coffee Mugs, Cups & Porcelain Dinnerware',
    description: 'Printed ceramic mugs, tea cup sets, serving bowls & bone-china dinner sets.',
    gstRate: 12,
    keywords: [
      'mug', 'coffee mug', 'ceramic', 'cup', 'tea set', 'dinner set', 'bowl',
      'plate', 'porcelain', 'crockery',
    ],
  },
  {
    id: '7013-glassware',
    hsnCode: '7013',
    categoryId: 'home_kitchen',
    title: 'Borosilicate Glassware, Jars & Drinking Tumblers',
    description: 'Glass storage jars, borosilicate baking bowls, juice glasses & oil dispensers.',
    gstRate: 18,
    keywords: [
      'glass', 'borosilicate', 'glass jar', 'tumbler', 'glass bottle',
      'oil dispenser', 'baking dish', 'carafe',
    ],
  },
  {
    id: '6302-bedsheets-towels',
    hsnCode: '6302',
    categoryId: 'home_kitchen',
    title: 'Bedsheets, Pillow Covers & Cotton Bath Towels',
    description: 'King/Queen cotton bedsheets, fitted bed linen, microfiber bath towels & table cloths.',
    gstRate: 5,
    thresholdInr: 1000,
    aboveThresholdGstRate: 12,
    thresholdNote: '5% GST up to ₹1,000 per piece; 12% GST above ₹1,000.',
    keywords: [
      'bedsheet', 'bed sheet', 'pillow cover', 'towel', 'bath towel', 'cotton linen',
      'king size', 'queen size', 'table cloth', 'bedding',
    ],
  },
  {
    id: '6303-curtains-blinds',
    hsnCode: '6303',
    categoryId: 'home_kitchen',
    title: 'Door & Window Curtains, Drapes & Blinds',
    description: 'Blackout eyelet curtains, sheer window drapes, roller blinds & door curtains.',
    gstRate: 5,
    thresholdInr: 1000,
    aboveThresholdGstRate: 12,
    thresholdNote: '5% GST up to ₹1,000 per piece; 12% GST above ₹1,000.',
    keywords: [
      'curtain', 'curtains', 'blackout', 'drapes', 'blinds', 'door curtain',
      'window curtain',
    ],
  },
  {
    id: '8509-kitchen-appliances',
    hsnCode: '8509',
    categoryId: 'home_kitchen',
    title: 'Mixer Grinders, Blenders, Choppers & Electric Kettles',
    description: 'Domestic food processors, hand blenders, juicers & vegetable choppers.',
    gstRate: 18,
    keywords: [
      'mixer', 'grinder', 'blender', 'juicer', 'chopper', 'food processor',
      'hand blender', 'frother', 'kitchen appliance',
    ],
  },
  {
    id: '8516-electric-heating-appliances',
    hsnCode: '8516',
    categoryId: 'home_kitchen',
    title: 'Electric Kettles, Hair Dryers, Irons & Induction Cooktops',
    description: 'Stainless electric kettles, steam irons, hair straighteners, toasters & induction stoves.',
    gstRate: 18,
    keywords: [
      'electric kettle', 'kettle', 'iron', 'steam iron', 'induction', 'toaster',
      'sandwich maker', 'hair dryer', 'straightener', 'room heater',
    ],
  },

  // ── Beauty & Personal Care ────────────────────────────────────────────────
  {
    id: '3304-skincare-cosmetics',
    hsnCode: '3304',
    categoryId: 'beauty',
    title: 'Skincare Serums, Face Wash, Sunscreens & Cosmetics',
    description: 'Vitamin C serums, moisturizers, SPF sunscreens, lipsticks, foundations & sheet masks.',
    gstRate: 18,
    keywords: [
      'skincare', 'serum', 'face wash', 'facewash', 'moisturizer', 'sunscreen',
      'cream', 'lotion', 'lipstick', 'kajal', 'makeup', 'cosmetics', 'niacinamide', 'lip balm',
    ],
  },
  {
    id: '3305-hair-care',
    hsnCode: '3305',
    categoryId: 'beauty',
    title: 'Shampoos, Conditioners, Hair Oils & Hair Serums',
    description: 'Anti-hairfall shampoos, onion hair oil, keratin masks, conditioners & hair wax.',
    gstRate: 18,
    keywords: [
      'shampoo', 'conditioner', 'hair oil', 'hair serum', 'hair mask', 'hair wax',
      'beard oil', 'anti dandruff', 'keratin',
    ],
  },
  {
    id: '3303-perfumes-mists',
    hsnCode: '3303',
    categoryId: 'beauty',
    title: 'Perfumes, Eau de Parfum, Attar & Body Mists',
    description: 'Long-lasting EDP perfumes, luxury gift fragrance sets, attar & body sprays.',
    gstRate: 18,
    keywords: [
      'perfume', 'edp', 'eau de parfum', 'fragrance', 'body mist', 'attar',
      'cologne', 'scent',
    ],
  },
  {
    id: '3307-deodorants-shaving',
    hsnCode: '3307',
    categoryId: 'beauty',
    title: 'Deodorants, Roll-Ons, Shaving Foams & Bath Salts',
    description: 'Underarm roll-ons, deodorant sprays, shaving gels, aftershave & room fresheners.',
    gstRate: 18,
    keywords: [
      'deodorant', 'deo', 'roll on', 'shaving foam', 'aftershave', 'bath salt',
      'air freshener',
    ],
  },
  {
    id: '3401-soaps-bodywash',
    hsnCode: '3401',
    categoryId: 'beauty',
    title: 'Bath Soaps, Handmade Soaps & Body Wash',
    description: 'Herbal bath soaps, charcoal bars, shower gels, body cleansers & handwash.',
    gstRate: 18,
    keywords: [
      'soap', 'handmade soap', 'body wash', 'shower gel', 'handwash', 'bath bar',
    ],
  },
  {
    id: '8510-trimmers-shavers',
    hsnCode: '8510',
    categoryId: 'beauty',
    title: 'Beard Trimmers, Hair Clippers & Electric Shavers',
    description: 'Rechargeable beard trimmers, body groomers, epilators & electric razors.',
    gstRate: 18,
    keywords: [
      'trimmer', 'beard trimmer', 'shaver', 'clipper', 'groomer', 'epilator',
      'electric razor',
    ],
  },

  // ── Jewellery & Watches ───────────────────────────────────────────────────
  {
    id: '7117-imitation-jewellery',
    hsnCode: '7117',
    categoryId: 'jewellery',
    title: 'Imitation Jewellery, Artificial Earrings, Necklaces & Bangles',
    description: 'Oxidised jhumkas, kundan necklace sets, fashion rings, bracelets, anklets & chokers.',
    gstRate: 3,
    keywords: [
      'imitation', 'artificial jewellery', 'jewellery', 'jewelry', 'earrings',
      'jhumka', 'necklace', 'choker', 'kundan', 'bangles', 'bracelet', 'ring', 'oxidised', 'anklet',
    ],
  },
  {
    id: '7113-precious-jewellery',
    hsnCode: '7113',
    categoryId: 'jewellery',
    title: 'Gold, 925 Sterling Silver & Precious Metal Jewellery',
    description: 'Hallmarked 925 sterling silver rings, gold-plated silver chains & gemstone pendants.',
    gstRate: 3,
    keywords: [
      'silver', '925 silver', 'sterling silver', 'gold', 'pendant', 'chain',
      'precious jewellery', 'mangalsutra',
    ],
  },
  {
    id: '9102-watches',
    hsnCode: '9102',
    categoryId: 'jewellery',
    title: 'Analog & Digital Wrist Watches',
    description: 'Chronograph wrist watches, leather strap analog watches, sports digital watches.',
    gstRate: 18,
    keywords: [
      'watch', 'wrist watch', 'analog watch', 'digital watch', 'chronograph',
      'mens watch', 'womens watch',
    ],
  },
  {
    id: '9004-sunglasses-eyewear',
    hsnCode: '9004',
    categoryId: 'jewellery',
    title: 'Sunglasses, Polarized Eyewear & Blue-Light Glasses',
    description: 'UV400 polarized sunglasses, aviators, wayfarers & anti-glare computer glasses.',
    gstRate: 18,
    keywords: [
      'sunglasses', 'goggles', 'eyewear', 'polarized', 'aviator', 'blue light',
      'computer glasses', 'uv400',
    ],
  },

  // ── Bags, Wallets & Luggage ───────────────────────────────────────────────
  {
    id: '4202-backpacks-luggage',
    hsnCode: '4202',
    categoryId: 'bags',
    title: 'Backpacks, Laptop Bags, School Bags & Travel Luggage',
    description: 'Water-resistant laptop backpacks, college bags, cabin trolley suitcases & duffle bags.',
    gstRate: 18,
    keywords: [
      'backpack', 'laptop bag', 'school bag', 'travel bag', 'luggage', 'suitcase',
      'trolley', 'duffle', 'trekking bag', 'office bag',
    ],
  },
  {
    id: '4202-handbags-wallets',
    hsnCode: '4202',
    categoryId: 'bags',
    title: 'Handbags, Tote Bags, Sling Bags, Wallets & Pouches',
    description: 'Women tote bags, crossbody slings, RFID leather wallets, clutches & makeup pouches.',
    gstRate: 18,
    keywords: [
      'handbag', 'tote bag', 'sling bag', 'wallet', 'purse', 'clutch', 'pouch',
      'card holder', 'rfid wallet', 'crossbody',
    ],
  },
  {
    id: '4203-belts-gloves',
    hsnCode: '4203',
    categoryId: 'bags',
    title: 'Leather Belts, Riding Gloves & Leather Accessories',
    description: 'Reversible formal leather belts, casual canvas belts & biker gloves.',
    gstRate: 18,
    keywords: [
      'belt', 'leather belt', 'formal belt', 'gloves', 'riding gloves',
    ],
  },

  // ── Grocery, Tea, Coffee & Dry Fruits ─────────────────────────────────────
  {
    id: '0901-coffee',
    hsnCode: '0901',
    categoryId: 'grocery',
    title: 'Roasted Coffee Beans, Filter Coffee & Ground Coffee',
    description: 'Arabica roasted beans, South Indian filter coffee powder & French press ground coffee.',
    gstRate: 5,
    keywords: [
      'coffee', 'coffee beans', 'arabica', 'filter coffee', 'ground coffee', 'espresso',
    ],
  },
  {
    id: '0902-tea',
    hsnCode: '0902',
    categoryId: 'grocery',
    title: 'Loose Leaf Tea, Green Tea, Masala Chai & Tea Bags',
    description: 'Assam CTC chai, Darjeeling first flush, chamomile green tea & herbal infusions.',
    gstRate: 5,
    keywords: [
      'tea', 'chai', 'green tea', 'masala chai', 'assam tea', 'darjeeling', 'tea bags',
    ],
  },
  {
    id: '0802-dry-fruits',
    hsnCode: '0802',
    categoryId: 'grocery',
    title: 'Almonds, Walnuts, Pistachios & Mixed Dry Fruits',
    description: 'California almonds, Kashmiri walnuts, roasted pistachios, trail mixes & nuts.',
    gstRate: 5,
    keywords: [
      'almonds', 'badam', 'walnuts', 'pistachio', 'pista', 'cashew', 'kaju',
      'dry fruits', 'nuts', 'trail mix', 'raisins',
    ],
  },
  {
    id: '0910-spices-masala',
    hsnCode: '0910',
    categoryId: 'grocery',
    title: 'Turmeric, Garam Masala, Ginger & Blended Spices',
    description: 'Organic haldi powder, whole spices, garam masala, saffron & curry blends.',
    gstRate: 5,
    keywords: [
      'spices', 'masala', 'turmeric', 'haldi', 'garam masala', 'saffron', 'ginger',
      'condiment', 'organic spice',
    ],
  },
  {
    id: '0409-natural-honey',
    hsnCode: '0409',
    categoryId: 'grocery',
    title: 'Raw Forest Honey & Pre-Packaged Natural Honey',
    description: 'Unprocessed multiflora honey, Tulsi honey & Himalayan raw honey jars.',
    gstRate: 5,
    keywords: [
      'honey', 'raw honey', 'forest honey', 'organic honey', 'madhu',
    ],
  },
  {
    id: '2106-supplements-protein',
    hsnCode: '2106',
    categoryId: 'grocery',
    title: 'Whey Protein, Health Supplements & Nutrition Mixes',
    description: 'Whey protein powders, plant protein, multivitamin gummies & pre-workout mixes.',
    gstRate: 18,
    keywords: [
      'protein', 'whey', 'supplement', 'nutrition', 'multivitamin', 'creatine',
      'pre workout', 'health mix',
    ],
  },

  // ── Health, Fitness & Sports ──────────────────────────────────────────────
  {
    id: '9506-fitness-sports',
    hsnCode: '9506',
    categoryId: 'health_fitness',
    title: 'Yoga Mats, Dumbbells, Resistance Bands & Sports Gear',
    description: 'Anti-slip TPE yoga mats, hex dumbbells, skipping ropes, badminton rackets & gym gear.',
    gstRate: 12,
    keywords: [
      'yoga mat', 'dumbbell', 'resistance band', 'gym', 'fitness', 'skipping rope',
      'badminton', 'cricket', 'football', 'sports', 'exercise', 'workout',
    ],
  },
  {
    id: '9018-medical-monitors',
    hsnCode: '9018',
    categoryId: 'health_fitness',
    title: 'Digital BP Monitors, Pulse Oximeters & Thermometers',
    description: 'Home blood pressure monitors, fingertip oximeters, nebulizers & digital thermometers.',
    gstRate: 12,
    keywords: [
      'oximeter', 'bp monitor', 'thermometer', 'nebulizer', 'glucometer',
      'medical device', 'health monitor',
    ],
  },
  {
    id: '9021-orthopedic-supports',
    hsnCode: '9021',
    categoryId: 'health_fitness',
    title: 'Posture Correctors, Knee Caps & Orthopedic Belts',
    description: 'Lumbar support belts, compression knee sleeves, wrist braces & cervical pillows.',
    gstRate: 12,
    keywords: [
      'knee cap', 'knee brace', 'posture corrector', 'lumbar belt', 'back support',
      'orthopedic', 'wrist support', 'ankle brace',
    ],
  },

  // ── Books & Stationery ────────────────────────────────────────────────────
  {
    id: '4901-printed-books',
    hsnCode: '4901',
    categoryId: 'books_stationery',
    title: 'Printed Books, Novels, Textbooks & Study Guides',
    description: 'Paperback & hardcover books, exam prep guides, story books & coloring/reading books.',
    gstRate: 0,
    keywords: [
      'book', 'books', 'printed book', 'novel', 'textbook', 'study guide',
      'paperback', 'hardcover', 'fiction', 'non-fiction', 'storybook',
    ],
  },
  {
    id: '4820-notebooks-planners',
    hsnCode: '4820',
    categoryId: 'books_stationery',
    title: 'Notebooks, Diaries, Planners & Registers',
    description: 'Spiral notebooks, hardcover journals, daily planners, sketchbooks & office registers.',
    gstRate: 12,
    keywords: [
      'notebook', 'diary', 'planner', 'journal', 'register', 'sketchbook',
      'exercise book', 'spiral pad', 'stationery',
    ],
  },
  {
    id: '9608-pens-markers',
    hsnCode: '9608',
    categoryId: 'books_stationery',
    title: 'Ball Pens, Gel Pens, Fountain Pens & Markers',
    description: 'Smooth gel pen sets, executive metal fountain pens, highlighters & whiteboard markers.',
    gstRate: 18,
    keywords: [
      'pen', 'gel pen', 'ball pen', 'fountain pen', 'marker', 'highlighter',
      'calligraphy', 'writing',
    ],
  },

  // ── Toys, Games & Gifts ───────────────────────────────────────────────────
  {
    id: '9503-educational-toys',
    hsnCode: '9503',
    categoryId: 'toys_gifts',
    title: 'Non-Electronic Toys, Wooden Puzzles, Dolls & Plushies',
    description: 'Montessori wooden toys, soft plush toys, building blocks, action figures & kids puzzles.',
    gstRate: 12,
    keywords: [
      'toy', 'toys', 'wooden toy', 'puzzle', 'plush', 'teddy', 'doll',
      'building blocks', 'montessori', 'kids gift', 'educational toy',
    ],
  },
  {
    id: '9503-electronic-toys',
    hsnCode: '9503',
    categoryId: 'toys_gifts',
    title: 'Electronic, Battery-Operated & Remote-Control Toys',
    description: 'RC cars, rechargeable drones for kids, musical battery toys & robotic toy kits.',
    gstRate: 18,
    keywords: [
      'rc car', 'remote control', 'electronic toy', 'battery toy', 'drone toy',
      'robot toy', 'musical toy',
    ],
  },
  {
    id: '9504-board-games',
    hsnCode: '9504',
    categoryId: 'toys_gifts',
    title: 'Board Games, Chess Sets & Card Games',
    description: 'Wooden chess boards, family party card games, ludo, carrom & tabletop games.',
    gstRate: 12,
    keywords: [
      'board game', 'card game', 'chess', 'carrom', 'ludo', 'party game', 'tabletop',
    ],
  },
  {
    id: '3406-scented-candles',
    hsnCode: '3406',
    categoryId: 'toys_gifts',
    title: 'Scented Soy Candles, Jar Candles & Gift Tealights',
    description: 'Aromatherapy soy wax jar candles, festive diyas, tealight sets & gift hamper candles.',
    gstRate: 12,
    keywords: [
      'candle', 'scented candle', 'soy wax', 'tealight', 'aromatherapy',
      'gift hamper', 'diwali gift',
    ],
  },

  // ── General & Packaging ───────────────────────────────────────────────────
  {
    id: '3926-general-plastic-cases',
    hsnCode: '3926',
    categoryId: 'general',
    title: 'Phone Cases, Back Covers, Desk Stands & General Plastic Items',
    description: 'Silicone mobile back covers, desk cable clips, acrylic organizers & general accessories.',
    gstRate: 18,
    keywords: [
      'phone case', 'mobile cover', 'back cover', 'silicone case', 'acrylic',
      'desk holder', 'stand', 'general', 'plastic article',
    ],
  },
  {
    id: '4819-corrugated-boxes',
    hsnCode: '4819',
    categoryId: 'general',
    title: 'Corrugated Shipping Boxes, Mailers & Cartons',
    description: 'E-commerce 3-ply/5-ply corrugated boxes, rigid gift boxes & kraft paper mailers.',
    gstRate: 12,
    keywords: [
      'box', 'corrugated box', 'shipping box', 'carton', 'packaging', 'mailer',
      'gift box',
    ],
  },
  {
    id: '8211-kitchen-knives',
    hsnCode: '8211',
    categoryId: 'general',
    title: 'Chef Knives, Kitchen Scissors & Multi-Tools',
    description: 'Stainless steel chef knives, Santoku blades, vegetable peelers & pocket multi-tools.',
    gstRate: 12,
    keywords: [
      'knife', 'chef knife', 'kitchen knife', 'multi-tool', 'blade', 'peeler',
    ],
  },
  {
    id: '8302-home-hardware',
    hsnCode: '8302',
    categoryId: 'general',
    title: 'Wall Hooks, Door Mounts, Brackets & Home Hardware',
    description: 'Adhesive wall hooks, floating shelf brackets, cabinet handles & door stoppers.',
    gstRate: 18,
    keywords: [
      'hook', 'wall hook', 'bracket', 'door handle', 'mount', 'hardware', 'shelf bracket',
    ],
  },
];

const CATEGORY_MAP = new Map(PRODUCT_CATEGORIES.map((cat) => [cat.id, cat]));

/**
 * Tokenizes user text into normalized lowercase search tokens,
 * expanding hyphenated words and basic singular stems so queries like
 * "t-shirt" or "earbuds" match reliably.
 *
 * @param {string} input
 * @returns {string[]}
 */
function tokenizeSearchText(input) {
  const cleaned = String(input || '')
    .toLowerCase()
    .replace(/['’`]/g, '');

  if (!cleaned.trim()) return [];

  const tokens = new Set();
  const rawParts = cleaned.split(/[^a-z0-9-]+/).filter(Boolean);

  for (const rawPart of rawParts) {
    const part =
      rawPart.length > 3 && rawPart.endsWith('s') && !rawPart.endsWith('ss')
        ? rawPart.slice(0, -1)
        : rawPart;

    tokens.add(rawPart);
    if (part !== rawPart) tokens.add(part);

    if (part.includes('-')) {
      const joined = part.replace(/-/g, '');
      if (joined) tokens.add(joined);
      const subParts = part.split('-').filter(Boolean);
      if (subParts.every((sub) => sub.length > 1)) {
        for (const sub of subParts) {
          tokens.add(sub);
        }
      }
    }
  }

  return Array.from(tokens);
}

/**
 * Formats an entry's price-threshold note dynamically based on the given selling price.
 *
 * @param {object} entry
 * @param {number} price
 * @param {number} effectiveRate
 * @returns {string | null}
 */
function buildAppliedThresholdNote(entry, price, effectiveRate) {
  if (!entry || typeof entry.thresholdInr !== 'number' || entry.aboveThresholdGstRate === undefined) {
    return null;
  }

  const thresholdLabel = `₹${entry.thresholdInr.toLocaleString('en-IN')}`;
  if (price > 0) {
    if (price > entry.thresholdInr) {
      return `Sale value exceeds ${thresholdLabel} → ${effectiveRate}% GST applies (${entry.gstRate}% applies up to ${thresholdLabel}).`;
    }
    return `Sale value is within ${thresholdLabel} → ${effectiveRate}% GST applies (${entry.aboveThresholdGstRate}% applies above ${thresholdLabel}).`;
  }

  return entry.thresholdNote || `${entry.gstRate}% GST up to ${thresholdLabel}; ${entry.aboveThresholdGstRate}% above ${thresholdLabel}.`;
}

/**
 * Resolves the effective GST rate (plus CGST / SGST / IGST split) for an HSN entry
 * at a given per-unit selling price in INR.
 *
 * @param {object} entry
 * @param {number} [sellingPriceInr=0]
 * @returns {{
 *   gstRate: number,
 *   cgstRate: number,
 *   sgstRate: number,
 *   igstRate: number,
 *   appliedThresholdNote: string | null,
 * }}
 */
export function resolveEffectiveGst(entry, sellingPriceInr = 0) {
  if (!entry) {
    return {
      gstRate: 18,
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18,
      appliedThresholdNote: null,
    };
  }

  const numericPrice = Number(sellingPriceInr);
  const price = Number.isFinite(numericPrice) && numericPrice > 0 ? numericPrice : 0;

  let gstRate = Number(entry.gstRate ?? 18);
  if (
    typeof entry.thresholdInr === 'number' &&
    entry.aboveThresholdGstRate !== undefined &&
    price > entry.thresholdInr
  ) {
    gstRate = Number(entry.aboveThresholdGstRate);
  }

  const halfRate = Number((gstRate / 2).toFixed(2));
  return {
    gstRate,
    cgstRate: halfRate,
    sgstRate: halfRate,
    igstRate: gstRate,
    appliedThresholdNote: buildAppliedThresholdNote(entry, price, gstRate),
  };
}

/**
 * Enriches an HSN entry with category name and effective GST rates.
 *
 * @param {object} entry
 * @param {number} sellingPrice
 * @returns {object}
 */
function enrichHsnEntry(entry, sellingPrice) {
  const category = CATEGORY_MAP.get(entry.categoryId);
  return {
    ...entry,
    categoryName: category?.name || 'General',
    ...resolveEffectiveGst(entry, sellingPrice),
  };
}

/**
 * Scores a single HSN entry against query tokens and category selection.
 *
 * @param {object} entry
 * @param {string} normalizedQuery
 * @param {string[]} queryTokens
 * @param {string} categoryId
 * @returns {{ score: number, keywordScore: number, matchedKeywords: string[], categoryMatched: boolean }}
 */
function scoreHsnEntry(entry, normalizedQuery, queryTokens, categoryId) {
  const matchedKeywords = [];
  let keywordScore = 0;

  // Direct 4-digit HSN code mention in the query
  if (normalizedQuery && normalizedQuery.includes(entry.hsnCode)) {
    keywordScore += 120;
    matchedKeywords.push(entry.hsnCode);
  }

  const compactQuery = normalizedQuery.replace(/[-_]/g, ' ');
  const keywordTokenSet = new Set();

  for (const rawKeyword of entry.keywords || []) {
    const kw = rawKeyword.toLowerCase();
    const compactKw = kw.replace(/[-_]/g, ' ');
    const isMultiWord = compactKw.includes(' ');

    for (const kwToken of tokenizeSearchText(kw)) {
      keywordTokenSet.add(kwToken);
    }

    if (
      normalizedQuery &&
      (normalizedQuery.includes(kw) || compactQuery.includes(compactKw))
    ) {
      // Check whole-word boundary for short single-word keywords to avoid partial false positives
      if (!isMultiWord && kw.length <= 4) {
        const boundaryRe = new RegExp(`(?:^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z0-9])`);
        if (!boundaryRe.test(compactQuery) && !boundaryRe.test(normalizedQuery)) {
          continue;
        }
      }
      keywordScore += isMultiWord ? 55 : 38;
      matchedKeywords.push(rawKeyword);
    }
  }

  // Score each unique query token at most once against keyword/title/description sets
  if (queryTokens.length > 0) {
    const titleTokens = new Set(tokenizeSearchText(entry.title));
    const descTokens = new Set(tokenizeSearchText(entry.description));

    for (const token of queryTokens) {
      if (token.length < 2) continue;
      if (keywordTokenSet.has(token)) {
        keywordScore += 16;
        if (!matchedKeywords.includes(token)) {
          matchedKeywords.push(token);
        }
      } else if (token.length > 2 && titleTokens.has(token)) {
        keywordScore += 8;
      } else if (token.length > 3 && descTokens.has(token)) {
        keywordScore += 3;
      }
    }
  }

  const categoryMatched =
    Boolean(categoryId) && categoryId !== 'general' && entry.categoryId === categoryId;
  const categoryScore = categoryMatched ? 30 : 0;

  return {
    score: keywordScore + categoryScore,
    keywordScore,
    matchedKeywords: Array.from(new Set(matchedKeywords)),
    categoryMatched,
  };
}

/**
 * Finds the best matching Indian GST HSN codes for a product description & category.
 *
 * @param {{
 *   query?: string,
 *   categoryId?: string,
 *   sellingPrice?: number,
 *   limit?: number,
 * }} [params]
 * @returns {Array<object>}
 */
export function findBestHsnMatches({
  query = '',
  categoryId = 'general',
  sellingPrice = 0,
  limit = 5,
} = {}) {
  const maxResults = Math.max(0, Number(limit) || 0);
  if (maxResults === 0) return [];

  const normalizedQuery = String(query || '').trim().toLowerCase();
  const queryTokens = tokenizeSearchText(normalizedQuery);

  const scored = HSN_ENTRIES.map((entry) => {
    const metrics = scoreHsnEntry(entry, normalizedQuery, queryTokens, categoryId);
    let confidence = 'General';
    if (metrics.keywordScore >= 35) {
      confidence = 'High';
    } else if (metrics.keywordScore >= 14 || metrics.categoryMatched) {
      confidence = 'Medium';
    }

    return {
      ...enrichHsnEntry(entry, sellingPrice),
      score: metrics.score,
      confidence,
      matchedKeywords: metrics.matchedKeywords,
      _categoryMatched: metrics.categoryMatched,
      _keywordScore: metrics.keywordScore,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b._keywordScore !== a._keywordScore) return b._keywordScore - a._keywordScore;
    if (a._categoryMatched !== b._categoryMatched) return a._categoryMatched ? -1 : 1;
    return a.hsnCode.localeCompare(b.hsnCode);
  });

  const relevant = scored.filter((item) => item.score > 0);
  const pool = relevant.length > 0 ? relevant : scored;

  return pool.slice(0, maxResults).map(({ _categoryMatched, _keywordScore, ...clean }) => clean);
}

/**
 * Filters and enriches HSN catalog entries for manual picker search in the UI.
 *
 * @param {string} [searchTerm='']
 * @param {string} [categoryFilter='all']
 * @param {number} [sellingPrice=0]
 * @returns {Array<object>}
 */
export function searchHsnCatalog(searchTerm = '', categoryFilter = 'all', sellingPrice = 0) {
  const term = String(searchTerm || '').trim().toLowerCase();
  const catFilter = String(categoryFilter || 'all').trim();
  const tokens = tokenizeSearchText(term);

  const filtered = HSN_ENTRIES.filter((entry) => {
    if (catFilter && catFilter !== 'all' && entry.categoryId !== catFilter) {
      return false;
    }
    if (!term) return true;

    const categoryName = CATEGORY_MAP.get(entry.categoryId)?.name || '';
    const searchable = [
      entry.hsnCode,
      entry.title,
      entry.description,
      categoryName,
      ...(entry.keywords || []),
    ]
      .join(' ')
      .toLowerCase();

    if (searchable.includes(term)) return true;

    const searchableTokens = new Set(tokenizeSearchText(searchable));
    return tokens.length > 0 && tokens.every((t) => searchable.includes(t) || searchableTokens.has(t));
  });

  const enriched = filtered.map((entry) => enrichHsnEntry(entry, sellingPrice));

  if (!term) return enriched;

  return enriched.sort((a, b) => {
    const aCodeExact = a.hsnCode === term ? 2 : a.hsnCode.startsWith(term) ? 1 : 0;
    const bCodeExact = b.hsnCode === term ? 2 : b.hsnCode.startsWith(term) ? 1 : 0;
    if (bCodeExact !== aCodeExact) return bCodeExact - aCodeExact;

    const aTitleMatch = a.title.toLowerCase().includes(term) ? 1 : 0;
    const bTitleMatch = b.title.toLowerCase().includes(term) ? 1 : 0;
    return bTitleMatch - aTitleMatch;
  });
}

# LyZov P&L Analyzer — Master Implementation Plan

> **Reference Documents:**
> - [Master Build Plan](file:///d:/label_cropper/docs-design/LYZOV_BUILD_PLAN.md)
> - [Build Progress Tracker](file:///d:/label_cropper/docs-design/PROGRESS.md)
> - [Technical Architecture](file:///d:/label_cropper/docs/ARCHITECTURE.md)
> - [Decisions Log](file:///d:/label_cropper/docs/DECISIONS.md)

---

## 1. Executive Summary & Core Mandate

The **LyZov P&L Analyzer** is a 100% private, client-side, self-contained financial intelligence platform for multi-channel e-commerce sellers (Shopify, WooCommerce, Amazon, Flipkart, Meesho, custom stores). 

### Non-Negotiable Directives
1. **Completely Separate & Standalone:** Zero dependencies on other apps in this repository (label cropper or GST tool).
2. **Database Engine (MongoDB):** Standalone MongoDB collections via Mongoose for persistent server storage of users, subscriptions, batches, raw rows, order lines, products, templates, rules, and Razorpay transactions, complemented by client-side IndexedDB caching.
3. **User Authentication & Login:** Complete registration and login system backed by MongoDB with hashed passwords, JWT sessions, and role-based access control (`seller` vs `admin`).
4. **Subscription & Razorpay Monetization:**
   - **1-Month (30 Days) Free Trial** activated automatically upon registration.
   - **Pro Tier:** ₹199 / month.
   - **Enterprise Tier:** ₹499 / month.
   - **Payment Gateway:** Razorpay order creation, client-side checkout popup, and HMAC-verified payment capture saved to MongoDB.
5. **Admin Dashboard (`/pnl/admin`):**
   - User & Subscription Manager: Monitor all registered users, trial countdowns, and active tiers.
   - Transaction Audit Log: All Razorpay payment IDs, timestamps, amounts (₹199 / ₹499), and statuses.
   - Template Repository: Global CRUD for channel import templates (Amazon, Flipkart, Meesho, Shopify, WooCommerce).
   - Master Fee Rule Cards: Administer platform fee card presets.
   - Analytics & Storage Health: MRR metrics, total batches, and lines analyzed.
6. **Continuous Autonomous Execution:** Execute through all phases sequentially, validating all acceptance criteria without halting for turn-by-turn prompts.

---

## 2. Directory Architecture (`src/pnl-tool/`)

```
src/pnl-tool/
├── PnlApp.jsx                  # Standalone app entry point, navigation & routing
├── pnl.css                     # Premium styling tokens, dark/light modes, animations
├── auth/                       # Standalone Authentication & User Sessions
│   ├── AuthContext.jsx         # User context, active user, login/signup/logout
│   ├── AuthModal.jsx           # Clean login/register dialog
│   └── session.js              # Token and user profile persistence in local DB
├── billing/                    # Subscription & Razorpay Gateway
│   ├── PricingModal.jsx        # 1-month trial, ₹199 Pro, ₹499 Enterprise selector
│   ├── RazorpayGateway.js      # Razorpay script loader, order creator & handler
│   └── subscriptionStore.js    # Trial countdown and plan status
├── db/                         # Local IndexedDB Database Engine
│   ├── schema.js               # Stores: batches, rawRows, orderLines, products, templates, rules, users, payments
│   └── index.js                # High-speed local database CRUD methods
├── domain/                     # Pure mathematical & business domain (Zero UI dependencies)
│   ├── money.js                # Integer minor units (paise/cents) exact math
│   ├── entities.js             # Canonical schemas (OrderLine, ProfitLine, etc.)
│   ├── formulas.js             # Net revenue, total fees, COGS, contribution, margin
│   ├── flags.js                # Data quality flag catalogue and rules
│   └── bridge.js               # Waterfall period-over-period profit bridge & simulators
├── workers/                    # Web Workers for lag-free 100k-row processing
│   ├── ingest.worker.js        # CSV/TSV/XLSX streaming parser & SHA-256 hash generator
│   └── compute.worker.js       # Fast P&L aggregation worker
├── templates/                  # Built-in Channel JSON Templates
│   ├── shopify.json
│   ├── amazon.json
│   ├── flipkart.json
│   ├── meesho.json
│   └── woocommerce.json
├── components/                 # Reusable UI Components
│   ├── PnlNavbar.jsx           # Navigation header, channel picker, trial badge, user menu
│   ├── IngestionZone.jsx       # Drag & drop upload with file preview & row counter
│   ├── ColumnMapper.jsx        # Interactive mapper with smart auto-suggest
│   ├── DataQualityReport.jsx   # Flag breakdown, rejected rows & impact metrics
│   ├── FeeRuleEditor.jsx       # Rule creator & "Explain this fee" modal
│   ├── CogsManager.jsx         # Product master CRUD, SKU aliasing & missing cost worklist
│   ├── DrilldownModal.jsx      # Universal click-to-raw-row inspector modal
│   ├── WaterfallBridge.jsx     # Visual waterfall delta breakdown
│   ├── PriceSimulator.jsx      # Break-even and sensitivity simulator
│   └── ReturnSimulator.jsx     # Return rate impact what-if simulator
└── pages/                      # Main Application Screens
    ├── DashboardPage.jsx       # Executive KPIs, channel comparisons & loss-making SKUs
    ├── IngestPage.jsx          # File upload & column mapping screen
    ├── QualityPage.jsx         # Data quality report & row audit screen
    ├── ProductsPage.jsx        # COGS & product master management screen
    ├── RulesPage.jsx           # Channel fee cards & rule builder screen
    ├── BridgePage.jsx          # Profit-change waterfall & what-if simulators screen
    └── AdminPage.jsx           # Comprehensive Admin Dashboard (Users, Payments, Templates, Rules, Stats)
```

---

## 3. Comprehensive Phase Execution Plan

### Phase 0: Setup, Baseline & Documentation (DONE)
- [x] Configure Node.js native test runner (`npm test`).
- [x] Create [docs/ARCHITECTURE.md](file:///d:/label_cropper/docs/ARCHITECTURE.md) and [docs/DECISIONS.md](file:///d:/label_cropper/docs/DECISIONS.md).
- [x] Populate environment baseline in [docs-design/PROGRESS.md](file:///d:/label_cropper/docs-design/PROGRESS.md).

### Phase 1: Domain Foundation & Canonical Schema (IN_PROGRESS)
- [x] Exact Money utility (`money.js`) with paise minor units, arithmetic, and rounding.
- [x] Data quality flags catalog (`flags.js`).
- [x] Pure financial formulas (`formulas.js`).
- [ ] Automated unit tests in `tests/pnl/money.test.js` and `tests/pnl/formulas.test.js`.

### Phase 2: Local Database (IndexedDB) & Ingestion Engine
- Implement `src/pnl-tool/db/index.js` using IndexedDB for ultra-fast local storage.
- File parser with streaming chunking for CSV, TSV, and XLSX.
- File hashing (`fileHash`), duplicate warning, and preview generator.
- Integration tests with fixture datasets.

### Phase 3: Column Mapping & Template System
- Interactive mapping UI with header synonym auto-suggestions.
- Status, date format, and number format value mappers.
- Shipped starter templates: Shopify, Amazon, Flipkart, Meesho, WooCommerce.
- Template import/export with schema validation.

### Phase 4: Normalization & Data Quality Report Screen
- RawRow to canonical OrderLine conversion pipeline.
- Natural key deduplication (keep first, keep latest, keep all).
- Return, cancellation, and RTO sign conventions.
- Data Quality Report UI: counts by severity, drill-down links, and raw row preview.
- Invariant reconciliation: $\text{rawRows} = \text{acceptedRows} + \text{rejectedRows}$.

### Phase 5: Channel Fee & Rule Engine
- Rule evaluation engine (percentage, flat, tiered, safe formula expression parser).
- Modes: reported from file, computed via rules, or compare & flag differences.
- Safe expression parser (strictly zero `eval`).
- "Explain this fee" modal revealing rule ID, formula, and input variables.

### Phase 6: Product Master & COGS Management
- Product cost import and manual CRUD table.
- Multi-channel SKU alias mapping with fuzzy suggestions.
- Date-effective COGS lookup (handling cost changes over time).
- "Missing COGS" high-priority worklist ordered by lost margin/revenue impact.

### Phase 7: P&L Computation Engine with Traceability
- Compute `ProfitLine` per `OrderLine`.
- Multi-dimensional aggregation (by period, channel, SKU, category, status).
- Complete vs. incomplete data separation.
- Multi-currency conversion via user-supplied FX table.
- Benchmarked performance (< 2s for 100k lines).

### Phase 8: Seller Dashboard, Reports & Drill-Down
- Executive summary KPIs (Revenue, Net Profit, Margin %, Return Rate, Completeness Score).
- Channel side-by-side comparison & SKU performance table (loss-makers tagged).
- Universal click-to-drill-down: any total opens contributing order lines and source raw rows.
- Filter system: date range, channel, SKU, status, completeness.

### Phase 9: Waterfall Profit-Change Bridge & Simulators
- **9A. Waterfall Bridge:** Period A vs. Period B delta decomposed into volume, price/mix, discounts, fees, shipping, returns, COGS, FX, and residual.
- **9B. Price Simulator:** Calibrated on actual seller fee and return history to calculate break-even and margins at new price points.
- **9C. Return-Rate Simulator:** Sensitivity analysis on margin impacts of $\pm x\%$ return rate variations.

### Phase 10: Auth, Billing & Razorpay Integration
- User registration, login, and profile state.
- 1-Month Free Trial countdown with banner/badge.
- Plan cards: Free Trial (30 days), Pro (₹199/mo), Enterprise (₹499/mo).
- Razorpay Checkout modal integration with payment verification and active status.

### Phase 11: Admin Dashboard & Management Console
- **User & Subscription Admin:** View registered users, active plans, trial expirations.
- **Transaction Logs:** Razorpay payment records, amounts (₹199/₹499), dates, payment IDs.
- **Template Management:** Create, review, update channel starter templates.
- **Rule Cards Admin:** Manage standard channel commission & fee structures.
- **System Health:** Database size, batch count, total order lines processed.

### Phase 12: Final Hardening, Integration & Polish
- Navigation integration (Navbar tab / route switcher).
- Light/Dark theme consistency with smooth micro-animations.
- Full automated test suite verification (`npm test`).
- Full production build verification (`npm run build`).
- Final user notification of complete readiness.

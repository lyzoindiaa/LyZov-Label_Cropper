# Architecture & Technical Conventions: LyZov P&L Analyzer

> **Principle:** The P&L Analyzer is completely independent and standalone from other tools in the repository. It runs 100% client-side with a zero-server-upload guarantee.

---

## 1. Stack Summary
- **Runtime & Language:** JavaScript (ESNext, ESM).
- **Core UI Framework:** React 19 (`react`, `react-dom`).
- **Styling & Components:** Material-UI v9 (`@mui/material`), Emotion, Lucide icons (`lucide-react`), Vanilla CSS tokens.
- **Local Database (Client-Side Storage):** IndexedDB (high-performance local database for batches, raw rows, order lines, products, templates, and rules).
- **Processing Layer:** Web Workers for CSV/XLSX streaming parsing and heavy aggregations (100k+ rows) without blocking the UI thread.
- **Test Runner:** Node.js native test runner (`node --test tests/pnl/**/*.test.js`) — ultra-fast (<1s), zero-dependency, native ESM support.
- **Linter & Type Rules:** Oxlint (`npm run lint`).
- **Bundler:** Vite 8 (`npm run build`).

---

## 2. Directory Structure (Standalone Module)

```
d:/label_cropper/
├── src/
│   └── pnl-tool/                     # Completely self-contained P&L tool
│       ├── PnlApp.jsx                # Standalone entry point & view router
│       ├── pnl.css                   # Custom styles, dark/light theme tokens, animations
│       ├── db/                       # Local IndexedDB persistence engine
│       │   ├── schema.js             # Object stores & indexes definition
│       │   └── index.js              # CRUD operations for batches, rows, products, templates
│       ├── domain/                   # Pure business logic (zero UI dependencies)
│       │   ├── money.js              # Integer paise/cents exact arithmetic
│       │   ├── entities.js           # Canonical schemas (OrderLine, ProfitLine, etc.)
│       │   ├── formulas.js           # Revenue, fee, COGS, contribution, margin math
│       │   ├── flags.js              # Data quality catalog & rule evaluation
│       │   └── bridge.js             # Waterfall profit decomposition & simulators
│       ├── workers/                  # Web workers
│       │   ├── ingest.worker.js      # Streaming file parser & hash computer
│       │   └── compute.worker.js     # Heavy aggregation worker
│       ├── templates/                # Reusable JSON templates for channels
│       │   ├── shopify.json
│       │   ├── amazon.json
│       │   ├── flipkart.json
│       │   ├── meesho.json
│       │   └── woocommerce.json
│       ├── billing/                  # Standalone billing & trial management
│       │   ├── license.js            # 1-month free trial, Pro (₹199), Enterprise (₹499)
│       │   └── RazorpayCheckout.jsx  # Client-side Razorpay modal trigger
│       ├── components/               # Specialized UI components
│       │   ├── PnlHeader.jsx         # App bar, channel selector, currency, license pill
│       │   ├── IngestionZone.jsx     # Drag-and-drop file upload with preview
│       │   ├── ColumnMapper.jsx      # Column & status mapping with auto-suggestions
│       │   ├── DataQualityReport.jsx # Reconciled data quality report with drill-down
│       │   ├── FeeRuleEditor.jsx     # Rule editor & "Explain this fee" modal
│       │   ├── CogsManager.jsx       # Product master, SKU aliasing & missing COGS worklist
│       │   ├── DrilldownModal.jsx    # Universal click-to-raw-row inspector
│       │   ├── WaterfallBridge.jsx   # Profit-change waterfall visualization
│       │   ├── Simulators.jsx        # Price break-even & return-rate what-if simulators
│       │   └── PricingModal.jsx      # Plan selector with 1-mo trial & Razorpay checkout
│       └── pages/                    # Core view screens
│           ├── DashboardView.jsx     # High-level KPIs, channel compare & loss-maker SKUs
│           ├── IngestView.jsx        # Upload & template mapping screen
│           ├── QualityView.jsx       # Data quality audit screen
│           ├── ProductsView.jsx      # COGS & product master screen
│           ├── RulesView.jsx         # Fee rules management screen
│           └── BridgeView.jsx        # Profit-change waterfall & simulator screen
├── tests/
│   ├── fixtures/                     # Anonymized sample CSV/XLSX files
│   └── pnl/                          # Automated tests
│       ├── money.test.js
│       ├── formulas.test.js
│       ├── flags.test.js
│       ├── ingestion.test.js
│       ├── rules.test.js
│       ├── cogs.test.js
│       ├── pnl.test.js
│       └── bridge.test.js
```

---

## 3. Conventions
- **Zero Server Leaks:** All file data, customer orders, and financial numbers remain strictly in local IndexedDB and memory.
- **Pure Domain Functions:** Functions in `src/pnl-tool/domain/` must have zero React or DOM dependencies for 100% unit-testability.
- **Traceability:** Every calculated line item preserves `traceRefs` pointing back to raw imported rows.
- **No Float Math for Money:** All currency amounts are computed as integer minor units (paise/cents) or explicit fixed-point decimals.
- **Independent Auth & Billing:** Local license state tracks a 30-day (1 month) free trial from first use, with upgrade options for Pro (₹199/month) and Enterprise (₹499/month) via Razorpay.

---

## 4. Verification Commands
- **Run automated test suite:** `npm test`
- **Run linter:** `npm run lint`
- **Run production build:** `npm run build`

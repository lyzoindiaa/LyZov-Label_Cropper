# Architectural Decisions Log: LyZov P&L Analyzer

## Decision Format
`YYYY-MM-DD: [Title]`
- **Context:** Problem statement
- **Decision:** Choice made
- **Reason:** Rationale
- **Alternatives Considered:** Why alternatives were rejected

---

### 2026-10-15: Completely Standalone Architecture
- **Context:** The repository contains existing tools (label cropper and GST tool).
- **Decision:** Build the P&L Analyzer as an entirely independent, decoupled module under `src/pnl-tool/` with zero dependency on the GST server or cropper logic.
- **Reason:** Guarantees absolute isolation, eliminates coupling bugs, and preserves 100% privacy for the seller's financial data.
- **Alternatives Considered:** Integrating with existing server APIs was rejected to uphold the privacy-first tenet (no financial sales data sent over the network).

---

### 2026-10-15: Database Engine (MongoDB & Mongoose)
- **Context:** The application requires reliable user accounts, multi-tenant persistence, admin dashboard oversight (user lists, subscription statuses, Razorpay logs), and template sharing across sessions.
- **Decision:** Use MongoDB via Mongoose on the server (`server/src/models/PnlModels.js`), paired with client-side caching for offline resilience and fast in-browser previewing.
- **Reason:** MongoDB natively supports flexible, document-based schemas perfectly suited for variable marketplace export rows, channel templates, user trial dates, and payment history.
- **Alternatives Considered:** Pure IndexedDB (does not support multi-device user login or central admin dashboard monitoring).

---

### 2026-10-15: Test Runner Selection
- **Context:** Automated tests must run fast and reliably across all phases.
- **Decision:** Use Node.js native test runner (`node --test`).
- **Reason:** Built-in to Node (zero dependencies to install or break), supports ESM natively, and runs our suite in milliseconds.
- **Alternatives Considered:** Vitest / Jest (extra heavy npm dependencies; rejected).

---

### 2026-10-15: Exact Money Arithmetic (Paise / Minor Units)
- **Context:** Financial calculations must never suffer from IEEE 754 binary floating-point drift (e.g. `0.1 + 0.2 = 0.30000000000000004`).
- **Decision:** Store and compute all monetary values as integer minor units (paise for INR, cents for USD) with strict currency tags.
- **Reason:** Absolute mathematical precision, deterministic rounding, and reliable reconciliation down to the single paisa.
- **Alternatives Considered:** Binary float math (rejected due to rounding drift).

---

### 2026-10-15: Pricing & Subscription Model
- **Context:** User monetization requirement.
- **Decision:** Provide a 1-month (30-day) free trial out of the box tracked in local storage/IndexedDB. After the trial, the user can subscribe to **Pro (₹199/month)** or **Enterprise (₹499/month)** with payment checkout via **Razorpay**.
- **Reason:** Matches seller unit economics with a low-friction trial, and uses India's standard payment gateway (Razorpay).
- **Alternatives Considered:** Free-forever (rejected per user request), hard immediate paywall (hurts adoption).

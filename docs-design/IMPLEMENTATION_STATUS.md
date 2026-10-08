# GST Tool for Amazon & Flipkart — Implementation Tracker

> **Repository:** `lyzoindiaa/LyZov-Label_Cropper`  
> **Documentation Source:** `docs-design/GST Tool for Amazon and Flipkart Build Plan (React, Node.js, MongoDB).md`  
> **Last Updated:** 07 October 2026  
> **Status:** ALL PHASES (0 to 10) COMPLETED & FULLY VERIFIED.

---

## 1. Executive Summary

This document tracks the phased development of the **GST Tool for Amazon & Flipkart Sellers**. All phases from initial UI design, backend Express architecture, statutory GST engine, platform parsers, verification engines, exporters, frontend API wiring, billing, and automated test fixtures are **100% implemented, tested, and operational**.

---

## 2. Phase-by-Phase Roadmap & Status

| Phase | Description | Status | Completion Date |
|---|---|:---:|:---:|
| **Phase 0: UI Design & Client Structure** | All 10 React screens, navigation, CSS design system, routing, sitemap | ✅ **Completed** | 07 Oct 2026 |
| **Phase 1: Backend Foundation & Auth** | Node.js Express server, MongoDB models, JWT/bcrypt Auth, Business GSTIN CRUD & validation | ✅ **Completed** | 07 Oct 2026 |
| **Phase 2: Common Schema & Upload Pipeline** | Multer file upload, SHA-256 deduplication, Amazon MTR parser (CSV/Excel) | ✅ **Completed** | 07 Oct 2026 |
| **Phase 3: Flipkart Report Parser** | Flipkart sales report parser, returns & credit note handling | ✅ **Completed** | 07 Oct 2026 |
| **Phase 4: Statutory GST Calculation Engine** | Tax split (POS vs Seller State), B2B/B2CS/CDNR/Table 14 classification, aggregator, paise precision | ✅ **Completed** | 07 Oct 2026 |
| **Phase 5: Data Verification & Validation Engine** | GSTIN checksums, tax rate slabs, duplicate invoice checks, row-by-row error logs | ✅ **Completed** | 07 Oct 2026 |
| **Phase 6: GSTR-1 File Exporters** | Government-compliant GSTR-1 JSON generator & multi-sheet Excel template exporter | ✅ **Completed** | 07 Oct 2026 |
| **Phase 7: Frontend-Backend API Integration** | Connected all UI screens to backend endpoints with token sessions, Vite proxy, and real data flows | ✅ **Completed** | 07 Oct 2026 |
| **Phase 8: Billing & Subscriptions** | Razorpay order generation, plan upgrades, simulated verification, webhook listener | ✅ **Completed** | 07 Oct 2026 |
| **Phase 9: Real-Data Testing & Verification** | End-to-end test suite (`e2e-pipeline.test.js`) with sample Amazon MTR & Flipkart Excel fixtures | ✅ **Completed** | 07 Oct 2026 |
| **Phase 10: Production Readiness** | Root navigation integration, Vite server configurations, clean production build | ✅ **Completed** | 07 Oct 2026 |
| **Phase 11: Hub Home Page** | Unified `tools.lyzov.com` landing page — showcases all tools (Cropper + GST), same design system as GST Tool, `HubPage.jsx` at `/`, Cropper moved to `/cropper` | ✅ **Completed** | 07 Oct 2026 |
| **Phase 12: Data Isolation & Super Admin Management** | Multi-tenant user privacy, zero mock data fallbacks, empty states for all views, Super Admin console (`/gst-tool/admin`) with seller directory, contacts, stats, plan upgrades | ✅ **Completed** | 07 Oct 2026 |

---

## 3. How to Run the Complete Stack

### 1. Frontend Development Server (Port 5173)
From the repository root (`d:\label_cropper`):
```bash
npx vite --port 5173
```
- **Hub / Home page:** `http://localhost:5173/` ← Gateway to all tools
- **Label Cropper Studio:** `http://localhost:5173/cropper`
- **GST Tool Landing Page:** `http://localhost:5173/gst-tool`
- **GST Tool Dashboard:** `http://localhost:5173/gst-tool/dashboard`
- **Admin Customer Console:** `http://localhost:5173/gst-tool/admin` *(Admin role only)*
- **New Return Upload:** `http://localhost:5173/gst-tool/upload`
- **GSTR-1 Summary & Audit:** `http://localhost:5173/gst-tool/summary`
- **Download JSON & Excel:** `http://localhost:5173/gst-tool/downloads`
- **Plans & Billing:** `http://localhost:5173/gst-tool/billing`

### 2. Backend Express API Server (Port 5000)
From the server directory (`d:\label_cropper\server`):
```bash
npm start
```
- Health Check: `http://localhost:5000/api/health`
- All requests under `/api/*` are automatically proxied from the frontend during development.

### 3. Run Automated Pipeline Test Suite
From `d:\label_cropper\server`:
```bash
node tests/e2e-pipeline.test.js
```
Runs tests against Amazon MTR CSV and Flipkart Excel fixtures, validating parsers, tax distributions, statutory aggregation, JSON schemas, and Excel exports.

---

## 4. API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/health` | Service health status | No |
| `POST` | `/api/auth/signup` | Register new seller account | No |
| `POST` | `/api/auth/login` | Login with email & password (returns JWT) | No |
| `GET` | `/api/auth/me` | Fetch active user profile and businesses | Yes |
| `POST` | `/api/businesses/validate-gstin` | Live checksum & structure validation | No |
| `GET` | `/api/businesses` | List all businesses for logged-in user | Yes |
| `POST` | `/api/businesses` | Add new business with GSTIN | Yes |
| `PUT` | `/api/businesses/:id` | Update business details | Yes |
| `DELETE` | `/api/businesses/:id` | Delete business | Yes |
| `POST` | `/api/uploads` | Upload Amazon/Flipkart report (Multer) | Yes |
| `GET` | `/api/uploads` | List uploads for a business & period | Yes |
| `DELETE` | `/api/uploads/:id` | Delete uploaded file and parsed order lines | Yes |
| `POST` | `/api/returns/generate` | Run GST engine, create JSON & Excel exports | Yes |
| `GET` | `/api/returns/:id/summary` | Get statutory return summary & tables | Yes |
| `GET` | `/api/returns/history` | List previously generated returns | Yes |
| `GET` | `/api/returns/:id/download/json` | Download GSTR-1 JSON for GST Portal | Yes |
| `GET` | `/api/returns/:id/download/excel` | Download multi-sheet GSTR-1 Excel | Yes |
| `GET` | `/api/billing/plans` | Fetch subscription plans | No |
| `POST` | `/api/billing/create-order` | Create Razorpay subscription order | Yes |
| `POST` | `/api/billing/verify` | Verify payment & upgrade user plan | Yes |
| `GET` | `/api/billing/invoices` | List billing receipts and invoices | Yes |
| `POST` | `/api/billing/webhook` | Razorpay webhook listener | No |
| `GET` | `/api/admin/stats` | Global system metrics (Total Sellers, Active Trials, Paid, Returns) | **Admin Only** |
| `GET` | `/api/admin/customers` | Complete directory of registered sellers with contacts, GSTINs, and filings | **Admin Only** |
| `PATCH` | `/api/admin/customers/:id/plan` | Update seller subscription plan or extend trial duration | **Admin Only** |
| `DELETE` | `/api/admin/customers/:id` | Purge customer and associated records | **Admin Only** |

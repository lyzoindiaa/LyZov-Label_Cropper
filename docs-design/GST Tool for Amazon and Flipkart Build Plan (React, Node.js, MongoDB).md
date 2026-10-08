# GST Tool for Amazon and Flipkart: Build Plan

*A simple, step-by-step plan to build a GSTR-1 generator for Amazon and Flipkart sellers using React, Tailwind, Zustand, React Hook Form, Node.js and MongoDB. Includes time and cost estimates. Written 7 October 2026.*

## 1. What we are building (in one minute)

A website where a seller:

1. Signs up and adds their business (GSTIN, state).
2. Picks a month and uploads their **Amazon** and/or **Flipkart** sales reports (Excel or CSV).
3. Clicks **Generate**. The tool reads the files, applies GST rules and shows a clean summary with any errors.
4. Downloads the **GSTR-1 JSON** (upload directly to the GST portal) and the **GSTR-1 Excel** (for checking).

This is the same core idea as the GST Online Seller tool on gsttool.in, but limited to two platforms. Doing two platforms well is much better than doing 28 platforms badly.

### In scope (we build this)

- Amazon and Flipkart report upload
- GSTR-1 sections: B2B, B2CS, CDNR (credit/debit notes for registered buyers), CDNUR (for unregistered buyers, if needed), EXEMP, HSN summary, Table 14 (supplies through e-commerce operator)
- Checks and error report before download
- GSTR-1 JSON and Excel download
- Login, business profile, upload history
- Subscription and payment (in a later phase)
- A few small free GST utilities (JSON to Excel, JSON validator) as an optional last phase

### Out of scope (we do NOT build this now)

- Other platforms (Meesho, Myntra and so on)
- Tally export
- 2A/2B reconciliation
- Direct filing on the GST portal (the user uploads the JSON themselves)
- Mobile app

## 2. How the tool works (simple flow)

```
User uploads Amazon / Flipkart file
        |
        v
File is checked (right columns? right month?)
        |
        v
Parser reads each row and converts it to ONE common format
        |
        v
GST engine decides: B2B or B2CS? IGST or CGST+SGST? Return? HSN?
        |
        v
Checks run (GSTIN valid? tax correct? totals match?)
        |
        v
Summary screen with errors and warnings
        |
        v
Download GSTR-1 JSON and Excel
```

The most important idea: **every platform file is converted into one common format first.** After that, the GST logic and the download code do not care whether the row came from Amazon or Flipkart. That keeps the code small and makes it easy to add Meesho or others later.

## 3. Tech stack and why each piece is used

| Piece | What it does here |
| --- | --- |
| **React** (with Vite) | The website the user sees |
| **Tailwind CSS** | Fast, clean styling without writing lots of CSS |
| **Zustand** | Small global store: logged-in user, selected business, selected month, upload progress, results |
| **React Hook Form** (with Zod) | Forms: signup, login, business details, period and file selection, with validation |
| **Node.js with Express** | The API server |
| **MongoDB with Mongoose** | Database for users, businesses, uploads, orders, reports |
| **Multer** | Receives file uploads |
| **SheetJS (xlsx) or ExcelJS** | Reads Amazon/Flipkart Excel files and writes the GSTR-1 Excel |
| **csv-parse** | Reads CSV files (Amazon reports are often CSV) |
| **Zod** | One set of validation rules used by both frontend and backend |
| **JWT + bcrypt** | Login and password safety |
| **Razorpay** | Subscription payments (UPI, cards, net banking) |
| **BullMQ + Redis** (optional) | Background processing for very large files |
| **Vitest / Jest** | Automated tests for the GST logic |

Two small advice points:

- **Use TypeScript** on both sides if you can. Money and tax code has many fields, and TypeScript catches silly mistakes early.
- **Never store money as normal decimals.** Store amounts in paise (integer) or use a decimal library such as decimal.js. Floating-point errors will show up as 1 paisa differences on the GST portal.

## 4. Architecture

```
React app (Vite + Tailwind + Zustand + React Hook Form)
        |  HTTPS / REST (JSON)
        v
Node.js + Express API
  |-- auth module (JWT)
  |-- business module (GSTIN, state)
  |-- upload module (Multer, file checks)
  |-- parsers/ amazon.js, flipkart.js   <- one file per platform
  |-- engine/  classify, taxSplit, aggregate, hsn, table14
  |-- validators/ gstin, state, rate, totals
  |-- exporters/ gstr1Json.js, gstr1Excel.js
  |-- billing module (Razorpay, plan checks)
        |
        v
MongoDB (users, businesses, uploads, orderlines, reports, payments)
File storage (local disk first, S3 later) for uploaded and generated files
```

### Suggested folder structure

```
gst-tool/
  client/
    src/
      pages/        (Login, Signup, Dashboard, Businesses, Upload, Summary, Downloads, Billing)
      components/   (FileDropzone, ErrorTable, SummaryCards, PeriodPicker)
      store/        (authStore.js, businessStore.js, returnStore.js)
      forms/        (schemas with Zod)
      api/          (axios functions)
  server/
    src/
      routes/ controllers/ models/ middleware/
      parsers/      (amazon, flipkart, common schema)
      engine/       (GST rules)
      validators/
      exporters/
      utils/        (gstin, state codes, money)
    tests/
      fixtures/     (real anonymised sample files)
  shared/           (Zod schemas, constants)
```

## 5. Database design (MongoDB)

**users**: name, email, phone, passwordHash, plan, trialEndsAt, createdAt.

**businesses**: userId, legalName, gstin, stateCode, filingFrequency (monthly or quarterly).

**uploads**: businessId, platform (amazon or flipkart), period (MMYYYY), originalFileName, fileHash, status (uploaded, parsed, failed), rowCount, errorSummary. The file hash stops the same file being uploaded twice by mistake.

**orderlines** (the common format; one document per invoice line):

- uploadId, businessId, period, platform
- orderId, invoiceNumber, invoiceDate
- type: sale, return or cancellation
- buyerGstin (empty for normal customers)
- shipFromState, placeOfSupply (state code)
- hsn, description, quantity, uqc
- taxableValue, gstRate, igst, cgst, sgst, cess, invoiceValue (all in paise)
- platformGstin (ETIN) for Table 14
- sourceRow (row number in the original file, used for error messages)

**reports**: businessId, period, version, summary totals, warnings, jsonFilePath, excelFilePath, createdAt.

**payments / subscriptions**: plan, amount, razorpayIds, status, validTill.

**Indexes to add:** orderlines by (businessId, period), uploads by (businessId, period, platform), uploads by fileHash.

## 6. Screens (React pages)

1. **Signup and Login** (React Hook Form with validation)
2. **Dashboard**: trial status, recent returns, quick start button
3. **Businesses**: add or edit GSTIN, state, filing frequency (GSTIN validated live)
4. **New Return** (the main page): pick business, pick month, upload Amazon file(s) and Flipkart file(s), see upload status for each
5. **Summary**: cards for total taxable value and total tax, tables for B2B, B2CS, CDNR, HSN, Table 14; a separate **Errors and Warnings** tab with row numbers
6. **Downloads**: GSTR-1 JSON, GSTR-1 Excel, history of older versions
7. **Billing**: plan, pay, invoices
8. **Help**: simple FAQ and how to download the right report from Amazon and Flipkart

### What goes in Zustand

- `authStore`: user, token, login and logout
- `businessStore`: list of businesses, selected business
- `returnStore`: selected period, uploaded files and their status, generated summary, errors

Keep server data (history, reports) in React Query or plain fetch calls. Keep only UI and session state in Zustand.

## 7. Backend API (main endpoints)

| Endpoint | Purpose |
| --- | --- |
| POST /auth/signup, /auth/login | Account |
| GET/POST/PUT /businesses | Manage GSTINs |
| POST /uploads | Upload file with platform, business, period |
| GET /uploads?businessId=&period= | List uploaded files |
| DELETE /uploads/:id | Remove a wrong file and its rows |
| POST /returns/generate | Run engine for business and period |
| GET /returns/:id/summary | Totals and tables |
| GET /returns/:id/errors | Error and warning list |
| GET /returns/:id/download/json | GSTR-1 JSON |
| GET /returns/:id/download/excel | GSTR-1 Excel |
| POST /billing/order, /billing/webhook | Razorpay |

## 8. Amazon and Flipkart parsers

Each parser has one job: **read the platform file and output rows in the common format.**

### Amazon

- Sellers usually download the **tax reports (MTR, Merchant Tax Report) for B2B and B2C** from Seller Central, and sometimes separate reports for other cases.
- Typical information in the files: invoice number and date, order id, transaction type (shipment, refund, cancel and so on), ship-from state, ship-to state, HSN, tax rate, taxable value, CGST, SGST, IGST, buyer GSTIN for B2B.
- Refunds and cancellations must become negative sales or credit notes.

### Flipkart

- Sellers download the **GST / Sales report** from Seller Hub (tax reports section). It is an Excel file with a main sales sheet.
- Typical information: order id, SKU, HSN, event type (sale, return, cancellation), order date, ship-from state, delivery state, taxable value, tax rates and amounts, invoice id and amount.
- Returns appear as events and must be matched to credit notes.

### Very important

Column names above are what these reports usually contain, but **they change over time and between report versions.** Before writing code:

1. Download 3 to 5 real reports from each platform (different months, with sales, returns and B2B orders). Ask friendly sellers or a CA for anonymised files.
2. Write down the exact column names.
3. Build each parser against those files, and keep the files as test fixtures.

### Parser rules to follow

- Check the header row first. If a needed column is missing, stop and tell the user exactly which one is missing.
- Convert dates and numbers carefully (Excel dates, commas, blank cells).
- Keep the original row number on every record.
- Do not guess silently. If a value looks wrong, add it to the warnings list.

## 9. GST logic in simple words

The engine applies these rules to the common-format rows. **Confirm each rule with a CA and the official GST portal documents before launch.** Rules and the JSON format change from time to time.

1. **Same state or different state?** If the place of supply is the same state as the seller, tax is CGST + SGST. If it is a different state, tax is IGST.
2. **B2B or B2CS?** If the buyer has a valid GSTIN, the sale is B2B and is listed invoice by invoice. If not, it is B2CS and is added up by state, tax rate and type (intra or inter state).
3. **Returns and cancellations.** A return after invoicing becomes a credit note. Registered buyer: CDNR. Unregistered buyer: CDNUR if required by the current rules. Cancellations before invoicing may need no entry.
4. **Table 14 (through e-commerce operator).** Sales made through Amazon or Flipkart are reported against the operator's GSTIN, so the report must group supplies by the platform's GSTIN.
5. **HSN summary.** Add up quantity, taxable value and taxes by HSN code, unit and rate.
6. **EXEMP.** Nil-rated and exempt supplies go to their own table.
7. **Rounding.** Do rounding in one place only and use integers (paise), so totals always match.

## 10. Checks before download

The tool should say clearly what is wrong, in simple words, with row numbers.

- GSTIN format and checksum are valid (seller and buyer)
- State codes are valid
- Tax rate is a valid GST slab
- IGST is not used together with CGST/SGST on one line
- Taxable value times rate is close to the tax shown in the file
- Invoice numbers are not duplicated
- All rows belong to the selected month (warn for earlier-month items)
- Credit notes have a reason and a linked invoice where possible
- HSN is present (warn if missing)
- Totals in the summary match the totals in the source file

Show each issue as **Error** (must fix) or **Warning** (can continue).

## 11. Download files

- **GSTR-1 JSON:** built from the official GSTR-1 offline tool format. Take the current schema and offline tool from the GST portal. Common keys are `b2b`, `b2cs`, `cdnr`, `cdnur`, `exemp`, `hsn`, `doc_issue` and `supeco`.
- **GSTR-1 Excel:** same data in tabs, similar to the government template so a CA can check it.
- **Golden rule:** every file the tool produces must load without error in the **official GST offline tool** before you release it. Make this a required step in your testing.

## 12. Login, payments and safety

- Passwords hashed with bcrypt; login with JWT (short-lived access token plus refresh token).
- Rate limit login and upload endpoints.
- Every query filtered by the logged-in user, so nobody can open another business's data.
- HTTPS everywhere; database not open to the internet.
- Delete uploaded files after a fixed time (for example 60 days) unless the user keeps them. Publish a short, clear privacy policy.
- Never ask for GST portal username or password. The user uploads the JSON themselves.
- Payments: Razorpay subscription or one-time monthly plan. Give a 30-day free trial, check plan status on the server before generating a return.

## 13. Testing plan

| Type | What to test |
| --- | --- |
| Unit tests | GSTIN checker, tax split, B2B vs B2CS, rounding, HSN totals |
| Parser tests | Each real sample file produces the expected number of rows and totals |
| Golden tests | For each sample month, the expected GSTR-1 totals are verified by hand once, then stored; tests fail if numbers change |
| API tests | Auth, ownership checks, upload errors |
| UI tests (light) | Signup, upload and download flow |
| Final check | Upload generated JSON into the official offline tool and the portal's validation |

## 14. Time estimate

Assumptions: one developer who already knows React and Node, working about 6 focused hours a day, 5 days a week. Real sample files must be available at the start.

| Phase | What happens | Days (solo) |
| --- | --- | --- |
| 0. Preparation | Collect sample reports, read the GSTR-1 format, confirm rules with a CA, list fields | 4 |
| 1. Project setup and login | Repos, Vite and Tailwind, Express, MongoDB, auth, business form with GSTIN check | 5 |
| 2. Upload and Amazon parser | Upload page, Multer, Amazon parser, common format, error messages | 7 |
| 3. Flipkart parser | Flipkart parser, returns and event types, tests | 6 |
| 4. GST engine | Tax split, B2B, B2CS, credit notes, HSN, EXEMP, Table 14 | 8 |
| 5. Checks | All validation rules, error and warning screen | 4 |
| 6. Download files | JSON and Excel exporters, offline-tool testing | 6 |
| 7. Main screens | Dashboard, new return, summary tables, downloads, history (partly overlaps earlier phases) | 8 |
| 8. Payments and plans | Razorpay, trial, plan limits | 4 |
| 9. Real-data testing and fixes | Run many real months, fix mismatches, CA review | 7 |
| 10. Deploy and launch | Server, domain, SSL, backups, monitoring, legal pages | 3 |
| **Total** |  | **62 days** |
| Buffer (about 20%) | Surprises, report format changes, portal validation fixes | 12 |
| **Grand total** |  | **about 74 working days** |

### What this means in calendar time

| Team | Time to launch |
| --- | --- |
| 1 developer | about 14 to 16 weeks (3.5 to 4 months) |
| 2 developers (one frontend, one backend) | about 8 to 10 weeks |
| Quick MVP: Amazon only, no payments, basic screens | about 7 to 8 weeks for one developer |

### Milestones

- **Week 2:** user can sign up, add a business and upload a file
- **Week 5:** Amazon file turns into a correct summary
- **Week 7:** Flipkart works too
- **Week 9:** JSON and Excel download, loads in the offline tool
- **Week 12:** payments and polished screens
- **Week 14 to 16:** tested with real data, launched to first users (beta with 5 to 10 sellers or CAs first)

### Why time may go up

- Amazon or Flipkart changes a report format
- You do not have enough real sample files with returns and B2B cases
- GST rules or the JSON format change during the build
- The first version of the numbers does not match the portal and needs long debugging

## 15. Rough monthly running cost (early stage)

These are approximate and depend on providers and traffic.

| Item | Rough cost |
| --- | --- |
| Server (small VPS or cloud instance) | ₹500 to ₹3,000 |
| MongoDB (Atlas shared tier or self-hosted) | ₹0 to ₹2,500 |
| File storage and backups | ₹100 to ₹500 |
| Domain, email sending | ₹100 to ₹500 |
| Error monitoring (free tier is fine at first) | ₹0 |
| Payment gateway | A percentage per transaction, no big fixed fee |
| **Total fixed** | about ₹1,000 to ₹7,000 per month |

One-time or occasional costs: a CA consultation for rule checking, a lawyer for privacy policy and terms, and your own development time.

## 16. Simple pricing idea

GSTTool charges about ₹149 per month for its seller tool. A competitor could start near the same level, for example ₹149 per month or ₹999 per year for Amazon and Flipkart, with a 30-day free trial. Offer a CA plan with multiple GSTINs at a higher price, because CAs file for many sellers.

## 17. Your first-week checklist

1. Collect 3 to 5 real Amazon and 3 to 5 Flipkart reports (with sales, returns, B2B).
2. Download the official GSTR-1 offline tool and a sample JSON from the GST portal.
3. Write down every column name from the sample reports.
4. Fix the common order-line format (section 5).
5. Create the repo with the folder structure above.
6. Set up Express, MongoDB, Vite, Tailwind, Zustand, React Hook Form.
7. Build signup, login and the business form with the GSTIN checker.
8. Write your first test: GSTIN validation.

## 18. Summary

Build one thing very well: **Amazon and Flipkart reports in, correct GSTR-1 JSON and Excel out.** Convert every file to one common format, keep the GST rules in one engine, test with real data, and verify every output in the official offline tool. With one developer expect roughly 3.5 to 4 months; with two developers, about 2 to 2.5 months.

*Note: report column names, GST rules and the JSON schema in this plan reflect general knowledge and should be confirmed against current Amazon and Flipkart reports and official GST portal documents before you code or launch.*

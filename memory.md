# Memory - Progress Tracker

> Last Updated: 2026-07-11 18:00 IST

---

## Project State Summary

| Aspect | Status |
|--------|--------|
| **Phase** | 10 - Khatabook features complete |
| **Overall Progress** | ~99% |
| **Current Focus** | Ledger features (You Gave/Got, PDF, SMS, images) |
| **Blockers** | User needs to fill KEYS_AND_CONFIG.md for deployment |

---

## What's Running Now

| Service | URL | Status |
|---------|-----|--------|
| NestJS Backend | http://localhost:3000 | ✅ Running |
| Admin Dashboard | http://localhost:5173 | ✅ Running |
| Landing Site | http://localhost:5174 | ✅ Running |
| Swagger Docs | http://localhost:3000/api/docs | ✅ Available |
| PostgreSQL | localhost:5432 (db: wise_accounts) | ✅ Running |

---

## Session Changes (2026-07-11)

### 1. Customer Ledger (Khatabook-style)

**Backend:**
- `customer.service.ts` — Rewrote `getLedger()`: fetches transactions + invoices + payments, merges into unified timeline, sorts by date, computes running balance. Returns `{ customer, summary, entries }`.
- `customer.controller.ts` — Existing endpoint at `GET /customers/:id/ledger`

**Admin Dashboard:**
- New `CustomerLedgerPage.tsx` — Full-page ledger at `/customers/:id/ledger`
  - Dark blue gradient header with customer info
  - 4 summary cards: Opening Balance, Total Debit, Total Credit, Closing Balance
  - Transaction table with Dr/Cr/OB chips, date, description, debit, credit, running balance
  - Footer with totals
- Updated `CustomersPage.tsx` — Ledger button now navigates to full page instead of dialog
- Updated `api/customers.ts` — `LedgerResponse` type matching backend

**Android:**
- New `CustomerLedgerScreen.kt` — Same Khatabook-style UI in Jetpack Compose
- Updated `CustomerListScreen.kt` — Added wallet icon for ledger navigation
- Updated `Routes.kt` + `NavGraph.kt` — Added `CUSTOMER_LEDGER` route

**iOS:**
- Rewrote `CustomerLedgerView.swift` — Same Khatabook-style UI in SwiftUI
- Updated `Customer.swift` — New `LedgerResponse`, `LedgerCustomer`, `LedgerSummary`, `LedgerEntryItem` models

### 2. Sale vs Purchase Invoices

**Backend:**
- `schema.prisma` — Added `InvoiceDirection` enum (SALE/PURCHASE), `direction` field + `supplierId` to Invoice model
- Migration `20260711115646_add_invoice_direction` applied
- `create-invoice.dto.ts` — Added `direction` and `supplierId` fields
- `billing.service.ts` — Handles direction: SALE updates customer balance, PURCHASE handles supplier; PUR- prefix for purchase invoices
- `billing.controller.ts` — Added `direction` query parameter

**Admin Dashboard:**
- Updated `InvoicesPage.tsx` — Sale/Purchase tabs, each filtering by direction
- Updated `api/invoices.ts` — `direction` field on Invoice type

**Android:**
- Updated `ApiService.kt` — `direction` on Invoice, `getInvoices()` accepts direction param
- Updated `InvoiceListScreen.kt` — Sale/Purchase TabRow

**iOS:**
- Updated `Invoice.swift` — `direction`, `supplierId`, `supplier` on Invoice; `SalePurchaseTab` enum
- Updated `InvoiceListView.swift` — Segmented Picker for Sale/Purchase
- Updated `CreateInvoiceRequest` — Added `direction` and `supplierId`

### 3. GST Returns (GSTR-1, GSTR-3B)

**Backend:**
- `reports.service.ts` — GSTR-1 returns B2B invoices + B2C summary; GSTR-3B returns monthly tax liability
- `reports.controller.ts` — Added `GET /reports/hsn` endpoint
- `reports.service.ts` — Added `getHsnReport()` for HSN-wise summary

**Admin Dashboard:**
- Rewrote `ReportsPage.tsx` — Month/year selectors on GSTR-1/GSTR-3B tabs, proper B2B table display, B2C summary
- Rewrote `api/reports.ts` — Fixed all types to match backend response shapes

**Android:**
- Updated `ApiService.kt` — New GSTR-1/GSTR-3B/SalesReport models matching backend
- Updated `ReportsScreen.kt` — Month/year selectors, proper report detail composables

**iOS:**
- Updated `Report.swift` — New GSTR models matching backend
- Updated `ReportsView.swift` — Month/year pickers, B2B table, B2C summary

---

## Cross-Platform Consistency

| Feature | Backend | Admin | Android | iOS |
|---------|---------|-------|---------|-----|
| LedgerResponse | ✅ | ✅ | ✅ | ✅ |
| Direction (SALE/PURCHASE) | ✅ | ✅ | ✅ | ✅ |
| GSTR-1 shape | ✅ | ✅ | ✅ | ✅ |
| GSTR-3B shape | ✅ | ✅ | ✅ | ✅ |
| TS compilation | ✅ 0 errors | ✅ 0 errors | N/A | N/A |

---

## Code Review Results (2026-07-11)

| # | Severity | Platform | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | MEDIUM | Android | Status filter lowercase vs backend uppercase | Pre-existing |
| 2 | LOW | iOS | CreateInvoiceRequest missing direction | FIXED |
| 3 | LOW | iOS | Year range hardcoded to 2026 | Known |
| 4 | INFO | Backend | Ledger shows only SALE_INVOICE entries | Expected |

---

## Database Schema Updates

- Added `InvoiceDirection` enum: `SALE`, `PURCHASE`
- Added `direction` field to `Invoice` model (default: `SALE`)
- Added `supplierId` field to `Invoice` model (optional FK to Supplier)
- Added `invoices` relation to `Supplier` model
- Added `imageUrl` field to `CustomerTransaction` model
- Migration `20260711124453_add_ledger_image` applied

---

## Khatabook Features (2026-07-11 Session 2)

### You Gave / You Got (Standalone Ledger Entries)

**Backend:**
- `POST /customers/:id/ledger` — Creates `LEDGER_GAVE` (debit) or `LEDGER_RECEIVED` (credit) transaction, updates customer balance
- `DELETE /customers/:id/ledger/:transactionId` — Deletes standalone entries, reverses balance
- `getLedger()` updated to include `LEDGER_GAVE`/`LEDGER_RECEIVED` entries with proper running balance
- DTO: `CreateLedgerEntryDto` — amount, type (GAVE/RECEIVED), paymentMode, description, date, reference, imageUrl

### PDF/Print Ledger

**Backend:**
- `GET /customers/:id/ledger/print` — Returns styled HTML with header, summary cards, transaction table with Dr/Cr chips, images, footer
- Static file serving configured at `/uploads/` prefix via `useStaticAssets()`

### SMS Ledger Link

**Backend:**
- `POST /customers/:id/ledger/sms` — Returns formatted SMS text with customer name, balance, and ledger URL
- Endpoint: `https://ledger.wiseaccounts.com/l/{businessId}/{customerId}`

### Image Attachments

**Backend:**
- `POST /customers/:id/ledger/upload` — Multer file upload (images only, 10MB limit), stores in `uploads/ledger/`
- `imageUrl` field on `CustomerTransaction` model
- `getLedgerHtml()` shows image thumbnails (clickable to open full-size)
- Static serving: `app.useStaticAssets(join(__dirname, '..', '..', 'uploads'), { prefix: '/uploads/' })`

**Admin Dashboard:**
- "You Gave" (red) / "You Got" (green) big buttons below header
- Entry dialog: amount, payment mode dropdown, date, description, reference, image dropzone
- Image preview in dialog + thumbnail in transaction table (clickable)
- PDF button (opens printable HTML in new tab) + SMS button (dialog with phone + message)
- Delete button on standalone entries

**Android:**
- Same "You Gave"/"You Got" buttons in Row
- Entry dialog with ExposedDropdownMenuBox for payment mode
- Gallery image picker (ActivityResultContracts.GetContent)
- Image thumbnail in TransactionRow (AsyncImage from Coil)
- PDF opens via Intent, SMS dialog

**iOS:**
- Same action buttons
- LedgerEntrySheet with image picker (UIImagePicker via UIViewRepresentable)
- AsyncImage thumbnail in ledger rows
- WebView for PDF via fullScreenCover
- LedgerSmsSheet with phone + message

---

## Local Dev Credentials

| Credential | Value |
|------------|-------|
| DB User | `shobhit` |
| DB Password | `postgres` |
| DB Name | `wise_accounts` |
| DB URL | `postgresql://shobhit:postgres@localhost:5432/wise_accounts?schema=public` |
| Admin Phone | `9999999999` |
| Admin Password | `admin123` |

---

## How to Resume Next Time

### Start backend:
```powershell
cd backend
npm run start:dev
```

### Start admin dashboard:
```powershell
cd admin-dashboard
npm run dev
```

### Start landing site:
```powershell
cd wiseaccounts
npx vite --port 5174 --host
```

### PostgreSQL service:
```powershell
Start-Service -Name "postgresql-x64-16"
```

---

## Quick Commands Reference

| Action | Command |
|--------|---------|
| Build backend | `cd backend && npm run build` |
| Build admin dashboard | `cd admin-dashboard && npx vite build` |
| Run backend tests | `cd backend && npx jest` |
| Prisma generate | `cd backend && npx prisma generate` |
| Prisma migrate | `cd backend && npx prisma migrate dev --name <name>` |
| TypeScript check (backend) | `cd backend && npx tsc --noEmit` |
| TypeScript check (dashboard) | `cd admin-dashboard && npx tsc --noEmit` |

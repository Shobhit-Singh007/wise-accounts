# Memory - Progress Tracker

> Last Updated: 2026-07-13 12:18 IST

---

## Project State Summary

| Aspect | Status |
|--------|--------|
| **Phase** | 5 - Deployment & Infrastructure (Docker setup complete) |
| **Overall Progress** | ~96% (Docker stack working locally, deployment pending) |
| **Current Focus** | Docker local testing verified, ready for deployment |
| **Blockers** | External credentials needed for deployment (see "What's Still Needed") |
| **Git Repo** | https://github.com/Shobhit-Singh007/wise-accounts |

---

## What's Running Now

| Service | URL | Status |
|---------|-----|--------|
| Landing Site | http://localhost | ✅ Running (Docker) |
| Admin Dashboard | http://localhost/admin | ✅ Running (Docker) |
| NestJS Backend API | http://localhost/api/v1 | ✅ Running (Docker) |
| Health Check | http://localhost/api/v1/health | ✅ 200 OK |
| PostgreSQL | postgres:5432 (Docker internal) | ✅ Running |
| Redis | redis:6379 (Docker internal) | ✅ Running |
| Swagger Docs | http://localhost/api/v1/api/docs | ✅ Running (Docker) |

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
| Business ID | `8caf3e59-2f77-414d-8fcf-bcf31d3f5ba6` |
| GitHub User | `Shobhit-Singh007` |
| Git Author | `Shobhit Singh <shobhitsinghraikwar@gmail.com>` |

---

## Git Commits

| Commit | Description |
|--------|-------------|
| `220b4ad` | feat: comprehensive feature additions across all platforms |
| `43dfc71` | feat: staff management with granular permissions |
| `6fefba5` | feat: invoice templates, E-Way Bill/e-Invoice APIs, one-click generate, mobile apps |

---

## Session Changes (2026-07-12) — Session 2

### 9. AWS Integration

**Backend:**
- `aws/aws.module.ts` — Global AwsModule with DynamoDB provider
- `aws/dynamo-db.service.ts` — DynamoDBService with `putSession`, `getSession`, `deleteSession`, `cacheGet`, `cacheSet`, `cacheDelete`, `putNotification`, `getNotifications`
- `src/app.module.ts` — AwsModule imported globally

**AWS Resources Created:**
| Resource | Details |
|----------|---------|
| SES Email | `noreply@wise-accounts.com` verified (sandbox) |
| DynamoDB Tables | `wise_sessions`, `wise_cache`, `wise_notifications` (PAY_PER_REQUEST) |
| Region | `ap-south-1` |

**AWS Credentials in `backend/.env`:**
```
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<redacted>
AWS_SECRET_ACCESS_KEY=<redacted>
SES_FROM_EMAIL=noreply@wise-accounts.com
```

**Integration Points:**
- AuthService: Caches sessions in DynamoDB (7-day TTL), `getMe` reads from cache first
- NotificationsService: Backs up in-app notifications to DynamoDB

---

### 10. Razorpay Payment Gateway

**Backend:**
- `razorpay` npm package installed
- `payments.service.ts` — `createRazorpayOrder()`, `verifyRazorpayWebhook()`, `generateUpiLink()`, `reconcilePayments()`, `autoReconcile()`

**Razorpay Test Keys in `backend/.env`:**
```
RAZORPAY_KEY_ID=<redacted>
RAZORPAY_KEY_SECRET=<redacted>
```

**Verified:** Test order creation confirmed working via API.

---

### 11. Dark Mode

**Android:**
- `ui/theme/Color.kt` — Brand colors + status/feature colors with light/dark variants
- `ui/theme/Theme.kt` — `LightColorScheme` + `DarkColorScheme`, `GSTBillingTheme` supports both
- `values-night/themes.xml` — Dark theme XML fallback
- `MainActivity.kt` — Uses `GSTBillingTheme` (follows system)

**iOS:**
- `GSTBilling/Theme/AppTheme.swift` — Centralized theme constants
- `GSTBilling/Theme/ColorExtensions.swift` — Semantic Color extensions (light/dark)
- `Assets.xcassets/PrimaryColor.colorset` + `AccentColor.colorset` — Light/dark color assets
- `GSTBillingApp.swift` — Removed `.preferredColorScheme(.light)` (follows system)

---

### 12. Dashboard Charts

**Android (Vico library):**
- `ui/dashboard/DashboardCharts.kt`
  - `SalesBarChart` — 12-month sales trend
  - `InvoiceStatusPieChart` — PAID/DRAFT/PENDING/PAID/VOID
  - `TopProductsChart` — Top products by revenue
- Vico dependencies: `vico-compose-m3:2.0.1`, `vico-core:2.0.1`

**iOS (Swift Charts):**
- `Views/Dashboard/DashboardChartsView.swift`
  - `SalesBarChartView` — 12-month sales trend
  - `InvoiceStatusChartView` — Pie chart by status
  - `TopProductsChartView` — Top products by revenue

---

### 13. Batch/Expiry Tracking

**Android:**
- `ui/inventory/BatchExpiryScreen.kt`
  - Batch list with expiry status badges
  - Filter: All / Expiring Soon / Expired
  - `BatchInfo` model with batch number, expiry date, status calculation

**iOS:**
- `Views/Inventory/BatchExpiryView.swift`
  - `BatchInfo` model with days until expiry
  - Colored status: Expired (red), Expiring Soon (orange), Valid (green)

---

### 14. Barcode Scanning

**Android (CameraX + ML Kit):**
- `ui/inventory/BarcodeScannerScreen.kt`
  - CameraX preview + ML Kit `BarcodeScanning.getClient()`
  - Supports EAN13, EAN8, Code128, QR_CODE
  - Scan result overlay + manual entry fallback

**iOS (AVFoundation):**
- `Views/Inventory/BarcodeScannerView.swift`
  - `AVCaptureSession` with metadata output
  - `AVMetadataMachineReadableCodeObject` parsing
  - Camera permission request + scan result display

---

### 15. Customer Groups

**Android:**
- `ui/customer/CustomerGroupsScreen.kt`
  - Group list with customer count
  - Create/edit/delete dialogs
  - Assign/remove customers from groups

**iOS:**
- `Views/Customer/CustomerGroupsView.swift`
  - `GroupRow` with customer count badge
  - `AddGroupSheet` for creating new groups

---

### 16. Payment Reminders

**Android:**
- `ui/payments/PaymentRemindersScreen.kt`
  - Reminder list with urgency colors (30+ days overdue = red, 7+ = orange)
  - Send reminder action (simulated)

**iOS:**
- `Views/Payments/PaymentRemindersView.swift`
  - `ReminderRow` with urgency-based coloring
  - Send reminder action

---

### 17. Export Service

**Android (PDF + CSV):**
- `data/export/ExportService.kt`
  - PDF via `PdfDocument` + canvas rendering
  - CSV via `BufferedWriter`
  - Share via `FileProvider`
- `res/xml/file_paths.xml` — FileProvider configuration
- `proguard-rules.pro` — ProGuard rules for dependencies

**iOS (PDF + CSV):**
- `Services/ExportService.swift`
  - HTML-based PDF via `UIMarkupTextPrintFormatter`
  - CSV via `String` builder
  - Share sheet via `UIActivityViewController`

---

### 18. Conflict Resolution

**Android:**
- `data/sync/ConflictResolver.kt`
  - 4 strategies: CLIENT_WINS, SERVER_WINS, LAST_WRITE_WINS, MERGE
  - `ConflictResolutionResult` with resolved data and metadata

**iOS:**
- `Services/ConflictResolver.swift`
  - Same 4 strategies with identical logic
  - `ConflictResolutionResult` struct

---

### 19. Thermal/AirPrint

**Android (Bluetooth):**
- `data/printing/ThermalPrinter.kt`
  - CoreBluetooth RFCOMM connection
  - Receipt formatting with item lines, totals, GST breakdown

**iOS:**
- `Services/ThermalPrinter.swift` — CoreBluetooth RFCOMM
- `Services/AirPrintService.swift` — `UIPrintInteractionController`

---

### 20. Razorpay Checkout

**Android:**
- `ui/payments/RazorpayCheckoutScreen.kt`
  - Razorpay SDK checkout flow (`com.razorpay:checkout:1.6.21`)
  - Order creation via API → checkout → verify → success/failure
- `build.gradle.kts` — Added `com.razorpay:checkout:1.6.21`
- `navigation/Routes.kt` — `const val RAZORPAY_CHECKOUT = "razorpay_checkout"`
- `navigation/NavGraph.kt` — Wired RazorpayCheckoutScreen

**iOS:**
- `Views/Payments/RazorpayCheckoutView.swift`
  - `RazorpayCheckoutViewModel` with order creation + simulated payment
- `Navigation/AppNavigation.swift` — `.razorpayCheckout` route added

---

### 21. Multi-Language (Hindi/English)

**Android:**
- `values/strings.xml` — 61 English strings
- `values-hi/strings.xml` — 61 Hindi translations

**iOS:**
- `Resources/Base.lproj/Localizable.strings` — English
- `Resources/hi.lproj/Localizable.strings` — Hindi
- `Utilities/Localizable.swift` — `AppLanguage` enum + `Bundle` extension
- `Views/Settings/LanguageSettingsView.swift` — Language picker UI

---

### 22. Android Build Config

- `proguard-rules.pro` — Razorpay, Hilt, Room, Retrofit, OkHttp, Gson rules
- `build.gradle.kts` — `isMinifyEnabled=true`, `isShrinkResources=true` (release)
- APK splits: arm64-v8a, armeabi-v7a, x86_64 + universal
- `res/xml/file_paths.xml` — FileProvider for export sharing

---

### 23. Performance Optimization

- `android/PERFORMANCE.md` — Lazy loading, image optimization, DB indexing, ProGuard tips
- `ios/PERFORMANCE.md` — Same optimization guide for iOS

---

### 24. Backend Testing

**Unit Tests (106 passing):**
- `test/auth.service.spec.ts` — 13 tests
- `test/billing.service.spec.ts` — 24 tests
- `test/inventory.service.spec.ts` — 20 tests
- `test/notifications.service.spec.ts` — 10 tests
- `test/business.service.spec.ts` — 19 tests
- `test/staff.service.spec.ts` — 20 tests

**Integration Tests:**
- `test/auth.integration-spec.ts` — Register, duplicate rejection, login, invalid credentials
- `test/business.integration-spec.ts` — Create business, get details with auth

**Load Testing:**
- `test/load/load-test.yml` — k6 config, ramp to 50 users, p95 < 500ms threshold

---

### 25. Monitoring Placeholders

- `src/common/sentry.interceptor.ts` — Sentry error interceptor (placeholder for `@sentry/nestjs`)
- `src/common/cloudwatch.logger.ts` — CloudWatch logger (placeholder for AWS SDK)

---

### 26. Documentation

- `docs/USER_MANUAL.md` — Comprehensive user manual covering all features

---

## Permission System

### 32 Granular Permissions

| Resource | Actions |
|----------|---------|
| dashboard | view |
| customers | view, create, edit, delete |
| products | view, create, edit, delete |
| invoices | view, create, edit, delete, cancel |
| payments | view, create, delete |
| reports | view, export |
| settings | view, edit |
| staff | view, invite, edit, remove |
| warehouses | view, create, edit, delete |

### 6 Preset Roles

| Role | Description |
|------|-------------|
| Owner | All permissions (immutable, cannot be removed) |
| Admin | Everything except `staff.remove` and `settings.edit` |
| Manager | customers, products, invoices, payments, reports.view, warehouses |
| Accountant | invoices.view/create, payments, reports, customers.view |
| Sales | invoices.view/create, customers.view/create |
| Viewer | All `*.view` permissions only |

---

## Cross-Platform Consistency

| Feature | Backend | Admin | Android | iOS |
|---------|---------|-------|---------|-----|
| Invoice Templates | ✅ | ✅ | ✅ | ✅ |
| E-Way Bill API | ✅ | ✅ | ✅ | ✅ |
| e-Invoice API | ✅ | ✅ | ✅ | ✅ |
| Generate Both (One-Click) | ✅ | ✅ | ✅ | ✅ |
| Invoice Detail Screen | ✅ | ✅ | ✅ | ✅ |
| Staff Management | ✅ | ✅ | ✅ | ✅ |
| Granular Permissions | ✅ | ✅ | ✅ | ✅ |
| Reports & Analytics | ✅ | ✅ | — | — |
| Dark Mode | — | — | ✅ | ✅ |
| Dashboard Charts | — | — | ✅ | ✅ |
| Batch/Expiry Tracking | — | — | ✅ | ✅ |
| Barcode Scanning | — | — | ✅ | ✅ |
| Customer Groups | — | — | ✅ | ✅ |
| Payment Reminders | — | — | ✅ | ✅ |
| Export (PDF/CSV) | — | — | ✅ | ✅ |
| Conflict Resolution | — | — | ✅ | ✅ |
| Thermal/AirPrint | — | — | ✅ | ✅ |
| Razorpay Checkout | ✅ | — | ✅ | ✅ |
| Multi-language | — | — | ✅ | ✅ |
| ProGuard/R8 | — | — | ✅ | N/A |
| APK Splits | — | — | ✅ | N/A |
| AWS DynamoDB | ✅ | — | — | — |
| AWS SES | ✅ | — | — | — |
| Razorpay Backend | ✅ | — | — | — |
| Unit Tests (106) | ✅ | — | — | — |
| Integration Tests | ✅ | — | — | — |
| Load Testing (k6) | ✅ | — | — | — |
| Sentry Interceptor | ✅ (placeholder) | — | — | — |
| CloudWatch Logger | ✅ (placeholder) | — | — | — |
| User Manual | ✅ | — | — | — |
| GSTR-1 (5 tables) | ✅ | ✅ | ✅ | ✅ |
| GSTR-3B (5 tables) | ✅ | ✅ | ✅ | ✅ |
| Inventory Dashboard | ✅ | ✅ | ✅ | ✅ |
| Stock Movements | ✅ | ✅ | ✅ | ✅ |
| TS Compilation | ✅ 0 errors | ✅ 0 errors | N/A | N/A |

---

## Session Changes (2026-07-12) — Session 3

### 27. GSTR-1 Complete (All Filing Tables)

**Backend (`reports.service.ts`):**
- Table 4: B2B Invoices — GSTIN, Invoice No, Date, Value, Place of Supply, Reverse Charge, Taxable, CGST, SGST, IGST
- Table 5: B2C Large — Place of Supply, Rate, Taxable, CGST, SGST, IGST (invoices > ₹2.5L inter-state)
- Table 6: B2C Small — aggregated by place of supply + rate
- Table 7: HSN Summary — grouped by `product.hsnCode` (fallback `9999`)
- Table 8: Documents — total invoices issued, value, credit/debit notes
- Date range filtering (fromDate/toDate)

**Admin Dashboard (`ReportsPage.tsx`):** GSTR-1 tab with all 5 tables + ExportButtons
**Android (`ReportsScreen.kt`):** `Gstr1ReportDetail` with `DateRangeSelector`, `SectionHeader`/`TaxChip`
**iOS (`ReportsView.swift`):** Date range picker, all 5 tables with LabeledContent

### 28. GSTR-3B Complete (All Filing Tables)

**Backend (`reports.service.ts`):**
- Table 3.1: Outward Supplies — Intra/Inter-state, Zero/Nil/Exempt/Non-GST/Reverse Charge
- Table 3.2: Inter-state Supplies — Place of Supply, Taxable Value, IGST
- Table 4: Eligible ITC — Import Goods/Services, Inward Supplies, Total, Reversed, Net ITC
- Table 5: Exempt/Nil/Non-GST — Taxable Value, IGST, CGST, SGST, Cess
- Table 6: Payment of Tax — Tax Payable, Paid, Balance (CGST/SGST/IGST/Cess/Interest/Late Fee)
- **FIXED:** Interstate detection uses actual business state from DB

**Admin Dashboard (`ReportsPage.tsx`):** GSTR-3B tab with all 5 tables + ExportButtons
**Android (`ReportsScreen.kt`):** `Gstr3bReportDetail` with `Gstr3bTable`/`PaymentRow` helpers
**iOS (`ReportsView.swift`):** Month/year picker, all 5 tables

### 29. Inventory Management (Dashboard + Stock Movements)

**Backend:**
- `GET /reports/inventory-dashboard` — Summary cards, warehouse breakdown, recent movements, low stock alerts
- `GET /reports/stock-movements` — Date range + product filters, movements, monthly summary
- **FIXED:** P&L now subtracts actual cost from revenue

**Admin Dashboard (`InventoryManagementPage.tsx`):**
- Dashboard tab: 6 cards, warehouse chart, recent movements, low stock
- Stock Movements tab: filters, table, monthly chart
- Categories/Suppliers/Purchase Orders CRUD
- **FIXED:** Uses centralized `reportsApi` methods

**Android:** `InventoryDashboardScreen.kt`, `StockMovementsScreen.kt`, routes wired
**iOS:** `InventoryDashboardView.swift`, `StockMovementsView.swift`, routes wired, **FIXED:** added `SummaryCard` struct

### 30. Code Review Fixes

**Backend:** HSN codes use `product.hsnCode`, interstate detection uses business state, OTP uses `crypto.randomInt()`, OTP logging gated behind dev mode, reverse charge metric corrected, P&L cost deduction added, Prisma types with `as any[]` cast
**Dashboard:** Centralized API methods used
**Verification:** Backend + Dashboard both compile with 0 TS errors

---

## Session Changes (2026-07-12) — Session 4

### 31. Reports Test Fixes

**Fixed 3 failing tests in `reports.service.spec.ts`:**
- `getSalesReport` test: Updated `include` to match code (`items: { include: { product: true } }, customer: true, business: true`)
- `getGstr3b` test: Added missing `business.findUnique` mock
- `getProfitLoss` test: Updated `include` to match code (`items: { include: { product: true } }`)

**Result:** All 106 tests passing ✅

### 32. Local Verification

**Services Running:**
| Service | Port | Status |
|---------|------|--------|
| PostgreSQL | 5432 | ✅ Running |
| NestJS Backend | 3000 | ✅ Running |
| Admin Dashboard | 5173 | ✅ Running |
| Landing Site | 5174 | ✅ Running |

**API Endpoint Tests:**
| Endpoint | Status | Data |
|----------|--------|------|
| `POST /api/v1/auth/login` | ✅ | JWT token issued |
| `GET /reports/gstr-1` | ✅ | B2B=4, B2cSmall=4, HSN=11 |
| `GET /reports/gstr-3b` | ✅ | 5 tables populated |
| `GET /reports/inventory-dashboard` | ✅ | 12 products, flat structure |
| `GET /reports/stock-movements` | ✅ | 12 movements returned |
| `GET /reports/profit-loss` | ✅ | Revenue=₹723,325, Net=₹220,405 |

**TypeScript Compilation:** Backend 0 errors, Dashboard 0 errors

### 33. Critical Bug Fixes

**Fix 1: GST reports filtering on `createdAt` instead of `invoiceDate`**
- All date-filtered reports (GSTR-1, GSTR-3B, Sales, P&L, HSN, Products) now filter on `invoiceDate`
- This was causing empty results when invoice business dates didn't match DB insertion timestamps

**Fix 2: Backend/frontend response structure mismatches**
- **GSTR-1**: Changed `table4_b2b` → `b2b`, `table5_b2cLarge` → `b2cLarge`, `table6_b2cSmall` → `b2cSmall`, `table7_hsn` → `hsnSummary`, `table8_documents` → `documents` (with nested `invoicesIssued`/`creditNotes`)
- **GSTR-3B**: Changed `table3_1/3_2/4/5/6` → `outwardSupplies`, `interStateSupplies`, `eligibleItc`, `exemptNilNonGst`, `paymentOfTax` (array of labeled objects)
- **Inventory Dashboard**: Flattened from nested `summary.lowStockProducts` to flat `totalProducts`, `stockValue`, `retailValue`, `potentialProfit`, `lowStockAlerts`

**Fix 3: Added `direction: 'SALE'` filter to GSTR-1 and GSTR-3B**
- Prevents purchase invoices from polluting outward-supply GST reports

**Fix 4: Updated GSTR-1 items include to `product: true`**
- Required for HSN code resolution from `product.hsnCode`

### 34. Additional Dashboard + Mobile App Fixes

**Fix 5: GSTR-1 B2B field name mismatches (crashed on render)**
- Backend returned `gstin`, `invoiceDate`, `totalTaxableValue`, `totalCgst` but frontend expected `customerGstin`, `date`, `taxableValue`, `cgst`
- Also added `customerName`, `taxAmount`, `grandTotal` fields
- Fixed in backend `reports.service.ts` + Android `ApiService.kt` + iOS `Report.swift`

**Fix 6: Inventory tabs all 404'd (Categories/Suppliers/Purchase Orders)**
- Frontend called `/businesses/{id}/inventory/categories` but backend route was `/businesses/{id}/categories` (extra `/inventory/` prefix)
- Fixed 12 broken API paths in `InventoryManagementPage.tsx`

**Fix 7: Stock Movements monthlySummary mismatch**
- Backend returned `byMonth` with `{ totalIn, totalOut, count }` but frontend expected `monthlySummary` with `{ purchases, sales, transfers, adjustments, returns }`
- Fixed backend to return per-type breakdown in `monthlySummary` format

**Fix 8: GSTR-3B response structure (array vs nested object)**
- Backend now returns `outwardSupplies`, `eligibleItc`, `exemptNilNonGst`, `paymentOfTax` as arrays of labeled objects
- Updated Android (`ReportsScreen.kt` — new composables for labeled tables)
- Updated iOS (`ReportsView.swift` — ForEach over arrays)

**Fix 9: Inventory Dashboard models (Android + iOS)**
- `WarehouseStock`: Changed from `{ warehouseId, warehouseName, productCount, totalValue }` to `{ warehouse, value }`
- `LowStockAlertItem`: Added `productId` default
- `StockMovement`: Added defaults for all fields

**Fix 10: GSTR-1 Documents (nested structure)**
- Backend returns `{ invoicesIssued: { count, totalValue }, creditNotes: { count, totalValue } }`
- Updated Android `Gstr1Documents` model + rendering code
- Updated iOS `Gstr1DocumentSummary` + `ReportsView.swift`

**Fix 11: iOS `hsn` → `hsnSummary` key rename**
- Backend returns `hsnSummary` but iOS model expected `hsn`

---

## What's Still Needed (Requires External Config)

### From You (Credentials/Config Needed):

| Item | Status | What You Need to Provide |
|------|--------|--------------------------|
| **App Icons** | ⏳ Blocked | Image files for launcher icon (Android) + app icon (iOS) |
| **Razorpay Live Keys** | ⏳ Blocked | `rzp_live_...` key ID + secret from Razorpay Dashboard |
| **Razorpay Webhook Secret** | ⏳ Blocked | Set in Razorpay Dashboard → Settings → Webhooks |
| **AWS SNS SMS** | ⏳ Blocked | Set spending limit in SNS console (currently sandbox) |
| **AWS Cognito** | ⏳ Blocked | Cognito User Pool ID, Client ID, Region (if you want Cognito auth) |
| **Custom Domain** | ⏳ Blocked | Domain name + Route53 hosted zone + SSL cert ARN |
| **Play Store Account** | ⏳ Blocked | Google Play Console account ($25 one-time) |
| **Apple Developer Account** | ⏳ Blocked | Apple Developer Program ($99/year) |
| **Sentry DSN** | ⏳ Blocked | From sentry.io project settings |
| **Slack Webhook** | ⏳ Blocked | For deployment notifications (optional) |

### Already Configured (Ready to Use):

| Item | Value | Status |
|------|-------|--------|
| AWS Access Key | `<redacted>` | ✅ Configured |
| AWS Secret Key | `<redacted>` | ✅ Configured |
| AWS Region | `ap-south-1` | ✅ Configured |
| SES Email | `noreply@wise-accounts.com` | ✅ Verified |
| DynamoDB Tables | `wise_sessions`, `wise_cache`, `wise_notifications` | ✅ Created |
| Razorpay Test Key ID | `<redacted>` | ✅ Configured |
| Razorpay Test Secret | `<redacted>` | ✅ Configured |
| JWT Secret | Auto-generated in `.env` | ✅ Configured |
| Database URL | `postgresql://shobhit:postgres@localhost:5432/wise_accounts` | ✅ Configured |

---

## Session Changes (2026-07-13) — Session 5

### 35. Uncommitted Changes Summary

**Status:** Many files modified and new files added since last commit (`43dfc71`).

**Key Changes (Uncommitted):**
- **Backend:** Multiple service improvements, new modules (AWS, recurring invoices, staff permissions)
- **Admin Dashboard:** New pages (Inventory Management, Batch Expiry), UI improvements, dark mode context
- **Android:** New screens (barcode scanning, customer groups, payment reminders, export, thermal printing)
- **iOS:** New views (barcode scanning, customer groups, payment reminders, export, thermal printing)
- **Infrastructure:** Docker configuration, nginx setup, performance documentation

**Note:** These changes represent significant feature additions and improvements that need to be committed.

### 36. Current State Assessment

**Services Status:**
- PostgreSQL: ✅ Running (port 5432)
- Backend: ❌ Not running (port 3000)
- Admin Dashboard: ❌ Not running (port 5173)
- Landing Site: ❌ Not running (port 5174)

**Next Actions Needed:**
1. Start backend services for testing
2. ~~Commit uncommitted changes~~ ✅ DONE (Commit `220b4ad`)
3. ~~Docker local testing setup~~ ✅ DONE
4. Install Docker Desktop and run `docker-compose up --build`

### 37. Docker Local Testing Setup

**Architecture:**
```
http://localhost → nginx → Landing Site (wiseaccounts build)
http://localhost/admin → nginx → Admin Dashboard (admin-dashboard build)
http://localhost/api/* → nginx → backend:3000 (NestJS API)
```

**Files Created/Modified:**
- `Dockerfile.nginx` — Multi-stage build: builds both landing site + admin dashboard, serves via nginx
- `nginx.conf` — Routes `/` to landing, `/admin` to admin dashboard, `/api` to backend
- `docker-compose.yml` — 4 services: postgres, redis, backend, nginx
- `backend/.env.docker` — Docker-specific env with container hostnames
- `backend/src/common/health.controller.ts` — Health endpoint for Docker health check
- `backend/src/app.module.ts` — Registered HealthController
- `.dockerignore` — Excludes node_modules, android, ios, etc.
- `admin-dashboard/vite.config.ts` — Added `base: '/admin/'` for subpath routing
- `admin-dashboard/src/App.tsx` — Added `basename="/admin"` to BrowserRouter
- `wiseaccounts/src/components/landing/Navbar.tsx` — Login button links to `/admin/login`

**Docker Services:**
| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| postgres | wise-accounts-db | 5432 | PostgreSQL database |
| redis | wise-accounts-redis | 6379 | Redis cache |
| backend | wise-accounts-api | 3000 | NestJS API |
| nginx | wise-accounts-nginx | **80** | Landing + Admin + API proxy |

**To Run:**
```powershell
docker-compose up --build
```
Then visit: http://localhost (landing) → Login → http://localhost/admin/login

---

## How to Resume Next Time

### Next Steps (Session 9):
1. **Generate Gradle wrapper** — download gradle-8.5-bin.zip, extract, run `gradle wrapper` in `android/`
2. **Add signing config** to `android/app/build.gradle.kts` (keystore already created)
3. **Update API_BASE_URL** for release builds → `https://wiseaccs.com/api/v1/`
4. **Build Android APK** — `./gradlew assembleRelease`
5. **iOS build** — requires Xcode on macOS (not possible on Windows); user needs to do this on a Mac
3. Request AWS SES production access (remove sandbox)
4. Request AWS SNS SMS spending limit increase

### Live Deployment (AWS EC2):
- **Instance ID:** `i-0b4277d47b7ccdbe2`
- **Public IP:** `34.202.237.230`
- **Region:** us-east-1
- **Instance type:** t3.micro (free tier)
- **Volume:** 30GB gp3
- **OS:** Amazon Linux 2023
- **Docker Compose:** `/usr/libexec/docker/cli-plugins/docker-compose`
- **Production compose file:** `docker-compose.prod.yml` (uses pre-built images from local builds)
- **Images stored in:** S3 bucket `wise-accounts-deploy` (us-east-1)
- **SSH Key:** `deploy-key` (ed25519, no passphrase)
- **EC2 User:** `ec2-user`
- **Docker images on server:** `ghcr.io/shobhit-singh007/wise-accounts-backend:latest`, `ghcr.io/shobhit-singh007/wise-accounts-nginx:latest`

### Live URLs:
| Service | URL |
|---------|-----|
| Landing Site | https://wiseaccs.com |
| About | https://wiseaccs.com/about |
| Contact | https://wiseaccs.com/contact |
| Admin Login | https://wiseaccs.com/admin/login |
| Admin Register | https://wiseaccs.com/admin/register |
| API Health | https://wiseaccs.com/api/v1/health |
| Direct IP | http://34.202.237.230 |

### DNS:
- **Provider:** Cloudflare
- **SSL Mode:** Flexible (Cloudflare handles HTTPS, origin is HTTP)
- **A Records:** @ → 34.202.237.230, www → 34.202.237.230

### Deploying Updates to EC2:
1. Build images locally:
   ```
   docker build -t ghcr.io/shobhit-singh007/wise-accounts-backend:latest ./backend
   docker build -t ghcr.io/shobhit-singh007/wise-accounts-nginx:latest -f Dockerfile.nginx .
   ```
2. Save images:
   ```
   docker save ghcr.io/shobhit-singh007/wise-accounts-backend:latest -o backend-image.tar
   docker save ghcr.io/shobhit-singh007/wise-accounts-nginx:latest -o nginx-image.tar
   ```
3. Upload to S3:
   ```
   aws s3 cp backend-image.tar s3://wise-accounts-deploy/ --profile deploy
   aws s3 cp nginx-image.tar s3://wise-accounts-deploy/ --profile deploy
   ```
4. On EC2 (via EC2 Instance Connect), generate presigned URL and download:
   ```
   cd ~/wise-accounts && aws s3 presign s3://wise-accounts-deploy/backend-image.tar --expires-in 3600
   curl -o backend-image.tar "<presigned-url>"
   sudo docker load -i backend-image.tar
   sudo /usr/libexec/docker/cli-plugins/docker-compose -f docker-compose.prod.yml up -d
   ```

### Local Docker (all-in-one):
```powershell
cd C:\Users\LENOVO\vscodewithclaude
docker-compose up --build
```
- Landing site: http://localhost
- Admin dashboard: http://localhost/admin
- API: http://localhost/api/v1
- Swagger docs: http://localhost/api/docs

### Local Development (without Docker):
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
| Docker (all-in-one) | `docker-compose up --build -d` |
| Docker status | `docker-compose ps` |
| Docker logs (backend) | `docker logs wise-accounts-api` |
| Docker down | `docker-compose down` |
| Build backend | `cd backend && npm run build` |
| Build admin dashboard | `cd admin-dashboard && npx vite build` |
| Run backend tests | `cd backend && npx jest` |
| Prisma generate | `cd backend && npx prisma generate` |
| Prisma migrate | `cd backend && npx prisma migrate dev --name <name>` |
| TypeScript check (backend) | `cd backend && npx tsc --noEmit` |
| TypeScript check (dashboard) | `cd admin-dashboard && npx tsc --noEmit` |
| Git push | `git push origin master` |

---

## Session 6 - Docker Setup & Debugging (2026-07-13)

### What Was Done
1. **Docker setup complete**: 4-service stack with docker-compose (postgres, redis, backend, nginx)
2. **Landing site** accessible at `http://localhost`
3. **Admin dashboard** accessible at `http://localhost/admin`
4. **Backend API** accessible at `http://localhost/api/v1`
5. **Health endpoint** at `/api/v1/health` returns 200

### Critical Bug Found & Fixed
**CloudWatchLogger infinite recursion** — `src/common/cloudwatch.logger.ts` used `new Logger('CloudWatch')` internally. When NestJS set CloudWatchLogger as global logger, `Logger.log()` routed back to `CloudWatchLogger.log()`, creating infinite recursion → stack overflow → process.abort() (exit code 139/SIGSEGV). Fixed by using `console.log/error/warn` directly instead of `Logger`.

### Files Changed
- `backend/src/common/cloudwatch.logger.ts` — Fixed infinite recursion (use console directly, not Logger)
- `backend/Dockerfile` — Multi-stage build (builder + runner, both node:22-alpine)
- `backend/.env.docker` — Docker networking env vars
- `backend/src/common/health.controller.ts` — Public health endpoint
- `backend/src/app.module.ts` — Registered HealthController
- `backend/src/main.ts` — Reverted debug change (removed abortOnError: false)
- `docker-compose.yml` — 4 services, removed deprecated `version` attribute
- `Dockerfile.nginx` — Multi-stage build for landing site + admin dashboard
- `nginx.conf` — Routes: / → landing, /admin → dashboard, /api/ → backend
- `.dockerignore` — Excludes node_modules, android, ios, etc.
- `admin-dashboard/vite.config.ts` — Added `base: '/admin/'`
- `admin-dashboard/src/App.tsx` — BrowserRouter with `basename="/admin"`
- `wiseaccounts/src/components/landing/Navbar.tsx` — Login → /admin/login

### Session 6 Continued — Branding, UX Fixes & Registration Flow

**Bug Fixes:**
- Fixed **blank page on invalid login** — axios 401 interceptor in `admin-dashboard/src/api/client.ts` was doing `window.location.href = '/login'` for failed login attempts; added skip for auth endpoints (`/auth/login`, `/auth/register`, etc.)
- Fixed **"Create one here" button** on LoginPage — was external link to wiseaccounts.com, now navigates to `/register`
- Fixed **"Back to Website" buttons** on LoginPage and RegisterPage — now go to `http://localhost/` (local landing site)
- Fixed **DashboardPage blank state** — new users with no businesses now see onboarding screen ("Welcome to Wise Accounts" + "Create Your First Business" button)

**Registration Flow:**
- Created `admin-dashboard/src/pages/RegisterPage.tsx` — full registration form (Name, Phone, Password, Confirm Password) with API call to `POST /auth/register`
- Added `/register` route in `admin-dashboard/src/App.tsx` (wrapped in `PublicRoute`)

**Branding Updates (wiseaccs.com):**
- Updated domain references from `wiseaccounts.com` → `wiseaccs.com` across 11 files (backend customer.service.ts, send-ledger-sms.dto.ts, billing.service.ts, notifications.service.ts, Layout.tsx, LoginPage.tsx, RegisterPage.tsx, ContactPage.tsx, Footer.tsx, ios Constants.swift)
- Updated `backend/.env.docker`: `SES_FROM_EMAIL="noreply@wiseaccs.com"`

**Contact & Team Updates:**
- Updated phone number to `+91 9971587302` in ContactPage.tsx and Footer.tsx
- Updated CEO/Founder to "Shobhit Singh" in AboutPage.tsx (was "Rahul Sharma")
- Created `TeamMemberCard` component with photo fallback to initials
- Prepared photo slot at `/shobhit-singh.jpg` (user needs to add image file)

**Cleanup:**
- Removed debug files (`backend_debug*.txt`, `build_log*.txt`, `debug-start.js`, `debug-entry.js`, `.env.debug`, etc.)
- Removed deprecated `version: "3.8"` from `docker-compose.yml`

**Files Changed (Session 6 continued):**
- `admin-dashboard/src/api/client.ts` — Skip 401 interceptor for auth endpoints
- `admin-dashboard/src/pages/LoginPage.tsx` — Fixed links, domain updated
- `admin-dashboard/src/pages/RegisterPage.tsx` — NEW registration page
- `admin-dashboard/src/pages/DashboardPage.tsx` — Onboarding screen for new users
- `admin-dashboard/src/components/Layout.tsx` — Domain updated
- `wiseaccounts/src/pages/AboutPage.tsx` — CEO updated to Shobhit Singh, TeamMemberCard component
- `wiseaccounts/src/pages/ContactPage.tsx` — Phone updated to +919971587302
- `wiseaccounts/src/components/landing/Footer.tsx` — Phone updated to +919971587302
- `backend/src/customer/customer.service.ts` — Domain updated
- `backend/src/billing/billing.service.ts` — Domain updated
- `backend/src/notifications/notifications.service.ts` — Domain updated

---

## Session 8 - Android/iOS Build Prep (2026-07-13)

### What Was Done
1. **Verified installed tools:** Android Studio at `C:\Program Files\Android\Android Studio`, JDK 21 (JBR), Android SDK at `%LOCALAPPDATA%\Android\Sdk` (platforms: android-30, android-34; build-tools: 34.0.0)
2. **Created signing keystore:** `android/app/wise_accounts.keystore`
   - Alias: `wise_accounts_key`
   - Password: `wiseaccounts123`
   - Validity: 10,000 days
3. **Identified blockers:**
   - Gradle wrapper missing (`gradle/wrapper/` directory is empty)
   - No `signingConfigs` block in `app/build.gradle.kts`
   - `API_BASE_URL` hardcoded to `http://10.0.2.2:3000/api/v1/`
   - iOS has no `.xcodeproj` — cannot build on Windows

### iOS Status
- **Cannot build on Windows** — needs Xcode on macOS
- Source code is complete (70+ Swift files), but no Xcode project file exists
- Config.xcconfig has all placeholder values (Team ID, API URL, Razorpay key)
- User needs to create Xcode project on a Mac and configure signing

### Files Changed
- `android/app/wise_accounts.keystore` — NEW signing keystore

### What's Left for Next Session
1. Generate Gradle wrapper (download gradle-8.5-bin.zip, extract, run `gradle wrapper`)
2. Add `signingConfigs` block to `app/build.gradle.kts`
3. Update `API_BASE_URL` for release builds
4. Build Android APK with `./gradlew assembleRelease`
5. iOS requires macOS with Xcode

---

## Session 9 - Android Build, Staff Invite Fix, Landing Site Plans (2026-07-14)

### 38. Android APK Build Prep & Release Build

**Gradle Wrapper:** Already exists (gradle-wrapper.jar + gradlew.bat + gradlew + properties)
**Signing Keystore:** Already exists at `android/app/wise_accounts.keystore`
**API_BASE_URL:** Already configured (release: `https://wiseaccs.com/api/v1/`, debug: `http://10.0.2.2:3000/api/v1/`)

**Build Issue:** Gradle daemon picked up JRE 1.8 instead of JDK 21
- Fix: Set `JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"` before building
- Build command: `$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"; .\gradlew.bat assembleRelease --no-daemon`

**APKs Generated:**
| APK | Size |
|-----|------|
| app-arm64-v8a-release.apk | 11.22 MB |
| app-armeabi-v7a-release.apk | 9.60 MB |
| app-universal-release.apk | 25.98 MB |
| app-x86_64-release.apk | 12.16 MB |

### 39. Android Crash Fixes (Multiple Iterations)

**Crash 1: App crashes on login screen (ProGuard/R8 stripping)**
- Root cause: R8 stripped Hilt-generated classes (`_Factory`, `_MembersInjector`, `Hilt_GSTBillingApp`)
- Fix: Added comprehensive ProGuard keep rules for Hilt, Room, Gson, Retrofit, Compose, etc.

**Crash 2: Compose BOM version mismatch**
- Root cause: Compose BOM `2024.02.00` (runtime 1.6.x) incompatible with Kotlin 2.1.0 Compose compiler (requires 1.7+)
- Fix: Updated BOM from `2024.02.00` → `2024.12.01`
- Also removed explicit Material 2 dependency and forced `core:1.12.0` resolution

**Crash 3: `Class cannot be cast to ParameterizedType` on Sign In**
- Root cause: R8 stripping generic `Signature` attribute from Retrofit interface methods and Gson TypeToken
- Fix: Removed `allowshrinking` from Retrofit interface rule and TypeToken rules in proguard-rules.pro
- Key rule change: `-keepclassmembers,allowobfuscation interface *` (removed `allowshrinking`)

**Files Changed:**
- `android/app/build.gradle.kts` — Compose BOM `2024.12.01`, removed Material 2, removed forced core versions
- `android/app/proguard-rules.pro` — Comprehensive rules for Hilt, Gson, Retrofit, Room, Compose, etc.
- `android/gradle.properties` — JVM args `Xmx2048m`

**Status:** APK rebuilt with all fixes. User needs to test. If still crashing, next step is to disable R8 minification entirely (`isMinifyEnabled = false`).

### 40. Staff Invite SMS/Email Fix (Backend)

**Problem:** `StaffService.invite()` created a database record but never sent SMS or email to the invitee.

**Root Cause:** `StaffModule` didn't import `NotificationsModule`, `StaffService` didn't inject `NotificationsService`.

**Fix:**
- `backend/src/notifications/notifications.service.ts` — Added `sendStaffInviteSms()` and `sendStaffInviteEmail()` public methods
- `backend/src/staff/staff.module.ts` — Added `NotificationsModule` to imports
- `backend/src/staff/staff.service.ts` — Injected `NotificationsService` + `ConfigService`, added Logger, sends SMS (always) + email (if provided) after invite creation
- Uses existing AWS SNS (SMS) and AWS SES (Email) infrastructure
- SMS body: "You've been invited to join {businessName} on Wise Accounts! Accept here: {link}"
- Email body: Full invitation with business name, inviter name, and 7-day expiry

**Invite Flow Now:** Admin invites → record created → SMS sent → email sent (if email provided) → link shown on screen as backup

### 41. Landing Site Plans + Razorpay Checkout

**Problem:** All pricing plan buttons had no onClick handlers — completely inert.

**Fix — Landing Site:**
- `wiseaccounts/src/components/landing/PricingSection.tsx` — Full Razorpay checkout:
  - Free plan → navigates to `/admin/register`
  - Business plan → opens Razorpay payment dialog → pay ₹499 → redirect to `/admin/register?plan=business&payment=success`
  - Enterprise → navigates to `/contact`
- `wiseaccounts/src/components/landing/HeroSection.tsx` — "Create Free Account" → `/admin/register`, "Watch Demo" → `/features`
- `wiseaccounts/index.html` — Added Razorpay checkout script

**Fix — Backend (New Subscription Module):**
- `backend/src/subscriptions/subscriptions.service.ts` — `createOrder()` creates Razorpay order for ₹499, `verifyPayment()` verifies HMAC signature
- `backend/src/subscriptions/subscriptions.controller.ts` — `POST /subscriptions/create-order` + `POST /subscriptions/verify`
- `backend/src/subscriptions/subscriptions.module.ts` — Module wiring
- `backend/src/app.module.ts` — Registered `SubscriptionsModule`

**Subscription Endpoints:**
| Endpoint | Purpose |
|----------|---------|
| `POST /subscriptions/create-order` | Creates Razorpay order for plan |
| `POST /subscriptions/verify` | Verifies payment signature |

**TypeScript Compilation:** Backend 0 errors, Landing site 0 errors

### 42. Deployment Notes

**Current Deployment:**
- EC2 instance: `i-0b4277d47b7ccdbe2` (34.202.237.230)
- Docker images: `ghcr.io/shobhit-singh007/wise-accounts-backend:latest`, `ghcr.io/shobhit-singh007/wise-accounts-nginx:latest`
- S3 bucket: `wise-accounts-deploy` (us-east-1)

**To Deploy Updates:**
1. Build backend image: `docker build -t ghcr.io/shobhit-singh007/wise-accounts-backend:latest ./backend`
2. Build nginx image: `docker build -t ghcr.io/shobhit-singh007/wise-accounts-nginx:latest -f Dockerfile.nginx .`
3. Save images: `docker save ... -o backend-image.tar` / `docker save ... -o nginx-image.tar`
4. Upload to S3, download on EC2, restart containers

**Landing site changes need nginx rebuild** (Dockerfile.nginx builds both landing + admin dashboard)

---

## What's Still Needed

### Android App:
- [ ] User to test latest APK (with all ProGuard fixes)
- [ ] If still crashing → disable R8 (`isMinifyEnabled = false`) as fallback
- [ ] App icons (image files needed)

### Deployment:
- [ ] Rebuild Docker images with new backend changes (staff invite SMS/email, subscriptions module)
- [ ] Rebuild nginx image with updated landing site (plans + Razorpay)
- [ ] Deploy to EC2

### External Config:
- [ ] AWS SES production access (remove sandbox)
- [ ] AWS SNS SMS spending limit increase
- [ ] Razorpay live keys (currently using test keys)
- [ ] App Store / Play Store accounts

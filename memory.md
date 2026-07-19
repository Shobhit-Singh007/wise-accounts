# Project Memory — Wise Accounts / GST Billing

## Overview
Full-stack GST billing SaaS: NestJS backend, React admin dashboard, Android & iOS mobile apps.

## Infrastructure
- **EC2**: `i-0b4277d47b7ccdbe2` in `us-east-1` (NOT ap-south-1), IP `54.224.106.63`
- **S3**: `wise-accounts-deploy` in `us-east-1`
- **EC2 path**: `/home/ec2-user/wise-accounts/` (NOT /root/)
- **Domain**: `wiseaccs.com` (production URL for Android/iOS)
- **Docker compose service name**: `backend` (NOT `api` — `docker compose ps` shows `wise-accounts-api` as container name but compose service is `backend`)
- **Docker**: `ghcr.io/shobhit-singh007/wise-accounts-backend:latest`, `ghcr.io/shobhit-singh007/wise-accounts-nginx:latest`
- **Dockerfile.nginx**: Uses `npm install --prefer-offline` (NOT npm ci)
- **GHCR push denied** — always use S3 upload + SSM method for deployment

## Dev Environment Gotchas
- **PowerShell 5.1**: `Out-File -Encoding utf8NoBOM` doesn't work; use `[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))` for BOM-free UTF8
- **AWS CLI --parameters**: Can't pass JSON arrays directly in PowerShell; write to file and use `file://path`
- **AWS CLI profile**: Don't use `--profile wise-accounts` — it may not exist. Use default credentials.
- **Android build**: JDK 21 at `C:\Users\LENOVO\.jdks\jdk-21.0.11+10`, Gradle 8.9, AGP 8.7.3, Kotlin 2.1.0, compileSdk 35. Must set `JAVA_HOME`. Use `.\scripts\build-android.ps1`.
- **APK path**: `android\app\build\outputs\apk\release\app-release.apk` (latest build: ~45.5 MB)
- **Build script gotcha**: Don't use `$ErrorActionPreference = "Stop"` — `java -version` writes to stderr, killing the script. Use explicit `$LASTEXITCODE` checks instead.
- **iOS build**: Cannot build on Windows — requires macOS + Xcode
- **Node versions**: Local npm 11.18, Docker npm 10.9.8

## Deployment Gotchas (LESSONS LEARNED)
- **Prisma migration MUST run after deploy**: `docker compose exec -T backend npx prisma migrate deploy` — deploy script now includes this step automatically. Without it, new schema columns (e.g. `Invoice.documentType`) cause runtime errors.
- **Docker compose service name is `backend`**, not `api`. Use: `docker compose exec -T backend ...`
- **SSM encoding**: BOM in JSON files causes "Invalid JSON" errors in SSM. Always write with `[System.IO.File]::WriteAllText(..., [System.Text.UTF8Encoding]::new($false))`.

## Completed Features

### Document Templates (7 types)
- Backend: `DocumentType` enum in Prisma schema, migration `20260718044009_add_document_type`
- Backend: PDF/HTML generation supports `documentType` query param (INVOICE, QUOTATION, PROFORMA, DELIVERY_CHALLAN, JOBWORK, CREDIT_NOTE, LETTERHEAD)
- Admin Dashboard: Document type selector in InvoiceDetailDialog, wired to print/download APIs
- Android: Document type dropdown in InvoiceDetailScreen, InvoicePreviewScreen accepts documentType param
- iOS: Document type picker in InvoiceDetailView, wired to print URL and PDF download

### Selective Import/Export
- Backend: `exportSuppliers()`, `exportPayments()` in ExportService
- Backend: `GET /export/selective?entities=...` endpoint
- Backend: ImportModule registered in AppModule
- Admin Dashboard: Import/Export tab in SettingsPage (tab index 5) with entity checkboxes
- Android: ExportDataScreen updated with suppliers + payments export
- iOS: ExportDataView updated with suppliers + payments, real API calls

### GSTIN Auto-fill / Lookup (All 3 platforms)
- Backend: `GET /businesses/:businessId/customers/gstin/:gstin` endpoint — external API (appyflow.in) + state code decode from GSTIN prefix
- **Customer screen**: Search button on GSTIN field in CustomersPage/AddCustomerScreen/AddCustomerView, auto-fills name/address/city/state/pincode
- **Business Profile**: Search icon button on GSTIN field in SettingsPage/BusinessProfileScreen/BusinessProfileView — auto-fills business name/address/city/state on all platforms
- **Quick Add Customer during Invoice**: All platforms can create a new customer on-the-fly from the invoice creation screen, with full GSTIN lookup support. Admin dashboard: CreateInvoiceDialog fields. Android: ModalBottomSheet in CreateInvoiceScreen. iOS: .sheet in CreateInvoiceView with lookup + save.

### Auto-create Products on Invoice Save
- Backend `billing.service.ts`: Modified `createInvoice()` to find-or-create products by name when `productId` is missing on line items

### Rate-Total Sync (All 3 platforms)
- Admin Dashboard: Amount column in CreateInvoiceDialog is editable; typing amount back-calculates rate
- Android: Amount field in LineItemCard is editable; `onAmountChanged()` back-calculates rate
- iOS: Total field in InvoiceItemRow is editable; `InvoiceItemInput.updateFromAmount()` back-calculates rate

### Multi-format Export (CSV, JSON, XLSX, PDF)
- Admin dashboard: `exportUtils.ts` (XSS protection, CSV injection prevention, concurrency-limited fetchAllPages)
- Admin dashboard: `ExportMenu.tsx` (dropdown, AbortController, race-condition guards)
- Android: `ExportDataScreen.kt` + `ExportUtils.kt`
- iOS: `ExportDataView.swift` + `ExportFormatter.swift`
- Backend: `GET /export/{customers,products,invoices,suppliers,payments}?format=csv|json`

### XLSX Import Support
- Backend: `xlsx` (sheetjs) package installed, `parseCsv()` handles `.xlsx`/`.xls` files via `XLSX.read()` + `sheet_to_json()`
- Controller file filter already accepted xlsx — now the parser actually handles binary format

### Business Settings Endpoints
- Backend: `BusinessSettingsController` at `businesses/:businessId/settings/*`
- `GET/PUT /settings/tax` — stores in `Business.settings` JSON field under `tax` key
- `GET/PUT /settings/notifications` — stores under `notifications` key
- `GET/PUT /settings/api-credentials` — stores under `apiCredentials` key
- Registered in `BusinessModule`

### Branding (Logo/Icon)
- Android LoginScreen, RegisterScreen, SettingsScreen — splash_logo.png
- iOS LoginView — splash_logo asset

## Key Files
| File | Purpose |
|------|---------|
| `admin-dashboard/src/utils/exportUtils.ts` | Export utilities |
| `admin-dashboard/src/components/ExportMenu.tsx` | Shared export dropdown |
| `admin-dashboard/src/pages/SettingsPage.tsx` | Settings page (invoice/tax/notif tabs) |
| `admin-dashboard/src/pages/CustomersPage.tsx` | Customer list + GSTIN lookup |
| `admin-dashboard/src/pages/InvoicesPage.tsx` | Invoice CRUD + rate-total sync + quick add customer |
| `backend/src/export/` | Backend export API |
| `backend/src/import/` | Backend import API (CSV + XLSX) |
| `backend/src/customer/customer.controller.ts` | GSTIN lookup endpoint |
| `backend/src/billing/billing.service.ts` | Auto-create products on invoice save |
| `backend/src/business/business-settings.controller.ts` | Tax/notification/API cred settings |
| `android/.../CreateInvoiceScreen.kt` | Invoice creation + rate-total sync |
| `android/.../AddCustomerScreen.kt` | Customer creation + GSTIN lookup |
| `android/.../ExportDataScreen.kt` | Export with all entities |
| `ios/.../CreateInvoiceView.swift` | Invoice creation + rate-total sync |
| `ios/.../AddCustomerView.swift` | Customer creation + GSTIN lookup |
| `ios/.../APIService.swift` | API client (lookupGstin, selectiveExport) |
| `scripts/deploy-ec2.ps1` | Automated EC2 deploy (build + S3 + SSM + migrate) |
| `Dockerfile.nginx` | Admin dashboard + nginx build |

## Test Suite

### Backend (NestJS + Jest — 30 suites, 324 tests)
- Run: `cd backend && npm test`
- Coverage: `cd backend && npm run test:cov`
- All services, controllers, and modules have spec files
- E2E: `cd backend && npm run test:e2e`

### Admin Dashboard (React + Vitest — 8 suites, ~110 tests)
- Run: `cd admin-dashboard && npx vitest run`
- Watch: `cd admin-dashboard && npx vitest`
- Covers: exportUtils, ExportMenu, SettingsPage, CreateInvoiceDialog, LoginPage, DashboardPage, AuthContext, API client

### Android (JUnit 4 — 2 suites)
- `ApiServiceTest.kt` — API interface annotation validation
- `ExportUtilsTest.kt` — CSV/JSON export formatting

### iOS (XCTest — 2 suites)
- `ExportFormatterTests.swift` — CSV/JSON formatting
- `CustomerTests.swift` — Model decoding/equality/hashing

### Test Files Created (recent additions)
| File | What it tests |
|------|---------------|
| `backend/src/common/health.controller.spec.ts` | Health check endpoint |
| `backend/src/common/guards/jwt-auth.guard.spec.ts` | JWT auth guard (public routes, handleRequest) |
| `backend/src/common/guards/roles.guard.spec.ts` | Roles guard (required roles, ForbiddenException) |
| `backend/src/subscriptions/subscriptions.service.spec.ts` | Razorpay order creation & payment verification |
| `backend/src/subscriptions/subscriptions.controller.spec.ts` | Subscription endpoints (create-order, verify) |
| `backend/src/aws/dynamo-db.service.spec.ts` | DynamoDB session/cache/notification operations |
| `admin-dashboard/src/__tests__/LoginPage.test.tsx` | Login form validation, API call, navigation |
| `admin-dashboard/src/__tests__/DashboardPage.test.tsx` | Dashboard stat cards, loading, error states |
| `admin-dashboard/src/__tests__/AuthContext.test.tsx` | Auth context (login, register, logout, token mgmt) |
| `admin-dashboard/src/__tests__/api.client.test.ts` | API client response unwrapping & 401 refresh |

## Bug Fixes
- **2026-07-19**: Dashboard crash on API error — `String.format("%.0f", ...)` with `?: 0` (Int) instead of `?: 0.0` (Double) caused `IllegalFormatConversionException` when `dashboardData` was null. Added error state UI with Retry button. See `DashboardScreen.kt:129,158`.
- **2026-07-19**: GSTIN lookup always returned blank — Backend returns flat `{gstin, name, ...}` JSON but Android expected `ApiResponse<T>` wrapper (`response.body()?.data` was always null). Fixed `ApiService.lookupGstin` return type + 3 ViewModels. See `ApiService.kt:475`, `AddCustomerScreen.kt`, `SubSettingsViewModel.kt`, `CreateInvoiceScreen.kt`.
- **2026-07-19**: XLSX import from GoGST showed blank fields — Android file picker only accepted `text/*` (no XLSX MIME). XLSX binary read as garbled text. Added Apache POI based XLSX parser + updated file picker. See `DataImportScreen.kt`.
- **2026-07-19**: Added 15 new fields for GoGST import compatibility across all layers:
  - **Prisma**: `Invoice.{customerAddress,customerPhone,customerState,placeOfSupply,reverseCharge,poNo,poDate,challanNo,challanDate,lrNo,paymentType,paymentNote,cessTotal,totalInWords}` + `InvoiceItem.{productNote,cgstRate,sgstRate,igstRate,cessRate,cessAmount,serialNo}`
  - **Backend import**: Rewrote `normalizeInvoiceRecord` with fuzzy column matching + `groupGoGSTRecords()` to handle GoGST merged format (invoice rows + line item rows with "--------" separators). Auto-creates customers/products by GSTIN/name.
  - **Android**: Updated `Invoice` API model, `InvoiceEntity` Room entity, `InvoiceRepository.toEntity/toApiModel`, and import screen target fields.
  - **iOS**: Updated `Invoice` + `InvoiceItem` models.
  - **Admin dashboard**: Updated `Invoice`/`InvoiceItem` types, `CreateInvoiceRequest`, `CreateInvoiceDialog` (added PO/Challan/LR/PlaceOfSupply/PaymentType fields), and `InvoiceDetailDialog` (displays new fields).
  - Migration: `20260719004005_add_gogst_import_fields`
  See: `schema.prisma`, `import.service.ts`, `import.dto.ts`, `ApiService.kt`, `InvoiceEntity.kt`, `InvoiceRepository.kt`, `DataImportScreen.kt`, `Invoice.swift`, `invoices.ts`, `InvoicesPage.tsx`.

- **2026-07-19**: Import field name mismatch — Android sent `{data,...}` but backend expected `{records}`. Admin dashboard sent `{customers/products/invoices}` instead of `{records}`. Fixed both. See `ImportApi.kt`, `import.ts`.
- **2026-07-19**: Added `totalQuantity` field + expanded import/export column mappings. Prisma migration `add_total_quantity`, Room migration 3→4. Added `Total Quantity`, `Taxable Value`, `Total Tax`, `Transporter ID`, `ACK Date`, `IRN Date`, `EWay Bill Date`, `Distance Km` to import mapping targets. Updated export service with all new fields.
- **2026-07-19**: Fixed backend import service — was not saving `ewayBillNo`, `ewayBillDate`, `transporterName`, `vehicleNo`, `irn`, `irnDate`, `ackNo`, `ackDate`, `paymentNote`, `notes` during import. Also fixed `notes` being set to `totalInWords` value instead of actual notes.
- **2026-07-19**: Added direct file upload import endpoints (`/import/invoices/upload`, `/import/products/upload`) that bypass column mapping for GoGST XLSX files. Backend handles grouping, normalization, and cross-table creation. Admin dashboard auto-detects XLSX files and uses direct upload. Added `normalizeKey()` regex improvement for `%`, `/`, `.`, `?` chars. Added `barcode`, `stock`, `isService`, `lowStockThreshold` to `normalizeProductRecord`.
- **2026-07-19**: Admin dashboard import only imported 10 rows — Backend `parseCsv()` sliced `rows` to first 10. Frontend used this as the full dataset. Removed `.slice(0, 10)` from both grouped and non-grouped paths. See `import.service.ts:694-703`.
- **2026-07-19**: Android import failed with 500 — Express default JSON body parser limit (100kb) exceeded by large import payloads. Increased limit to 10mb via `app.useBodyParser('json', { limit: '10mb' })`. Also fixed `ImportResult` model mismatch: Android expected `errors: List<ImportError>` (objects) but backend returns `errors: string[]`. Changed to `List<String>` and updated error display. See `main.ts`, `ImportApi.kt`, `DataImportScreen.kt`.

## Deployment Commands
```powershell
# Full deploy (build + S3 + SSM + prisma migrate)
.\scripts\deploy-ec2.ps1

# Manual prisma migrate on EC2
# Write SSM params file:
[System.IO.File]::WriteAllText("tmp_ssm.json", '{"commands":["cd /home/ec2-user/wise-accounts && docker compose exec -T backend npx prisma migrate deploy"]}', [System.Text.UTF8Encoding]::new($false))
aws ssm send-command --instance-id i-0b4277d47b7ccdbe2 --document-name "AWS-RunShellScript" --parameters "file://tmp_ssm.json" --region us-east-1
```

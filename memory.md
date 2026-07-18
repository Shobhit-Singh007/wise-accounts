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

### GSTIN Auto-fill (All 3 platforms)
- Backend: `GET /businesses/:businessId/customers/gstin/:gstin` endpoint — external API (appyflow.in) + state code decode from GSTIN prefix
- Admin Dashboard: Search button on GSTIN field in CustomersPage, auto-fills name/address/city/state/pincode
- Android: Search icon button in AddCustomerScreen, `lookupGstin()` API call via Hilt-injected ApiService
- iOS: Search button in AddCustomerView, `lookupGstin()` API call, `GSTINLookupResult` model

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
| `admin-dashboard/src/pages/InvoicesPage.tsx` | Invoice CRUD + rate-total sync |
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

## Deployment Commands
```powershell
# Full deploy (build + S3 + SSM + prisma migrate)
.\scripts\deploy-ec2.ps1

# Manual prisma migrate on EC2
# Write SSM params file:
[System.IO.File]::WriteAllText("tmp_ssm.json", '{"commands":["cd /home/ec2-user/wise-accounts && docker compose exec -T backend npx prisma migrate deploy"]}', [System.Text.UTF8Encoding]::new($false))
aws ssm send-command --instance-id i-0b4277d47b7ccdbe2 --document-name "AWS-RunShellScript" --parameters "file://tmp_ssm.json" --region us-east-1
```

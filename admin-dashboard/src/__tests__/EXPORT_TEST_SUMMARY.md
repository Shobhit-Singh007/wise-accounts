# Export Integration Test Summary

**Date:** 2026-07-18  
**Test suite:** `src/__tests__/export.integration.test.tsx`  
**Total tests:** 23 integration tests  
**Status:** All passing

## What Was Tested

### 1. Full CSV Export Flow (3 tests)
- Generates CSV blob from customer-like data with correct filename
- Verifies CSV blob has correct MIME type (`text/csv;charset=utf-8;`)
- Handles special characters (commas, quotes, newlines) without error

### 2. Full XLSX Export Flow (1 test)
- Generates XLSX workbook via `xlsx` library without throwing errors
- Verifies `aoa_to_sheet`, `book_new`, `book_append_sheet`, and `writeFile` are called

### 3. Full JSON Export Flow (2 tests)
- Generates JSON blob with correct MIME type and filename
- Verifies `jsonData` param is used when provided directly

### 4. Multi-Page Fetch Integration (3 tests)
- `fetchAllPages` combines 3 pages (total=1500, PAGE_SIZE=500) into a single array
- Makes only 1 API call when `total <= PAGE_SIZE`
- Handles empty data gracefully

### 5. Error Handling Integration (2 tests)
- Propagates API errors from page 1 (immediate failure)
- Propagates API errors from page 2 (mid-fetch failure with `Promise.all`)

### 6. ExportMenu Integration (6 tests)
- Renders Export button and opens format menu with all 4 formats (CSV, JSON, XLSX, PDF)
- Exports CSV successfully with snackbar confirmation
- Calls `fetchAll` when provided and uses returned rows
- Disables button while loading and re-enables after completion
- Fetches data from mocked API (`customersApi.list`) before exporting
- Shows error snackbar when `fetchAll` fails

### 7. exportData Dispatch Integration (3 tests)
- Dispatches CSV format to `exportToCsv`
- Dispatches JSON format to `exportToJson`
- Dispatches PDF format to `exportToPdf` (opens window with HTML)

### 8. Cross-Platform Export Logic Analysis (3 tests)
- Documents Android `ExportDataScreen` export column sets (Customers: 10, Products: 8, Invoices: 8)
- Documents iOS `ExportDataView` export column sets (Customers: 10, Products: 7, Invoices: 8)
- Notes column differences between web (11 cols), Android (10 cols), and iOS (10 cols)

## Test Coverage Areas

| Area | Coverage | Notes |
|------|----------|-------|
| `exportToCsv` | Full | BOM, escaping, MIME type, special chars |
| `exportToXlsx` | Smoke | Cannot fully test file generation in Node (xlsx uses fs) |
| `exportToJson` | Full | MIME type, jsonData passthrough, filename |
| `exportToPdf` | Via dispatch | Window.open mocked, HTML content verified |
| `fetchAllPages` | Full | Single/multi-page, empty data, error propagation |
| `ExportMenu` component | Full | Render, menu, callbacks, loading, error, API integration |
| `exportData` router | Full | All 4 format dispatches verified |

## Gaps Identified

### Not Tested (by design or limitation)
1. **XLSX content verification** — `xlsx.writeFile` writes to filesystem in Node; only smoke-tested for no-throw
2. **PDF HTML content** — Tested via `exportData` dispatch, but not via `ExportMenu` (window.open mocking in React context is fragile)
3. **File download mechanics** — `URL.createObjectURL` and `<a>` click are mocked; actual download is not verified
4. **Concurrent export prevention** — Button disabled state tested, but race conditions with rapid clicks are not covered
5. **Large dataset handling** — Multi-page test uses 3 pages of 500; real-world datasets of 10k+ rows are not tested
6. **Authentication token handling** — `Authorization` header injection in `client.ts` interceptors is not tested in integration tests

### Android/iOS Platform Gaps
- Cannot run Kotlin/Swift tests in this JS test environment
- Column differences between platforms are documented but not asserted for parity
- Android uses `buildCsv()` with `StringBuilder`; iOS uses string concatenation — both share the same CSV escaping logic but implementations differ

## Recommendations for Additional Testing

1. **E2E test with Playwright/Cypress** — Verify actual file download in a real browser
2. **XLSX content test** — Use `xlsx.readFile` on a temp file to verify sheet contents
3. **Network error simulation** — Test with MSW (Mock Service Worker) for realistic API mocking
4. **Memory pressure test** — Fetching 100k rows through `fetchAllPages` to verify no memory leaks
5. **Export format switching** — Rapidly switch between CSV/JSON/XLSX/PDF to test state management
6. **Android/iOS unit tests** — Use JUnit (Android) and XCTest (iOS) for native platform export logic

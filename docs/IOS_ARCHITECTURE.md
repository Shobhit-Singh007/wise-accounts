# iOS Architecture — Wise Accounts

> Architecture documentation for the native iOS application.

---

## Architecture Pattern: MVVM + async/await

```
┌──────────────────────────────────────────────────────┐
│                    View Layer                         │
│  ┌────────────────────────────────────────────────┐  │
│  │              SwiftUI Views                     │  │
│  │   LoginView │ DashboardView │ InvoiceListView  │  │
│  └─────────────────────┬──────────────────────────┘  │
│                        │ @ObservedObject             │
│  ┌─────────────────────┴──────────────────────────┐  │
│  │          ViewModel (@MainActor)                 │  │
│  │   AuthVM │ DashboardVM │ InvoiceVM │ etc.      │  │
│  └─────────────────────┬──────────────────────────┘  │
│                        │ async/await                  │
├────────────────────────┼─────────────────────────────┤
│                 Service Layer                         │
│  ┌─────────────────────┴──────────────────────────┐  │
│  │            APIService (URLSession)              │  │
│  │   Auth │ Business │ Customer │ Invoice │ etc.   │  │
│  └────────────────────────────────────────────────┘  │
│  ┌─────────────────────┐  ┌───────────────────────┐  │
│  │    AuthManager      │  │    SyncService        │  │
│  │ (Token management)  │  │ (Background sync)     │  │
│  └─────────────────────┘  └───────────────────────┘  │
│  ┌─────────────────────┐  ┌───────────────────────┐  │
│  │   LocalStorage      │  │   KeychainHelper      │  │
│  │ (JSON file cache)   │  │ (Secure token store)  │  │
│  └─────────────────────┘  └───────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## Project Structure

```
ios/GSTBilling/
├── App/
│   ├── GSTBillingApp.swift       # @main App entry point
│   └── ContentView.swift         # Auth gate (login vs navigation)
│
├── Models/
│   ├── User.swift                # User, AuthResponse, LoginRequest
│   ├── Business.swift            # Business, Warehouse, DashboardData
│   ├── Customer.swift            # Customer, CustomerLedger, Transaction
│   ├── Product.swift             # Product, Category, Supplier, StockBatch
│   ├── Invoice.swift             # Invoice, InvoiceItem, CreateInvoiceRequest
│   ├── Payment.swift             # Payment, RazorpayOrder, UpiLinkResponse
│   └── Report.swift              # SalesReport, GSTR-1, GSTR-3B, P&L
│
├── Services/
│   ├── APIService.swift          # URLSession-based HTTP client
│   ├── AuthManager.swift         # Auth state, token persistence
│   ├── LocalStorage.swift        # JSON file-based caching
│   └── SyncService.swift         # Background sync with BGTaskScheduler
│
├── ViewModels/
│   ├── AuthViewModel.swift       # Login/Register state
│   ├── DashboardViewModel.swift  # Dashboard data loading
│   ├── CustomerViewModel.swift   # Customer CRUD
│   ├── ProductViewModel.swift    # Product CRUD
│   ├── InvoiceViewModel.swift    # Invoice CRUD + GST calculation
│   └── ReportsViewModel.swift    # Report loading
│
├── Views/
│   ├── Auth/
│   │   ├── LoginView.swift       # Login/Register screen
│   │   └── RegisterView.swift    # Registration form
│   ├── Dashboard/
│   │   └── DashboardView.swift   # Home dashboard with stats
│   ├── Customer/
│   │   ├── CustomerListView.swift
│   │   ├── AddCustomerView.swift
│   │   └── CustomerLedgerView.swift
│   ├── Inventory/
│   │   ├── ProductListView.swift
│   │   ├── AddProductView.swift
│   │   └── CategoryView.swift
│   ├── Billing/
│   │   ├── InvoiceListView.swift
│   │   ├── CreateInvoiceView.swift
│   │   └── InvoiceDetailView.swift
│   ├── Payments/
│   │   └── PaymentView.swift
│   ├── Reports/
│   │   └── ReportsView.swift
│   ├── Settings/
│   │   └── SettingsView.swift
│   └── Components/               # Shared SwiftUI components
│
├── Navigation/
│   └── AppNavigation.swift       # NavigationStack with AppRoute
│
├── Utilities/
│   ├── Constants.swift           # Base URL, keys, GST rates
│   ├── Helpers.swift             # Formatters, GSTCalculator
│   └── AppError.swift            # Error types
│
└── Resources/
    └── Assets.xcassets           # App icons, colors
```

---

## Networking Layer (URLSession)

### APIService (Singleton)

```swift
final class APIService {
    static let shared = APIService()
    
    private let session: URLSession    // 30s timeout
    private var authToken: String?
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private let tokenRefresher: TokenRefresher  // actor for thread-safe refresh
}
```

### Key Features:

1. **Generic request method** — Type-safe responses:
   ```swift
   func request<T: Codable>(_ endpoint: APIEndpoint, endpoint path: String,
                            method: String, body: Codable?,
                            queryItems: [URLQueryItem]?) async throws -> T
   ```

2. **Automatic token refresh** — On 401 response:
   ```swift
   if httpResponse.statusCode == 401 {
       let newToken = try await tokenRefresher.refresh()
       // Retry with new token
   }
   ```

3. **TokenRefresher actor** — Prevents concurrent refresh calls:
   ```swift
   actor TokenRefresher {
       private var refreshTask: Task<String, Error>?
       func refresh() async throws -> String { ... }
   }
   ```

4. **Endpoint enum** — Type-safe URL building:
   ```swift
   enum APIEndpoint {
       case auth
       case business
       case customers(String)     // businessId
       case inventory(String)
       case billing(String)
       case payments(String)
       case reports(String)
       case sync(String)
   }
   ```

---

## Auth Flow

### AuthManager (@MainActor, ObservableObject)

```
┌──────────────────────────────────────────┐
│              AuthManager                  │
│──────────────────────────────────────────│
│ @Published isAuthenticated: Bool         │
│ @Published currentUser: User?            │
│ @Published currentBusiness: Business?    │
│ @Published businesses: [Business]        │
│──────────────────────────────────────────│
│ Token Storage: KeychainHelper            │
│ User Cache: UserDefaults                 │
│ Business Cache: UserDefaults             │
└──────────────────────────────────────────┘
```

### Token Storage (Keychain):

```swift
enum KeychainHelper {
    static func save(key: String, value: String)  // SecItemAdd
    static func read(key: String) -> String?       // SecItemCopyMatching
    static func delete(key: String)                // SecItemDelete
}
```

- Access token stored under key `access_token`
- Refresh token stored under key `refresh_token`
- Service identifier: `com.gstbilling`

### Auth Flow:

1. **App Launch** → `AuthManager.checkAuth()` checks for stored token
2. **Login** → `POST /auth/login` → stores tokens in Keychain, user in UserDefaults
3. **Token Expiry** → Automatic refresh via `TokenRefresher` actor
4. **Logout** → `POST /auth/logout` → clears Keychain + UserDefaults

---

## Offline Persistence Strategy

### LocalStorage (JSON File Cache)

```swift
final class LocalStorage {
    static let shared = LocalStorage()
    
    func cache<T: Codable>(_ value: T, forKey key: String)   // Write to Documents/
    func retrieve<T: Codable>(_ type: T.Type, forKey key: String) -> T?  // Read
    func remove(forKey key: String)                           // Delete
}
```

### Cached Data:

| Cache Key | Type | Description |
|-----------|------|-------------|
| `cached_customers` | `[Customer]` | Customer list |
| `cached_products` | `[Product]` | Product list |
| `cached_invoices` | `[Invoice]` | Invoice list |
| `cached_categories` | `[Category]` | Category list |
| `cached_dashboard` | `DashboardData` | Dashboard summary |
| `pending_operations` | `[PendingOperation]` | Offline queue |

### Offline Queue:

```swift
struct PendingOperation: Codable {
    let id: String
    let type: String           // createCustomer, createInvoice, etc.
    let businessId: String
    let entityId: String?
    let data: Data?
    let createdAt: Date
}
```

### Sync Flow:

1. ViewModels load from cache first, then fetch from API
2. On network failure, data is shown from cache
3. Pending operations are queued in `LocalStorage`
4. `SyncService` pushes pending changes via `BGTaskScheduler`
5. Background task runs every 15 minutes when connectivity available

---

## Background Sync (BGTaskScheduler)

```swift
@MainActor
class SyncService: ObservableObject {
    static let shared = SyncService()
    
    func registerBackgroundTask()           // Register task identifier
    func scheduleBackgroundSync(businessId:) // Schedule periodic sync
    func performSync() async throws         // Push pending + pull changes
    
    func queueChange(_ change: SyncChange)   // Add to pending queue
}
```

### Sync Protocol:

1. Get all pending changes from `LocalStorage`
2. Call `POST /businesses/:id/sync/push` with changes
3. Clear pending queue on success
4. Record sync timestamp
5. Reschedule next background sync

---

## Navigation

Uses SwiftUI `NavigationStack` with typed routes:

```swift
enum AppRoute: Hashable {
    case dashboard
    case customerList
    case addCustomer
    case editCustomer(Customer)
    case customerLedger(Customer)
    case productList
    case addProduct
    case editProduct(Product)
    case createInvoice
    case invoiceList
    case invoiceDetail(Invoice)
    case payments
    case reports
    case settings
}
```

### Navigation Flow:

```
GSTBillingApp
└── ContentView (auth gate)
    ├── LoginView (if not authenticated)
    └── AppNavigation (if authenticated)
        └── NavigationStack
            └── DashboardView
                ├── CustomerListView
                │   ├── AddCustomerView
                │   └── CustomerLedgerView
                ├── ProductListView
                │   └── AddProductView
                ├── CreateInvoiceView
                ├── InvoiceListView
                │   └── InvoiceDetailView
                ├── ReportsView
                └── SettingsView
```

---

## GST Calculation (Client-side)

```swift
struct GSTCalculator {
    struct GSTResult {
        let taxableValue: Double
        let cgst: Double
        let sgst: Double
        let igst: Double
        let total: Double
    }
    
    static func calculate(rate: Double, quantity: Double, 
                         discount: Double, taxRate: Double,
                         isIntraState: Bool, taxType: String) -> GSTResult {
        let baseAmount = rate * quantity
        let discountAmount = baseAmount * discount / 100
        let afterDiscount = baseAmount - discountAmount
        
        let taxableValue: Double
        let taxAmount: Double
        
        if taxType == "inclusive" {
            taxableValue = afterDiscount / (1 + taxRate / 100)
            taxAmount = afterDiscount - taxableValue
        } else {
            taxableValue = afterDiscount
            taxAmount = taxableValue * taxRate / 100
        }
        
        if isIntraState {
            let half = taxAmount / 2
            return GSTResult(taxableValue: taxableValue, cgst: half, sgst: half, igst: 0, 
                           total: taxableValue + taxAmount)
        } else {
            return GSTResult(taxableValue: taxableValue, cgst: 0, sgst: 0, igst: taxAmount, 
                           total: taxableValue + taxAmount)
        }
    }
}
```

---

## Build Instructions

### Requirements:
- Xcode 15.0+
- iOS 16.0+ deployment target
- Swift 5.9+

### Build:

```bash
# Open in Xcode
open ios/GSTBilling.xcodeproj

# Or via command line
xcodebuild -project ios/GSTBilling.xcodeproj \
  -scheme GSTBilling \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  build

# Run tests
xcodebuild test -project ios/GSTBilling.xcodeproj \
  -scheme GSTBilling \
  -destination 'platform=iOS Simulator,name=iPhone 15'

# Archive for distribution
xcodebuild archive -project ios/GSTBilling.xcodeproj \
  -scheme GSTBilling \
  -archivePath build/GSTBilling.xcarchive
```

### Build Configuration:

| Setting | Debug | Release |
|---------|-------|---------|
| Base URL | `http://localhost:3000/api/v1` | `https://api.wiseaccounts.app/api/v1` |
| Keychain Service | `com.gstbilling` | `com.gstbilling` |
| Background Sync | Enabled | Enabled |
| Token Storage | Keychain | Keychain |
| Data Cache | JSON files | JSON files |

---

## Error Handling

```swift
enum AppError: LocalizedError {
    case networkError(String)
    case serverError(String)
    case unauthorized
    case validationError(String)
    case notFound(String)
    case decodingError(String)
    case unknown(String)
}

enum APIError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int, message: String)
    case decodingFailed(Error)
}
```

ViewModels catch errors and set `@Published errorMessage` for UI display.

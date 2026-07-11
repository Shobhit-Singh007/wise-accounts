# Code Summary — Wise Accounts

> Complete code walkthrough of all three platforms with module explanations.

---

## Backend (NestJS + TypeScript)

### File Tree

```
backend/
├── .env                              # Environment variables
├── .prettierrc                       # Code formatting config
├── eslint.config.mjs                 # ESLint config
├── nest-cli.json                     # NestJS CLI config
├── package.json                      # Dependencies and scripts
├── prisma.config.ts                  # Prisma configuration
├── tsconfig.json                     # TypeScript config
│
├── prisma/
│   └── schema.prisma                 # Database schema (14 models)
│
├── src/
│   ├── main.ts                       # Bootstrap, Swagger, CORS, pipes
│   ├── app.module.ts                 # Root module (10 sub-modules)
│   ├── app.controller.ts             # Health check
│   ├── app.service.ts                # App-level service
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts          # Global Prisma module
│   │   └── prisma.service.ts         # DB connection lifecycle
│   │
│   ├── common/
│   │   ├── common.module.ts          # Shared module
│   │   ├── decorators/
│   │   │   ├── public.decorator.ts       # @Public() - bypass JWT
│   │   │   ├── current-user.decorator.ts # @CurrentUser() - extract JWT payload
│   │   │   ├── business-id.decorator.ts  # @BusinessId() - extract business
│   │   │   └── roles.decorator.ts        # @Roles() - RBAC
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts         # JWT authentication guard
│   │   │   ├── business-ownership.guard.ts # Business access control
│   │   │   └── roles.guard.ts            # Role-based access control
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts  # Global error handler
│   │   └── interceptors/
│   │       └── transform.interceptor.ts  # Response wrapping
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts        # Register, Login, Refresh, Logout
│   │   ├── auth.service.ts           # JWT generation, password hashing
│   │   ├── dto/
│   │   │   ├── register.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   ├── refresh-token.dto.ts
│   │   │   └── verify-otp.dto.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts       # Passport JWT strategy
│   │
│   ├── business/
│   │   ├── business.module.ts
│   │   ├── business.controller.ts    # CRUD + Dashboard + Warehouses
│   │   ├── business.service.ts       # Business logic
│   │   └── dto/
│   │       ├── create-business.dto.ts
│   │       ├── update-business.dto.ts
│   │       └── create-warehouse.dto.ts
│   │
│   ├── customer/
│   │   ├── customer.module.ts
│   │   ├── customer.controller.ts    # CRUD + Ledger + Payments
│   │   ├── customer.service.ts       # Business logic
│   │   └── dto/
│   │       ├── create-customer.dto.ts
│   │       ├── update-customer.dto.ts
│   │       └── record-payment.dto.ts
│   │
│   ├── inventory/
│   │   ├── inventory.module.ts
│   │   ├── inventory.controller.ts   # Products, Stock, POs, Categories
│   │   ├── inventory.service.ts      # Stock management logic
│   │   └── dto/
│   │       ├── create-product.dto.ts
│   │       ├── update-product.dto.ts
│   │       ├── stock-adjust.dto.ts
│   │       ├── stock-transfer.dto.ts
│   │       ├── create-category.dto.ts
│   │       ├── create-supplier.dto.ts
│   │       └── create-purchase-order.dto.ts
│   │
│   ├── billing/
│   │   ├── billing.module.ts
│   │   ├── billing.controller.ts     # Invoice CRUD + Credit Notes
│   │   ├── billing.service.ts        # GST calculation + Stock deduction
│   │   └── dto/
│   │       ├── create-invoice.dto.ts
│   │       └── create-credit-note.dto.ts
│   │
│   ├── payments/
│   │   ├── payments.module.ts
│   │   ├── payments.controller.ts    # Record, Razorpay, UPI, Webhook
│   │   ├── payments.service.ts       # Payment processing logic
│   │   └── dto/
│   │       ├── create-payment.dto.ts
│   │       └── razorpay-order.dto.ts
│   │
│   ├── reports/
│   │   ├── reports.module.ts
│   │   ├── reports.controller.ts     # Sales, GSTR-1, GSTR-3B, P&L
│   │   └── reports.service.ts        # Report generation logic
│   │
│   ├── sync/
│   │   ├── sync.module.ts
│   │   ├── sync.controller.ts        # Push/Pull offline changes
│   │   └── sync.service.ts           # Sync protocol logic
│   │
│   └── notifications/
│       ├── notifications.module.ts
│       ├── notifications.controller.ts  # Reminders, Alerts
│       └── notifications.service.ts     # AWS SNS/SES integration
│
├── test/
│   └── jest-e2e.json
│
└── dist/                             # Compiled output
```

---

### Module Details

#### Auth Module

**Purpose:** User registration, login, token management, and authentication.

**Key Classes:**
- `AuthService` — Handles register (bcrypt hash), login (bcrypt compare), token generation (JWT access + UUID refresh tokens stored in DB), refresh (rotate tokens), logout (revoke)
- `JwtStrategy` — Passport strategy that validates JWT from Bearer header, checks user exists and is active
- `JwtAuthGuard` — Global guard that skips validation for `@Public()` endpoints

**Security Flow:**
```
Request → JwtAuthGuard
  ├── @Public() → Skip auth, pass through
  └── No @Public() → JwtStrategy.validate()
       ├── Extract token from Bearer header
       ├── Verify JWT signature + expiry
       ├── Check user exists in DB (isActive = true)
       └── Return JwtPayload { sub, phone, role }
            → Available via @CurrentUser() decorator
```

**Dependencies:** PrismaService, JwtService, ConfigService

---

#### Business Module

**Purpose:** Multi-business management with ownership verification.

**Key Features:**
- Create business + auto-create UserBusiness membership + default warehouse
- Dashboard aggregation (customer count, product count, total billed, outstanding)
- Warehouse CRUD

**Guard:** `BusinessOwnershipGuard` — Verifies `userId` has a `UserBusiness` record for the requested `businessId`. Sets `request.userBusinessRole`.

---

#### Customer Module

**Purpose:** Customer management with ledger tracking and payment recording.

**Key Features:**
- CRUD with search (name, phone) and pagination
- Opening balance creates initial `CustomerTransaction`
- Ledger returns all transactions + invoices with payments
- Payment recording delegates to `PaymentsService`

---

#### Inventory Module

**Purpose:** Full inventory management with batch tracking and multi-warehouse support.

**Key Classes:**
- `InventoryService` — All stock operations

**Stock Logic:**
```
adjustStock():
  1. Find or create StockBatch (product + warehouse + batchNo)
  2. Validate sufficient stock for deductions
  3. Calculate quantity change:
     - PURCHASE, TRANSFER_IN, RETURN → positive
     - SALE, TRANSFER_OUT, ADJUSTMENT → negative
  4. Update StockBatch.quantity
  5. Create StockMovement record

transferStock():
  1. adjustStock(TRANSFER_OUT, fromWarehouse)
  2. adjustStock(TRANSFER_IN, toWarehouse)
```

**Low Stock Alert:** Compares aggregated `StockBatch.quantity` against `Product.lowStockThreshold`.

**Expiring Batches:** Finds batches with `expiryDate` within N days.

---

#### Billing Module

**Purpose:** Invoice creation with automatic GST calculation and stock management.

**GST Calculation Logic (`billing.service.ts:20-56`):**
```typescript
for each item:
  taxableValue = (quantity × rate) - discount
  
  if isInterState(business.state, customer.state):
    igst = taxableValue × taxRate / 100
  else:
    cgst = taxableValue × (taxRate / 2) / 100
    sgst = taxableValue × (taxRate / 2) / 100
  
  total = taxableValue + cgst + sgst + igst

invoice.subtotal = Σ(item.taxableValue)
invoice.taxAmount = Σ(item.cgst + item.sgst + item.igst)
invoice.grandTotal = subtotal + taxAmount - discount
```

**Database Transaction (within `$transaction`):**
1. Create `Invoice` + `InvoiceItem` records
2. Update `Customer.balance` (+ grandTotal)
3. Create `CustomerTransaction` (INVOICE_CREATED)
4. Deduct stock from `StockBatch` (FEFO order: earliest expiry first)

**Credit Note Logic:**
- Calculates proportional credit per unit from original invoice item
- Adjusts customer balance downward
- Marks invoice as CREDITED

---

#### Payments Module

**Purpose:** Payment recording, Razorpay integration, UPI links, webhook handling.

**Key Features:**
- Manual payment recording (CASH, UPI, BANK_TRANSFER, CARD, CHEQUE)
- Updates `Invoice.paidAmount` and `Customer.balance`
- Razorpay order creation via SDK (if configured)
- Webhook verification (HMAC-SHA256 signature)
- Auto-record payment on `payment.captured` event
- UPI deep link generation

---

#### Reports Module

**Purpose:** Generate business reports for sales, GST compliance, and financial statements.

**Reports:**
- **Sales Report** — Aggregated by date range with category breakdown
- **GSTR-1** — Outward supplies split into B2B (with GSTIN) and B2C (aggregate)
- **GSTR-3B** — Monthly summary (taxable value, tax, paid, outstanding)
- **Customer Report** — Per-customer billing and payment summary
- **Profit & Loss** — Revenue, tax, discount, net profit

---

#### Sync Module

**Purpose:** Offline-first data synchronization between mobile apps and server.

**Push Protocol:**
```
POST /sync/push { deviceId, changes: [{ table, action, data }] }

For each change:
  - 'customers': upsert or soft-delete
  - 'products': upsert or soft-delete
  - 'payments': create
  Return synced/failed counts
```

**Pull Protocol:**
```
GET /sync/pull?lastSyncAt=<ISO>&deviceId=<string>

Returns all records updated/created since lastSyncAt:
  - products, customers, invoices, payments, stockBatches
```

---

#### Notifications Module

**Purpose:** SMS, email, and push notification delivery via AWS services.

**Delivery Channels:**
- SMS → AWS SNS `PublishCommand`
- Email → AWS SES `SendEmailCommand`

**Notification Types:**
- Payment reminders to customers
- Low stock alerts to business owner
- Invoice shared (PDF link)
- GST filing deadline reminders

---

## Android (Kotlin)

### File Tree

```
android/app/src/main/java/com/gstbilling/app/
├── GSTBillingApp.kt                 # @HiltAndroidApp Application
├── MainActivity.kt                   # Single Activity, Compose setup
│
├── data/
│   ├── local/
│   │   ├── AppDatabase.kt            # Room DB (3 entities, 3 DAOs)
│   │   ├── converter/                 # Type converters
│   │   ├── dao/
│   │   │   ├── CustomerDao.kt         # CRUD + search + Flow
│   │   │   ├── InvoiceDao.kt          # CRUD + sync queue + Flow
│   │   │   └── ProductDao.kt          # CRUD + search + Flow
│   │   └── entity/
│   │       ├── CustomerEntity.kt      # Room entity with syncOperation
│   │       ├── InvoiceEntity.kt       # Room entity with itemsJson + syncStatus
│   │       └── ProductEntity.kt       # Room entity
│   ├── remote/
│   │   ├── api/
│   │   │   ├── ApiService.kt          # Retrofit interface (all endpoints)
│   │   │   └── AuthInterceptor.kt     # Adds Bearer token from SessionManager
│   │   └── dto/                       # Request/Response DTOs
│   └── repository/
│       ├── AuthRepository.kt          # Login, register, refresh, logout
│       ├── BusinessRepository.kt      # Business CRUD
│       ├── CustomerRepository.kt      # Customer CRUD with offline-first
│       ├── InvoiceRepository.kt       # Invoice CRUD with offline-first + sync
│       └── ProductRepository.kt       # Product CRUD with offline-first
│
├── di/
│   └── AppModule.kt                  # Hilt module (DB, Retrofit, DAOs)
│
├── navigation/
│   ├── Routes.kt                     # Route string constants
│   └── NavGraph.kt                   # Navigation Compose graph + MainViewModel
│
├── ui/
│   ├── auth/LoginScreen.kt           # Login/Register with ViewModel
│   ├── billing/
│   │   ├── CreateInvoiceScreen.kt    # Invoice creation with item list
│   │   └── InvoiceListScreen.kt      # Invoice list with status filter
│   ├── components/                    # Shared composables
│   ├── customer/
│   │   ├── CustomerListScreen.kt     # Searchable customer list
│   │   └── AddCustomerScreen.kt      # Add/Edit customer form
│   ├── dashboard/DashboardScreen.kt  # Stats cards + quick actions
│   ├── inventory/
│   │   ├── ProductListScreen.kt      # Product list with search
│   │   └── AddProductScreen.kt       # Add/Edit product form
│   ├── payments/                      # Payment collection screens
│   ├── reports/ReportsScreen.kt      # Report cards
│   └── settings/SettingsScreen.kt    # App settings + logout
│
└── util/
    ├── AppResult.kt                  # Sealed class: Success/Error/Loading
    ├── NetworkMonitor.kt             # ConnectivityManager wrapper
    └── SessionManager.kt             # EncryptedSharedPreferences + DataStore
```

### Room Database Entities

**InvoiceEntity** — Core offline entity:
```kotlin
@Entity(tableName = "invoices")
data class InvoiceEntity(
    @PrimaryKey val id: Long,
    val invoiceNumber: String?,
    val customerId: Long?,
    val customerName: String?,
    val businessId: Long,
    val invoiceDate: String?,
    val dueDate: String?,
    val subtotal: Double?,
    val discount: Double?,
    val taxableAmount: Double?,
    val cgst: Double?,
    val sgst: Double?,
    val igst: Double?,
    val totalAmount: Double?,
    val roundOff: Double?,
    val status: String?,
    val notes: String?,
    val itemsJson: String,           // Serialized line items for offline
    val syncStatus: String?,         // "synced" or "pending"
    val createdAt: String?,
    val updatedAt: String?
)
```

### Retrofit API Interface

Defines all endpoints as suspend functions returning `Response<ApiResponse<T>>`. Auth interceptor automatically attaches the Bearer token from `SessionManager`.

### Offline-First Repository Pattern

```
Repository.fetch():
  1. Return Flow from Room DAO (UI shows cached data immediately)
  2. If online: fetch from API → update Room → Flow auto-emits
  3. If offline: show cached data, queue pending operation

Repository.create():
  1. If online: POST to API → save to Room → return success
  2. If offline: save to Room with syncStatus="pending" → return success
  3. Background WorkManager syncs pending items when online
```

---

## iOS (Swift)

### File Tree

```
ios/GSTBilling/
├── App/
│   ├── GSTBillingApp.swift           # @main, creates AuthManager
│   └── ContentView.swift             # Auth gate (login or navigation)
│
├── Models/
│   ├── User.swift                    # User, AuthResponse, Login/Register requests
│   ├── Business.swift                # Business, Warehouse, DashboardData
│   ├── Customer.swift                # Customer, Ledger, Transaction
│   ├── Product.swift                 # Product, Category, Supplier, Stock, PO
│   ├── Invoice.swift                 # Invoice, InvoiceItem, CreditNote
│   ├── Payment.swift                 # Payment, RazorpayOrder, UpiLink
│   └── Report.swift                  # Sales, GSTR-1, GSTR-3B, P&L, Sync
│
├── Services/
│   ├── APIService.swift              # URLSession HTTP client (singleton)
│   ├── AuthManager.swift             # Auth state, Keychain, UserDefaults
│   ├── LocalStorage.swift            # JSON file caching (Documents/)
│   └── SyncService.swift             # BGTaskScheduler background sync
│
├── ViewModels/
│   ├── AuthViewModel.swift           # Login/Register form state
│   ├── DashboardViewModel.swift      # Dashboard data loading
│   ├── CustomerViewModel.swift       # Customer CRUD
│   ├── ProductViewModel.swift        # Product CRUD
│   ├── InvoiceViewModel.swift        # Invoice creation + GST preview
│   └── ReportsViewModel.swift        # Report loading
│
├── Views/
│   ├── Auth/LoginView.swift          # Login/Register screen
│   ├── Dashboard/DashboardView.swift # Stats + quick actions
│   ├── Customer/                     # Customer screens
│   ├── Inventory/                    # Product screens
│   ├── Billing/                      # Invoice screens
│   ├── Payments/                     # Payment screens
│   ├── Reports/                      # Report screens
│   ├── Settings/SettingsView.swift   # App settings
│   └── Components/                   # Shared SwiftUI views
│
├── Navigation/
│   └── AppNavigation.swift           # NavigationStack + AppRoute enum
│
├── Utilities/
│   ├── Constants.swift               # Base URL, keys, GST rates, colors
│   ├── Helpers.swift                 # Formatters, GSTCalculator, utility functions
│   └── AppError.swift                # Error enums (AppError, APIError)
│
└── Resources/
    └── Assets.xcassets
```

### Models

All models conform to `Codable` (for JSON serialization) and `Identifiable` (for SwiftUI lists). Many also conform to `Hashable` (for NavigationStack).

**Key pattern:** Request structs (e.g., `CreateInvoiceRequest`) mirror the backend DTOs exactly.

### Networking and Auth Flow

```
APIService.shared.request<T>(endpoint, method, body):
  1. Build URL from Constants.baseURL + endpoint.basePath + path
  2. Create URLRequest with Bearer token
  3. URLSession.data(for: request)
  4. Check HTTP status:
     - 200-299: Decode JSON to T
     - 401: Call TokenRefresher.refresh() → retry once
     - Other: Throw APIError.httpError
  5. Return decoded T
```

**TokenRefresher** is a Swift `actor` that prevents concurrent refresh calls by deduplicating in-flight refresh tasks.

### Local Persistence Strategy

| Layer | Storage | Data |
|-------|---------|------|
| Tokens | Keychain (Security framework) | Access + refresh tokens |
| Session | UserDefaults | User ID, business ID, login state |
| Cache | JSON files in Documents/ | Customers, products, invoices, categories |
| Pending Ops | JSON file in Documents/ | Queued offline operations |
| Sync State | UserDefaults | Last sync timestamp |

ViewModels load from cache first, then fetch from API and update cache. This ensures instant UI rendering even offline.

### GST Calculation (Client-side)

The `GSTCalculator` utility in `Helpers.swift` provides real-time GST preview during invoice creation, supporting both "inclusive" and "exclusive" tax types with intra/inter-state determination.

---

## Cross-Platform Consistency

| Aspect | Backend | Android | iOS |
|--------|---------|---------|-----|
| Auth | JWT + Refresh tokens | EncryptedSharedPrefs + DataStore | Keychain + UserDefaults |
| Data model | Prisma schema | Room entities + Retrofit DTOs | Codable structs |
| Offline | Server stores all | Room DB + WorkManager sync | JSON files + BGTaskScheduler |
| GST calc | Server-side (authoritative) | Client-side (preview) | Client-side (preview) |
| Navigation | URL routing | Navigation Compose | NavigationStack |
| DI | NestJS IoC | Hilt | Manual singleton injection |

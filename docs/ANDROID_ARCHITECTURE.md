# Android Architecture — Wise Accounts

> Architecture documentation for the native Android application.

---

## Architecture Pattern: MVVM + Repository + Offline-First

```
┌──────────────────────────────────────────────────────┐
│                    UI Layer                           │
│  ┌────────────────────────────────────────────────┐  │
│  │         Jetpack Compose Screens                │  │
│  │   LoginScreen │ DashboardScreen │ etc.          │  │
│  └─────────────────────┬──────────────────────────┘  │
│                        │ observes StateFlow           │
│  ┌─────────────────────┴──────────────────────────┐  │
│  │           ViewModel (Hilt)                     │  │
│  │   LoginVM │ DashboardVM │ InvoiceVM │ etc.     │  │
│  └─────────────────────┬──────────────────────────┘  │
│                        │ calls                       │
├────────────────────────┼─────────────────────────────┤
│                   Data Layer                          │
│  ┌─────────────────────┴──────────────────────────┐  │
│  │           Repository (Hilt Singleton)           │  │
│  │   AuthRepo │ CustomerRepo │ InvoiceRepo │ etc. │  │
│  └────────┬────────────────────────┬──────────────┘  │
│           │ offline-first          │                  │
│  ┌────────┴────────┐     ┌────────┴────────┐        │
│  │   Room DAO      │     │   Retrofit API  │        │
│  │  (Local DB)     │     │  (Remote)       │        │
│  └─────────────────┘     └─────────────────┘        │
├─────────────────────────────────────────────────────┤
│                 Infrastructure                       │
│  ┌──────────┐ ┌───────────┐ ┌──────────────────┐   │
│  │ Hilt DI  │ │WorkManager│ │ DataStore + Enc. │   │
│  │          │ │(Background)│ │ SharedPrefs      │   │
│  └──────────┘ └───────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Package Structure

```
android/app/src/main/java/com/gstbilling/app/
├── GSTBillingApp.kt              # Application class (@HiltAndroidApp)
├── MainActivity.kt               # Single Activity with Compose
│
├── data/
│   ├── local/
│   │   ├── AppDatabase.kt        # Room database definition
│   │   ├── converter/             # Type converters
│   │   ├── dao/
│   │   │   ├── CustomerDao.kt     # Customer CRUD + search
│   │   │   ├── InvoiceDao.kt      # Invoice CRUD + sync queue
│   │   │   └── ProductDao.kt      # Product CRUD + search
│   │   └── entity/
│   │       ├── CustomerEntity.kt  # Room entity
│   │       ├── InvoiceEntity.kt   # Room entity
│   │       └── ProductEntity.kt   # Room entity
│   ├── remote/
│   │   ├── api/
│   │   │   ├── ApiService.kt      # Retrofit interface
│   │   │   └── AuthInterceptor.kt # Adds Bearer token
│   │   └── dto/                   # Request/Response DTOs
│   └── repository/
│       ├── AuthRepository.kt      # Login, register, refresh
│       ├── BusinessRepository.kt  # Business CRUD
│       ├── CustomerRepository.kt  # Customer CRUD + offline
│       ├── InvoiceRepository.kt   # Invoice CRUD + offline sync
│       └── ProductRepository.kt   # Product CRUD + offline
│
├── di/
│   └── AppModule.kt              # Hilt module (DB, Retrofit, DAOs)
│
├── navigation/
│   ├── Routes.kt                 # Route constants
│   └── NavGraph.kt               # Navigation Compose graph
│
├── ui/
│   ├── auth/
│   │   └── LoginScreen.kt        # Login/Register UI
│   ├── billing/
│   │   ├── CreateInvoiceScreen.kt # Invoice creation form
│   │   └── InvoiceListScreen.kt   # Invoice list with filters
│   ├── components/                # Shared UI components
│   ├── customer/
│   │   ├── CustomerListScreen.kt  # Customer list with search
│   │   └── AddCustomerScreen.kt   # Add/Edit customer form
│   ├── dashboard/
│   │   └── DashboardScreen.kt     # Home dashboard
│   ├── inventory/
│   │   ├── ProductListScreen.kt   # Product list
│   │   └── AddProductScreen.kt    # Add/Edit product form
│   ├── payments/                  # Payment screens
│   ├── reports/
│   │   └── ReportsScreen.kt       # Reports dashboard
│   └── settings/
│       └── SettingsScreen.kt      # App settings
│
└── util/
    ├── AppResult.kt              # Sealed class for API results
    ├── NetworkMonitor.kt         # Connectivity checker
    └── SessionManager.kt         # Token & session persistence
```

---

## Dependency Injection (Hilt)

### AppModule (`di/AppModule.kt`)

Provides all singletons:

| Provider | Scope | Description |
|----------|-------|-------------|
| `DataStore<Preferences>` | Singleton | User preferences |
| `OkHttpClient` | Singleton | HTTP client with auth interceptor + logging |
| `Retrofit` | Singleton | HTTP client configured with base URL |
| `ApiService` | Singleton | Retrofit API interface |
| `AppDatabase` | Singleton | Room database instance |
| `CustomerDao` | — | From AppDatabase |
| `ProductDao` | — | From AppDatabase |
| `InvoiceDao` | — | From AppDatabase |

### OkHttpClient Configuration:
```kotlin
OkHttpClient.Builder()
    .addInterceptor(authInterceptor)   // Adds Bearer token
    .addInterceptor(logging)           // HTTP logging
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .writeTimeout(30, TimeUnit.SECONDS)
    .build()
```

---

## Offline-First Flow

```
┌─────────────────────────────────────────────────────┐
│                    User Action                       │
│              (e.g., Create Invoice)                  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Is Online?     │
              │ (NetworkMonitor│
              └───────┬────────┘
                 Yes   │    No
                ┌──────┘    └──────┐
                ▼                   ▼
        ┌──────────────┐   ┌──────────────────┐
        │ POST to API  │   │ Save to Room DB   │
        │ via Retrofit │   │ with syncStatus   │
        └──────┬───────┘   │ = "pending"       │
               │           └────────┬─────────┘
               ▼                    │
        ┌──────────────┐            ▼
        │ Save to Room │   ┌──────────────────┐
        │ with sync    │   │ WorkManager will  │
        │ = "synced"   │   │ retry when online │
        └──────────────┘   └──────────────────┘
```

### Repository Pattern:

1. **Room DAO** returns `Flow<List<T>>` — UI observes reactively
2. **Repository** checks `NetworkMonitor.isOnline()`
3. If online: call Retrofit API, save result to Room
4. If offline: save to Room with `syncStatus = "pending"`
5. `syncPending()` method uploads pending changes when connectivity returns

### Sync Protocol (InvoiceRepository example):

```kotlin
suspend fun syncPending() {
    val pending = invoiceDao.getPendingSync()
    for (invoice in pending) {
        try {
            val request = /* deserialize from itemsJson */
            val response = apiService.createInvoice(request)
            if (response.isSuccessful) {
                invoiceDao.deleteById(invoice.id)
                response.body()?.data?.let { invoiceDao.insert(it.toEntity()) }
            }
        } catch (_: Exception) { }
    }
}
```

---

## Room Database

### AppDatabase

```kotlin
@Database(entities = [CustomerEntity, ProductEntity, InvoiceEntity], version = 2)
abstract class AppDatabase : RoomDatabase() {
    abstract fun customerDao(): CustomerDao
    abstract fun productDao(): ProductDao
    abstract fun invoiceDao(): InvoiceDao
}
```

### Entities:

**InvoiceEntity** includes `syncStatus` field ("synced" or "pending") and `itemsJson` for offline serialization.

### Migration:

```kotlin
val MIGRATION_1_2 = Migration(1, 2) { db ->
    db.execSQL("ALTER TABLE invoices ADD COLUMN itemsJson TEXT NOT NULL DEFAULT '[]'")
    db.execSQL("ALTER TABLE customers ADD COLUMN syncOperation TEXT DEFAULT NULL")
}
```

---

## Retrofit API Interface

```kotlin
interface ApiService {
    // Auth
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<TokenResponse>
    
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<TokenResponse>
    
    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<TokenResponse>

    // Customers
    @GET("businesses/{id}/customers")
    suspend fun getCustomers(@Path("id") businessId: Long): Response<ApiResponse<List<Customer>>>
    
    @POST("businesses/{id}/customers")
    suspend fun createCustomer(@Path("id") businessId: Long, @Body dto: CreateCustomerRequest): Response<ApiResponse<Customer>>

    // Products
    @GET("businesses/{id}/products")
    suspend fun getProducts(@Path("id") businessId: Long): Response<ApiResponse<List<Product>>>
    
    @POST("businesses/{id}/products")
    suspend fun createProduct(@Path("id") businessId: Long, @Body dto: CreateProductRequest): Response<ApiResponse<Product>>

    // Invoices
    @GET("businesses/{id}/invoices")
    suspend fun getInvoices(@Path("id") businessId: Long): Response<ApiResponse<List<Invoice>>>
    
    @POST("businesses/{id}/invoices")
    suspend fun createInvoice(@Path("id") businessId: Long, @Body request: CreateInvoiceRequest): Response<ApiResponse<Invoice>>
    
    @POST("businesses/{id}/invoices/{invoiceId}/cancel")
    suspend fun cancelInvoice(@Path("id") businessId: Long, @Path("invoiceId") invoiceId: Long): Response<ApiResponse<Invoice>>

    // Payments
    @POST("businesses/{id}/payments")
    suspend fun recordPayment(@Path("id") businessId: Long, @Body request: RecordPaymentRequest): Response<ApiResponse<Payment>>
}
```

---

## Session Management

**SessionManager** uses:
- `EncryptedSharedPreferences` (AES-256-GCM) for access/refresh tokens
- `DataStore<Preferences>` for user ID, business ID, business name, login state

```kotlin
@Singleton
class SessionManager @Inject constructor(...) {
    val isLoggedIn: Flow<Boolean>  // Observable login state
    val businessId: Flow<Long?>    // Current business
    
    suspend fun saveAuthData(accessToken, refreshToken, userId, businessId, ...)
    suspend fun getAccessToken(): String?
    suspend fun clearSession()
}
```

---

## Navigation

Uses Jetpack Navigation Compose with route-based navigation:

```
NavGraph
├── Login ────────────────> Dashboard
├── Dashboard ──┬────────> Customers
│               ├────────> Products
│               ├────────> CreateInvoice
│               ├────────> Invoices
│               ├────────> Reports
│               └────────> Settings
├── Customers ──┬────────> AddCustomer
│               ├────────> EditCustomer/{id}
│               └────────> CreateInvoice/{customerId}
├── Products ───┬────────> AddProduct
│               └────────> EditProduct/{id}
└── Invoices ───┴────────> InvoiceDetail/{id}
```

---

## Build Configuration

| Property | Value |
|----------|-------|
| Package | `com.gstbilling.app` |
| minSdk | 26 (Android 8.0) |
| targetSdk | 34 (Android 14) |
| compileSdk | 34 |
| Kotlin JVM | 17 |
| Compose BOM | 2024.02.00 |
| Hilt | 2.50 |
| Room | 2.6.1 |
| Retrofit | 2.9.0 |

### Key Dependencies:
```kotlin
// Compose
implementation(platform("androidx.compose:compose-bom:2024.02.00"))
implementation("androidx.compose.material3:material3")
implementation("androidx.navigation:navigation-compose:2.7.7")

// DI
implementation("com.google.dagger:hilt-android:2.50")
implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

// Database
implementation("androidx.room:room-runtime:2.6.1")
implementation("androidx.room:room-ktx:2.6.1")

// Networking
implementation("com.squareup.retrofit2:retrofit:2.9.0")
implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

// Security
implementation("androidx.security:security-crypto:1.1.0-alpha06")

// Camera/Barcode
implementation("androidx.camera:camera-camera2:1.3.1")
implementation("com.google.zxing:core:3.5.3")
```

---

## Build Instructions

```bash
# Debug build
./gradlew assembleDebug

# Release APK
./gradlew assembleRelease

# Release AAB (for Play Store)
./gradlew bundleRelease

# Install on connected device
./gradlew installDebug

# Run tests
./gradlew test
./gradlew connectedAndroidTest
```

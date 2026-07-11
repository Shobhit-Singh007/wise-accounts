# API Reference — Wise Accounts

> Complete REST API documentation for the NestJS backend.

---

## Base Configuration

| Property | Value |
|----------|-------|
| **Base URL (Dev)** | `http://localhost:3000/api/v1` |
| **Base URL (Production)** | `https://api.wiseaccounts.app/api/v1` |
| **Swagger Docs** | `http://localhost:3000/api/docs` |
| **Content-Type** | `application/json` |
| **API Version** | v1 (URL prefix: `/api/v1/`) |

---

## Authentication

All protected endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Token Lifecycle

1. Register or Login → receive `accessToken` + `refreshToken`
2. Use `accessToken` for all requests (expires in 15 minutes)
3. When expired, call `/auth/refresh` with `refreshToken`
4. Old refresh token is revoked; a new pair is issued
5. `refreshToken` expires after 7 days

### Response Envelope

All API responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-07-09T12:00:00.000Z"
}
```

Error responses:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["field: must be a string"],
  "timestamp": "2026-07-09T12:00:00.000Z"
}
```

### Rate Limits

| Scope | Limit | Window |
|-------|-------|--------|
| Per User | 100 requests | 60 seconds |
| Per IP (WAF) | 1000 requests | 60 seconds |

---

## Pagination

List endpoints support offset-based pagination via query parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `page` | `1` | Page number (1-indexed) |
| `limit` | `20` | Items per page |
| `search` | — | Search term (name, phone, SKU, barcode) |

Paginated response structure:

```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

## Authentication Module

### Register User

```
POST /auth/register
```

**Authentication:** None (Public)

**Request Body:**
```json
{
  "phone": "+919876543210",
  "email": "user@example.com",
  "name": "John Doe",
  "password": "Password@123"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| phone | string | Yes | Unique |
| email | string | No | Valid email |
| name | string | Yes | 2–100 chars |
| password | string | Yes | Min 8 chars |

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "phone": "+919876543210",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "BUSINESS_ADMIN",
    "isActive": true,
    "createdAt": "2026-07-09T12:00:00.000Z"
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "uuid-v4"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","name":"John Doe","password":"Password@123"}'
```

---

### Login

```
POST /auth/login
```

**Authentication:** None (Public)

**Request Body:**
```json
{
  "phone": "+919876543210",
  "password": "Password@123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "phone": "+919876543210",
    "name": "John Doe",
    "role": "BUSINESS_ADMIN",
    "isActive": true
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "uuid-v4"
}
```

**Errors:** 401 Invalid credentials / Account deactivated

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","password":"Password@123"}'
```

---

### Refresh Token

```
POST /auth/refresh
```

**Authentication:** None (Public)

**Request Body:**
```json
{
  "refreshToken": "uuid-v4"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbG... (new)",
  "refreshToken": "uuid-v4 (new)"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"uuid-v4"}'
```

---

### Logout

```
POST /auth/logout
```

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "refreshToken": "uuid-v4"
}
```

**Response (200):** `{ "success": true, "data": { "message": "Logged out" } }`

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"uuid-v4"}'
```

---

## Business Module

### Create Business

```
POST /businesses
```

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Sharma Traders",
  "gstin": "29ABCDE1234F1Z5",
  "phone": "+919876543210",
  "email": "info@sharmatraders.com",
  "address": "123 Main Street",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560001"
}
```

| Field | Type | Required |
|-------|------|----------|
| name | string | Yes |
| gstin | string | No |
| phone | string | No |
| email | string | No |
| address | string | No |
| city | string | No |
| state | string | No |
| pincode | string | No |

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Sharma Traders",
  "gstin": "29ABCDE1234F1Z5",
  "isActive": true,
  "settings": {},
  "createdAt": "2026-07-09T12:00:00.000Z"
}
```

> Automatically creates a `UserBusiness` membership (default) and a "Main Warehouse".

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/businesses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Sharma Traders","state":"Karnataka"}'
```

---

### List Businesses

```
GET /businesses
```

**Authentication:** Required

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Sharma Traders",
      "gstin": "29ABCDE1234F1Z5",
      "state": "Karnataka"
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/api/v1/businesses \
  -H "Authorization: Bearer <token>"
```

---

### Get Business

```
GET /businesses/:businessId
```

**Authentication:** Required + Business Ownership

**Response (200):** Single business object with full details.

**Example:**
```bash
curl http://localhost:3000/api/v1/businesses/biz-uuid \
  -H "Authorization: Bearer <token>"
```

---

### Update Business

```
PUT /businesses/:businessId
```

**Authentication:** Required + Business Ownership

**Request Body:** Any subset of business fields.

**Response (200):** Updated business object.

---

### Deactivate Business

```
DELETE /businesses/:businessId
```

**Authentication:** Required + Business Ownership

**Response (200):** `{ "message": "Business deactivated" }`

> Soft-deletes by setting `isActive = false`.

---

### Get Dashboard

```
GET /businesses/:businessId/dashboard
```

**Authentication:** Required + Business Ownership

**Response (200):**
```json
{
  "totalCustomers": 45,
  "totalProducts": 120,
  "totalInvoices": 342,
  "totalBilled": 1500000,
  "totalPaid": 1200000,
  "outstanding": 300000
}
```

---

### Create Warehouse

```
POST /businesses/:businessId/warehouses
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "name": "Warehouse 2",
  "address": "456 Industrial Area",
  "city": "Mumbai",
  "state": "Maharashtra"
}
```

---

### List Warehouses

```
GET /businesses/:businessId/warehouses
```

**Authentication:** Required + Business Ownership

**Response (200):** Array of warehouse objects.

---

## Customer Module

### Create Customer

```
POST /businesses/:businessId/customers
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "name": "Rahul Sharma",
  "phone": "+919876543210",
  "email": "rahul@example.com",
  "gstin": "29ABCDE1234F1Z5",
  "address": "456 Park Street",
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "creditLimit": 50000,
  "openingBalance": 5000,
  "groupId": null
}
```

| Field | Type | Required |
|-------|------|----------|
| name | string | Yes (2–200 chars) |
| phone | string | No |
| email | string | No |
| gstin | string | No |
| address | string | No |
| city | string | No |
| state | string | No |
| pincode | string | No |
| creditLimit | number | No (default 0) |
| openingBalance | number | No (default 0) |
| groupId | string | No |

**Response (201):** Created customer object.

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/businesses/biz-uuid/customers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Rahul Sharma","phone":"+919876543210","state":"Delhi"}'
```

---

### List Customers

```
GET /businesses/:businessId/customers?search=&page=1&limit=20
```

**Authentication:** Required + Business Ownership

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| search | string | Filter by name or phone |
| page | number | Page number |
| limit | number | Items per page |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Rahul Sharma",
      "phone": "+919876543210",
      "balance": 5000,
      "group": { "id": "uuid", "name": "Wholesale" }
    }
  ],
  "meta": { "total": 45, "page": 1, "limit": 20, "totalPages": 3 }
}
```

---

### Get Customer

```
GET /businesses/:businessId/customers/:customerId
```

**Authentication:** Required + Business Ownership

---

### Update Customer

```
PUT /businesses/:businessId/customers/:customerId
```

**Authentication:** Required + Business Ownership

**Request Body:** Any subset of customer fields.

---

### Deactivate Customer

```
DELETE /businesses/:businessId/customers/:customerId
```

**Authentication:** Required + Business Ownership

> Soft-deletes by setting `isActive = false`.

---

### Get Customer Ledger

```
GET /businesses/:businessId/customers/:customerId/ledger
```

**Authentication:** Required + Business Ownership

**Response (200):**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "INVOICE_CREATED",
      "amount": 10000,
      "balanceAfter": 15000,
      "description": "Invoice INV-1234",
      "createdAt": "2026-07-09T12:00:00.000Z"
    }
  ],
  "invoices": [
    {
      "id": "uuid",
      "invoiceNo": "INV-1720520400000-123",
      "grandTotal": 10000,
      "paidAmount": 5000,
      "status": "CONFIRMED",
      "payments": [...]
    }
  ]
}
```

---

### Record Payment for Customer

```
POST /businesses/:businessId/customers/:customerId/payments
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "amount": 5000,
  "method": "CASH",
  "notes": "Partial payment"
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| amount | number | Yes | Min 1 |
| method | string | Yes | CASH, UPI, BANK_TRANSFER, CARD, RAZORPAY, CHEQUE |
| notes | string | No | |

---

## Inventory Module

### Create Product

```
POST /businesses/:businessId/products
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "name": "Wheat Flour (Atta)",
  "sku": "WF-001",
  "hsnCode": "1101",
  "unit": "kg",
  "sellingPrice": 45,
  "purchasePrice": 38,
  "mrp": 50,
  "taxRate": 5,
  "taxType": "inclusive",
  "trackBatch": true,
  "trackExpiry": true,
  "lowStockThreshold": 100,
  "categoryId": "uuid",
  "barcode": "8901234567890",
  "isService": false
}
```

| Field | Type | Required | Default |
|-------|------|----------|---------|
| name | string | Yes | |
| sku | string | No | |
| hsnCode | string | No | |
| unit | string | No | "piece" |
| sellingPrice | number | No | 0 |
| purchasePrice | number | No | 0 |
| mrp | number | No | |
| taxRate | number | No | 0 |
| taxType | string | No | "inclusive" |
| trackBatch | boolean | No | false |
| trackExpiry | boolean | No | false |
| lowStockThreshold | number | No | 0 |
| categoryId | string | No | |
| barcode | string | No | |
| isService | boolean | No | false |

---

### List Products

```
GET /businesses/:businessId/products?search=&page=1&limit=20
```

**Authentication:** Required + Business Ownership

**Response (200):** Products with computed `stock` field (sum of all batch quantities).

---

### Get Product

```
GET /businesses/:businessId/products/:productId
```

**Authentication:** Required + Business Ownership

**Response (200):** Product with `category`, `stockBatches` (with warehouse), and computed `stock`.

---

### Update Product

```
PUT /businesses/:businessId/products/:productId
```

**Authentication:** Required + Business Ownership

---

### Deactivate Product

```
DELETE /businesses/:businessId/products/:productId
```

**Authentication:** Required + Business Ownership

---

### Adjust Stock

```
POST /businesses/:businessId/products/:productId/stock-adjust
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "type": "PURCHASE",
  "quantity": 100,
  "warehouseId": "uuid",
  "batchNo": "BATCH-001",
  "notes": "Initial stock"
}
```

| Field | Type | Required | Values for `type` |
|-------|------|----------|-------------------|
| type | string | Yes | PURCHASE, SALE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT, RETURN |
| quantity | number | Yes | Positive integer |
| warehouseId | string | No | Defaults to first warehouse |
| batchNo | string | No | Auto-generated if not provided |
| notes | string | No | |

---

### Transfer Stock

```
POST /businesses/:businessId/stock-transfer
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "productId": "uuid",
  "fromWarehouseId": "uuid",
  "toWarehouseId": "uuid",
  "quantity": 50,
  "batchNo": "BATCH-001",
  "notes": "Restocking"
}
```

---

### Low Stock Alerts

```
GET /businesses/:businessId/low-stock-alerts
```

**Authentication:** Required + Business Ownership

**Response (200):**
```json
[
  {
    "productId": "uuid",
    "productName": "Wheat Flour",
    "sku": "WF-001",
    "currentStock": 15,
    "threshold": 100
  }
]
```

---

### Expiring Batches

```
GET /businesses/:businessId/expiring-batches?days=30
```

**Authentication:** Required + Business Ownership

---

### Create Category

```
POST /businesses/:businessId/categories
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "name": "Groceries",
  "parentId": null
}
```

---

### List Categories

```
GET /businesses/:businessId/categories?page=1&limit=20
```

**Authentication:** Required + Business Ownership

---

### Create Supplier

```
POST /businesses/:businessId/suppliers
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "name": "ABC Foods Ltd",
  "phone": "+919876543210",
  "email": "supply@abcfoods.com",
  "gstin": "27AAAAA0000B1Z5",
  "address": "MIDC, Pune",
  "city": "Pune",
  "state": "Maharashtra"
}
```

---

### List Suppliers

```
GET /businesses/:businessId/suppliers?page=1&limit=20
```

**Authentication:** Required + Business Ownership

---

### Create Purchase Order

```
POST /businesses/:businessId/purchase-orders
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "supplierId": "uuid",
  "expectedDate": "2026-07-15",
  "items": [
    {
      "productId": "uuid",
      "quantity": 100,
      "unitPrice": 38,
      "batchNo": "BATCH-001"
    }
  ],
  "notes": "Monthly restock"
}
```

**Response (201):** Purchase order with items and supplier included.

---

### List Purchase Orders

```
GET /businesses/:businessId/purchase-orders?page=1&limit=20
```

**Authentication:** Required + Business Ownership

---

### Receive Purchase Order

```
POST /businesses/:businessId/purchase-orders/:orderId/receive
```

**Authentication:** Required + Business Ownership

> Marks order as "RECEIVED" and adds stock via PURCHASE adjustment for each item.

---

## Billing Module

### Create Invoice

```
POST /businesses/:businessId/invoices
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "type": "B2B",
  "customerId": "uuid",
  "invoiceDate": "2026-07-09",
  "dueDate": "2026-08-08",
  "discount": 100,
  "notes": "Thank you for your business",
  "terms": "Payment due within 30 days",
  "referenceId": "PO-12345",
  "items": [
    {
      "productId": "uuid",
      "itemName": "Wheat Flour",
      "quantity": 10,
      "unit": "kg",
      "rate": 45,
      "discount": 0,
      "taxRate": 5,
      "batchNo": "BATCH-001",
      "expiryDate": "2026-12-31"
    },
    {
      "itemName": "Sugar (loose)",
      "quantity": 5,
      "unit": "kg",
      "rate": 60,
      "taxRate": 5
    }
  ]
}
```

**GST Calculation Logic:**
```
For each item:
  taxableValue = (quantity × rate) - discount
  If business.state == customer.state (intra-state):
    cgst = taxableValue × (taxRate / 2) / 100
    sgst = taxableValue × (taxRate / 2) / 100
  Else (inter-state):
    igst = taxableValue × taxRate / 100
  total = taxableValue + cgst + sgst + igst

Invoice totals:
  subtotal = Σ(item.taxableValue)
  taxAmount = Σ(item.cgst + item.sgst + item.igst)
  grandTotal = subtotal + taxAmount - discount
```

**Response (201):**
```json
{
  "id": "uuid",
  "invoiceNo": "INV-B2B-1720520400000-456",
  "type": "B2B",
  "subtotal": 450,
  "taxAmount": 22.50,
  "discount": 100,
  "grandTotal": 372.50,
  "status": "CONFIRMED",
  "items": [...],
  "customer": {...},
  "createdAt": "2026-07-09T12:00:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/v1/businesses/biz-uuid/invoices \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"B2B",
    "customerId":"cust-uuid",
    "items":[
      {"itemName":"Wheat Flour","quantity":10,"rate":45,"taxRate":5}
    ]
  }'
```

---

### List Invoices

```
GET /businesses/:businessId/invoices?status=&customerId=&page=1&limit=20
```

**Authentication:** Required + Business Ownership

**Query Parameters:**

| Param | Type | Values |
|-------|------|--------|
| status | string | DRAFT, CONFIRMED, CANCELLED, CREDITED |
| customerId | string | Filter by customer |
| page | number | Page number |
| limit | number | Items per page |

---

### Get Invoice

```
GET /businesses/:businessId/invoices/:invoiceId
```

**Authentication:** Required + Business Ownership

**Response:** Invoice with items, customer, payments, and createdBy user.

---

### Cancel Invoice

```
POST /businesses/:businessId/invoices/:invoiceId/cancel
```

**Authentication:** Required + Business Ownership

> Sets status to CANCELLED and reverses customer balance.

---

### Create Credit Note

```
POST /businesses/:businessId/invoices/credit-note
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "invoiceId": "uuid",
  "reason": "Damaged goods returned",
  "items": [
    {
      "invoiceItemId": "uuid",
      "quantity": 2,
      "reason": "Damaged packaging"
    }
  ]
}
```

**Response (201):**
```json
{
  "creditNoteNo": "CN-1720520400000",
  "totalCredit": 90,
  "message": "Credit note created"
}
```

---

## Payments Module

### Record Payment

```
POST /businesses/:businessId/payments
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "invoiceId": "uuid",
  "customerId": "uuid",
  "amount": 5000,
  "method": "CASH",
  "reference": "REF-001",
  "notes": "Cash payment for INV-1234"
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| invoiceId | string | No | Link to specific invoice |
| customerId | string | No | Link to customer ledger |
| amount | number | Yes | Min 1 |
| method | string | Yes | CASH, UPI, BANK_TRANSFER, CARD, RAZORPAY, CHEQUE |
| reference | string | No | Transaction reference |
| notes | string | No | |

> Updates `Invoice.paidAmount`, `Customer.balance`, and creates `CustomerTransaction`.

---

### List Payments

```
GET /businesses/:businessId/payments?page=1&limit=20
```

**Authentication:** Required + Business Ownership

---

### Create Razorpay Order

```
POST /businesses/:businessId/payments/razorpay-order
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "amount": 1000,
  "invoiceId": "uuid",
  "receipt": "receipt-001"
}
```

**Response (200):**
```json
{
  "razorpayOrderId": "order_xxx",
  "amount": 100000,
  "currency": "INR",
  "keyId": "rzp_test_xxx"
}
```

---

### Razorpay Webhook

```
POST /payments/razorpay-webhook
```

**Authentication:** None (Public — verified via HMAC signature)

**Headers:** `x-razorpay-signature: <signature>`

> On `payment.captured` event, automatically records payment and updates invoice.

---

### Generate UPI Link

```
POST /businesses/:businessId/payments/upi-link
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "amount": 1000,
  "description": "Payment for Invoice INV-1234"
}
```

**Response (200):**
```json
{
  "upiLink": "upi://pay?pa=payment@upi&am=1000&tn=Payment%20for%20Invoice%20INV-1234&cu=INR",
  "upiId": "payment@upi",
  "amount": 1000
}
```

---

## Reports Module

### Sales Report

```
GET /businesses/:businessId/reports/sales?startDate=2026-01-01&endDate=2026-07-09
```

**Authentication:** Required + Business Ownership

**Response (200):**
```json
{
  "period": { "startDate": "2026-01-01", "endDate": "2026-07-09" },
  "summary": {
    "totalSales": 1500000,
    "totalTax": 270000,
    "totalInvoices": 342,
    "averageInvoice": 4386
  },
  "categorySales": [
    { "name": "Wheat Flour", "count": 500, "total": 22500 }
  ],
  "invoices": [...]
}
```

---

### GSTR-1 Report

```
GET /businesses/:businessId/reports/gstr-1?fromDate=2026-06-01&toDate=2026-06-30
```

**Authentication:** Required + Business Ownership

**Response (200):**
```json
{
  "fromDate": "2026-06-01",
  "toDate": "2026-06-30",
  "summary": {
    "totalInvoices": 50,
    "totalTaxableValue": 200000,
    "totalTax": 36000
  },
  "b2b": [
    {
      "invoiceNo": "INV-B2B-...",
      "date": "2026-06-15",
      "customerName": "Rahul Sharma",
      "customerGstin": "29ABCDE1234F1Z5",
      "taxableValue": 5000,
      "taxAmount": 900,
      "grandTotal": 5900
    }
  ],
  "b2c": {
    "count": 30,
    "totalTaxableValue": 50000,
    "totalTax": 9000
  }
}
```

---

### GSTR-3B Report

```
GET /businesses/:businessId/reports/gstr-3b?month=6&year=2026
```

**Authentication:** Required + Business Ownership

**Response (200):**
```json
{
  "month": 6,
  "year": 2026,
  "summary": {
    "totalInvoices": 50,
    "totalTaxableValue": 200000,
    "totalTax": 36000,
    "totalPaid": 150000,
    "outstanding": 50000
  }
}
```

---

### Customer Report

```
GET /businesses/:businessId/reports/customers
```

**Authentication:** Required + Business Ownership

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Rahul Sharma",
    "phone": "+919876543210",
    "creditLimit": 50000,
    "balance": 15000,
    "totalInvoices": 12,
    "totalPayments": 8
  }
]
```

---

### Profit & Loss Statement

```
GET /businesses/:businessId/reports/profit-loss?startDate=2026-01-01&endDate=2026-07-09
```

**Authentication:** Required + Business Ownership

**Response (200):**
```json
{
  "revenue": 1500000,
  "totalSales": 1230000,
  "totalTax": 270000,
  "totalDiscount": 15000,
  "netProfit": 1500000,
  "invoiceCount": 342
}
```

---

## Sync Module

### Push Offline Changes

```
POST /businesses/:businessId/sync/push
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "deviceId": "android-uuid-or-ios-vendor-id",
  "changes": [
    {
      "table": "customers",
      "action": "create",
      "data": {
        "id": "local-uuid",
        "name": "New Customer",
        "phone": "+919876543210"
      }
    },
    {
      "table": "products",
      "action": "update",
      "data": {
        "id": "server-uuid",
        "sellingPrice": 50
      }
    }
  ]
}
```

**Supported tables:** `customers`, `products`, `payments`

**Supported actions:** `create`, `update`, `delete`

**Response (200):**
```json
{
  "synced": 2,
  "failed": 0,
  "results": [
    { "table": "customers", "action": "create", "success": true },
    { "table": "products", "action": "update", "success": true }
  ]
}
```

---

### Pull Changes

```
GET /businesses/:businessId/sync/pull?lastSyncAt=2026-07-08T00:00:00.000Z&deviceId=android-uuid
```

**Authentication:** Required + Business Ownership

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| lastSyncAt | string | ISO 8601 timestamp of last sync |
| deviceId | string | Device identifier |

**Response (200):**
```json
{
  "timestamp": "2026-07-09T12:00:00.000Z",
  "data": {
    "products": [...],
    "customers": [...],
    "invoices": [...],
    "payments": [...],
    "stockBatches": [...]
  },
  "counts": {
    "products": 5,
    "customers": 3,
    "invoices": 10,
    "payments": 8,
    "stockBatches": 15
  }
}
```

---

## Notifications Module

### Send Payment Reminder

```
POST /businesses/:businessId/notifications/payment-reminder
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "customerId": "uuid",
  "amount": 5000,
  "dueDate": "2026-07-15"
}
```

> Sends SMS via AWS SNS and email via AWS SES to the customer.

---

### Send Low Stock Alert

```
POST /businesses/:businessId/notifications/low-stock-alert
```

**Authentication:** Required + Business Ownership

**Request Body:**
```json
{
  "productName": "Wheat Flour",
  "currentStock": 15,
  "threshold": 100
}
```

> Sends SMS to the business admin.

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (no business ownership) |
| 404 | Not Found |
| 409 | Conflict (e.g., duplicate phone) |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

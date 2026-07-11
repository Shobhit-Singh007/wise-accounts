# Database Schema — Wise Accounts

> PostgreSQL schema documentation based on the Prisma schema.

---

## ER Diagram

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│      User        │     │  RefreshToken    │     │   UserBusiness   │
│──────────────────│     │──────────────────│     │──────────────────│
│ id (PK)          │◄──┐ │ id (PK)          │     │ id (PK)          │
│ phone (UNIQUE)   │   │ │ token (UNIQUE)   │     │ userId (FK)      │──►User
│ email            │   │ │ userId (FK)      │──►User│ businessId (FK)  │──►Business
│ passwordHash     │   │ │ expiresAt        │     │ role             │
│ name             │   │ │ revoked          │     │ isDefault        │
│ role             │   │ └──────────────────┘     │ joinedAt         │
│ avatarUrl        │   │                          └──────────────────┘
│ isActive         │   │
│ createdAt        │   │
│ updatedAt        │   │
└──────────────────┘   │
                       │
┌──────────────────┐   │   ┌──────────────────┐
│    Business      │◄──┘   │    Warehouse     │
│──────────────────│       │──────────────────│
│ id (PK)          │◄──────│ id (PK)          │
│ name             │       │ businessId (FK)  │──►Business
│ gstin            │       │ name             │
│ phone            │       │ address          │
│ email            │       │ city             │
│ address          │       │ state            │
│ city             │       │ isActive         │
│ state            │       │ createdAt        │
│ pincode          │       │ updatedAt        │
│ logoUrl          │       └──────────────────┘
│ settings (JSON)  │
│ isActive         │
│ createdAt        │
│ updatedAt        │
└───────┬──────────┘
        │
        ├─────────────────────────────────────────────────────────┐
        │              │              │              │            │
        ▼              ▼              ▼              ▼            ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│   Customer   │ │ Category │ │ Product  │ │ Supplier │ │ PurchaseOrder│
│──────────────│ │──────────│ │──────────│ │──────────│ │──────────────│
│ id (PK)      │ │ id (PK)  │ │ id (PK)  │ │ id (PK)  │ │ id (PK)      │
│ businessId   │ │businessId│ │businessId│ │businessId│ │ businessId   │
│ groupId(FK)  │──┐│ name   │ │categoryId│──►Category │ │ supplierId   │──►Supplier
│ name         │  ││parentId│ │ name     │ │ name     │ │ orderNo(UQ)  │
│ phone        │  ││createdAt│ │ sku      │ │ phone    │ │ orderDate    │
│ email        │  ││updatedAt│ │ hsnCode  │ │ email    │ │ expectedDate │
│ gstin        │  │└──────────┘ │ unit     │ │ gstin    │ │ subtotal     │
│ address      │  │             │sellPrice │ │ address  │ │ taxAmount    │
│ city         │  │             │purchPrice│ │ city     │ │ discount     │
│ state        │  │             │ mrp      │ │ state    │ │ grandTotal   │
│ pincode      │  │             │ taxRate  │ │ isActive │ │ status       │
│ creditLimit  │  │             │ taxType  │ │createdAt │ │ notes        │
│ balance      │  │             │trackBatch│ │updatedAt │ │ createdAt    │
│ openBalance  │  │             │trackExpiry│└──────────┘ │ updatedAt    │
│ notes        │  │             │lowStock  │              └──────┬───────┘
│ isActive     │  │             │ imageUrl │                     │
│ createdAt    │  │             │ barcode  │                     ▼
│ updatedAt    │  │             │isService │              ┌──────────────────┐
└──────┬───────┘  │             │ isActive │              │PurchaseOrderItem │
       │          │             │createdAt │              │──────────────────│
       │          │             │updatedAt │              │ id (PK)          │
       │          │             └─────┬────┘              │purchaseOrderId   │
       │          │                   │                   │ productId (FK)   │──►Product
       │          │         ┌─────────┼─────────┐         │ quantity         │
       │          │         │         │         │         │ unitPrice        │
       │          ▼         ▼         ▼         ▼         │ totalPrice       │
       │  ┌────────────┐┌─────────┐┌─────────┐┌────────┐ │ batchNo          │
       │  │CustomerGroup││StockBatch││InvoiceItem││StockMv│ └──────────────────┘
       │  │────────────││─────────││─────────││────────│
       │  │ id (PK)    ││ id (PK) ││ id (PK) ││ id(PK) │
       │  │businessId  ││productId│─┘│invoiceId│─┐│productId│
       │  │ name       ││warehouseId││productId│ ││warehouse│
       │  │ discount   ││ batchNo  │ │ itemName│ ││ type    │
       │  │ createdAt  ││ quantity │ │ quantity│ ││quantity │
       │  └─────┬──────┘│expiryDate│ │ rate    │ ││refId    │
       │        │       │purchPrice│ │ discount│ ││refType  │
       │        ▼       │createdAt │ │taxable  │ ││notes    │
       │  ┌──────────┐  │updatedAt │ │ taxRate │ ││createdAt│
       │  │ Customer │  └─────────┘ │ cgst    │ │└─────────┘
       │  │  (self)  │              │ sgst    │ │
       │  └──────────┘              │ igst    │ │
       │                            │ total   │ │
       ▼                            │ batchNo │ │
┌──────────────────┐               │expiryDat│ │
│CustomerTransaction│              └─────────┘ │
│──────────────────│                           │
│ id (PK)          │                           │
│ customerId (FK)  │──►Customer                │
│ type             │                           │
│ amount           │                           │
│ balanceAfter     │                           │
│ description      │                           │
│ referenceId      │                           │
│ createdAt        │                           │
└──────────────────┘                           │
                                               │
┌──────────────────┐     ┌──────────────────┐  │
│     Invoice      │     │   CreditNote     │  │
│──────────────────│     │──────────────────│  │
│ id (PK)          │◄──┐ │ id (PK)          │  │
│ businessId (FK)  │   │ │ invoiceId (FK)   │──┘
│ customerId (FK)  │──┐│ │ creditNoteNo(UQ) │
│ invoiceNo (UQ)   │  ││ │ totalCredit      │
│ type             │  ││ │ reason           │
│ invoiceDate      │  ││ │ createdById (FK) │──►User
│ dueDate          │  ││ │ createdAt        │
│ subtotal         │  ││ └──────────────────┘
│ taxAmount        │  ││
│ discount         │  ││ ┌──────────────────┐
│ roundOff         │  ││ │ CreditNoteItem   │
│ grandTotal       │  ││ │──────────────────│
│ paidAmount       │  ││ │ id (PK)          │
│ status           │  ││ │ creditNoteId(FK) │──►CreditNote
│ notes            │  ││ │ invoiceItemId    │──►InvoiceItem
│ terms            │  ││ │ productId (FK)   │──►Product
│ ewayBillNo       │  ││ │ itemName         │
│ referenceId      │  ││ │ quantity         │
│ createdById (FK) │──┘│ │ unit, rate, tax  │
│ createdAt        │   │ │ cgst/sgst/igst   │
│ updatedAt        │   │ │ total            │
└──────────────────┘   │ │ reason           │
       │               │ └──────────────────┘
       │               │
       ▼               ▼
┌──────────────────┐
│     Payment      │     ┌──────────────────┐
│──────────────────│     │  RazorpayOrder   │
│ id (PK)          │     │──────────────────│
│ businessId (FK)  │     │ id (PK)          │
│ customerId (FK)  │     │ businessId (FK)  │
│ invoiceId (FK)   │     │ invoiceId        │
│ amount           │     │razorpayOrderId(UQ│
│ method           │     │ amount           │
│ status           │     │ currency         │
│ reference        │     │ status           │
│ notes            │     │ receipt          │
│ paidAt           │     │ createdAt        │
│ createdAt        │     │ updatedAt        │
│ updatedAt        │     └──────────────────┘
└──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│    AuditLog      │     │     SyncLog      │
│──────────────────│     │──────────────────│
│ id (PK)          │     │ id (PK)          │
│ businessId (FK)  │     │ deviceId         │
│ userId (FK)      │     │ businessId       │
│ action           │     │ table            │
│ entity           │     │ action           │
│ entityId         │     │ entityId         │
│ oldValues (JSON) │     │ payload (JSON)   │
│ newValues (JSON) │     │ status           │
│ ipAddress        │     │ errorMsg         │
│ userAgent        │     │ createdAt        │
│ createdAt        │     │ syncedAt         │
└──────────────────┘     └──────────────────┘
```

---

## Tables Reference

### User

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default uuid() | Unique identifier |
| phone | VARCHAR | UNIQUE, NOT NULL | Phone number (login credential) |
| email | VARCHAR | Nullable | Email address |
| passwordHash | VARCHAR | NOT NULL | bcrypt hashed password |
| name | VARCHAR | NOT NULL | Full name |
| role | ENUM | Default: BUSINESS_ADMIN | SUPER_ADMIN, BUSINESS_ADMIN, BUSINESS_EDITOR, BUSINESS_VIEWER |
| avatarUrl | VARCHAR | Nullable | Profile picture URL |
| isActive | BOOLEAN | Default: true | Account active flag |
| createdAt | TIMESTAMP | Default: now() | Creation timestamp |
| updatedAt | TIMESTAMP | Auto-updated | Last update timestamp |

**Indexes:** `phone` (unique)

---

### RefreshToken

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| token | VARCHAR | UNIQUE, NOT NULL | Refresh token value (UUID v4) |
| userId | UUID | FK → User.id, NOT NULL | Token owner |
| expiresAt | TIMESTAMP | NOT NULL | Expiration (7 days from creation) |
| createdAt | TIMESTAMP | Default: now() | Creation timestamp |
| revoked | BOOLEAN | Default: false | Revoked flag |

---

### UserBusiness (Join Table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| userId | UUID | FK → User.id | User reference |
| businessId | UUID | FK → Business.id | Business reference |
| role | ENUM | Default: BUSINESS_ADMIN | User's role in this business |
| isDefault | BOOLEAN | Default: false | Default business flag |
| joinedAt | TIMESTAMP | Default: now() | Membership timestamp |

**Unique constraint:** `(userId, businessId)`

---

### Business

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR | NOT NULL | Business name |
| gstin | VARCHAR | Nullable | GST Identification Number |
| phone | VARCHAR | Nullable | Business phone |
| email | VARCHAR | Nullable | Business email |
| address | VARCHAR | Nullable | Street address |
| city | VARCHAR | Nullable | City |
| state | VARCHAR | Nullable | State (used for GST calculation) |
| pincode | VARCHAR | Nullable | PIN code |
| logoUrl | VARCHAR | Nullable | Business logo URL |
| settings | JSON | Default: {} | Business-specific settings |
| isActive | BOOLEAN | Default: true | Active flag |
| createdAt | TIMESTAMP | Default: now() | |
| updatedAt | TIMESTAMP | Auto-updated | |

---

### Warehouse

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| businessId | UUID | FK → Business.id | Owner business |
| name | VARCHAR | NOT NULL | Warehouse name |
| address | VARCHAR | Nullable | |
| city | VARCHAR | Nullable | |
| state | VARCHAR | Nullable | |
| isActive | BOOLEAN | Default: true | |
| createdAt | TIMESTAMP | Default: now() | |
| updatedAt | TIMESTAMP | Auto-updated | |

---

### CustomerGroup

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| businessId | UUID | FK → Business.id | |
| name | VARCHAR | NOT NULL | Group name |
| discount | FLOAT | Nullable | Default discount % for group |
| createdAt | TIMESTAMP | Default: now() | |

---

### Customer

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| businessId | UUID | FK → Business.id, indexed | |
| groupId | UUID | FK → CustomerGroup.id, Nullable | |
| name | VARCHAR(200) | NOT NULL | Customer name |
| phone | VARCHAR | Nullable | |
| email | VARCHAR | Nullable | |
| gstin | VARCHAR | Nullable | Customer GSTIN |
| address | VARCHAR | Nullable | |
| city | VARCHAR | Nullable | |
| state | VARCHAR | Nullable | Used for IGST vs CGST+SGST |
| pincode | VARCHAR | Nullable | |
| creditLimit | FLOAT | Default: 0 | Max credit allowed |
| balance | FLOAT | Default: 0 | Current outstanding balance |
| openingBalance | FLOAT | Default: 0 | Initial balance |
| notes | VARCHAR | Nullable | |
| isActive | BOOLEAN | Default: true | |
| createdAt | TIMESTAMP | Default: now() | |
| updatedAt | TIMESTAMP | Auto-updated | |

**Indexes:** `businessId`

---

### CustomerTransaction

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| customerId | UUID | FK → Customer.id | |
| type | VARCHAR | NOT NULL | OPENING_BALANCE, INVOICE_CREATED, PAYMENT_RECEIVED |
| amount | FLOAT | NOT NULL | Transaction amount |
| balanceAfter | FLOAT | NOT NULL | Running balance after this transaction |
| description | VARCHAR | Nullable | Human-readable description |
| referenceId | UUID | Nullable | Related entity ID |
| createdAt | TIMESTAMP | Default: now() | |

---

### Category

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| businessId | UUID | FK → Business.id | |
| name | VARCHAR | NOT NULL | Category name |
| parentId | UUID | FK → Category.self, Nullable | Parent for hierarchy |
| createdAt | TIMESTAMP | Default: now() | |
| updatedAt | TIMESTAMP | Auto-updated | |

**Self-referential:** `parentId` → `Category.id` for nested categories.

---

### Product

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| businessId | UUID | FK → Business.id, indexed | |
| categoryId | UUID | FK → Category.id, Nullable | |
| name | VARCHAR | NOT NULL | Product/service name |
| sku | VARCHAR | Nullable | Stock Keeping Unit |
| hsnCode | VARCHAR | Nullable | HSN code for GST |
| unit | VARCHAR | Default: "piece" | Measurement unit |
| sellingPrice | FLOAT | Default: 0 | Sale price |
| purchasePrice | FLOAT | Default: 0 | Cost price |
| mrp | FLOAT | Nullable | Maximum Retail Price |
| taxRate | FLOAT | Default: 0 | GST rate (%) |
| taxType | VARCHAR | Default: "inclusive" | "inclusive" or "exclusive" |
| trackBatch | BOOLEAN | Default: false | Enable batch tracking |
| trackExpiry | BOOLEAN | Default: false | Enable expiry tracking |
| lowStockThreshold | INT | Default: 0 | Alert when stock ≤ threshold |
| imageUrl | VARCHAR | Nullable | Product image URL |
| barcode | VARCHAR | Nullable | Barcode/QR value |
| isService | BOOLEAN | Default: false | Service (no stock) vs product |
| isActive | BOOLEAN | Default: true | |
| createdAt | TIMESTAMP | Default: now() | |
| updatedAt | TIMESTAMP | Auto-updated | |

**Indexes:** `businessId`

---

### StockBatch

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| productId | UUID | FK → Product.id, indexed | |
| warehouseId | UUID | FK → Warehouse.id | |
| batchNo | VARCHAR | Nullable | Batch identifier |
| quantity | INT | Default: 0 | Current stock in this batch |
| expiryDate | TIMESTAMP | Nullable | Expiry date |
| purchasePrice | FLOAT | Nullable | Cost price for this batch |
| createdAt | TIMESTAMP | Default: now() | |
| updatedAt | TIMESTAMP | Auto-updated | |

**Unique constraint:** `(productId, warehouseId, batchNo)`
**Indexes:** `productId`

---

### StockMovement

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| productId | UUID | FK → Product.id, indexed | |
| warehouseId | UUID | FK → Warehouse.id | |
| batchNo | VARCHAR | Nullable | |
| type | ENUM | NOT NULL | PURCHASE, SALE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT, RETURN |
| quantity | INT | NOT NULL | Movement quantity |
| referenceId | UUID | Nullable | Related entity (invoice, PO, etc.) |
| referenceType | VARCHAR | Nullable | Entity type |
| notes | VARCHAR | Nullable | |
| createdAt | TIMESTAMP | Default: now() | |

---

### Supplier

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| businessId | UUID | FK → Business.id | |
| name | VARCHAR | NOT NULL | |
| phone | VARCHAR | Nullable | |
| email | VARCHAR | Nullable | |
| gstin | VARCHAR | Nullable | |
| address | VARCHAR | Nullable | |
| city | VARCHAR | Nullable | |
| state | VARCHAR | Nullable | |
| isActive | BOOLEAN | Default: true | |
| createdAt | TIMESTAMP | Default: now() | |
| updatedAt | TIMESTAMP | Auto-updated | |

---

### PurchaseOrder

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| businessId | UUID | FK → Business.id, indexed | |
| supplierId | UUID | FK → Supplier.id, Nullable | |
| orderNo | VARCHAR | UNIQUE, NOT NULL | Auto-generated: PO-{timestamp} |
| orderDate | TIMESTAMP | Default: now() | |
| expectedDate | TIMESTAMP | Nullable | |
| subtotal | FLOAT | Default: 0 | |
| taxAmount | FLOAT | Default: 0 | |
| discount | FLOAT | Default: 0 | |
| grandTotal | FLOAT | Default: 0 | |
| status | VARCHAR | Default: "PENDING" | PENDING, RECEIVED, CANCELLED |
| notes | VARCHAR | Nullable | |
| createdAt | TIMESTAMP | Default: now() | |
| updatedAt | TIMESTAMP | Auto-updated | |

---

### PurchaseOrderItem

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| purchaseOrderId | UUID | FK → PurchaseOrder.id | |
| productId | UUID | FK → Product.id | |
| quantity | INT | NOT NULL | |
| unitPrice | FLOAT | NOT NULL | |
| totalPrice | FLOAT | NOT NULL | quantity × unitPrice |
| batchNo | VARCHAR | Nullable | |

---

### Invoice

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| businessId | UUID | FK → Business.id, indexed | |
| customerId | UUID | FK → Customer.id, Nullable, indexed | Null for B2C walk-in |
| invoiceNo | VARCHAR | UNIQUE, NOT NULL | Auto-generated |
| type | ENUM | Default: B2C | B2B or B2C |
| invoiceDate | TIMESTAMP | Default: now() | |
| dueDate | TIMESTAMP | Nullable | |
| subtotal | FLOAT | Default: 0 | Sum of taxable values |
| taxAmount | FLOAT | Default: 0 | Total GST |
| discount | FLOAT | Default: 0 | Invoice-level discount |
| roundOff | FLOAT | Default: 0 | Rounding adjustment |
| grandTotal | FLOAT | Default: 0 | Final amount |
| paidAmount | FLOAT | Default: 0 | Amount paid so far |
| status | ENUM | Default: CONFIRMED | DRAFT, CONFIRMED, CANCELLED, CREDITED |
| notes | VARCHAR | Nullable | |
| terms | VARCHAR | Nullable | |
| ewayBillNo | VARCHAR | Nullable | E-way bill number |
| referenceId | VARCHAR | Nullable | External reference |
| createdById | UUID | FK → User.id | Creator |
| createdAt | TIMESTAMP | Default: now() | |
| updatedAt | TIMESTAMP | Auto-updated | |

**Indexes:** `businessId`, `customerId`

---

### InvoiceItem

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| invoiceId | UUID | FK → Invoice.id, indexed | |
| productId | UUID | FK → Product.id, Nullable, indexed | Null for manual items |
| itemName | VARCHAR | NOT NULL | Product name at time of invoice |
| quantity | FLOAT | NOT NULL | |
| unit | VARCHAR | Default: "piece" | |
| rate | FLOAT | NOT NULL | Unit price |
| discount | FLOAT | Default: 0 | Line-item discount |
| taxableValue | FLOAT | Default: 0 | Computed: qty×rate - discount |
| taxRate | FLOAT | Default: 0 | GST % |
| cgst | FLOAT | Default: 0 | Central GST |
| sgst | FLOAT | Default: 0 | State GST |
| igst | FLOAT | Default: 0 | Integrated GST (inter-state) |
| total | FLOAT | Default: 0 | taxableValue + all taxes |
| batchNo | VARCHAR | Nullable | |
| expiryDate | TIMESTAMP | Nullable | |

---

### CreditNote

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| invoiceId | UUID | FK → Invoice.id, indexed | |
| creditNoteNo | VARCHAR | UNIQUE, NOT NULL | Auto-generated: CN-{timestamp} |
| totalCredit | FLOAT | Default: 0 | Total credit amount |
| reason | VARCHAR | Nullable | |
| createdById | UUID | FK → User.id | |
| createdAt | TIMESTAMP | Default: now() | |

---

### CreditNoteItem

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| creditNoteId | UUID | FK → CreditNote.id | |
| invoiceItemId | UUID | FK → InvoiceItem.id | |
| productId | UUID | FK → Product.id, Nullable | |
| itemName | VARCHAR | NOT NULL | |
| quantity | FLOAT | NOT NULL | |
| unit | VARCHAR | Default: "piece" | |
| rate | FLOAT | NOT NULL | |
| discount | FLOAT | Default: 0 | |
| taxableValue | FLOAT | Default: 0 | |
| taxRate | FLOAT | Default: 0 | |
| cgst | FLOAT | Default: 0 | |
| sgst | FLOAT | Default: 0 | |
| igst | FLOAT | Default: 0 | |
| total | FLOAT | Default: 0 | |
| reason | VARCHAR | Nullable | |

---

### Payment

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| businessId | UUID | FK → Business.id, indexed | |
| customerId | UUID | FK → Customer.id, Nullable, indexed | |
| invoiceId | UUID | FK → Invoice.id, Nullable | |
| amount | FLOAT | NOT NULL | Payment amount |
| method | ENUM | NOT NULL | CASH, UPI, BANK_TRANSFER, CARD, RAZORPAY, CHEQUE |
| status | ENUM | Default: COMPLETED | PENDING, COMPLETED, FAILED, REFUNDED |
| reference | VARCHAR | Nullable | Transaction reference |
| notes | VARCHAR | Nullable | |
| paidAt | TIMESTAMP | Default: now() | |
| createdAt | TIMESTAMP | Default: now() | |
| updatedAt | TIMESTAMP | Auto-updated | |

---

### RazorpayOrder

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| businessId | UUID | FK → Business.id, indexed | |
| invoiceId | UUID | Nullable | |
| razorpayOrderId | VARCHAR | UNIQUE | Razorpay's order ID |
| amount | FLOAT | NOT NULL | Amount in INR |
| currency | VARCHAR | Default: "INR" | |
| status | VARCHAR | Default: "CREATED" | CREATED, CAPTURED, FAILED |
| receipt | VARCHAR | Nullable | |
| createdAt | TIMESTAMP | Default: now() | |
| updatedAt | TIMESTAMP | Auto-updated | |

---

### AuditLog

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| businessId | UUID | FK → Business.id, Nullable, indexed | |
| userId | UUID | FK → User.id, Nullable | |
| action | VARCHAR | NOT NULL | CREATE, UPDATE, DELETE |
| entity | VARCHAR | NOT NULL | Table name |
| entityId | UUID | Nullable | Record ID |
| oldValues | JSON | Nullable | Previous state |
| newValues | JSON | Nullable | New state |
| ipAddress | VARCHAR | Nullable | |
| userAgent | VARCHAR | Nullable | |
| createdAt | TIMESTAMP | Default: now() | |

---

### SyncLog

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | |
| deviceId | VARCHAR | NOT NULL | Mobile device identifier |
| businessId | VARCHAR | NOT NULL | Indexed |
| table | VARCHAR | NOT NULL | Table name |
| action | VARCHAR | NOT NULL | CREATE, UPDATE, DELETE |
| entityId | VARCHAR | NOT NULL | Record ID |
| payload | JSON | NOT NULL | Full change payload |
| status | ENUM | Default: PENDING | PENDING, SYNCED, CONFLICT, FAILED |
| errorMsg | VARCHAR | Nullable | |
| createdAt | TIMESTAMP | Default: now() | |
| syncedAt | TIMESTAMP | Nullable | When synced |

---

## Key Relationships

| Relationship | Type | Description |
|-------------|------|-------------|
| User ↔ Business | Many-to-Many | Via `UserBusiness` join table |
| Business → Customer | One-to-Many | `Customer.businessId` |
| Business → Product | One-to-Many | `Product.businessId` |
| Business → Invoice | One-to-Many | `Invoice.businessId` |
| Customer → Invoice | One-to-Many | `Invoice.customerId` (nullable) |
| Invoice → InvoiceItem | One-to-Many | `InvoiceItem.invoiceId` |
| Invoice → Payment | One-to-Many | `Payment.invoiceId` |
| Invoice → CreditNote | One-to-Many | `CreditNote.invoiceId` |
| Product → StockBatch | One-to-Many | `StockBatch.productId` |
| Warehouse → StockBatch | One-to-Many | `StockBatch.warehouseId` |
| Product → StockMovement | One-to-Many | `StockMovement.productId` |
| Category → Product | One-to-Many | `Product.categoryId` |
| Category → Category | Self-referential | `Category.parentId` |
| Customer → CustomerTransaction | One-to-Many | `CustomerTransaction.customerId` |
| CustomerGroup → Customer | One-to-Many | `Customer.groupId` |
| Supplier → PurchaseOrder | One-to-Many | `PurchaseOrder.supplierId` |
| PurchaseOrder → PurchaseOrderItem | One-to-Many | `PurchaseOrderItem.purchaseOrderId` |

---

## Migration Strategy

Migrations are managed by Prisma:

```bash
# Create a migration
npx prisma migrate dev --name <migration_name>

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

### Migration naming convention:
```
YYYYMMDDHHMMSS_<description>
```

### Best practices:
- Always use `prisma migrate dev` in development (never edit SQL directly)
- Test migrations against a copy of production data
- Use `@@index` annotations for frequently queried columns
- Soft-delete pattern (`isActive = false`) instead of hard deletes
- JSON fields (`settings`, `oldValues`) for flexible schema

# System Architecture — Wise Accounts

> High-level architecture documentation covering all platforms and cloud infrastructure.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Mobile Clients                              │
│  ┌──────────────────────────┐    ┌──────────────────────────┐      │
│  │    Android (Kotlin)       │    │      iOS (Swift)          │      │
│  │  ┌────────────────────┐  │    │  ┌────────────────────┐  │      │
│  │  │  Jetpack Compose UI │  │    │  │   SwiftUI Views    │  │      │
│  │  └────────┬───────────┘  │    │  └────────┬───────────┘  │      │
│  │  ┌────────┴───────────┐  │    │  ┌────────┴───────────┐  │      │
│  │  │  MVVM ViewModels   │  │    │  │  MVVM ViewModels   │  │      │
│  │  └────────┬───────────┘  │    │  └────────┬───────────┘  │      │
│  │  ┌────────┴───────────┐  │    │  ┌────────┴───────────┐  │      │
│  │  │  Repository Layer  │  │    │  │   APIService       │  │      │
│  │  └────────┬───────────┘  │    │  └────────┬───────────┘  │      │
│  │  ┌────────┴───────────┐  │    │  ┌────────┴───────────┐  │      │
│  │  │ Room DB │ Retrofit │  │    │  │LocalStorage│URLSes│  │      │
│  │  └────────┴───────────┘  │    │  └────────────────────┘  │      │
│  └──────────────┬───────────┘    └──────────────┬───────────┘      │
└─────────────────┼───────────────────────────────┼───────────────────┘
                  │  HTTPS / REST                 │  HTTPS / REST
                  ▼                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AWS API Gateway + WAF                             │
│              Rate Limiting · SSL Termination                         │
│              Request Validation · DDoS Protection                    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   ECS Fargate (NestJS Backend)                       │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Auth   │ │ Business │ │ Customer │ │Inventory │ │ Billing  │  │
│  │ Module  │ │  Module  │ │  Module  │ │  Module  │ │  Module  │  │
│  └─────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │Payments │ │ Reports  │ │  Sync    │ │ Notifs   │               │
│  │ Module  │ │  Module  │ │  Module  │ │  Module  │               │
│  └─────────┘ └──────────┘ └──────────┘ └──────────┘               │
└────────┬──────────────┬────────────────────────┬────────────────────┘
         │              │                        │
         ▼              ▼                        ▼
┌──────────────┐ ┌──────────────┐    ┌──────────────────────┐
│ PostgreSQL   │ │ Redis        │    │     AWS Services      │
│ (RDS)        │ │(ElastiCache) │    │                      │
│              │ │              │    │ ┌─────┐ ┌──────────┐ │
│ Primary data │ │ Sessions    │    │ │ S3  │ │ SQS      │ │
│ Multi-AZ     │ │ Cache       │    │ │ PDFs│ │ Async Jobs│ │
│ Encrypted    │ │ Rate Limit  │    │ └─────┘ └──────────┘ │
└──────────────┘ └──────────────┘    │ ┌─────┐ ┌──────────┐ │
                                     │ │ SES │ │ SNS      │ │
                                     │ │Email│ │ SMS/Push │ │
                                     │ └─────┘ └──────────┘ │
                                     │ ┌──────────────────┐  │
                                     │ │ CloudWatch       │  │
                                     │ │ Monitoring/Logs  │  │
                                     │ └──────────────────┘  │
                                     └──────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Backend Runtime** | Node.js | 20+ | Server runtime |
| **Backend Framework** | NestJS | 11.x | Enterprise-grade API framework |
| **Language (Backend)** | TypeScript | 5.7+ | Type-safe development |
| **ORM** | Prisma | 7.8+ | Type-safe database access |
| **Database** | PostgreSQL | 15+ | Primary relational database |
| **Cache** | Redis (ElastiCache) | 7+ | Session store, caching, rate limiting |
| **Android Language** | Kotlin | 1.9+ | Native Android development |
| **Android UI** | Jetpack Compose | BOM 2024.02 | Declarative UI toolkit |
| **Android DI** | Hilt | 2.50 | Dependency injection |
| **Android Local DB** | Room | 2.6+ | Offline persistence |
| **Android Networking** | Retrofit + OkHttp | 2.9 / 4.12 | HTTP client |
| **Android Background** | WorkManager | — | Background sync scheduling |
| **iOS Language** | Swift | 5.9+ | Native iOS development |
| **iOS UI** | SwiftUI | iOS 16+ | Declarative UI framework |
| **iOS Networking** | URLSession | — | Native HTTP client |
| **iOS Local Storage** | FileManager (JSON) | — | Offline caching |
| **iOS Background** | BGTaskScheduler | — | Background sync |
| **iOS Keychain** | Security Framework | — | Secure token storage |
| **Cloud Provider** | AWS | — | Infrastructure and services |
| **Container Orchestration** | ECS Fargate | — | Serverless containers |
| **IaC** | Terraform | 1.x | Infrastructure as Code |
| **CI/CD** | GitHub Actions | — | Automated pipelines |
| **API Docs** | Swagger (OpenAPI) | — | Interactive API documentation |

---

## Data Flow: Creating an Invoice

This trace follows the complete journey of an invoice from mobile app creation through database persistence:

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐
│ Mobile  │────>│  API GW  │────>│  NestJS  │────>│ PostgreSQL│────>│   S3      │
│  App    │     │  + WAF   │     │  Backend │     │   RDS    │     │ (PDF)     │
└─────────┘     └──────────┘     └──────────┘     └──────────┘     └───────────┘
```

### Step-by-step Flow

1. **User Action**: User taps "Create Invoice" on mobile app, fills in customer, items, quantities, and rates.

2. **GST Calculation (Client-side preview)**: The mobile app calculates a preview of GST (CGST/SGST/IGST) based on the business state vs. customer state to show the user the expected total.

3. **HTTP Request**: Mobile sends `POST /api/v1/businesses/:businessId/invoices` with JWT Bearer token in Authorization header.

4. **Rate Limiting**: AWS WAF checks for DDoS patterns. API Gateway applies rate limits (100 req/min per user). NestJS ThrottlerModule enforces per-user limits.

5. **Authentication**: `JwtAuthGuard` extracts the token from the Bearer header, validates the JWT signature and expiry via `JwtStrategy`. The strategy checks the user exists and is active in the database.

6. **Authorization**: `BusinessOwnershipGuard` verifies the authenticated user has a membership record in the `UserBusiness` table for the specified `businessId`.

7. **Request Validation**: `ValidationPipe` (with `whitelist: true` and `transform: true`) validates the `CreateInvoiceDto` using class-validator decorators. Invalid fields are stripped; invalid types throw 400.

8. **Invoice Number Generation**: `BillingService.generateInvoiceNumber()` creates a unique number with prefix (`INV-B2B-` or `INV-`), timestamp, and random suffix.

9. **Inter/Intra State Determination**: `BillingService.isInterState()` compares the business `state` with the customer `state`. If different, IGST applies; otherwise CGST + SGST.

10. **Tax Calculation**: For each line item:
    ```
    taxableValue = (quantity × rate) - discount
    if intraState:
        cgst = taxableValue × (taxRate/2) / 100
        sgst = taxableValue × (taxRate/2) / 100
    else:
        igst = taxableValue × taxRate / 100
    total = taxableValue + cgst + sgst + igst
    ```

11. **Database Transaction**: A Prisma `$transaction` wraps all writes:
    - Creates `Invoice` record with computed totals
    - Creates `InvoiceItem` records for each line item
    - Updates `Customer.balance` by adding `grandTotal`
    - Creates `CustomerTransaction` of type `INVOICE_CREATED`
    - Deducts stock from `StockBatch` records (FEFO order)

12. **Response**: Returns the created invoice with items and customer included.

13. **Client Update**: Mobile app receives the response, updates the local Room/CoreData database, and displays the created invoice.

14. **Sync**: If the user was offline, the invoice is queued in the local sync queue. When connectivity is restored, `WorkManager` (Android) or `BGTaskScheduler` (iOS) triggers a sync push to the server.

---

## Key Architectural Decisions

| ID | Decision | Summary | Details |
|----|----------|---------|---------|
| D-001 | Tech Stack | NestJS + Kotlin + Swift + AWS | [decisions.md](../decisions.md#d-001-tech-stack-selection) |
| D-002 | Native Apps | Separate native apps, not cross-platform | [decisions.md](../decisions.md#d-002-native-apps-not-cross-platform) |
| D-003 | Offline-First | All apps work offline with background sync | [decisions.md](../decisions.md#d-003-offline-first-architecture) |
| D-004 | AWS Infrastructure | ECS Fargate, RDS, ElastiCache, S3, SQS, Lambda | [decisions.md](../decisions.md#d-004-aws-infrastructure-architecture) |
| D-005 | API Design | RESTful, JWT auth, versioned, cursor-based pagination | [decisions.md](../decisions.md#d-005-api-design) |
| D-006 | GST Compliance | Full CGST/SGST/IGST, GSTR-1, GSTR-3B auto-generation | [decisions.md](../decisions.md#d-006-gst-compliance-approach) |
| D-007 | Payments | Razorpay primary gateway + UPI | [decisions.md](../decisions.md#d-007-payment-gateway) |
| D-008 | Multi-tenancy | Shared database, row-level isolation via `businessId` | [decisions.md](../decisions.md#d-008-database-schema-strategy) |
| D-009 | Multi-business | One account manages multiple businesses | [decisions.md](../decisions.md#d-009-multi-business-architecture) |
| D-010 | Inventory | Batch/expiry tracking, multi-warehouse, FIFO/FEFO | [decisions.md](../decisions.md#d-010-inventory-tracking) |
| D-011 | Security | bcrypt, JWT RS256, RDS encryption, WAF, audit logs | [decisions.md](../decisions.md#d-011-security-best-practices) |
| D-012 | CI/CD | GitHub Actions with staging→production pipeline | [decisions.md](../decisions.md#d-012-cicd-strategy) |
| D-013 | Code Review | Dedicated subagent review at Phase 6 | [decisions.md](../decisions.md#d-013-code-review-process) |
| D-014 | Distribution | Direct APK/IPA download + app store listing | [decisions.md](../decisions.md#d-014-downloadable-apps-strategy) |

---

## Module Dependency Graph

```
                    ┌──────────┐
                    │  Auth    │
                    │  Module  │
                    └────┬─────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Business │  │  Sync    │  │  Notifs  │
    │  Module  │  │  Module  │  │  Module  │
    └────┬─────┘  └──────────┘  └──────────┘
         │
    ┌────┼────────────┬────────────┐
    ▼    ▼            ▼            ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Customer│ │Inventory│ │Billing │ │Payments│
│ Module │ │ Module  │ │ Module │ │ Module │
└────────┘ └────────┘ └───┬────┘ └───┬────┘
                          │          │
                          ▼          │
                   ┌────────────┐    │
                   │  Reports   │◄───┘
                   │  Module    │
                   └────────────┘
```

---

## Security Architecture

```
Mobile App ──HTTPS/TLS 1.3──> AWS WAF ──> API Gateway ──> ECS Fargate
                                                                │
                                           ┌───────────────────┤
                                           │                   │
                                     ┌─────▼─────┐     ┌──────▼──────┐
                                     │  JwtGuard  │     │BusinessOwner│
                                     │  (Passport)│     │   Guard     │
                                     └─────┬─────┘     └──────┬──────┘
                                           │                   │
                                     ┌─────▼─────┐     ┌──────▼──────┐
                                     │  Roles    │     │ Rate Limiter│
                                     │   Guard   │     │(Throttler)  │
                                     └─────┬─────┘     └──────┬──────┘
                                           │                   │
                                           ▼                   ▼
                                     ┌──────────────────────────────┐
                                     │      Controller → Service     │
                                     │    (with ValidationPipe)      │
                                     └──────────────────────────────┘
```

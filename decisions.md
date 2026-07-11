# Decisions - Wise Accounts

> All architectural and design decisions recorded with rationale.
> Date: 2026-07-09

---

## D-001: Tech Stack Selection

| Decision | Value |
|----------|-------|
| **Backend** | Node.js + NestJS + TypeScript |
| **Database** | PostgreSQL (primary) + DynamoDB (cache/sessions) |
| **Android** | Kotlin + Jetpack Compose + MVVM |
| **iOS** | Swift + SwiftUI + MVVM |
| **Cloud** | AWS (ECS Fargate, RDS, S3, ElastiCache, SQS, Lambda) |
| **ORMs** | Prisma (backend), Room (Android), CoreData/SwiftData (iOS) |

**Rationale:**
- NestJS provides enterprise-grade structure with dependency injection, guards, interceptors
- Kotlin + Jetpack Compose is modern Android standard (Google-recommended)
- SwiftUI is Apple's modern declarative UI framework
- Prisma offers type-safe DB access with auto-generated types
- Room is Android's official local DB with compile-time SQL verification

---

## D-002: Native Apps (Not Cross-Platform)

| Decision | Value |
|----------|-------|
| **Approach** | Separate Kotlin (Android) & Swift (iOS) native apps |

**Rationale:**
- Better performance and native look & feel
- Access to platform-specific features (Bluetooth printers, thermal printing, NFC)
- Better offline support with platform-specific background sync
- GST invoice printing requires platform-specific printer SDKs
- Each platform gets optimized UX for its design guidelines
- Trade-off: ~40% more development time vs cross-platform

---

## D-003: Offline-First Architecture

**Decision:** All apps operate offline-first with background sync.

**Rationale:**
- Indian small shops frequently have poor/unreliable internet
- Users must be able to create invoices, record payments, and access customer data offline
- Sync happens automatically when connectivity is restored
- Conflict resolution: Last-Write-Wins with timestamp + UUID conflict detection

**Implementation:**
- Android: Room DB -> WorkManager -> Retrofit -> API -> PostgreSQL
- iOS: CoreData -> BGTaskScheduler -> URLSession -> API -> PostgreSQL
- Sync queue tracks pending changes with change logs

---

## D-004: AWS Infrastructure Architecture

**Chosen AWS Services:**

| Service | Purpose |
|---------|---------|
| **ECS Fargate** | Containerized backend (serverless containers) |
| **RDS PostgreSQL** | Primary relational database |
| **ElastiCache Redis** | Caching, session store, rate limiting |
| **S3** | Invoice PDFs, backups, user assets |
| **CloudFront** | CDN for static assets, PDF delivery |
| **SQS** | Async job queue (PDF gen, email, SMS) |
| **Lambda** | Serverless tasks (PDF generation, notifications) |
| **Cognito** | Authentication & user management |
| **API Gateway** | REST API management |
| **CloudWatch** | Monitoring, logging, alerts |
| **Route53** | DNS management with SSL |
| **AWS WAF** | API security & DDoS protection |

**Rationale:**
- Fargate avoids server management overhead vs EC2
- RDS with Multi-AZ ensures production reliability
- Redis caching reduces DB load for frequent queries
- SQS decouples heavy tasks from API response time
- Cognito integrates easily with both Android & iOS SDKs

---

## D-005: API Design

**Decision:** RESTful APIs with versioning (/api/v1/...)

- JWT-based authentication (access + refresh tokens)
- All responses follow JSON:API specification
- Pagination: Cursor-based for lists
- Request/Response validation using class-validator (NestJS)
- Rate limiting: 100 req/min per user, 1000 req/min per business

---

## D-006: GST Compliance Approach

**Decision:** Full GST compliance with auto-calculations

Supported tax structures:
- CGST + SGST (intra-state)
- IGST (inter-state)
- GST composition scheme
- Tax-exempt items
- Reverse charge mechanism

GST reports:
- GSTR-1 (outward supplies) - auto-generated from invoices
- GSTR-3B (summary return) - monthly summary
- E-way bill generation API integration

---

## D-007: Payment Gateway

**Decision:** Razorpay as primary payment gateway

- Razorpay Android/iOS SDK integration
- UPI payment link generation (static & dynamic)
- Payment verification webhook
- Refund support
- Settlement tracking

---

## D-008: Database Schema Strategy

**Decision:** Multi-tenant with shared database, row-level isolation

- Each business has a unique usinessId
- All tables include usiness_id column
- Row-Level Security (RLS) on PostgreSQL
- Separate schemas for audit logs
- Soft deletes on all entities

---

## D-009: Multi-Business Architecture

**Decision:** One account can manage multiple businesses

- Account user can create/switch between businesses
- Each business has independent:
  - GSTIN, address, logo
  - Products, customers, inventory
  - Invoices, payments, ledger
  - Subscription/license
- Users can be invited to manage other's businesses with roles (Admin, Editor, Viewer)

---

## D-010: Inventory Tracking

**Decision:** Advanced inventory with batch/expiry tracking

- Batch numbers tracked per product receipt
- Expiry date enforcement (warning at configurable threshold)
- Multiple warehouses with stock transfers
- FIFO/FEFO cost calculation methods
- Low stock alerts via push notification + SMS

---

## D-011: Security Best Practices

- All passwords hashed with bcrypt (12 rounds)
- JWT tokens signed with RS256 (asymmetric keys)
- Data encrypted at rest (RDS + S3 encryption)
- HTTPS enforced with TLS 1.3
- AWS WAF blocks SQL injection & XSS
- Audit logs track all create/update/delete operations
- Rate limiting per user & per IP
- Regular security audits via automated scanning

---

## D-012: CI/CD Strategy

**Decision:** GitHub Actions for all pipelines

| Trigger | Action |
|---------|--------|
| Push to develop | Build, test, deploy to staging |
| PR to main | Build, test, run security scan |
| Merge to main | Build, test, deploy to production |
| Daily | Run full test suite + security scan |

---

## D-013: Code Review Process

**Decision:** Dedicated subagent review at Phase 6

- Backend: Architecture review, security review, performance review
- Android: Architecture review, memory management, UI best practices
- iOS: Architecture review, memory management, Swift best practices
- All reviewers check: SOLID principles, DRY, test coverage, error handling

---

## D-014: Downloadable Apps Strategy

**Decision:** Apps distributed via direct download (APK/AAB/IPA)

- Android: AAB for Play Store + APK for direct download
- iOS: IPA via TestFlight + App Store
- Enterprise distribution for direct IPA download (if needed)
- Auto-update mechanism built into apps

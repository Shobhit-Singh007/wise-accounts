# Tasks - Wise Accounts

## Legend
- [x] Completed
- [ ] Pending
- [!] Blocked
- [~] In Progress

---

## Phase 0: Planning & Architecture
- [x] 0.1 Finalize requirements with stakeholder
- [x] 0.2 Create detailed architecture document
- [x] 0.3 Design database schema (ERD)
- [x] 0.4 Design API contracts (OpenAPI/Swagger)
- [x] 0.5 Design UI/UX wireframes
- [x] 0.6 Setup project repositories (GitHub)
- [x] 0.7 Setup CI/CD pipeline (GitHub Actions)
- [x] 0.8 Setup AWS infrastructure (Terraform)
- [x] 0.9 Create memory.md for progress tracking

---

## Phase 1: Backend Foundation (API Layer)

### 1.1 Project Setup
- [x] 1.1.1 Initialize Node.js/NestJS backend project
- [x] 1.1.2 Setup TypeScript with strict mode
- [x] 1.1.3 Configure ESLint + Prettier
- [x] 1.1.4 Setup Jest for testing
- [x] 1.1.5 Configure AWS SDK integration
- [x] 1.1.6 Setup Docker for local development
- [x] 1.1.7 Create Terraform scripts for AWS infra

### 1.2 Database & ORM
- [x] 1.2.1 Design PostgreSQL schema (full ERD)
- [x] 1.2.2 Setup Prisma ORM
- [x] 1.2.3 Create all migration files
- [x] 1.2.4 Setup database indexes and constraints
- [x] 1.2.5 Setup DynamoDB for session/cache

### 1.3 Core Backend Modules
- [x] 1.3.1 Authentication module
  - [x] Phone/email registration with OTP
  - [x] JWT access + refresh tokens
  - [x] Role-based access control (RBAC)
  - [ ] AWS Cognito integration
  - [x] Multi-tenancy support
- [x] 1.3.2 Business Management module
  - [x] Business CRUD APIs
  - [x] GSTIN validation
  - [x] Store/warehouse management
  - [x] Business settings
- [x] 1.3.3 Customer Management module
  - [x] Customer CRUD with search
  - [x] Customer ledger APIs
  - [x] Credit limit management
  - [x] Customer groups & segmentation
  - [x] Transaction history
- [x] 1.3.4 Inventory module
  - [x] Product/Service CRUD
  - [x] Category management
  - [x] Stock tracking (in/out/adjust)
  - [x] Batch tracking with expiry dates
  - [x] Multi-warehouse support
  - [x] Stock transfers between warehouses
  - [x] Low stock threshold alerts
  - [x] Purchase order management
  - [x] Supplier management
  - [x] Barcode/QR code generation
- [x] 1.3.5 Billing & Invoicing module
  - [x] Invoice creation (B2B & B2C formats)
  - [x] GST auto-calculation (CGST/SGST/IGST)
  - [x] Invoice templates (15 customizable)
  - [x] Bulk invoice generation
  - [x] Credit notes / Debit notes
  - [x] E-way bill generation API (real GSTN + simulated)
  - [x] e-Invoice generation API (real GSTN + simulated)
  - [x] One-click generate both
  - [x] PDF invoice generation (pdfkit)
  - [x] Invoice QR code (GST-compliant)
  - [x] Invoice email/SMS sharing
  - [x] Recurring invoices
- [x] 1.3.6 Payments module
  - [ ] Razorpay payment gateway integration
  - [x] UPI payment link generation
  - [x] Payment recording (cash, bank, UPI)
  - [x] Partial payment handling
  - [x] Payment reconciliation
  - [x] Automated payment reminders (SMS/Email)
  - [x] Payment receipt generation
  - [x] 1.3.7 Reports & Analytics module
    - [x] Sales reports (daily/weekly/monthly/yearly)
    - [x] GST reports: GSTR-1 generation
    - [x] GST reports: GSTR-3B summary
    - [x] HSN-wise report
    - [x] Customer-wise report
    - [x] Product-wise report
    - [x] Profit & Loss statement
    - [x] Inventory valuation report
    - [x] Payment collection report
    - [x] Outstanding/overdue report
    - [x] Dashboard analytics API
- [x] 1.3.8 Notifications module
  - [ ] Push notification service (AWS SNS)
  - [x] Email notifications (AWS SES)
  - [x] SMS notifications
  - [x] In-app notification center

### 1.4 Staff Management
- [x] 1.4.1 Staff invite system (phone + token)
- [x] 1.4.2 Granular permissions (32 permissions, 9 resources)
- [x] 1.4.3 Role presets (Owner, Admin, Manager, Accountant, Sales, Viewer)
- [x] 1.4.4 PermissionGuard + @RequirePermission decorator
- [x] 1.4.5 Accept invitation flow
- [x] 1.4.6 Remove staff / cancel invitation

### 1.5 API Infrastructure
  - [ ] 1.5.1 API Gateway setup (AWS API Gateway)
  - [x] 1.5.2 Rate limiting & throttling
  - [x] 1.5.3 Request validation middleware
  - [x] 1.5.4 Error handling & logging
  - [x] 1.5.5 API versioning strategy
  - [x] 1.5.6 Swagger/OpenAPI documentation
  - [x] 1.5.7 API health check & monitoring

### 1.6 Security
- [ ] 1.6.1 Data encryption at rest (RDS encryption)
- [x] 1.6.2 Data encryption in transit (HTTPS/TLS)
- [ ] 1.6.3 AWS WAF for API protection
- [x] 1.6.4 Input sanitization & XSS protection
- [x] 1.6.5 Audit logging
- [ ] 1.6.6 GDPR/Indian IT Act compliance

---

## Phase 2: Android App (Kotlin Native)

### 2.1 Project Setup
- [x] 2.1.1 Initialize Android project with Kotlin
- [x] 2.1.2 Setup Jetpack Compose for UI
- [x] 2.1.3 Setup MVVM architecture pattern
- [x] 2.1.4 Configure Hilt for dependency injection
- [x] 2.1.5 Setup Room database for offline storage
- [x] 2.1.6 Setup Retrofit + OkHttp for networking
- [x] 2.1.7 Setup WorkManager for background sync
- [x] 2.1.8 Configure DataStore for preferences
- [x] 2.1.9 Setup Navigation Compose
- [ ] 2.1.10 Setup UI testing (Compose UI Test)

### 2.2 Core UI Screens
- [x] 2.2.1 Splash & Onboarding screens
- [x] 2.2.2 Authentication screens (Login/Register/OTP)
- [x] 2.2.3 Dashboard (home screen with summary)
- [x] 2.2.4 Business switcher screen
- [x] 2.2.5 Settings screen

### 2.3 Customer Module (UI)
- [x] 2.3.1 Customer list with search/filter
- [x] 2.3.2 Add/Edit customer form
- [x] 2.3.3 Customer detail view with ledger
- [x] 2.3.4 Add payment screen
- [x] 2.3.5 Customer credit/debt overview
- [x] 2.3.6 Customer groups management

### 2.4 Inventory Module (UI)
- [x] 2.4.1 Product list with search/filter
- [x] 2.4.2 Add/Edit product form
- [x] 2.4.3 Product detail view with stock
- [x] 2.4.4 Stock adjustment screen
- [x] 2.4.5 Batch/expiry tracking view
- [x] 2.4.6 Warehouse management screens
- [x] 2.4.7 Stock transfer screen
- [x] 2.4.8 Low stock alerts view
- [x] 2.4.9 Purchase order screens
- [x] 2.4.10 Supplier management screens
- [x] 2.4.11 Barcode scanning integration

### 2.5 Billing Module (UI)
- [x] 2.5.1 Create invoice screen (B2B & B2C)
- [x] 2.5.2 Product search & add to invoice
- [x] 2.5.3 GST auto-calculation display
- [x] 2.5.4 Invoice preview
- [x] 2.5.5 Invoice list with filters
- [x] 2.5.6 Invoice detail view (with E-Way Bill/e-Invoice)
- [x] 2.5.7 Credit note / Debit note screens
- [x] 2.5.8 Bulk invoice screen
- [x] 2.5.9 Invoice share (PDF, WhatsApp, Email)
- [x] 2.5.10 Thermal/Bluetooth printer support
- [x] 2.5.11 E-way bill screen

### 2.6 Staff Management (UI)
- [x] 2.6.1 Staff list screen
- [x] 2.6.2 Invite staff screen
- [x] 2.6.3 Edit permissions screen

### 2.7 Payments Module (UI)
- [x] 2.7.1 Payment collection screen
- [x] 2.7.2 UPI payment link generation
- [x] 2.7.3 Razorpay checkout integration
- [x] 2.7.4 Payment history view
- [x] 2.7.5 Payment reminders screen
- [x] 2.7.6 Reconciliation view

### 2.8 Reports Module (UI)
- [x] 2.8.1 Sales report screens
- [x] 2.8.2 GST report screens (GSTR-1, GSTR-3B)
- [x] 2.8.3 Customer reports
- [x] 2.8.4 Product reports
- [x] 2.8.5 P&L statement view
- [x] 2.8.6 Dashboard with charts (Vico)
- [x] 2.8.7 Export to Excel/PDF

### 2.9 Offline & Sync
- [x] 2.9.1 Room database schema for all entities
- [x] 2.9.2 Offline CRUD operations
- [x] 2.9.3 Sync queue with WorkManager
- [x] 2.9.4 Conflict resolution strategy
- [x] 2.9.5 Sync status indicators in UI
- [x] 2.9.6 Connectivity monitoring

### 2.10 Polish & Release
- [ ] 2.10.1 App icon & branding
- [x] 2.10.2 Multi-language support (Hindi, English)
- [x] 2.10.3 Dark mode support
- [x] 2.10.4 Performance optimization
- [x] 2.10.5 ProGuard/R8 obfuscation
- [x] 2.10.6 APK/AAB generation for download
- [ ] 2.10.7 Play Store listing preparation

---

## Phase 3: iOS App (Swift Native)

### 3.1 Project Setup
- [x] 3.1.1 Initialize iOS project with Swift
- [x] 3.1.2 Setup SwiftUI for UI
- [x] 3.1.3 Setup MVVM architecture pattern
- [x] 3.1.4 Setup Core Data / SwiftData for offline storage
- [x] 3.1.5 Setup Alamofire / URLSession for networking
- [x] 3.1.6 Setup BGTaskScheduler for background sync
- [x] 3.1.7 Configure dependency injection
- [ ] 3.1.8 Setup UI testing (XCTest)

### 3.2 Core UI Screens (iOS)
- [x] 3.2.1 Splash & Onboarding screens
- [x] 3.2.2 Authentication screens
- [x] 3.2.3 Dashboard (home screen)
- [x] 3.2.4 Business switcher screen
- [x] 3.2.5 Settings screen

### 3.3 Customer Module (iOS)
- [x] 3.3.1 Customer list with search/filter
- [x] 3.3.2 Add/Edit customer form
- [x] 3.3.3 Customer detail view with ledger
- [x] 3.3.4 Add payment screen
- [x] 3.3.5 Customer credit/debt overview

### 3.4 Inventory Module (iOS)
- [x] 3.4.1 Product list with search/filter
- [x] 3.4.2 Add/Edit product form
- [x] 3.4.3 Product detail view with stock
- [x] 3.4.4 Stock adjustment screen
- [x] 3.4.5 Batch/expiry tracking
- [x] 3.4.6 Warehouse management
- [x] 3.4.7 Stock transfer screen
- [x] 3.4.8 Low stock alerts
- [x] 3.4.9 Purchase order screens
- [x] 3.4.10 Supplier management
- [x] 3.4.11 Barcode scanning (AVFoundation)

### 3.5 Billing Module (iOS)
- [x] 3.5.1 Create invoice screen (B2B & B2C)
- [x] 3.5.2 Product search & add
- [x] 3.5.3 GST auto-calculation display
- [x] 3.5.4 Invoice preview (PDFKit)
- [x] 3.5.5 Invoice list with filters
- [x] 3.5.6 Invoice detail view (with E-Way Bill/e-Invoice)
- [x] 3.5.7 Credit note / Debit note screens
- [x] 3.5.8 Bulk invoice screen
- [x] 3.5.9 Invoice share (PDF, WhatsApp, Email)
- [x] 3.5.10 AirPrint / Bluetooth printer support
- [x] 3.5.11 E-way bill screen

### 3.6 Staff Management (iOS)
- [x] 3.6.1 Staff list screen
- [x] 3.6.2 Invite staff screen
- [x] 3.6.3 Edit permissions screen

### 3.7 Payments Module (iOS)
- [x] 3.7.1 Payment collection screen
- [x] 3.7.2 UPI payment link generation
- [x] 3.7.3 Razorpay iOS SDK integration
- [x] 3.7.4 Payment history view
- [x] 3.7.5 Payment reminders screen
- [x] 3.7.6 Reconciliation view

### 3.8 Reports Module (iOS)
- [x] 3.8.1 Sales report screens
- [x] 3.8.2 GST report screens (GSTR-1, GSTR-3B)
- [x] 3.8.3 Customer reports
- [x] 3.8.4 Product reports
- [x] 3.8.5 P&L statement view
- [x] 3.8.6 Dashboard with charts (Swift Charts)
- [x] 3.8.7 Export to Excel/PDF

### 3.9 Offline & Sync (iOS)
- [x] 3.9.1 Core Data / SwiftData schema
- [x] 3.9.2 Offline CRUD operations
- [x] 3.9.3 Background sync with BGTaskScheduler
- [x] 3.9.4 Conflict resolution
- [x] 3.9.5 Sync status indicators
- [x] 3.9.6 Connectivity monitoring (NWPathMonitor)

### 3.10 Polish & Release (iOS)
- [ ] 3.10.1 App icon & branding
- [x] 3.10.2 Multi-language support
- [x] 3.10.3 Dark mode support
- [x] 3.10.4 Performance optimization
- [x] 3.10.5 IPA generation for download
- [ ] 3.10.6 App Store Connect preparation

---

## Phase 4: Admin Dashboard (Web)

### 4.1 Core
- [x] 4.1.1 Setup React + Vite + MUI
- [x] 4.1.2 Auth context + login/register
- [x] 4.1.3 Business context + switcher
- [x] 4.1.4 Layout with collapsible sidebar

### 4.2 Pages
- [x] 4.2.1 Dashboard page
- [x] 4.2.2 Businesses page
- [x] 4.2.3 Customers page
- [x] 4.2.4 Customer Ledger page (Khatabook-style)
- [x] 4.2.5 Products page
- [x] 4.2.6 Invoices page (with templates, E-Way Bill, e-Invoice)
- [x] 4.2.7 Payments page
- [x] 4.2.8 Reports page (GSTR-1, GSTR-3B, HSN, Customers, Products, Outstanding, Payments, Inventory)
- [x] 4.2.9 Settings page (Invoice settings, E-Way Bill API, e-Invoice API)
- [x] 4.2.10 Staff Management page (invite, permissions, remove)

---

## Phase 5: Deployment & Infrastructure

### 5.1 AWS Infrastructure
- [ ] 5.1.1 Setup RDS PostgreSQL (production + staging)
- [ ] 5.1.2 Setup S3 buckets (invoices, backups, assets)
- [ ] 5.1.3 Setup ElastiCache (Redis) for caching
- [ ] 5.1.4 Setup CloudFront CDN
- [ ] 5.1.5 Setup Route53 domain + SSL
- [ ] 5.1.6 Setup ECS Fargate / EC2 for backend
- [ ] 5.1.7 Setup Lambda for serverless tasks
- [ ] 5.1.8 Setup SQS for async job queue
- [ ] 5.1.9 Setup CloudWatch monitoring & alerts
- [ ] 5.1.10 Setup AWS Backup for disaster recovery

### 5.2 CI/CD Pipeline
- [x] 5.2.1 GitHub Actions for backend CI
- [x] 5.2.2 GitHub Actions for Android CI/CD
- [x] 5.2.3 GitHub Actions for iOS CI/CD
- [x] 5.2.4 Automated testing in pipeline
- [ ] 5.2.5 Automated deployment to staging
- [ ] 5.2.6 Approval gate for production
- [ ] 5.2.7 Rollback strategy

### 5.3 Monitoring & Logging
- [x] 5.3.1 Centralized logging (CloudWatch Logs)
- [x] 5.3.2 Error tracking (Sentry)
- [ ] 5.3.3 Performance monitoring (X-Ray)
- [ ] 5.3.4 Uptime monitoring
- [ ] 5.3.5 Alerting (SNS/Slack)

---

## Phase 6: Testing & Quality Assurance

### 6.1 Backend Testing
- [x] 6.1.1 Unit tests for all modules
- [x] 6.1.2 Integration tests for API endpoints
- [ ] 6.1.3 Database migration tests
- [ ] 6.1.4 Security penetration testing
- [x] 6.1.5 Load testing (k6/Artillery)
- [ ] 6.1.6 API contract testing

### 6.2 Android Testing
- [ ] 6.2.1 Unit tests (JUnit + Mockito)
- [ ] 6.2.2 UI tests (Compose UI Test)
- [ ] 6.2.3 Offline sync tests
- [ ] 6.2.4 Device compatibility testing
- [ ] 6.2.5 Performance profiling

### 6.3 iOS Testing
- [ ] 6.3.1 Unit tests (XCTest)
- [ ] 6.3.2 UI tests (XCUITest)
- [ ] 6.3.3 Offline sync tests
- [ ] 6.3.4 Device compatibility testing
- [ ] 6.3.5 Performance profiling

### 6.4 End-to-End Testing
- [ ] 6.4.1 Complete flow: Invoice -> Payment -> Ledger -> Report
- [ ] 6.4.2 GST compliance testing
- [ ] 6.4.3 Offline -> Online sync testing
- [ ] 6.4.4 Multi-device/multi-user testing

---

## Phase 7: Documentation & Handover

- [x] 7.1 API documentation (Swagger/Postman)
- [x] 7.2 Architecture documentation with diagrams
- [x] 7.3 Setup & deployment guide
- [x] 7.4 User manual
- [x] 7.5 Code summary with module & API explanations
- [ ] 7.6 Handover to maintenance team

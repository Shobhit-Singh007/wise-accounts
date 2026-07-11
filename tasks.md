# Tasks - Wise Accounts

## Legend
- [ ] Pending
- [x] Completed
- [!] Blocked
- [~] In Progress

---

## Phase 0: Planning & Architecture (Current)
- [ ] 0.1 Finalize requirements with stakeholder
- [ ] 0.2 Create detailed architecture document
- [ ] 0.3 Design database schema (ERD)
- [ ] 0.4 Design API contracts (OpenAPI/Swagger)
- [ ] 0.5 Design UI/UX wireframes (Figma)
- [ ] 0.6 Setup project repositories (GitHub)
- [ ] 0.7 Setup CI/CD pipeline (GitHub Actions)
- [ ] 0.8 Setup AWS infrastructure (Terraform)
- [ ] 0.9 Create memory.md for progress tracking

---

## Phase 1: Backend Foundation (API Layer)

### 1.1 Project Setup
- [ ] 1.1.1 Initialize Node.js/NestJS backend project
- [ ] 1.1.2 Setup TypeScript with strict mode
- [ ] 1.1.3 Configure ESLint + Prettier
- [ ] 1.1.4 Setup Jest for testing
- [ ] 1.1.5 Configure AWS SDK integration
- [ ] 1.1.6 Setup Docker for local development
- [ ] 1.1.7 Create Terraform scripts for AWS infra

### 1.2 Database & ORM
- [ ] 1.2.1 Design PostgreSQL schema (full ERD)
- [ ] 1.2.2 Setup Prisma ORM
- [ ] 1.2.3 Create all migration files
- [ ] 1.2.4 Setup database indexes and constraints
- [ ] 1.2.5 Setup DynamoDB for session/cache

### 1.3 Core Backend Modules
- [ ] 1.3.1 Authentication module
  - [ ] Phone/email registration with OTP
  - [ ] JWT access + refresh tokens
  - [ ] Role-based access control (RBAC)
  - [ ] AWS Cognito integration
  - [ ] Multi-tenancy support
- [ ] 1.3.2 Business Management module
  - [ ] Business CRUD APIs
  - [ ] GSTIN validation
  - [ ] Store/warehouse management
  - [ ] Business settings
- [ ] 1.3.3 Customer Management module
  - [ ] Customer CRUD with search
  - [ ] Customer ledger APIs
  - [ ] Credit limit management
  - [ ] Customer groups & segmentation
  - [ ] Transaction history
- [ ] 1.3.4 Inventory module
  - [ ] Product/Service CRUD
  - [ ] Category management
  - [ ] Stock tracking (in/out/adjust)
  - [ ] Batch tracking with expiry dates
  - [ ] Multi-warehouse support
  - [ ] Stock transfers between warehouses
  - [ ] Low stock threshold alerts
  - [ ] Purchase order management
  - [ ] Supplier management
  - [ ] Barcode/QR code generation
- [ ] 1.3.5 Billing & Invoicing module
  - [ ] Invoice creation (B2B & B2C formats)
  - [ ] GST auto-calculation (CGST/SGST/IGST)
  - [ ] Invoice templates (customizable)
  - [ ] Bulk invoice generation
  - [ ] Credit notes / Debit notes
  - [ ] E-way bill generation API
  - [ ] PDF invoice generation (S3 storage)
  - [ ] Invoice QR code (GST-compliant)
  - [ ] Invoice email/SMS sharing
  - [ ] Recurring invoices
- [ ] 1.3.6 Payments module
  - [ ] Razorpay payment gateway integration
  - [ ] UPI payment link generation
  - [ ] Payment recording (cash, bank, UPI)
  - [ ] Partial payment handling
  - [ ] Payment reconciliation
  - [ ] Automated payment reminders (SMS/Email)
  - [ ] Payment receipt generation
- [ ] 1.3.7 Reports & Analytics module
  - [ ] Sales reports (daily/weekly/monthly/yearly)
  - [ ] GST reports: GSTR-1 generation
  - [ ] GST reports: GSTR-3B summary
  - [ ] Customer-wise report
  - [ ] Product-wise report
  - [ ] Profit & Loss statement
  - [ ] Inventory valuation report
  - [ ] Payment collection report
  - [ ] Outstanding/overdue report
  - [ ] Dashboard analytics API
- [ ] 1.3.8 Notifications module
  - [ ] Push notification service (AWS SNS)
  - [ ] Email notifications (AWS SES)
  - [ ] SMS notifications (AWS SNS)
  - [ ] In-app notification center
### 1.4 API Infrastructure
- [ ] 1.4.1 API Gateway setup (AWS API Gateway)
- [ ] 1.4.2 Rate limiting & throttling
- [ ] 1.4.3 Request validation middleware
- [ ] 1.4.4 Error handling & logging (CloudWatch)
- [ ] 1.4.5 API versioning strategy
- [ ] 1.4.6 Swagger/OpenAPI documentation
- [ ] 1.4.7 API health check & monitoring

### 1.5 Security
- [ ] 1.5.1 Data encryption at rest (RDS encryption)
- [ ] 1.5.2 Data encryption in transit (HTTPS/TLS)
- [ ] 1.5.3 AWS WAF for API protection
- [ ] 1.5.4 Input sanitization & XSS protection
- [ ] 1.5.5 Audit logging
- [ ] 1.5.6 GDPR/Indian IT Act compliance

---

## Phase 2: Android App (Kotlin Native)

### 2.1 Project Setup
- [ ] 2.1.1 Initialize Android project with Kotlin
- [ ] 2.1.2 Setup Jetpack Compose for UI
- [ ] 2.1.3 Setup MVVM architecture pattern
- [ ] 2.1.4 Configure Hilt for dependency injection
- [ ] 2.1.5 Setup Room database for offline storage
- [ ] 2.1.6 Setup Retrofit + OkHttp for networking
- [ ] 2.1.7 Setup WorkManager for background sync
- [ ] 2.1.8 Configure DataStore for preferences
- [ ] 2.1.9 Setup Navigation Compose
- [ ] 2.1.10 Setup UI testing (Compose UI Test)

### 2.2 Core UI Screens
- [ ] 2.2.1 Splash & Onboarding screens
- [ ] 2.2.2 Authentication screens (Login/Register/OTP)
- [ ] 2.2.3 Dashboard (home screen with summary)
- [ ] 2.2.4 Business switcher screen
- [ ] 2.2.5 Settings screen

### 2.3 Customer Module (UI)
- [ ] 2.3.1 Customer list with search/filter
- [ ] 2.3.2 Add/Edit customer form
- [ ] 2.3.3 Customer detail view with ledger
- [ ] 2.3.4 Add payment screen
- [ ] 2.3.5 Customer credit/debt overview
- [ ] 2.3.6 Customer groups management

### 2.4 Inventory Module (UI)
- [ ] 2.4.1 Product list with search/filter
- [ ] 2.4.2 Add/Edit product form
- [ ] 2.4.3 Product detail view with stock
- [ ] 2.4.4 Stock adjustment screen
- [ ] 2.4.5 Batch/expiry tracking view
- [ ] 2.4.6 Warehouse management screens
- [ ] 2.4.7 Stock transfer screen
- [ ] 2.4.8 Low stock alerts view
- [ ] 2.4.9 Purchase order screens
- [ ] 2.4.10 Supplier management screens
- [ ] 2.4.11 Barcode scanning integration

### 2.5 Billing Module (UI)
- [ ] 2.5.1 Create invoice screen (B2B & B2C)
- [ ] 2.5.2 Product search & add to invoice
- [ ] 2.5.3 GST auto-calculation display
- [ ] 2.5.4 Invoice preview
- [ ] 2.5.5 Invoice list with filters
- [ ] 2.5.6 Invoice detail view
- [ ] 2.5.7 Credit note / Debit note screens
- [ ] 2.5.8 Bulk invoice screen
- [ ] 2.5.9 Invoice share (PDF, WhatsApp, Email)
- [ ] 2.5.10 Thermal/Bluetooth printer support
- [ ] 2.5.11 E-way bill screen

### 2.6 Payments Module (UI)
- [ ] 2.6.1 Payment collection screen
- [ ] 2.6.2 UPI payment link generation
- [ ] 2.6.3 Razorpay checkout integration
- [ ] 2.6.4 Payment history view
- [ ] 2.6.5 Payment reminders screen
- [ ] 2.6.6 Reconciliation view

### 2.7 Reports Module (UI)
- [ ] 2.7.1 Sales report screens
- [ ] 2.7.2 GST report screens (GSTR-1, GSTR-3B)
- [ ] 2.7.3 Customer reports
- [ ] 2.7.4 Product reports
- [ ] 2.7.5 P&L statement view
- [ ] 2.7.6 Dashboard with charts (MPAndroidChart)
- [ ] 2.7.7 Export to Excel/PDF

### 2.8 Offline & Sync
- [ ] 2.8.1 Room database schema for all entities
- [ ] 2.8.2 Offline CRUD operations
- [ ] 2.8.3 Sync queue with WorkManager
- [ ] 2.8.4 Conflict resolution strategy
- [ ] 2.8.5 Sync status indicators in UI
- [ ] 2.8.6 Connectivity monitoring

### 2.9 Polish & Release
- [ ] 2.9.1 App icon & branding
- [ ] 2.9.2 Multi-language support (Hindi, English)
- [ ] 2.9.3 Dark mode support
- [ ] 2.9.4 Performance optimization
- [ ] 2.9.5 ProGuard/R8 obfuscation
- [ ] 2.9.6 APK/AAB generation for download
- [ ] 2.9.7 Play Store listing preparation
---

## Phase 3: iOS App (Swift Native)

### 3.1 Project Setup
- [ ] 3.1.1 Initialize iOS project with Swift
- [ ] 3.1.2 Setup SwiftUI for UI
- [ ] 3.1.3 Setup MVVM architecture pattern
- [ ] 3.1.4 Setup Core Data / SwiftData for offline storage
- [ ] 3.1.5 Setup Alamofire / URLSession for networking
- [ ] 3.1.6 Setup BGTaskScheduler for background sync
- [ ] 3.1.7 Configure dependency injection
- [ ] 3.1.8 Setup UI testing (XCTest)

### 3.2 Core UI Screens (iOS)
- [ ] 3.2.1 Splash & Onboarding screens
- [ ] 3.2.2 Authentication screens
- [ ] 3.2.3 Dashboard (home screen)
- [ ] 3.2.4 Business switcher screen
- [ ] 3.2.5 Settings screen

### 3.3 Customer Module (iOS)
- [ ] 3.3.1 Customer list with search/filter
- [ ] 3.3.2 Add/Edit customer form
- [ ] 3.3.3 Customer detail view with ledger
- [ ] 3.3.4 Add payment screen
- [ ] 3.3.5 Customer credit/debt overview

### 3.4 Inventory Module (iOS)
- [ ] 3.4.1 Product list with search/filter
- [ ] 3.4.2 Add/Edit product form
- [ ] 3.4.3 Product detail view with stock
- [ ] 3.4.4 Stock adjustment screen
- [ ] 3.4.5 Batch/expiry tracking
- [ ] 3.4.6 Warehouse management
- [ ] 3.4.7 Stock transfer screen
- [ ] 3.4.8 Low stock alerts
- [ ] 3.4.9 Purchase order screens
- [ ] 3.4.10 Supplier management
- [ ] 3.4.11 Barcode scanning (AVFoundation)

### 3.5 Billing Module (iOS)
- [ ] 3.5.1 Create invoice screen (B2B & B2C)
- [ ] 3.5.2 Product search & add
- [ ] 3.5.3 GST auto-calculation display
- [ ] 3.5.4 Invoice preview (PDFKit)
- [ ] 3.5.5 Invoice list with filters
- [ ] 3.5.6 Invoice detail view
- [ ] 3.5.7 Credit note / Debit note screens
- [ ] 3.5.8 Bulk invoice screen
- [ ] 3.5.9 Invoice share (PDF, WhatsApp, Email)
- [ ] 3.5.10 AirPrint / Bluetooth printer support
- [ ] 3.5.11 E-way bill screen

### 3.6 Payments Module (iOS)
- [ ] 3.6.1 Payment collection screen
- [ ] 3.6.2 UPI payment link generation
- [ ] 3.6.3 Razorpay iOS SDK integration
- [ ] 3.6.4 Payment history view
- [ ] 3.6.5 Payment reminders screen
- [ ] 3.6.6 Reconciliation view

### 3.7 Reports Module (iOS)
- [ ] 3.7.1 Sales report screens
- [ ] 3.7.2 GST report screens (GSTR-1, GSTR-3B)
- [ ] 3.7.3 Customer reports
- [ ] 3.7.4 Product reports
- [ ] 3.7.5 P&L statement view
- [ ] 3.7.6 Dashboard with charts (Charts library)
- [ ] 3.7.7 Export to Excel/PDF

### 3.8 Offline & Sync (iOS)
- [ ] 3.8.1 Core Data / SwiftData schema
- [ ] 3.8.2 Offline CRUD operations
- [ ] 3.8.3 Background sync with BGTaskScheduler
- [ ] 3.8.4 Conflict resolution
- [ ] 3.8.5 Sync status indicators
- [ ] 3.8.6 Connectivity monitoring (NWPathMonitor)

### 3.9 Polish & Release (iOS)
- [ ] 3.9.1 App icon & branding
- [ ] 3.9.2 Multi-language support
- [ ] 3.9.3 Dark mode support
- [ ] 3.9.4 Performance optimization
- [ ] 3.9.5 IPA generation for download
- [ ] 3.9.6 App Store Connect preparation
---

## Phase 4: Backend Deployment & Infrastructure

### 4.1 AWS Infrastructure
- [ ] 4.1.1 Setup RDS PostgreSQL (production + staging)
- [ ] 4.1.2 Setup S3 buckets (invoices, backups, assets)
- [ ] 4.1.3 Setup ElastiCache (Redis) for caching
- [ ] 4.1.4 Setup CloudFront CDN
- [ ] 4.1.5 Setup Route53 domain + SSL
- [ ] 4.1.6 Setup ECS Fargate / EC2 for backend
- [ ] 4.1.7 Setup Lambda for serverless tasks
- [ ] 4.1.8 Setup SQS for async job queue
- [ ] 4.1.9 Setup CloudWatch monitoring & alerts
- [ ] 4.1.10 Setup AWS Backup for disaster recovery

### 4.2 CI/CD Pipeline
- [ ] 4.2.1 GitHub Actions for backend CI
- [ ] 4.2.2 GitHub Actions for Android CI/CD
- [ ] 4.2.3 GitHub Actions for iOS CI/CD
- [ ] 4.2.4 Automated testing in pipeline
- [ ] 4.2.5 Automated deployment to staging
- [ ] 4.2.6 Approval gate for production
- [ ] 4.2.7 Rollback strategy

### 4.3 Monitoring & Logging
- [ ] 4.3.1 Centralized logging (CloudWatch Logs)
- [ ] 4.3.2 Error tracking (Sentry)
- [ ] 4.3.3 Performance monitoring (X-Ray)
- [ ] 4.3.4 Uptime monitoring
- [ ] 4.3.5 Alerting (SNS/Slack)

---

## Phase 5: Testing & Quality Assurance

### 5.1 Backend Testing
- [ ] 5.1.1 Unit tests for all modules
- [ ] 5.1.2 Integration tests for API endpoints
- [ ] 5.1.3 Database migration tests
- [ ] 5.1.4 Security penetration testing
- [ ] 5.1.5 Load testing (k6/Artillery)
- [ ] 5.1.6 API contract testing

### 5.2 Android Testing
- [ ] 5.2.1 Unit tests (JUnit + Mockito)
- [ ] 5.2.2 UI tests (Compose UI Test)
- [ ] 5.2.3 Offline sync tests
- [ ] 5.2.4 Device compatibility testing
- [ ] 5.2.5 Performance profiling

### 5.3 iOS Testing
- [ ] 5.3.1 Unit tests (XCTest)
- [ ] 5.3.2 UI tests (XCUITest)
- [ ] 5.3.3 Offline sync tests
- [ ] 5.3.4 Device compatibility testing
- [ ] 5.3.5 Performance profiling

### 5.4 End-to-End Testing
- [ ] 5.4.1 Complete flow: Invoice -> Payment -> Ledger -> Report
- [ ] 5.4.2 GST compliance testing
- [ ] 5.4.3 Offline -> Online sync testing
- [ ] 5.4.4 Multi-device/multi-user testing

---

## Phase 6: Code Review & Optimization

- [ ] 6.1 Backend code review (subagent)
- [ ] 6.2 Android code review (subagent)
- [ ] 6.3 iOS code review (subagent)
- [ ] 6.4 Security audit
- [ ] 6.5 Performance optimization
- [ ] 6.6 Database query optimization
- [ ] 6.7 App size optimization

---

## Phase 7: Deployment & Distribution

- [ ] 7.1 Deploy backend to AWS production
- [ ] 7.2 Generate Android APK/AAB for download
- [ ] 7.3 Generate iOS IPA for download
- [ ] 7.4 Create deployment documentation
- [ ] 7.5 Create admin dashboard (web)
- [ ] 7.6 Production smoke tests

---

## Phase 8: Documentation & Handover

- [ ] 8.1 API documentation (Swagger/Postman)
- [ ] 8.2 Architecture documentation with diagrams
- [ ] 8.3 Setup & deployment guide
- [ ] 8.4 User manual
- [ ] 8.5 Code summary with module & API explanations
- [ ] 8.6 Handover to maintenance team

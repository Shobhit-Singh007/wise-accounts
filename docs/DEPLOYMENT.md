# Deployment Guide — Wise Accounts

> Step-by-step deployment instructions for all components.

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| AWS Account | With programmatic access (Access Key + Secret) |
| AWS CLI | v2.x configured (`aws configure`) |
| Terraform | v1.5+ installed |
| Docker | v24+ with Docker Compose |
| Node.js | v20+ (for backend builds) |
| Android Studio | Latest stable (for Android builds) |
| Xcode | 15+ with Apple Developer account (for iOS) |
| Domain | Registered domain (e.g., `wiseaccounts.app`) |
| SSL Certificate | ACM certificate for HTTPS |
| Razorpay Account | Test + Live API keys |

---

## Step 1: Terraform Infrastructure Deployment

### 1.1 Configure Variables

Create `infrastructure/terraform/environments/prod.tfvars`:

```hcl
environment       = "prod"
aws_region        = "ap-south-1"
project_name      = "wise-accounts"

# VPC
vpc_cidr             = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]
availability_zones   = ["ap-south-1a", "ap-south-1b"]

# RDS
db_instance_class        = "db.t3.medium"
db_allocated_storage     = 50
db_max_allocated_storage = 100
db_name                   = "wiseaccounts"
db_username               = "admin"
db_password               = "<use-aws-secrets-manager>"
multi_az                  = true
db_backup_retention_period = 30

# ECS
ecs_cluster_name    = "wise-accounts-cluster"
ecs_service_name    = "wise-accounts-api"
container_image     = "<account-id>.dkr.ecr.ap-south-1.amazonaws.com/wise-accounts:latest"
container_cpu       = 512
container_memory    = 1024
app_desired_count   = 2
app_min_count       = 1
app_max_count       = 4

# Domain
domain_name      = "api.wiseaccounts.app"
certificate_arn  = "arn:aws:acm:ap-south-1:<account-id>:certificate/<cert-id>"

# Redis
redis_node_type      = "cache.t3.micro"
redis_num_cache_nodes = 1

# Security
jwt_secret = "<generate-strong-secret>"

# Email
ses_sender_email = "noreply@wiseaccounts.app"
sns_topic_email  = "admin@wiseaccounts.app"
```

### 1.2 Initialize and Apply

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan (review changes)
terraform plan -var-file=environments/prod.tfvars

# Apply (create infrastructure)
terraform apply -var-file=environments/prod.tfvars

# Save outputs
terraform output -json > ../outputs.json
```

### 1.3 Infrastructure Created

| Resource | Purpose |
|----------|---------|
| VPC + Subnets | Network isolation (public/private) |
| ALB | Load balancer with SSL termination |
| ECS Fargate Cluster | Container orchestration |
| RDS PostgreSQL | Primary database (Multi-AZ) |
| ElastiCache Redis | Caching and sessions |
| S3 Buckets | PDFs, backups, assets |
| Cognito | User pool and identity pool |
| KMS Key | Encryption key for RDS + S3 |
| CloudWatch | Log groups and alarms |
| IAM Roles | Task execution and task roles |

---

## Step 2: Backend Docker Build and ECR Push

### 2.1 Create ECR Repository

```bash
aws ecr create-repository --repository-name wise-accounts --region ap-south-1
```

### 2.2 Login to ECR

```bash
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-south-1.amazonaws.com
```

### 2.3 Create Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main"]
```

### 2.4 Build and Push

```bash
cd backend

# Build image
docker build -t wise-accounts:latest .

# Tag for ECR
docker tag wise-accounts:latest <account-id>.dkr.ecr.ap-south-1.amazonaws.com/wise-accounts:latest

# Push to ECR
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/wise-accounts:latest
```

---

## Step 3: ECS Service Deployment

### 3.1 Update Task Definition

The Terraform module creates the ECS service. Update the image in `prod.tfvars`:

```hcl
container_image = "<account-id>.dkr.ecr.ap-south-1.amazonaws.com/wise-accounts:latest"
```

Then re-apply Terraform:

```bash
terraform apply -var-file=environments/prod.tfvars -target=module.ecs
```

### 3.2 Force New Deployment

```bash
aws ecs update-service \
  --cluster wise-accounts-cluster \
  --service wise-accounts-api \
  --force-new-deployment \
  --region ap-south-1
```

### 3.3 Verify

```bash
# Check service status
aws ecs describe-services \
  --cluster wise-accounts-cluster \
  --services wise-accounts-api \
  --region ap-south-1

# Check running tasks
aws ecs list-tasks \
  --cluster wise-accounts-cluster \
  --region ap-south-1

# Test health endpoint
curl https://api.wiseaccounts.app/api/v1/health
```

---

## Step 4: Database Migrations

### 4.1 Run Migrations

```bash
# Set DATABASE_URL from Terraform output
export DATABASE_URL="postgresql://admin:<password>@<rds-endpoint>:5432/wiseaccounts?schema=public"

# Run Prisma migrations
cd backend
npx prisma migrate deploy
```

### 4.2 Verify Schema

```bash
npx prisma studio  # Opens browser with data browser
```

---

## Step 5: Android APK/AAB Generation

### 5.1 Configure Signing

Create `android/app/release-key.properties`:

```properties
storePassword=<keystore-password>
keyPassword=<key-password>
keyAlias=wise-accounts
file=release-key.jks
```

### 5.2 Generate Keystore

```bash
keytool -genkey -v -keystore android/app/release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias wise-accounts
```

### 5.3 Build Release APK

```bash
cd android

# Build APK (direct download)
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

### 5.4 Build Release AAB (Play Store)

```bash
# Build AAB (Play Store)
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 5.5 Build with ProGuard

Release builds automatically enable:
- `isMinifyEnabled = true` (R8 minification)
- ProGuard rules from `proguard-rules.pro`

---

## Step 6: iOS IPA Generation

### 6.1 Configure Signing

In Xcode:
1. Open `ios/GSTBilling.xcodeproj`
2. Select the project → Signing & Capabilities
3. Select your Apple Developer Team
4. Set Bundle Identifier: `com.wiseaccounts.app`

### 6.2 Archive and Export IPA

```bash
# Archive
xcodebuild archive \
  -project ios/GSTBilling.xcodeproj \
  -scheme GSTBilling \
  -archivePath build/GSTBilling.xcarchive \
  -destination "generic/platform=iOS"

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/GSTBilling.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/
```

### 6.3 ExportOptions.plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
```

---

## Environment Variables Reference

### Backend `.env`

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `your-super-secret-key` |
| `JWT_EXPIRY` | Access token lifetime | `15m` |
| `PORT` | Server port | `3000` |
| `CORS_ORIGIN` | Allowed origins | `https://app.wiseaccounts.app` |
| `AWS_REGION` | AWS region | `ap-south-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key | — |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | — |
| `SES_FROM_EMAIL` | Sender email for SES | `noreply@wiseaccounts.app` |
| `RAZORPAY_KEY_ID` | Razorpay test/live key | `rzp_test_xxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | — |
| `UPI_ID` | UPI payment ID | `payment@upi` |

### Android `build.gradle.kts`

| Variable | Description |
|----------|-------------|
| `API_BASE_URL` | Backend URL (changes per build type) |

---

## CI/CD Pipeline (GitHub Actions)

### Backend CI (`.github/workflows/backend-ci.yml`)

```yaml
name: Backend CI
on:
  push:
    paths: ['backend/**']
  pull_request:
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
        working-directory: backend
      - run: npm run lint
        working-directory: backend
      - run: npm run test:cov
        working-directory: backend
      - run: npm run build
        working-directory: backend
```

### Backend CD (`.github/workflows/backend-cd.yml`)

```yaml
name: Backend CD
on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1
      
      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build and push
        working-directory: backend
        run: |
          docker build -t wise-accounts:${{ github.sha }} .
          docker tag wise-accounts:${{ github.sha }} ${{ secrets.ECR_REGISTRY }}/wise-accounts:${{ github.sha }}
          docker push ${{ secrets.ECR_REGISTRY }}/wise-accounts:${{ github.sha }}
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
  --cluster wise-accounts-cluster \
  --service wise-accounts-api \
            --force-new-deployment
```

---

## Rollback Procedures

### Backend Rollback

```bash
# Option 1: Redeploy previous image
aws ecs update-service \
  --cluster wise-accounts-cluster \
  --service wise-accounts-api \
  --task-definition wise-accounts:<previous-revision>

# Option 2: Force new deployment with current image
aws ecs update-service \
  --cluster wise-accounts-cluster \
  --service wise-accounts-api \
  --force-new-deployment

# Option 3: Rollback via Terraform
cd infrastructure/terraform
terraform apply -var-file=environments/prod.tfvars -target=module.ecs
```

### Database Rollback

```bash
# Rollback last migration
npx prisma migrate reset  # WARNING: Destructive

# Or manually revert specific migration
npx prisma migrate dev --create-only --name rollback_<migration>
# Edit the generated SQL, then:
npx prisma migrate deploy
```

### Infrastructure Rollback

```bash
cd infrastructure/terraform
terraform plan -var-file=environments/prod.tfvars  # Review changes
terraform apply -var-file=environments/prod.tfvars  # Apply
```

---

## Monitoring

### CloudWatch Alarms

| Alarm | Metric | Threshold |
|-------|--------|-----------|
| High CPU | ECS CPU Utilization | > 80% for 5 min |
| High Memory | ECS Memory Utilization | > 85% for 5 min |
| 5xx Errors | ALB 5xx Count | > 10 in 5 min |
| High Latency | ALB Target Response Time | > 2s for 5 min |
| RDS CPU | RDS CPU Utilization | > 75% for 10 min |
| RDS Storage | RDS Free Storage | < 1 GB |

### Logs

```bash
# View ECS logs
aws logs tail /ecs/wise-accounts --follow

# View ALB access logs
aws s3 ls s3://<alb-logs-bucket>/ --recursive
```

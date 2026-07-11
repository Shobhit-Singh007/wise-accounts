# Keys & Configuration Reference

> **Place all required keys and variables here before deployment.**
> This file serves as a single source of truth for all configuration values.

---

## 1. Backend Environment Variables (`.env`)

Create `backend/.env` with these values:

```env
# Database
DATABASE_URL="postgresql://shobhit:postgres@<host>:5432/wise_accounts?schema=public"

# JWT Authentication
JWT_SECRET="<generate-a-random-64-char-string>"
JWT_EXPIRY="15m"

# Server
PORT=3000
CORS_ORIGIN="https://yourdomain.com"

# AWS Configuration
AWS_REGION="ap-south-1"
AWS_ACCESS_KEY_ID="<your-aws-access-key>"
AWS_SECRET_ACCESS_KEY="<your-aws-secret-key>"
SES_FROM_EMAIL="noreply@yourdomain.com"

# Razorpay Payment Gateway
RAZORPAY_KEY_ID="<your-razorpay-key-id>"
RAZORPAY_KEY_SECRET="<your-razorpay-key-secret>"

# UPI
UPI_ID="yourbusiness@upi"
```

> **Generate JWT_SECRET**: Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## 2. AWS Account

| Resource | Value | Notes |
|----------|-------|-------|
| AWS Account ID | `_____________` | Found in AWS Console |
| AWS Region | `ap-south-1` | Mumbai — closest to India |
| Domain Name | `_____________` | e.g., api.yourbusiness.com |
| Hosted Zone ID (Route53) | `_____________` | From Route53 console |
| SSL Certificate ARN | `_____________` | From ACM console |

**Required AWS Services to enable:**
- [ ] VPC
- [ ] RDS (PostgreSQL)
- [ ] ECS Fargate
- [ ] ECR (Docker registry)
- [ ] S3 (3 buckets)
- [ ] ElastiCache (Redis)
- [ ] Cognito
- [ ] Route53
- [ ] ACM (SSL)
- [ ] SES (email)
- [ ] SNS (SMS)
- [ ] CloudWatch
- [ ] WAF

---

## 3. Android Signing

| Key | Value | Notes |
|-----|-------|-------|
| Keystore Password | `_____________` | Set during keystore generation |
| Key Alias | `_____________` | e.g., `wise_accounts_key` |
| Key Password | `_____________` | Can be same as keystore password |
| Keystore File | `android/app/wise_accounts.keystore` | Generated during setup |

**For Play Store release, additionally need:**
- [ ] Play Console account ($25 one-time)
- [ ] App signing key from Google
- [ ] Privacy policy URL

---

## 4. iOS / Apple Developer

| Key | Value | Notes |
|-----|-------|-------|
| Apple Team ID | `_____________` | From Apple Developer account |
| Bundle Identifier | `com.gstbilling.app` | Must match Xcode project |
| App Store Connect API Key | `_____________` | For CI/CD |
| Distribution Certificate | `_____________` | From Apple Developer portal |
| Provisioning Profile | `_____________` | For App Store distribution |

**Steps after getting Apple Developer account:**
1. Create App ID with bundle `com.gstbilling.app`
2. Generate Distribution Certificate
3. Create App Store Provisioning Profile
4. Upload to GitHub Secrets:
   - `IOS_SIGNING_IDENTITY`
   - `IOS_PROVISIONING_PROFILE`
   - `IOS_PROVISIONING_PROFILE_SPECIFIER`
   - `APP_STORE_CONNECT_API_KEY`

---

## 5. GitHub Secrets (for CI/CD)

Set these in GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | From AWS IAM user |
| `AWS_SECRET_ACCESS_KEY` | From AWS IAM user |
| `AWS_ACCOUNT_ID` | 12-digit AWS account ID |
| `AWS_REGION` | `ap-south-1` |
| `AWS_ROLE_ARN_DEV` | `arn:aws:iam::<account>:role/wise-accounts-dev-role` |
| `AWS_ROLE_ARN_PROD` | `arn:aws:iam::<account>:role/wise-accounts-prod-role` |
| `ANDROID_SIGNING_KEY_STORE` | Base64 of keystore file |
| `ANDROID_SIGNING_KEY_ALIAS` | Key alias from keystore |
| `ANDROID_SIGNING_KEY_PASSWORD` | Key password |
| `ANDROID_SIGNING_STORE_PASSWORD` | Keystore password |
| `SLACK_WEBHOOK_URL` | For deployment notifications |

---

## 6. Razorpay

| Key | Value | Notes |
|-----|-------|-------|
| Key ID | `_____________` | From Razorpay Dashboard |
| Key Secret | `_____________` | From Razorpay Dashboard |
| Webhook Secret | `_____________` | Set in Razorpay Dashboard |
| Webhook URL | `https://api.yourdomain.com/api/v1/payments/razorpay-webhook` | Configure in Razorpay |

---

## 7. Domain & DNS

| Record | Type | Value |
|--------|------|-------|
| `api.yourdomain.com` | CNAME or A | ALB DNS name (from Terraform output) |
| `admin.yourdomain.com` | CNAME | For admin dashboard (if deployed) |

---

## 8. Third-Party Services (Optional)

- [ ] **Sentry**: Error tracking — `SENTRY_DSN` env var
- [ ] **SendGrid**: Email fallback — `SENDGRID_API_KEY`
- [ ] **Twilio**: SMS fallback — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- [ ] **New Relic**: APM monitoring — `NEW_RELIC_LICENSE_KEY`

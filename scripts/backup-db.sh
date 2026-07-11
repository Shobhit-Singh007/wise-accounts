#!/bin/bash
set -e

# ───────────────────────────────────────────────────
# backup-db.sh — Backup PostgreSQL database and upload to S3
# Usage: ./backup-db.sh [environment]
#   environment: dev | prod (default: dev)
#   Requires: AWS CLI, pg_dump, terraform outputs configured
# ───────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-dev}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()    { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $*"; }
log_success() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] OK:${NC} $*"; }
log_error()   { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*"; }

# ── Check prerequisites ───────────────────────────
for cmd in aws pg_dump terraform; do
  if ! command -v "$cmd" &> /dev/null; then
    log_error "'${cmd}' is required but not installed."
    exit 1
  fi
done

# ── Environment configuration ─────────────────────
TF_DIR="${PROJECT_ROOT}/infrastructure/terraform/environments/${ENVIRONMENT}"
BACKUP_TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
BACKUP_FILE="/tmp/wise-accounts-${ENVIRONMENT}-db-${BACKUP_TIMESTAMP}.sql.gz"
BACKUP_FILENAME=$(basename "$BACKUP_FILE")
RETENTION_DAYS=30

# ── Step 1: Get RDS endpoint from terraform output ─
if [ ! -d "$TF_DIR" ]; then
  log_error "Terraform directory not found: ${TF_DIR}"
  exit 1
fi

log_info "Getting RDS endpoint from terraform (environment: ${ENVIRONMENT})..."
cd "$TF_DIR"

terraform init -reconfigure -input=false -backend-config="key=wise-accounts/${ENVIRONMENT}/terraform.tfstate" 2>&1 | tail -1

RDS_ENDPOINT=$(terraform output -raw rds_endpoint 2>/dev/null || echo "")
RDS_PORT=$(terraform output -raw rds_port 2>/dev/null || echo "5432")
DB_NAME=$(terraform output -raw rds_database_name 2>/dev/null || echo "wiseaccounts")
BACKUP_BUCKET=$(terraform output -raw backups_bucket_name 2>/dev/null || echo "")

if [ -z "$RDS_ENDPOINT" ]; then
  log_error "Failed to get RDS endpoint from terraform output. Is terraform applied?"
  exit 1
fi

if [ -z "$BACKUP_BUCKET" ]; then
  log_error "Failed to get backups bucket name from terraform output"
  exit 1
fi

log_info "RDS Endpoint: ${RDS_ENDPOINT}:${RDS_PORT}"
log_info "Database:     ${DB_NAME}"
log_info "Backup Bucket: s3://${BACKUP_BUCKET}"

# ── Step 2: Get database credentials ──────────────
log_info "Reading database credentials..."

DB_USER=$(terraform output -raw db_username 2>/dev/null || echo "wiseaccounts_admin")
DB_PASSWORD=$(grep -r "db_password" "${TF_DIR}/terraform.tfvars" 2>/dev/null \
  | head -1 \
  | sed 's/.*= *"//' \
  | sed 's/".*//' \
  || echo "")

# Fallback: get from SSM Parameter Store
if [ -z "$DB_PASSWORD" ]; then
  log_info "Fetching DB password from AWS SSM Parameter Store..."
  DB_PASSWORD=$(aws ssm get-parameter \
    --name "/wise-accounts/${ENVIRONMENT}/db-password" \
    --with-decryption \
    --query "Parameter.Value" \
    --output text 2>/dev/null || echo "")
fi

if [ -z "$DB_PASSWORD" ]; then
  log_error "Could not retrieve database password"
  echo "  Set it via terraform.tfvars or SSM Parameter Store:"
  echo "  /wise-accounts/${ENVIRONMENT}/db-password"
  exit 1
fi

# ── Step 3: Run pg_dump ──────────────────────────
log_info "Starting pg_dump (this may take a while for large databases)..."

export PGPASSWORD="$DB_PASSWORD"
pg_dump \
  -h "$RDS_ENDPOINT" \
  -p "$RDS_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --compress=9 \
  --verbose \
  -f "$BACKUP_FILE" 2>&1

unset PGPASSWORD

if [ ! -f "$BACKUP_FILE" ]; then
  log_error "Backup file was not created"
  exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_success "Database dump completed: ${BACKUP_FILE} (${BACKUP_SIZE})"

# ── Step 4: Upload to S3 ─────────────────────────
log_info "Uploading to S3..."
aws s3 cp "$BACKUP_FILE" "s3://${BACKUP_BUCKET}/${ENVIRONMENT}/${BACKUP_FILENAME}" \
  --storage-class STANDARD_IA

if [ $? -ne 0 ]; then
  log_error "S3 upload failed"
  rm -f "$BACKUP_FILE"
  exit 1
fi
log_success "Backup uploaded to s3://${BACKUP_BUCKET}/${ENVIRONMENT}/${BACKUP_FILENAME}"

# ── Step 5: Cleanup old backups (>30 days) ────────
log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."
OLD_BACKUPS=$(aws s3api list-objects \
  --bucket "$BACKUP_BUCKET" \
  --prefix "${ENVIRONMENT}/" \
  --query "Contents[?LastModified<='$(date -d "-${RETENTION_DAYS} days" '+%Y-%m-%dT%H:%M:%SZ')'].[Key]" \
  --output text)

if [ -n "$OLD_BACKUPS" ]; then
  COUNT=$(echo "$OLD_BACKUPS" | wc -l)
  log_info "Removing ${COUNT} old backup(s)..."
  echo "$OLD_BACKUPS" | while read -r KEY; do
    if [ -n "$KEY" ]; then
      aws s3 rm "s3://${BACKUP_BUCKET}/${KEY}"
      log_info "  Deleted: ${KEY}"
    fi
  done
  log_success "Old backups cleaned up"
else
  log_info "No backups older than ${RETENTION_DAYS} days to clean up"
fi

# ── Remove local temp file ────────────────────────
rm -f "$BACKUP_FILE"
log_info "Temporary file removed"

echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Backup Summary${NC}"
echo -e "${GREEN}  Environment:  ${ENVIRONMENT}${NC}"
echo -e "${GREEN}  Database:     ${DB_NAME}${NC}"
echo -e "${GREEN}  Backup Size:  ${BACKUP_SIZE}${NC}"
echo -e "${GREEN}  S3 Location:  s3://${BACKUP_BUCKET}/${ENVIRONMENT}/${BACKUP_FILENAME}${NC}"
echo -e "${GREEN}  Retention:    ${RETENTION_DAYS} days${NC}"
echo -e "${GREEN}  Completed At: $(date)${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"

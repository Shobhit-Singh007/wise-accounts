#!/bin/bash
set -e

# ───────────────────────────────────────────────────
# run-migrations.sh — Run Prisma database migrations
# Usage: ./run-migrations.sh [command]
#   command: deploy | status | reset | generate (default: deploy)
# ───────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="${PROJECT_ROOT}/backend"

COMMAND="${1:-deploy}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $*"; }
log_success() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] OK:${NC} $*"; }
log_error()   { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*"; }

# ── Step 1: Verify Prisma is installed ────────────
if ! command -v npx &> /dev/null; then
  log_error "npx not found. Node.js is required."
  exit 1
fi

cd "$BACKEND_DIR"

# Validate Prisma is in dependencies
if [ ! -f "package.json" ]; then
  log_error "No package.json found in ${BACKEND_DIR}"
  exit 1
fi

PRISMA_DIR="${BACKEND_DIR}/prisma"
if [ ! -d "$PRISMA_DIR" ]; then
  log_error "Prisma directory not found at ${PRISMA_DIR}"
  exit 1
fi

# ── Step 2: Set DATABASE_URL if not set ───────────
if [ -z "$DATABASE_URL" ]; then
  if [ -f ".env" ]; then
    source .env
  fi
  if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL is not set and no .env file found"
    echo "  Export DATABASE_URL or create a .env file in ${BACKEND_DIR}"
    exit 1
  fi
fi

log_info "Using database: $(echo "$DATABASE_URL" | sed 's|://[^:]*:[^@]*@|://***:***@|')"

# ── Step 3: Generate Prisma client ────────────────
if [ "$COMMAND" = "deploy" ] || [ "$COMMAND" = "generate" ]; then
  log_info "Generating Prisma client..."
  npx prisma generate
  log_success "Prisma client generated"
fi

# ── Step 4: Run migration command ─────────────────
case "$COMMAND" in
  deploy)
    log_info "Running 'prisma migrate deploy'..."
    npx prisma migrate deploy

    log_info "Running 'prisma db push' to sync any remaining schema changes..."
    npx prisma db push --accept-data-loss 2>/dev/null || npx prisma db push
    ;;

  status)
    log_info "Checking migration status..."
    npx prisma migrate status
    ;;

  reset)
    log_info "WARNING: This will delete ALL data in the database!"
    read -rp "Type 'reset' to confirm: " CONFIRM
    if [ "$CONFIRM" = "reset" ]; then
      log_info "Resetting database and applying all migrations..."
      npx prisma migrate reset --force
      log_success "Database reset completed"
    else
      log_info "Reset cancelled"
      exit 0
    fi
    ;;

  generate)
    log_info "Prisma client regenerated (no migration changes applied)"
    ;;

  *)
    log_error "Unknown command '${COMMAND}'. Use: deploy | status | reset | generate"
    exit 1
    ;;
esac

# ── Step 5: Verify migration status ───────────────
if [ "$COMMAND" = "deploy" ]; then
  log_info "Verifying migration status..."
  PENDING_COUNT=$(npx prisma migrate status 2>&1 | grep -c "Pending" || true)
  if [ "$PENDING_COUNT" -gt 0 ]; then
    log_error "${PENDING_COUNT} pending migration(s) detected after deploy"
    npx prisma migrate status
    exit 1
  fi
  log_success "All migrations applied successfully"
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Migration Summary${NC}"
echo -e "${GREEN}  Command:      ${COMMAND}${NC}"
echo -e "${GREEN}  Backend Dir:  ${BACKEND_DIR}${NC}"
echo -e "${GREEN}  Completed At: $(date)${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"

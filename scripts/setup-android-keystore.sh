#!/bin/bash
set -e

# ───────────────────────────────────────────────────
# setup-android-keystore.sh — Generate Android debug keystore
# Usage: ./setup-android-keystore.sh [output_path]
#   output_path: Path for generated keystore (default: android/app/debug.keystore)
# ───────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

DEFAULT_OUTPUT="${PROJECT_ROOT}/android/app/debug.keystore"
OUTPUT_FILE="${1:-$DEFAULT_OUTPUT}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $*"; }
log_success() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] OK:${NC} $*"; }
log_error()   { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*"; }

# ── Step 1: Check for keytool ─────────────────────
if ! command -v keytool &> /dev/null; then
  log_error "keytool not found. Java JDK is required."
  echo "  Install JDK: https://adoptium.net/ or via your package manager"
  echo "  Ensure JAVA_HOME/bin is in your PATH"
  exit 1
fi

KEYTOOL_VERSION=$(keytool -version 2>&1 | head -1)
log_info "Using: ${KEYTOOL_VERSION}"

# ── Step 2: Create output directory ───────────────
OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
mkdir -p "$OUTPUT_DIR"

# ── Step 3: Check for existing keystore ───────────
if [ -f "$OUTPUT_FILE" ]; then
  log_info "Keystore already exists at ${OUTPUT_FILE}"
  read -rp "Overwrite? (y/N): " CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    log_info "Keystore generation cancelled"
    exit 0
  fi
  rm -f "$OUTPUT_FILE"
fi

# ── Step 4: Generate keystore ─────────────────────
KEY_ALIAS="androiddebugkey"
KEY_VALIDITY=10000
KEY_PASSWORD="android"
STORE_PASSWORD="android"
DNAME="CN=Android Debug, O=Android, C=US"

log_info "Generating debug keystore..."
log_info "  Output:    ${OUTPUT_FILE}"
log_info "  Alias:     ${KEY_ALIAS}"
log_info "  Validity:  ${KEY_VALIDITY} days"

keytool -genkey \
  -v \
  -keystore "$OUTPUT_FILE" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "$KEY_VALIDITY" \
  -storepass "$STORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -dname "$DNAME"

log_success "Keystore generated at ${OUTPUT_FILE}"

# ── Step 5: Verify keystore ───────────────────────
log_info "Verifying keystore contents..."
keytool -list \
  -keystore "$OUTPUT_FILE" \
  -storepass "$STORE_PASSWORD" \
  -v 2>&1 | head -20

# ── Step 6: Ensure .gitignore excludes release keystores ──
GITIGNORE="${PROJECT_ROOT}/android/app/.gitignore"
if [ ! -f "$GITIGNORE" ]; then
  echo "*.keystore" > "$GITIGNORE"
  echo "*.jks" >> "$GITIGNORE"
  log_info "Created .gitignore for keystore files"
else
  if ! grep -q "\.keystore" "$GITIGNORE" 2>/dev/null; then
    echo "*.keystore" >> "$GITIGNORE"
    log_info "Added *.keystore to .gitignore"
  fi
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Keystore Summary${NC}"
echo -e "${GREEN}  File:     ${OUTPUT_FILE}${NC}"
echo -e "${GREEN}  Alias:    ${KEY_ALIAS}${NC}"
echo -e "${GREEN}  Store Pwd: ${STORE_PASSWORD}${NC}"
echo -e "${GREEN}  Key Pwd:   ${KEY_PASSWORD}${NC}"
echo -e "${GREEN}  Validity:  ${KEY_VALIDITY} days${NC}"
echo -e "${GREEN}  Created At: $(date)${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}  For release builds, generate a production keystore with:${NC}"
echo -e "  keytool -genkey -v -keystore ${PROJECT_ROOT}/android/app/wise_accounts.keystore \\"
echo -e "    -alias wise_accounts_key -keyalg RSA -keysize 2048 -validity 10000"
echo ""

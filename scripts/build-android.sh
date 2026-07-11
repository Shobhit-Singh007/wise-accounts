#!/bin/bash
set -e

# ───────────────────────────────────────────────────
# build-android.sh — Build Android APK/AAB
# Usage: ./build-android.sh [release|debug] [aab|apk]
#   build_type: release | debug (default: debug)
#   package_type: aab | apk (default: apk)
# ───────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ANDROID_DIR="${PROJECT_ROOT}/android"
OUTPUT_DIR="${SCRIPT_DIR}/output"
KEYSTORE_FILE="${ANDROID_DIR}/app/wise_accounts.keystore"

BUILD_TYPE="${1:-debug}"
PACKAGE_TYPE="${2:-apk}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $*"; }
log_success() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] OK:${NC} $*"; }
log_error()   { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*"; }
log_step()    { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] STEP:${NC} $*"; }

# Validate build type
if [ "$BUILD_TYPE" != "release" ] && [ "$BUILD_TYPE" != "debug" ]; then
  log_error "Invalid build type '${BUILD_TYPE}'. Use 'release' or 'debug'."
  exit 1
fi

if [ "$PACKAGE_TYPE" != "aab" ] && [ "$PACKAGE_TYPE" != "apk" ]; then
  log_error "Invalid package type '${PACKAGE_TYPE}'. Use 'aab' or 'apk'."
  exit 1
fi

# ── Step 1: Check keystore for release builds ─────
if [ "$BUILD_TYPE" = "release" ]; then
  if [ ! -f "$KEYSTORE_FILE" ]; then
    log_error "Keystore not found at ${KEYSTORE_FILE}"
    echo -e "  Generate one with: ${YELLOW}./scripts/setup-android-keystore.sh${NC}"
    exit 1
  fi
  log_info "Using keystore: ${KEYSTORE_FILE}"
else
  log_info "Building in DEBUG mode (no signing required)"
fi

# ── Step 2: Create output directory ───────────────
mkdir -p "$OUTPUT_DIR"

# ── Step 3: Run Gradle build ──────────────────────
BUILD_TASK="assemble$(echo ${BUILD_TYPE} | sed 's/^[a-z]/\U&/')"
if [ "$PACKAGE_TYPE" = "aab" ]; then
  BUILD_TASK="bundle$(echo ${BUILD_TYPE} | sed 's/^[a-z]/\U&/')"
fi

log_step "Running './gradlew ${BUILD_TASK}'..."
cd "$ANDROID_DIR"

if [ "$(uname)" = "MINGW"* ] || [ "$(uname)" = "MSYS"* ]; then
  GRADLE_CMD="./gradlew.bat"
else
  GRADLE_CMD="./gradlew"
fi

if [ ! -f "$GRADLE_CMD" ]; then
  log_error "Gradle wrapper not found at ${GRADLE_CMD}"
  exit 1
fi

chmod +x "$GRADLE_CMD" 2>/dev/null || true
$GRADLE_CMD $BUILD_TASK --no-daemon --stacktrace
log_success "Gradle build completed"

# ── Step 4: Locate and copy output file ──────────
log_info "Locating build output..."
if [ "$PACKAGE_TYPE" = "aab" ]; then
  BUILD_DIR="${ANDROID_DIR}/app/build/outputs/bundle/${BUILD_TYPE}"
  FILE_EXT="aab"
else
  BUILD_DIR="${ANDROID_DIR}/app/build/outputs/apk/${BUILD_TYPE}"
  FILE_EXT="apk"
fi

BUILT_FILE=$(find "$BUILD_DIR" -name "*.${FILE_EXT}" -type f 2>/dev/null | head -1)

if [ -z "$BUILT_FILE" ] || [ ! -f "$BUILT_FILE" ]; then
  log_error "Build output file not found in ${BUILD_DIR}"
  echo "  Available files:"
  find "$BUILD_DIR" -type f 2>/dev/null || echo "  (none)"
  exit 1
fi

OUTPUT_NAME="wise-accounts-${BUILD_TYPE}-$(date '+%Y%m%d-%H%M%S').${FILE_EXT}"
cp "$BUILT_FILE" "${OUTPUT_DIR}/${OUTPUT_NAME}"
log_success "Output copied to ${OUTPUT_DIR}/${OUTPUT_NAME}"

FILE_SIZE=$(du -h "${OUTPUT_DIR}/${OUTPUT_NAME}" | cut -f1)
echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Android Build Summary${NC}"
echo -e "${GREEN}  Build Type:     ${BUILD_TYPE}${NC}"
echo -e "${GREEN}  Package Type:   ${PACKAGE_TYPE}${NC}"
echo -e "${GREEN}  Output File:    ${OUTPUT_DIR}/${OUTPUT_NAME}${NC}"
echo -e "${GREEN}  File Size:      ${FILE_SIZE}${NC}"
echo -e "${GREEN}  Built At:       $(date)${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"

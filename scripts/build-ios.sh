#!/bin/bash
set -e

# ───────────────────────────────────────────────────
# build-ios.sh — Build iOS IPA
# Usage: ./build-ios.sh [development|distribution]
#   build_type: development | distribution (default: development)
# ───────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
IOS_DIR="${PROJECT_ROOT}/ios"
OUTPUT_DIR="${SCRIPT_DIR}/output"
EXPORT_DIR="$(mktemp -d)"

BUILD_TYPE="${1:-development}"

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
if [ "$BUILD_TYPE" != "development" ] && [ "$BUILD_TYPE" != "distribution" ]; then
  log_error "Invalid build type '${BUILD_TYPE}'. Use 'development' or 'distribution'."
  exit 1
fi

# ── Step 1: Check for Xcode ───────────────────────
if ! command -v xcodebuild &> /dev/null; then
  log_error "xcodebuild not found. Xcode is required to build iOS apps."
  exit 1
fi

XCODE_VERSION=$(xcodebuild -version | head -1)
log_info "Xcode version: ${XCODE_VERSION}"

# ── Step 2: Find the Xcode project / workspace ─────
log_info "Scanning for Xcode project in ${IOS_DIR}..."

XCODE_PROJECT=$(find "$IOS_DIR" -maxdepth 2 -name "*.xcodeproj" -type d | head -1)
XCODE_WORKSPACE=$(find "$IOS_DIR" -maxdepth 2 -name "*.xcworkspace" -type d | head -1)

if [ -z "$XCODE_PROJECT" ] && [ -z "$XCODE_WORKSPACE" ]; then
  log_error "No Xcode project (.xcodeproj) or workspace (.xcworkspace) found in ${IOS_DIR}"
  exit 1
fi

log_info "Found project: ${XCODE_PROJECT:-$XCODE_WORKSPACE}"

# Determine scheme (usually the project name)
if [ -n "$XCODE_WORKSPACE" ]; then
  BUILD_SOURCE="-workspace \"${XCODE_WORKSPACE}\""
  SCHEME_NAME=$(basename "$XCODE_WORKSPACE" .xcworkspace)
else
  BUILD_SOURCE="-project \"${XCODE_PROJECT}\""
  SCHEME_NAME=$(basename "$XCODE_PROJECT" .xcodeproj)
fi

log_info "Using scheme: ${SCHEME_NAME}"

# ── Step 3: Build archive ──────────────────────────
ARCHIVE_PATH="${EXPORT_DIR}/${SCHEME_NAME}.xcarchive"
log_step "Building archive (this may take several minutes)..."

xcodebuild archive \
  ${BUILD_SOURCE} \
  -scheme "${SCHEME_NAME}" \
  -configuration Release \
  -archivePath "${ARCHIVE_PATH}" \
  -allowProvisioningUpdates \
  | xcpretty

if [ $? -ne 0 ]; then
  log_info "xcpretty not available, showing raw output..."
  xcodebuild archive \
    ${BUILD_SOURCE} \
    -scheme "${SCHEME_NAME}" \
    -configuration Release \
    -archivePath "${ARCHIVE_PATH}" \
    -allowProvisioningUpdates
fi

log_success "Archive built at ${ARCHIVE_PATH}"

# ── Step 4: Export IPA ─────────────────────────────
mkdir -p "$OUTPUT_DIR"

# Determine export method
case "$BUILD_TYPE" in
  development)
    EXPORT_METHOD="development"
    ;;
  distribution)
    EXPORT_METHOD="app-store"
    ;;
esac

EXPORT_OPTIONS_PLIST="${EXPORT_DIR}/export-options.plist"
/usr/libexec/PlistBuddy -c "Add method string ${EXPORT_METHOD}" "$EXPORT_OPTIONS_PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Set method ${EXPORT_METHOD}" "$EXPORT_OPTIONS_PLIST"

log_step "Exporting IPA (method: ${EXPORT_METHOD})..."
xcodebuild -exportArchive \
  -archivePath "${ARCHIVE_PATH}" \
  -exportPath "${EXPORT_DIR}" \
  -exportOptionsPlist "$EXPORT_OPTIONS_PLIST" \
  -allowProvisioningUpdates 2>&1 | xcpretty || \
xcodebuild -exportArchive \
  -archivePath "${ARCHIVE_PATH}" \
  -exportPath "${EXPORT_DIR}" \
  -exportOptionsPlist "$EXPORT_OPTIONS_PLIST" \
  -allowProvisioningUpdates

# ── Step 5: Copy IPA to output directory ───────────
IPA_FILE=$(find "$EXPORT_DIR" -name "*.ipa" -type f 2>/dev/null | head -1)

if [ -z "$IPA_FILE" ] || [ ! -f "$IPA_FILE" ]; then
  log_error "IPA file not found after export"
  ls -la "$EXPORT_DIR"
  exit 1
fi

OUTPUT_NAME="wise-accounts-${BUILD_TYPE}-$(date '+%Y%m%d-%H%M%S').ipa"
cp "$IPA_FILE" "${OUTPUT_DIR}/${OUTPUT_NAME}"
log_success "IPA copied to ${OUTPUT_DIR}/${OUTPUT_NAME}"

# ── Cleanup temporary files ────────────────────────
rm -rf "$EXPORT_DIR"

FILE_SIZE=$(du -h "${OUTPUT_DIR}/${OUTPUT_NAME}" | cut -f1)
echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  iOS Build Summary${NC}"
echo -e "${GREEN}  Build Type:    ${BUILD_TYPE}${NC}"
echo -e "${GREEN}  Export Method: ${EXPORT_METHOD}${NC}"
echo -e "${GREEN}  Scheme:        ${SCHEME_NAME}${NC}"
echo -e "${GREEN}  Output File:   ${OUTPUT_DIR}/${OUTPUT_NAME}${NC}"
echo -e "${GREEN}  File Size:     ${FILE_SIZE}${NC}"
echo -e "${GREEN}  Built At:      $(date)${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"

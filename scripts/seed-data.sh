#!/bin/bash
set -e

# ───────────────────────────────────────────────────
# seed-data.sh — Seed demo data via API endpoints
# Usage: ./seed-data.sh [base_url]
#   base_url: API base URL (default: http://localhost:3000/api/v1)
# ───────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd")

BASE_URL="${1:-http://localhost:3000/api/v1}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $*"; }
log_success() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] OK:${NC} $*"; }
log_error()   { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*"; }
log_step()    { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] STEP:${NC} $*"; }

# ── Check prerequisites ───────────────────────────
if ! command -v curl &> /dev/null; then
  log_error "curl is required but not installed."
  exit 1
fi

API() {
  local METHOD="$1"
  local PATH="$2"
  local DATA="$3"
  local AUTH="$4"
  local URL="${BASE_URL}${PATH}"

  local HEADERS=(-H "Content-Type: application/json")
  if [ -n "$AUTH" ]; then
    HEADERS+=(-H "Authorization: Bearer ${AUTH}")
  fi

  curl -s -X "$METHOD" "${HEADERS[@]}" \
    -d "$DATA" \
    "$URL" 2>&1
}

echo ""
echo -e "${BLUE}  ┌─────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}  │   Wise Accounts — Demo Data Seeder        │${NC}"
echo -e "${BLUE}  │   API Base: ${BASE_URL}            │${NC}"
echo -e "${BLUE}  └─────────────────────────────────────────────┘${NC}"
echo ""

# ── Step 1: Check API health ─────────────────────
log_step "Checking API health..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL%api/v1*}" 2>/dev/null || echo "000")
if [ "$HEALTH" = "000" ] || [ "$HEALTH" -ge 500 ]; then
  log_error "API is not reachable at ${BASE_URL} (HTTP ${HEALTH})"
  exit 1
fi
log_success "API is reachable"

# ── Step 2: Register admin user ───────────────────
log_step "Registering admin user..."
ADMIN_PHONE="9999999999"
ADMIN_PASSWORD="password123"

REGISTER_RESULT=$(API POST "/auth/register" \
  "{\"phone\":\"${ADMIN_PHONE}\",\"password\":\"${ADMIN_PASSWORD}\",\"name\":\"Demo Admin\"}")

ADMIN_TOKEN=$(echo "$REGISTER_RESULT" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  # User might already exist — try login
  log_info "Admin may already exist. Attempting login..."
  LOGIN_RESULT=$(API POST "/auth/login" \
    "{\"phone\":\"${ADMIN_PHONE}\",\"password\":\"${ADMIN_PASSWORD}\"}")
  ADMIN_TOKEN=$(echo "$LOGIN_RESULT" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$ADMIN_TOKEN" ]; then
  log_error "Failed to register/login admin user"
  echo "  Response: $(echo "$REGISTER_RESULT" | head -c 200)"
  exit 1
fi
log_success "Admin user registered/logged in (phone: ${ADMIN_PHONE})"

# ── Step 3: Create business ──────────────────────
log_step "Creating business..."
BUSINESS_RESULT=$(API POST "/businesses" '{
  "name": "Sharma General Store",
  "gstin": "27ABCDE1234F1Z5",
  "phone": "9876543210",
  "email": "sharma@example.com",
  "address": "42, MG Road, Camp Area",
  "city": "Pune",
  "state": "Maharashtra",
  "pincode": "411001"
}' "$ADMIN_TOKEN")

BUSINESS_ID=$(echo "$BUSINESS_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$BUSINESS_ID" ]; then
  log_error "Failed to create business"
  echo "  Response: $(echo "$BUSINESS_RESULT" | head -c 200)"
  exit 1
fi
log_success "Business created: Sharma General Store (ID: ${BUSINESS_ID})"

# ── Step 4: Create default warehouse ─────────────
log_step "Creating warehouse..."
WAREHOUSE_RESULT=$(API POST "/businesses/${BUSINESS_ID}/warehouses" '{
  "name": "Main Warehouse",
  "address": "42, MG Road, Camp Area, Pune",
  "city": "Pune",
  "state": "Maharashtra"
}' "$ADMIN_TOKEN")
WAREHOUSE_ID=$(echo "$WAREHOUSE_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
log_success "Warehouse created (ID: ${WAREHOUSE_ID})"

# ── Step 5: Create categories ────────────────────
log_step "Creating product categories..."

CATEGORIES=$(cat <<'JSON'
[
  {"name": "Groceries"},
  {"name": "Beverages"},
  {"name": "Snacks & Confectionery"},
  {"name": "Household Items"},
  {"name": "Personal Care"}
]
JSON
)

echo "$CATEGORIES" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | while read -r CAT_NAME; do
  CAT_RESULT=$(API POST "/businesses/${BUSINESS_ID}/categories" \
    "{\"name\":\"${CAT_NAME}\"}" "$ADMIN_TOKEN" 2>/dev/null)
  CAT_ID=$(echo "$CAT_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$CAT_ID" ]; then
    log_info "  Category created: ${CAT_NAME}"
  fi
done

# ── Step 6: Create products ─────────────────────
log_step "Creating products..."

PRODUCTS=$(cat <<'JSON'
[
  {"name":"Basmati Rice - 1kg","sku":"GRO-RICE-001","hsnCode":"1006","unit":"kg","sellingPrice":95,"purchasePrice":80,"taxRate":5,"taxType":"inclusive","lowStockThreshold":10},
  {"name":"Toor Dal - 1kg","sku":"GRO-DAL-001","hsnCode":"0713","unit":"kg","sellingPrice":120,"purchasePrice":100,"taxRate":5,"taxType":"inclusive","lowStockThreshold":10},
  {"name":"Coca Cola 750ml","sku":"BEV-COLA-001","hsnCode":"2202","unit":"piece","sellingPrice":45,"purchasePrice":35,"taxRate":12,"taxType":"inclusive","lowStockThreshold":20},
  {"name":"Bottled Water 1L","sku":"BEV-WATER-001","hsnCode":"2201","unit":"piece","sellingPrice":20,"purchasePrice":12,"taxRate":12,"taxType":"inclusive","lowStockThreshold":30},
  {"name":"Lays Chips (Pack)","sku":"SNK-LAYS-001","hsnCode":"2106","unit":"piece","sellingPrice":10,"purchasePrice":8,"taxRate":12,"taxType":"inclusive","lowStockThreshold":50},
  {"name":"Biscuit - Parle G","sku":"SNK-BISC-001","hsnCode":"1905","unit":"piece","sellingPrice":10,"purchasePrice":7,"taxRate":12,"taxType":"inclusive","lowStockThreshold":50},
  {"name":"Surf Excel Detergent 1kg","sku":"HHL-DET-001","hsnCode":"3402","unit":"kg","sellingPrice":180,"purchasePrice":155,"taxRate":18,"taxType":"inclusive","lowStockThreshold":5},
  {"name":"Dishwash Liquid 500ml","sku":"HHL-DISH-001","hsnCode":"3402","unit":"piece","sellingPrice":95,"purchasePrice":78,"taxRate":18,"taxType":"inclusive","lowStockThreshold":10},
  {"name":"Shampoo Sachet","sku":"PCR-SHAM-001","hsnCode":"3305","unit":"piece","sellingPrice":5,"purchasePrice":3,"taxRate":18,"taxType":"inclusive","lowStockThreshold":100},
  {"name":"Toothpaste 100g","sku":"PCR-PASTE-001","hsnCode":"3306","unit":"piece","sellingPrice":85,"purchasePrice":65,"taxRate":18,"taxType":"inclusive","lowStockThreshold":15},
  {"name":"Wheat Flour (Atta) - 5kg","sku":"GRO-ATTA-001","hsnCode":"1101","unit":"kg","sellingPrice":175,"purchasePrice":150,"taxRate":5,"taxType":"inclusive","lowStockThreshold":5},
  {"name":"Sugar - 1kg","sku":"GRO-SUG-001","hsnCode":"1701","unit":"kg","sellingPrice":42,"purchasePrice":38,"taxRate":5,"taxType":"inclusive","lowStockThreshold":20}
]
JSON
)

echo "$PRODUCTS" | grep -o '"name":"[^"]*","sku":"[^"]*","hsnCode":"[^"]*","unit":"[^"]*","sellingPrice":[^,]*,"purchasePrice":[^,]*,"taxRate":[^,]*,"taxType":"[^"]*","lowStockThreshold":[^}]*' | while read -r line; do
  PRODUCT_NAME=$(echo "$line" | sed 's/.*"name":"//' | sed 's/","sku".*//')
  API_RESULT=$(API POST "/businesses/${BUSINESS_ID}/products" \
    "{\"name\":\"${PRODUCT_NAME}\",$(echo "$line" | sed 's/.*","sku"/"sku"/')}" "$ADMIN_TOKEN" 2>/dev/null)
  PROD_ID=$(echo "$API_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$PROD_ID" ]; then
    log_info "  Product created: ${PRODUCT_NAME}"
  fi
done

# ── Step 7: Create customers ─────────────────────
log_step "Creating customers..."

CUSTOMERS=$(cat <<'JSON'
[
  {"name":"Rahul Verma","phone":"9876543211","gstin":"27FGHI5678J1Z5","address":"12, FC Road","city":"Pune","state":"Maharashtra","pincode":"411004"},
  {"name":"Priya Sharma","phone":"9876543212","address":"55, JM Road, Shivajinagar","city":"Pune","state":"Maharashtra","pincode":"411005"},
  {"name":"Amit Patel","phone":"9876543213","gstin":"24JKLM9012N1Z6","address":"88, Akshar Chowk","city":"Ahmedabad","state":"Gujarat","pincode":"380009"},
  {"name":"Sneha Reddy","phone":"9876543214","address":"7-1-28, Ameerpet","city":"Hyderabad","state":"Telangana","pincode":"500016"},
  {"name":"Vikram Singh","phone":"9876543215","address":"22, Civil Lines","city":"Jaipur","state":"Rajasthan","pincode":"302001"},
  {"name":"Neha Gupta","phone":"9876543216","address":"33, Sector 18, Rohini","city":"Delhi","state":"Delhi","pincode":"110089"}
]
JSON
)

echo "$CUSTOMERS" | grep -o '"name":"[^"]*","phone":"[^"]*"[^}]*' | while read -r line; do
  CUST_NAME=$(echo "$line" | sed 's/.*"name":"//' | sed 's/","phone".*//')
  API_RESULT=$(API POST "/businesses/${BUSINESS_ID}/customers" \
    "{\"name\":\"${CUST_NAME}\",$(echo "$line" | sed 's/.*","phone"/"phone"/')}" "$ADMIN_TOKEN" 2>/dev/null)
  CUST_ID=$(echo "$API_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$CUST_ID" ]; then
    log_info "  Customer created: ${CUST_NAME}"
  fi
done

# ── Step 8: Create sample invoices ────────────────
log_step "Creating sample invoices..."

# Get customer IDs
CUSTOMERS_IDS=$(API GET "/businesses/${BUSINESS_ID}/customers" "" "$ADMIN_TOKEN" \
  | grep -o '"id":"[^"]*","businessId":"[^"]*","name":"[^"]*"' \
  | head -3)

CUST1=$(echo "$CUSTOMERS_IDS" | sed -n '1p' | sed 's/.*"id":"//' | sed 's/","businessId".*//')
CUST2=$(echo "$CUSTOMERS_IDS" | sed -n '2p' | sed 's/.*"id":"//' | sed 's/","businessId".*//')
CUST3=$(echo "$CUSTOMERS_IDS" | sed -n '3p' | sed 's/.*"id":"//' | sed 's/","businessId".*//')

CUST1_NAME=$(echo "$CUSTOMERS_IDS" | sed -n '1p' | sed 's/.*"name":"//' | sed 's/"//g')
CUST2_NAME=$(echo "$CUSTOMERS_IDS" | sed -n '2p' | sed 's/.*"name":"//' | sed 's/"//g')
CUST3_NAME=$(echo "$CUSTOMERS_IDS" | sed -n '3p' | sed 's/.*"name":"//' | sed 's/"//g')

# Get product IDs
PRODUCT_IDS=$(API GET "/businesses/${BUSINESS_ID}/products" "" "$ADMIN_TOKEN" \
  | grep -o '"id":"[^"]*","businessId":"[^"]*","name":"[^"]*","sku":"[^"]*","hsnCode":"[^"]*"' \
  | head -5)

INVOICES=$(cat <<EOF
[
  {
    "customerId":"${CUST1}",
    "type":"B2B",
    "items":[
      {"productId":"$(echo "$PRODUCT_IDS" | sed -n '1p' | sed 's/.*"id":"//' | sed 's/","businessId".*//')","itemName":"Basmati Rice - 1kg","quantity":5,"unit":"kg","rate":95,"taxRate":5},
      {"productId":"$(echo "$PRODUCT_IDS" | sed -n '4p' | sed 's/.*"id":"//' | sed 's/","businessId".*//')","itemName":"Bottled Water 1L","quantity":12,"unit":"piece","rate":20,"taxRate":12}
    ]
  },
  {
    "customerId":"${CUST2}",
    "type":"B2C",
    "items":[
      {"productId":"$(echo "$PRODUCT_IDS" | sed -n '5p' | sed 's/.*"id":"//' | sed 's/","businessId".*//')","itemName":"Lays Chips (Pack)","quantity":20,"unit":"piece","rate":10,"taxRate":12},
      {"productId":"$(echo "$PRODUCT_IDS" | sed -n '6p' | sed 's/.*"id":"//' | sed 's/","businessId".*//')","itemName":"Biscuit - Parle G","quantity":30,"unit":"piece","rate":10,"taxRate":12}
    ]
  },
  {
    "customerId":"${CUST3}",
    "type":"B2B",
    "items":[
      {"productId":"$(echo "$PRODUCT_IDS" | sed -n '2p' | sed 's/.*"id":"//' | sed 's/","businessId".*//')","itemName":"Toor Dal - 1kg","quantity":10,"unit":"kg","rate":120,"taxRate":5},
      {"productId":"$(echo "$PRODUCT_IDS" | sed -n '3p' | sed 's/.*"id":"//' | sed 's/","businessId".*//')","itemName":"Coca Cola 750ml","quantity":24,"unit":"piece","rate":45,"taxRate":12}
    ]
  }
]
EOF
)

echo "$INVOICES" | grep -oP '\{[^{}]*"customerId"[^{}]*\}' | while read -r invoice; do
  INVOICE_RESULT=$(API POST "/businesses/${BUSINESS_ID}/invoices" \
    "$invoice" "$ADMIN_TOKEN" 2>/dev/null)
  INVOICE_NO=$(echo "$INVOICE_RESULT" | grep -o '"invoiceNo":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$INVOICE_NO" ]; then
    log_info "  Invoice created: ${INVOICE_NO}"
  fi
done

# ── Step 9: Create a supplier and purchase order ──
log_step "Creating supplier and purchase order..."
SUPPLIER_RESULT=$(API POST "/businesses/${BUSINESS_ID}/suppliers" \
  '{"name":"Patel Whole Distributors","phone":"9988776655","gstin":"27ZYXWV4321Q1Z5","address":"100, Laxmi Road","city":"Pune","state":"Maharashtra"}' \
  "$ADMIN_TOKEN")
SUPPLIER_ID=$(echo "$SUPPLIER_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
log_info "  Supplier created: Patel Whole Distributors"

# ── Summary ───────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Seeding Complete!${NC}"
echo -e "${GREEN}  Admin Phone:  ${ADMIN_PHONE}${NC}"
echo -e "${GREEN}  Password:     ${ADMIN_PASSWORD}${NC}"
echo -e "${GREEN}  Business:     Sharma General Store${NC}"
echo -e "${GREEN}  API Base:     ${BASE_URL}${NC}"
echo -e "${GREEN}  Completed At: $(date)${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}  Login with:${NC}"
echo -e "  curl -X POST ${BASE_URL}/auth/login \\"
echo -e "    -H \"Content-Type: application/json\" \\"
echo -e "    -d '{\"phone\":\"${ADMIN_PHONE}\",\"password\":\"${ADMIN_PASSWORD}\"}'"
echo ""

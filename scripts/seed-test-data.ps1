$BASE = "http://localhost:3000/api/v1"
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body '{"phone":"9999999999","password":"admin123"}'
$TOKEN = $login.data.accessToken
$H = @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" }

function Post($path, $body) {
  Invoke-RestMethod -Uri "$BASE$path" -Method POST -Headers $H -Body ($body | ConvertTo-Json -Depth 10 -Compress)
}
function Get-Api($path) {
  Invoke-RestMethod -Uri "$BASE$path" -Method GET -Headers $H
}

# ============================================================
# BUSINESS 1: Uday Enterprise
# ============================================================
Write-Host "`n=== Creating Uday Enterprise ===" -ForegroundColor Cyan
$biz1 = Post "/businesses" @{
  name = "Uday Enterprise"
  gstin = "27AABCU9603R1ZM"
  phone = "9876543210"
  email = "uday.enterprise@gmail.com"
  address = "45, Station Road, Near Railway Crossing"
  city = "Nagpur"
  state = "Maharashtra"
  pincode = "440001"
}
$B1 = $biz1.data.id
Write-Host "  Business ID: $B1"

# Categories for Uday Enterprise (Electronics & General Trading)
$cats1 = @("Electronics", "Mobile Accessories", "Computer Peripherals", "Home Appliances", "Office Supplies", "Cables & Adapters")
$catIds1 = @()
foreach ($c in $cats1) {
  $r = Post "/businesses/$B1/categories" @{ name = $c }
  $catIds1 += $r.data.id
  Write-Host "  Category: $c"
}

# Products for Uday Enterprise
Write-Host "`n  Creating Products..."
$prods1 = @(
  @{ name="Samsung Galaxy M34 5G"; hsnCode="8517"; unit="piece"; sellingPrice=18999; purchasePrice=16500; taxRate=18; categoryId=$catIds1[0]; sku="ELEC-SAM-001"; lowStockThreshold=5 }
  @{ name="boAt Rockerz 450 Headphones"; hsnCode="8518"; unit="piece"; sellingPrice=1799; purchasePrice=1200; taxRate=18; categoryId=$catIds1[0]; sku="ELEC-BOAT-001"; lowStockThreshold=10 }
  @{ name="Portronics Car Mobile Holder"; hsnCode="8518"; unit="piece"; sellingPrice=399; purchasePrice=220; taxRate=18; categoryId=$catIds1[1]; sku="ACC-POR-001"; lowStockThreshold=20 }
  @{ name="TP-Link USB-C to USB-C Cable 1m"; hsnCode="8544"; unit="piece"; sellingPrice=299; purchasePrice=150; taxRate=18; categoryId=$catIds1[4]; sku="CBL-TP-001"; lowStockThreshold=30 }
  @{ name="Logitech M220 Wireless Mouse"; hsnCode="8471"; unit="piece"; sellingPrice=999; purchasePrice=650; taxRate=18; categoryId=$catIds1[2]; sku="COMP-LOG-001"; lowStockThreshold=15 }
  @{ name="HP 15s Laptop (Ryzen 5)"; hsnCode="8471"; unit="piece"; sellingPrice=42999; purchasePrice=38000; taxRate=18; categoryId=$catIds1[2]; sku="COMP-HP-001"; lowStockThreshold=3 }
  @{ name="Havells 1500W Room Heater"; hsnCode="8516"; unit="piece"; sellingPrice=2499; purchasePrice=1800; taxRate=18; categoryId=$catIds1[3]; sku="APPL-HAV-001"; lowStockThreshold=8 }
  @{ name="Syska LED Bulb 9W (Pack of 4)"; hsnCode="9405"; unit="pack"; sellingPrice=349; purchasePrice=220; taxRate=18; categoryId=$catIds1[3]; sku="APPL-SYS-001"; lowStockThreshold=25 }
  @{ name="Deluxe A4 Paper 500 sheets"; hsnCode="4819"; unit="pack"; sellingPrice=299; purchasePrice=210; taxRate=12; categoryId=$catIds1[4]; sku="OFF-DEL-001"; lowStockThreshold=50 }
  @{ name="Belkin Surge Protector 6-Outlet"; hsnCode="8536"; unit="piece"; sellingPrice=1299; purchasePrice=850; taxRate=18; categoryId=$catIds1[4]; sku="OFF-BLK-001"; lowStockThreshold=10 }
  @{ name="Mi Power Bank 20000mAh"; hsnCode="8507"; unit="piece"; sellingPrice=1799; purchasePrice=1300; taxRate=18; categoryId=$catIds1[1]; sku="ACC-MI-001"; lowStockThreshold=15 }
  @{ name="Noise ColorFit Pro 4 Smartwatch"; hsnCode="9102"; unit="piece"; sellingPrice=3499; purchasePrice=2400; taxRate=18; categoryId=$catIds1[0]; sku="ELEC-NOI-001"; lowStockThreshold=7 }
)
$prodIds1 = @()
foreach ($p in $prods1) {
  $r = Post "/businesses/$B1/products" $p
  $prodIds1 += $r.data.id
  Write-Host "  Product: $($p.name)"
}

# Customers for Uday Enterprise
Write-Host "`n  Creating Customers..."
$custs1 = @(
  @{ name="Rajesh Kumar"; phone="9876543210"; gstin="27AABCR1234A1Z5"; email="rajesh@gmail.com"; address="12, Civil Lines"; city="Nagpur"; state="Maharashtra"; pincode="440001"; creditLimit=50000 }
  @{ name="Priya Electronics"; phone="9876543211"; gstin="27BBBCK5678B1Z6"; email="priya.electronics@gmail.com"; address="78, Dharampeth"; city="Nagpur"; state="Maharashtra"; pincode="440010"; creditLimit=100000 }
  @{ name="Amit Sharma"; phone="9876543212"; email="amit.sharma@outlook.com"; address="23, Sitabuldi"; city="Nagpur"; state="Maharashtra"; pincode="440012"; creditLimit=25000 }
  @{ name="Vikrant Enterprises"; phone="9876543213"; gstin="27CCCCL9012C1Z7"; email="vikrant.ent@yahoo.com"; address="56, Sadar"; city="Nagpur"; state="Maharashtra"; pincode="440001"; creditLimit=200000 }
  @{ name="Sunita Trading Co."; phone="9876543214"; gstin="24DDDGM3456D1Z8"; email="sunita.trading@gmail.com"; address="90, MG Road"; city="Ahmedabad"; state="Gujarat"; pincode="380001"; creditLimit=75000 }
  @{ name="Deepak Patel"; phone="9876543215"; email="deepak.p@gmail.com"; address="15, Nehru Nagar"; city="Bhopal"; state="Madhya Pradesh"; pincode="462001"; creditLimit=30000 }
  @{ name="Kavita Enterprises"; phone="9876543216"; gstin="09EEEFN7890E1Z9"; email="kavita.ent@gmail.com"; address="34, Hazratganj"; city="Lucknow"; state="Uttar Pradesh"; pincode="226001"; creditLimit=60000 }
  @{ name="Manoj Kumar Singh"; phone="9876543217"; email="manoj.singh@gmail.com"; address="67, Rajouri Garden"; city="Delhi"; state="Delhi"; pincode="110027"; creditLimit=40000 }
)
$custIds1 = @()
foreach ($c in $custs1) {
  $r = Post "/businesses/$B1/customers" $c
  $custIds1 += $r.data.id
  Write-Host "  Customer: $($c.name)"
}

# Add stock to products (stock-adjust for each product)
Write-Host "`n  Adding Stock..."
for ($i = 0; $i -lt $prodIds1.Count; $i++) {
  $qty = Get-Random -Minimum 20 -Maximum 150
  Post "/businesses/$B1/products/$($prodIds1[$i])/stock-adjust" @{
    type = "PURCHASE"
    quantity = $qty
    notes = "Initial stock"
  }
  Write-Host "  Stock added: $($prods1[$i].name) x $qty"
}

# Invoices for Uday Enterprise
Write-Host "`n  Creating Invoices..."

# Invoice 1: B2B to Rajesh Kumar
Post "/businesses/$B1/invoices" @{
  type = "B2B"
  customerId = $custIds1[0]
  invoiceDate = "2026-07-01"
  dueDate = "2026-07-31"
  items = @(
    @{ productId=$prodIds1[0]; itemName="Samsung Galaxy M34 5G"; quantity=2; unit="piece"; rate=18999; taxRate=18 }
    @{ productId=$prodIds1[4]; itemName="Logitech M220 Wireless Mouse"; quantity=5; unit="piece"; rate=999; taxRate=18 }
  )
}
Write-Host "  Invoice 1: B2B to Rajesh Kumar"

# Invoice 2: B2B to Priya Electronics (bulk order)
Post "/businesses/$B1/invoices" @{
  type = "B2B"
  customerId = $custIds1[1]
  invoiceDate = "2026-07-03"
  dueDate = "2026-08-02"
  items = @(
    @{ productId=$prodIds1[2]; itemName="Portronics Car Mobile Holder"; quantity=50; unit="piece"; rate=399; taxRate=18 }
    @{ productId=$prodIds1[3]; itemName="TP-Link USB-C to USB-C Cable 1m"; quantity=100; unit="piece"; rate=299; taxRate=18 }
    @{ productId=$prodIds1[10]; itemName="Mi Power Bank 20000mAh"; quantity=20; unit="piece"; rate=1799; taxRate=18 }
  )
}
Write-Host "  Invoice 2: B2B to Priya Electronics"

# Invoice 3: B2C to Amit Sharma
Post "/businesses/$B1/invoices" @{
  type = "B2C"
  customerId = $custIds1[2]
  invoiceDate = "2026-07-05"
  dueDate = "2026-07-20"
  items = @(
    @{ productId=$prodIds1[1]; itemName="boAt Rockerz 450 Headphones"; quantity=1; unit="piece"; rate=1799; taxRate=18 }
    @{ productId=$prodIds1[8]; itemName="Deluxe A4 Paper 500 sheets"; quantity=3; unit="pack"; rate=299; taxRate=12 }
  )
}
Write-Host "  Invoice 3: B2C to Amit Sharma"

# Invoice 4: B2B to Vikrant Enterprises (big order)
Post "/businesses/$B1/invoices" @{
  type = "B2B"
  customerId = $custIds1[3]
  invoiceDate = "2026-07-08"
  dueDate = "2026-08-07"
  items = @(
    @{ productId=$prodIds1[5]; itemName="HP 15s Laptop (Ryzen 5)"; quantity=10; unit="piece"; rate=42999; taxRate=18 }
    @{ productId=$prodIds1[4]; itemName="Logitech M220 Wireless Mouse"; quantity=10; unit="piece"; rate=999; taxRate=18 }
    @{ productId=$prodIds1[9]; itemName="Belkin Surge Protector 6-Outlet"; quantity=10; unit="piece"; rate=1299; taxRate=18 }
  )
}
Write-Host "  Invoice 4: B2B to Vikrant Enterprises"

# Invoice 5: B2C to Sunita (inter-state - Gujarat)
Post "/businesses/$B1/invoices" @{
  type = "B2B"
  customerId = $custIds1[4]
  invoiceDate = "2026-07-10"
  dueDate = "2026-08-09"
  items = @(
    @{ productId=$prodIds1[11]; itemName="Noise ColorFit Pro 4 Smartwatch"; quantity=5; unit="piece"; rate=3499; taxRate=18 }
    @{ productId=$prodIds1[6]; itemName="Havells 1500W Room Heater"; quantity=3; unit="piece"; rate=2499; taxRate=18 }
  )
}
Write-Host "  Invoice 5: B2B to Sunita Trading (Inter-state IGST)"

# Invoice 6: Small B2C
Post "/businesses/$B1/invoices" @{
  type = "B2C"
  customerId = $custIds1[5]
  invoiceDate = "2026-07-11"
  dueDate = "2026-07-25"
  items = @(
    @{ productId=$prodIds1[7]; itemName="Syska LED Bulb 9W (Pack of 4)"; quantity=2; unit="pack"; rate=349; taxRate=18 }
  )
}
Write-Host "  Invoice 6: B2C to Deepak Patel"

# Payments for Uday Enterprise
Write-Host "`n  Recording Payments..."
$invList1 = Get-Api "/businesses/$B1/invoices?limit=20"
$invoices1 = $invList1.data.data

if ($invoices1.Count -gt 0) {
  Post "/businesses/$B1/payments" @{
    invoiceId = $invoices1[0].id
    customerId = $custIds1[0]
    amount = 10000
    method = "BANK_TRANSFER"
    reference = "NEFT-20260701-001"
    notes = "Partial payment against INV-1"
  }
  Write-Host "  Payment: 10000 via Bank Transfer for Rajesh Kumar"
}
if ($invoices1.Count -gt 2) {
  Post "/businesses/$B1/payments" @{
    invoiceId = $invoices1[2].id
    customerId = $custIds1[2]
    amount = 2696
    method = "UPI"
    reference = "UPI-20260705-001"
    notes = "Full payment by Amit Sharma"
  }
  Write-Host "  Payment: 2696 via UPI for Amit Sharma"
}
Post "/businesses/$B1/payments" @{
  customerId = $custIds1[3]
  amount = 50000
  method = "CASH"
  notes = "Advance from Vikrant Enterprises"
}
Write-Host "  Payment: 50000 Cash advance from Vikrant"

# ============================================================
# BUSINESS 2: UBS SUPERMART
# ============================================================
Write-Host "`n`n=== Creating UBS SUPERMART ===" -ForegroundColor Cyan
$biz2 = Post "/businesses" @{
  name = "UBS SUPERMART"
  gstin = "29AABCU9603R2ZP"
  phone = "9123456789"
  email = "ubs.supermart@gmail.com"
  address = "12, Main Market Road, Jayanagar"
  city = "Bengaluru"
  state = "Karnataka"
  pincode = "560041"
}
$B2 = $biz2.data.id
Write-Host "  Business ID: $B2"

# Categories for UBS SUPERMART (Grocery / FMCG)
$cats2 = @("Fresh Vegetables", "Fruits", "Dairy & Bakery", "Snacks & Namkeen", "Beverages", "Personal Care", "Cleaning Supplies", "Staples & Grains")
$catIds2 = @()
foreach ($c in $cats2) {
  $r = Post "/businesses/$B2/categories" @{ name = $c }
  $catIds2 += $r.data.id
  Write-Host "  Category: $c"
}

# Products for UBS SUPERMART
Write-Host "`n  Creating Products..."
$prods2 = @(
  @{ name="Onion (1kg)"; hsnCode="0713"; unit="kg"; sellingPrice=40; purchasePrice=28; taxRate=0; categoryId=$catIds2[0]; sku="VEG-ONI-001"; lowStockThreshold=50; trackBatch=$false }
  @{ name="Tomato (1kg)"; hsnCode="0702"; unit="kg"; sellingPrice=50; purchasePrice=35; taxRate=0; categoryId=$catIds2[0]; sku="VEG-TOM-001"; lowStockThreshold=50; trackBatch=$false }
  @{ name="Potato (1kg)"; hsnCode="0701"; unit="kg"; sellingPrice=35; purchasePrice=22; taxRate=0; categoryId=$catIds2[0]; sku="VEG-POT-001"; lowStockThreshold=60; trackBatch=$false }
  @{ name="Banana (1 dozen)"; hsnCode="0803"; unit="piece"; sellingPrice=60; purchasePrice=40; taxRate=0; categoryId=$catIds2[1]; sku="FRU-BAN-001"; lowStockThreshold=30 }
  @{ name="Apple - Shimla (1kg)"; hsnCode="0808"; unit="kg"; sellingPrice=150; purchasePrice=110; taxRate=0; categoryId=$catIds2[1]; sku="FRU-APL-001"; lowStockThreshold=20 }
  @{ name="Amul Gold Milk (1L)"; hsnCode="0401"; unit="piece"; sellingPrice=64; purchasePrice=54; taxRate=5; categoryId=$catIds2[2]; sku="DAL-AML-001"; lowStockThreshold=40 }
  @{ name="Amul Butter (100g)"; hsnCode="0405"; unit="piece"; sellingPrice=56; purchasePrice=45; taxRate=5; categoryId=$catIds2[2]; sku="DAL-AMB-001"; lowStockThreshold=30 }
  @{ name="Britannia Bread (400g)"; hsnCode="1905"; unit="piece"; sellingPrice=45; purchasePrice=32; taxRate=5; categoryId=$catIds2[2]; sku="BAK-BRI-001"; lowStockThreshold=25 }
  @{ name="Lays Classic Salted (52g)"; hsnCode="1905"; unit="piece"; sellingPrice=20; purchasePrice=14; taxRate=12; categoryId=$catIds2[3]; sku="SNK-LAY-001"; lowStockThreshold=100 }
  @{ name="Haldiram Aloo Bhujia (200g)"; hsnCode="1905"; unit="piece"; sellingPrice=65; purchasePrice=48; taxRate=12; categoryId=$catIds2[3]; sku="SNK-HAL-001"; lowStockThreshold=40 }
  @{ name="Kurkure Masala Munch (90g)"; hsnCode="1905"; unit="piece"; sellingPrice=20; purchasePrice=14; taxRate=12; categoryId=$catIds2[3]; sku="SNK-KUR-001"; lowStockThreshold=80 }
  @{ name="Coca Cola (750ml)"; hsnCode="2202"; unit="piece"; sellingPrice=40; purchasePrice=30; taxRate=12; categoryId=$catIds2[4]; sku="BEV-CC-001"; lowStockThreshold=50 }
  @{ name="Minute Maid Pulpy Orange (400ml)"; hsnCode="2009"; unit="piece"; sellingPrice=25; purchasePrice=18; taxRate=12; categoryId=$catIds2[4]; sku="BEV-MM-001"; lowStockThreshold=40 }
  @{ name="Tata Salt (1kg)"; hsnCode="2501"; unit="piece"; sellingPrice=28; purchasePrice=22; taxRate=0; categoryId=$catIds2[7]; sku="STP-TAT-001"; lowStockThreshold=60 }
  @{ name="India Gate Basmati Rice (5kg)"; hsnCode="1006"; unit="pack"; sellingPrice=450; purchasePrice=370; taxRate=5; categoryId=$catIds2[7]; sku="STP-IG-001"; lowStockThreshold=15 }
  @{ name="Toor Dal (1kg)"; hsnCode="0713"; unit="kg"; sellingPrice=160; purchasePrice=130; taxRate=0; categoryId=$catIds2[7]; sku="STP-TDL-001"; lowStockThreshold=30 }
  @{ name="Fortune Sunflower Oil (1L)"; hsnCode="1509"; unit="piece"; sellingPrice=145; purchasePrice=120; taxRate=5; categoryId=$catIds2[7]; sku="STP-FOR-001"; lowStockThreshold=25 }
  @{ name="Surf Excel Easy Wash (1kg)"; hsnCode="3402"; unit="piece"; sellingPrice=135; purchasePrice=110; taxRate=18; categoryId=$catIds2[6]; sku="CLN-SFX-001"; lowStockThreshold=20 }
  @{ name="Vim Dishwash Liquid (500ml)"; hsnCode="3402"; unit="piece"; sellingPrice=99; purchasePrice=75; taxRate=18; categoryId=$catIds2[6]; sku="CLN-VIM-001"; lowStockThreshold=25 }
  @{ name="Colgate MaxFresh 150g"; hsnCode="3306"; unit="piece"; sellingPrice=95; purchasePrice=72; taxRate=18; categoryId=$catIds2[5]; sku="PER-COL-001"; lowStockThreshold=30 }
  @{ name="Head & Shoulders 180ml"; hsnCode="3305"; unit="piece"; sellingPrice=210; purchasePrice=165; taxRate=18; categoryId=$catIds2[5]; sku="PER-HS-001"; lowStockThreshold=20 }
  @{ name="Lifebuoy Soap (4x100g)"; hsnCode="3401"; unit="pack"; sellingPrice=140; purchasePrice=108; taxRate=18; categoryId=$catIds2[5]; sku="PER-LIF-001"; lowStockThreshold=25 }
  @{ name="Maggi 2-Minute Noodles (70g)"; hsnCode="1902"; unit="piece"; sellingPrice=14; purchasePrice=10; taxRate=5; categoryId=$catIds2[3]; sku="SNK-MAG-001"; lowStockThreshold=200 }
)
$prodIds2 = @()
foreach ($p in $prods2) {
  $r = Post "/businesses/$B2/products" $p
  $prodIds2 += $r.data.id
  Write-Host "  Product: $($p.name)"
}

# Customers for UBS SUPERMART
Write-Host "`n  Creating Customers..."
$custs2 = @(
  @{ name="Suresh Babu"; phone="9111111111"; email="suresh.b@gmail.com"; address="22, Koramangala 4th Block"; city="Bengaluru"; state="Karnataka"; pincode="560034"; creditLimit=10000 }
  @{ name="Lakshmi Traders"; phone="9222222222"; gstin="29AAACL1234F1Z5"; email="lakshmi.traders@gmail.com"; address="45, Malleshwaram"; city="Bengaluru"; state="Karnataka"; pincode="560003"; creditLimit=50000 }
  @{ name="Ravi Shankar"; phone="9333333333"; email="ravi.s@yahoo.com"; address="8, Indiranagar 100ft Road"; city="Bengaluru"; state="Karnataka"; pincode="560038"; creditLimit=5000 }
  @{ name="Anjali Merchants"; phone="9444444444"; gstin="27BBBCM5678G1Z6"; email="anjali.m@gmail.com"; address="67, FC Road"; city="Pune"; state="Maharashtra"; pincode="411004"; creditLimit=30000 }
  @{ name="Ramesh & Sons"; phone="9555555555"; gstin="24CCCRN9012H1Z7"; email="ramesh.sons@gmail.com"; address="33, Anna Salai"; city="Chennai"; state="Tamil Nadu"; pincode="600002"; creditLimit=40000 }
  @{ name="Meena Kumari"; phone="9666666666"; email="meena.k@gmail.com"; address="15, Jayanagar 3rd Block"; city="Bengaluru"; state="Karnataka"; pincode="560011"; creditLimit=8000 }
  @{ name="Phoenix Grocery Store"; phone="9777777777"; gstin="29DDDCM3456I1Z8"; email="phoenix.grocery@gmail.com"; address="90, Whitefield Main Road"; city="Bengaluru"; state="Karnataka"; pincode="560066"; creditLimit=75000 }
  @{ name="Deepa Nair"; phone="9888888888"; email="deepa.nair@gmail.com"; address="41, HSR Layout Sector 2"; city="Bengaluru"; state="Karnataka"; pincode="560102"; creditLimit=15000 }
)
$custIds2 = @()
foreach ($c in $custs2) {
  $r = Post "/businesses/$B2/customers" $c
  $custIds2 += $r.data.id
  Write-Host "  Customer: $($c.name)"
}

# Add stock to products
Write-Host "`n  Adding Stock..."
$stockQty = @(80, 60, 100, 120, 40, 90, 60, 50, 200, 80, 150, 100, 70, 90, 30, 50, 40, 35, 45, 30, 50, 300)
for ($i = 0; $i -lt $prodIds2.Count; $i++) {
  Post "/businesses/$B2/products/$($prodIds2[$i])/stock-adjust" @{
    type = "PURCHASE"
    quantity = $stockQty[$i]
    notes = "Initial stock"
  }
}
Write-Host "  Stock added to all $($prodIds2.Count) products"

# Invoices for UBS SUPERMART
Write-Host "`n  Creating Invoices..."

# Invoice 1: B2B to Lakshmi Traders (wholesale)
Post "/businesses/$B2/invoices" @{
  type = "B2B"
  customerId = $custIds2[1]
  invoiceDate = "2026-07-01"
  dueDate = "2026-07-15"
  items = @(
    @{ productId=$prodIds2[13]; itemName="Tata Salt (1kg)"; quantity=50; unit="piece"; rate=28; taxRate=0 }
    @{ productId=$prodIds2[14]; itemName="India Gate Basmati Rice (5kg)"; quantity=20; unit="pack"; rate=450; taxRate=5 }
    @{ productId=$prodIds2[15]; itemName="Toor Dal (1kg)"; quantity=30; unit="kg"; rate=160; taxRate=0 }
    @{ productId=$prodIds2[16]; itemName="Fortune Sunflower Oil (1L)"; quantity=25; unit="piece"; rate=145; taxRate=5 }
  )
}
Write-Host "  Invoice 1: B2B to Lakshmi Traders"

# Invoice 2: B2B to Phoenix Grocery Store
Post "/businesses/$B2/invoices" @{
  type = "B2B"
  customerId = $custIds2[6]
  invoiceDate = "2026-07-03"
  dueDate = "2026-08-02"
  items = @(
    @{ productId=$prodIds2[5]; itemName="Amul Gold Milk (1L)"; quantity=100; unit="piece"; rate=64; taxRate=5 }
    @{ productId=$prodIds2[6]; itemName="Amul Butter (100g)"; quantity=50; unit="piece"; rate=56; taxRate=5 }
    @{ productId=$prodIds2[7]; itemName="Britannia Bread (400g)"; quantity=60; unit="piece"; rate=45; taxRate=5 }
    @{ productId=$prodIds2[11]; itemName="Coca Cola (750ml)"; quantity=48; unit="piece"; rate=40; taxRate=12 }
  )
}
Write-Host "  Invoice 2: B2B to Phoenix Grocery Store"

# Invoice 3: B2C to Suresh Babu
Post "/businesses/$B2/invoices" @{
  type = "B2C"
  customerId = $custIds2[0]
  invoiceDate = "2026-07-05"
  dueDate = "2026-07-12"
  items = @(
    @{ productId=$prodIds2[0]; itemName="Onion (1kg)"; quantity=2; unit="kg"; rate=40; taxRate=0 }
    @{ productId=$prodIds2[1]; itemName="Tomato (1kg)"; quantity=1; unit="kg"; rate=50; taxRate=0 }
    @{ productId=$prodIds2[3]; itemName="Banana (1 dozen)"; quantity=2; unit="piece"; rate=60; taxRate=0 }
    @{ productId=$prodIds2[5]; itemName="Amul Gold Milk (1L)"; quantity=2; unit="piece"; rate=64; taxRate=5 }
    @{ productId=$prodIds2[7]; itemName="Britannia Bread (400g)"; quantity=1; unit="piece"; rate=45; taxRate=5 }
    @{ productId=$prodIds2[8]; itemName="Lays Classic Salted (52g)"; quantity=3; unit="piece"; rate=20; taxRate=12 }
    @{ productId=$prodIds2[21]; itemName="Maggi 2-Minute Noodles (70g)"; quantity=5; unit="piece"; rate=14; taxRate=5 }
  )
}
Write-Host "  Invoice 3: B2C to Suresh Babu"

# Invoice 4: B2B to Anjali Merchants (inter-state Maharashtra)
Post "/businesses/$B2/invoices" @{
  type = "B2B"
  customerId = $custIds2[3]
  invoiceDate = "2026-07-07"
  dueDate = "2026-08-06"
  items = @(
    @{ productId=$prodIds2[9]; itemName="Haldiram Aloo Bhujia (200g)"; quantity=100; unit="piece"; rate=65; taxRate=12 }
    @{ productId=$prodIds2[10]; itemName="Kurkure Masala Munch (90g)"; quantity=200; unit="piece"; rate=20; taxRate=12 }
    @{ productId=$prodIds2[21]; itemName="Maggi 2-Minute Noodles (70g)"; quantity=500; unit="piece"; rate=14; taxRate=5 }
  )
}
Write-Host "  Invoice 4: B2B to Anjali Merchants (Inter-state IGST)"

# Invoice 5: B2B to Ramesh & Sons (inter-state Tamil Nadu)
Post "/businesses/$B2/invoices" @{
  type = "B2B"
  customerId = $custIds2[4]
  invoiceDate = "2026-07-09"
  dueDate = "2026-08-08"
  items = @(
    @{ productId=$prodIds2[17]; itemName="Surf Excel Easy Wash (1kg)"; quantity=40; unit="piece"; rate=135; taxRate=18 }
    @{ productId=$prodIds2[18]; itemName="Vim Dishwash Liquid (500ml)"; quantity=30; unit="piece"; rate=99; taxRate=18 }
    @{ productId=$prodIds2[19]; itemName="Colgate MaxFresh 150g"; quantity=50; unit="piece"; rate=95; taxRate=18 }
    @{ productId=$prodIds2[20]; itemName="Head & Shoulders 180ml"; quantity=25; unit="piece"; rate=210; taxRate=18 }
    @{ productId=$prodIds2[21]; itemName="Lifebuoy Soap (4x100g)"; quantity=40; unit="pack"; rate=140; taxRate=18 }
  )
}
Write-Host "  Invoice 5: B2B to Ramesh & Sons (Inter-state IGST)"

# Invoice 6: B2C to Ravi Shankar
Post "/businesses/$B2/invoices" @{
  type = "B2C"
  customerId = $custIds2[2]
  invoiceDate = "2026-07-10"
  dueDate = "2026-07-17"
  items = @(
    @{ productId=$prodIds2[4]; itemName="Apple - Shimla (1kg)"; quantity=2; unit="kg"; rate=150; taxRate=0 }
    @{ productId=$prodIds2[6]; itemName="Amul Butter (100g)"; quantity=2; unit="piece"; rate=56; taxRate=5 }
    @{ productId=$prodIds2[12]; itemName="Minute Maid Pulpy Orange (400ml)"; quantity=3; unit="piece"; rate=25; taxRate=12 }
  )
}
Write-Host "  Invoice 6: B2C to Ravi Shankar"

# Invoice 7: B2C to Meena Kumari
Post "/businesses/$B2/invoices" @{
  type = "B2C"
  customerId = $custIds2[5]
  invoiceDate = "2026-07-11"
  dueDate = "2026-07-18"
  items = @(
    @{ productId=$prodIds2[2]; itemName="Potato (1kg)"; quantity=3; unit="kg"; rate=35; taxRate=0 }
    @{ productId=$prodIds2[5]; itemName="Amul Gold Milk (1L)"; quantity=3; unit="piece"; rate=64; taxRate=5 }
    @{ productId=$prodIds2[9]; itemName="Haldiram Aloo Bhujia (200g)"; quantity=2; unit="piece"; rate=65; taxRate=12 }
    @{ productId=$prodIds2[11]; itemName="Coca Cola (750ml)"; quantity=4; unit="piece"; rate=40; taxRate=12 }
    @{ productId=$prodIds2[19]; itemName="Colgate MaxFresh 150g"; quantity=1; unit="piece"; rate=95; taxRate=18 }
  )
}
Write-Host "  Invoice 7: B2C to Meena Kumari"

# Payments for UBS SUPERMART
Write-Host "`n  Recording Payments..."
$invList2 = Get-Api "/businesses/$B2/invoices?limit=20"
$invoices2 = $invList2.data.data

if ($invoices2.Count -gt 0) {
  Post "/businesses/$B2/payments" @{
    invoiceId = $invoices2[0].id
    customerId = $custIds2[1]
    amount = 25000
    method = "BANK_TRANSFER"
    reference = "NEFT-20260701-UBS01"
    notes = "Partial payment - Lakshmi Traders"
  }
  Write-Host "  Payment: 25000 via Bank Transfer - Lakshmi Traders"
}
if ($invoices2.Count -gt 2) {
  Post "/businesses/$B2/payments" @{
    invoiceId = $invoices2[2].id
    customerId = $custIds2[0]
    amount = 500
    method = "CASH"
    notes = "Full payment - Suresh Babu"
  }
  Write-Host "  Payment: 500 Cash - Suresh Babu"
}
Post "/businesses/$B2/payments" @{
  customerId = $custIds2[6]
  amount = 10000
  method = "UPI"
  reference = "UPI-PHOENIX-001"
  notes = "Advance from Phoenix Grocery"
}
Write-Host "  Payment: 10000 UPI advance - Phoenix Grocery"

# ============================================================
# SUMMARY
# ============================================================
Write-Host "`n`n========================================" -ForegroundColor Green
Write-Host "  SEEDING COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Login: 9999999999 / admin123" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Business 1: Uday Enterprise (Nagpur, Maharashtra)" -ForegroundColor Yellow
Write-Host "    - 6 Categories, 12 Products, 8 Customers" -ForegroundColor White
Write-Host "    - 6 Invoices (mix B2B + B2C + Inter-state)" -ForegroundColor White
Write-Host "    - 3 Payments" -ForegroundColor White
Write-Host ""
Write-Host "  Business 2: UBS SUPERMART (Bengaluru, Karnataka)" -ForegroundColor Yellow
Write-Host "    - 8 Categories, 22 Products, 8 Customers" -ForegroundColor White
Write-Host "    - 7 Invoices (mix B2B + B2C + Inter-state)" -ForegroundColor White
Write-Host "    - 3 Payments" -ForegroundColor White
Write-Host ""
Write-Host "  Open http://localhost:5173 and login!" -ForegroundColor Cyan
Write-Host ""

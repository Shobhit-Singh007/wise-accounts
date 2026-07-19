// Run on EC2: node scripts/delete-imported-customers.js
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();
const businessId = process.argv[2]; // Pass business ID as argument

async function getCustomerNames(filePath) {
  const wb = XLSX.readFile(filePath, { type: 'file' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, header: 1 });
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    if (rows[i].filter(v => String(v).trim()).length >= 3) { headerIdx = i; break; }
  }
  const nameIdx = rows[headerIdx].findIndex(h => /customer\s*name/i.test(String(h)));
  if (nameIdx === -1) return [];
  const names = new Set();
  const summaryKeywords = ['grand total', 'balance', 'total'];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(v => !String(v).trim())) continue;
    if (summaryKeywords.some(k => String(row[0] || '').toLowerCase().includes(k))) continue;
    const name = String(row[nameIdx] || '').trim();
    if (name) names.add(name);
  }
  return [...names];
}

async function main() {
  if (!businessId) {
    console.error('Usage: node delete-imported-customers.js <businessId>');
    process.exit(1);
  }

  const files = [
    process.argv[3] || 'C:/Users/LENOVO/Downloads/Customer_All_Transactions_Report__01 Jan 2026_to_31 Dec 2026.xlsx',
  ];

  for (const file of files) {
    if (!require('fs').existsSync(file)) {
      console.log(`File not found: ${file}`);
      continue;
    }
    const names = await getCustomerNames(file);
    console.log(`Found ${names.length} unique customers in ${file}`);

    for (const name of names) {
      const customer = await prisma.customer.findFirst({
        where: { businessId, name },
      });
      if (customer) {
        await prisma.customerTransaction.deleteMany({ where: { customerId: customer.id } });
        await prisma.customer.delete({ where: { id: customer.id } });
        console.log(`Deleted: ${name}`);
      }
    }
  }

  await prisma.$disconnect();
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });

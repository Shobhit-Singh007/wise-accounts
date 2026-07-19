const XLSX = require('xlsx');
const fs = require('fs');

function getCustomerNames(filePath) {
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

const files = [
  'C:/Users/LENOVO/Downloads/Customer_All_Transactions_Report__01 Jan 2026_to_31 Dec 2026.xlsx',
  'C:/Users/LENOVO/Downloads/Customer_All_Transactions_Report__01 Jan 2025_to_31 Dec 2025.xlsx',
  'C:/Users/LENOVO/Downloads/Customer_All_Transactions_Report__01 Jan 2023_to_31 Dec 2023.xlsx',
];

const allNames = new Set();
for (const f of files) {
  if (fs.existsSync(f)) {
    const names = getCustomerNames(f);
    console.log(`${f}: ${names.length} customers`);
    names.forEach(n => allNames.add(n));
  } else {
    console.log(`NOT FOUND: ${f}`);
  }
}
console.log(`\nTotal unique names across all files: ${allNames.size}`);
console.log('\n' + JSON.stringify([...allNames]));

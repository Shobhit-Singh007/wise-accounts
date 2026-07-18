import * as XLSX from 'xlsx';

export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'pdf';

interface ExportOptions {
  headers: string[];
  rows: (string | number)[][];
  filename: string;
  title?: string;
  jsonData?: Record<string, unknown>[];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitizeCsvValue(str: string): string {
  const escaped = str.replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str) || str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${escaped}"`;
  }
  return escaped;
}

export function exportToCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => sanitizeCsvValue(String(cell ?? '')))
        .join(','),
    ),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToJson(headers: string[], rows: (string | number)[][], filename: string, jsonData?: Record<string, unknown>[]) {
  let data: Record<string, unknown>[];

  if (jsonData && jsonData.length > 0) {
    data = jsonData;
  } else {
    data = rows.map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] ?? '';
      });
      return obj;
    });
  }

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `${filename}.json`);
}

export function exportToXlsx(headers: string[], rows: (string | number)[][], filename: string) {
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const colWidths = headers.map((h, i) => {
    let maxLen = h.length;
    for (const r of rows) {
      const len = String(r[i] ?? '').length;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPdf(title: string, headers: string[], rows: (string | number)[][], filename: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`,
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${escapeHtml(title)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { color: #1a237e; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f5; padding: 8px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
        td { padding: 6px 12px; border-bottom: 1px solid #eee; }
        tr { page-break-inside: avoid; }
        tr:hover td { background: #fafafa; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h2>${escapeHtml(title)}</h2>
      <div class="subtitle">Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} | ${rows.length} records</div>
      <table>
        <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export function exportData(options: ExportOptions, format: ExportFormat) {
  const { headers, rows, filename, title, jsonData } = options;
  switch (format) {
    case 'csv':
      exportToCsv(headers, rows, filename);
      break;
    case 'json':
      exportToJson(headers, rows, filename, jsonData);
      break;
    case 'xlsx':
      exportToXlsx(headers, rows, filename);
      break;
    case 'pdf':
      exportToPdf(title || filename, headers, rows, filename);
      break;
  }
}

export async function fetchAllPages<T>(
  listFn: (params: { page: number; limit: number }) => Promise<{ data: { data: T[]; meta: { total: number } } }>,
): Promise<T[]> {
  const PAGE_SIZE = 500;
  const CONCURRENCY = 3;
  const firstPage = await listFn({ page: 1, limit: PAGE_SIZE });
  const total = firstPage.data.meta?.total ?? 0;
  let allData = firstPage.data.data || [];

  if (total > PAGE_SIZE) {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

    for (let i = 0; i < pageNumbers.length; i += CONCURRENCY) {
      const batch = pageNumbers.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map((p) => listFn({ page: p, limit: PAGE_SIZE })));
      for (const page of results) {
        allData = allData.concat(page.data.data || []);
      }
    }
  }

  return allData;
}

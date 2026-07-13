export function exportToCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(','),
    ),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPdf(title: string, headers: string[], rows: (string | number)[][], filename: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td style="padding:6px 12px;border-bottom:1px solid #eee">${cell ?? ''}</td>`).join('')}</tr>`,
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h2 { color: #1a237e; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f5f5; padding: 8px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
        td { padding: 6px 12px; border-bottom: 1px solid #eee; }
        tr:hover td { background: #fafafa; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <div class="subtitle">Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

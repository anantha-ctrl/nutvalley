/** Convert an array of objects to CSV and trigger a download. */
export function exportCsv(filename, rows, columns) {
  if (!rows?.length) return;
  const cols = columns || Object.keys(rows[0]);
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.map((c) => esc(c.label || c.key || c)).join(',');
  const body = rows
    .map((r) => cols.map((c) => esc(typeof c === 'object' ? r[c.key] : r[c])).join(','))
    .join('\n');
  // BOM so Excel opens the file as UTF-8 (keeps ₹ and other non-ASCII text intact)
  const blob = new Blob(['﻿', `${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Normalise a columns spec into [{ key, label }]. Falls back to the first row's keys. */
function normCols(rows, columns) {
  const cols = columns || Object.keys(rows[0]);
  return cols.map((c) => (typeof c === 'object' ? { key: c.key, label: c.label || c.key } : { key: c, label: c }));
}

/** Trigger a browser download for a Blob. */
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const escHtml = (v) =>
  String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Export rows to an Excel-compatible .xls (HTML table) file — opens natively in Excel. */
export function exportExcel(filename, rows, columns) {
  if (!rows?.length) return;
  const cols = normCols(rows, columns);
  const head = cols.map((c) => `<th>${escHtml(c.label)}</th>`).join('');
  const body = rows
    .map((r) => `<tr>${cols.map((c) => `<td>${escHtml(r[c.key])}</td>`).join('')}</tr>`)
    .join('');
  const html =
    `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head>` +
    `<body><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel' });
  download(blob, filename.endsWith('.xls') ? filename : `${filename}.xls`);
}

/** Open a print-ready window (browser "Save as PDF") with a titled table. */
export function exportPdf(title, rows, columns) {
  if (!rows?.length) return;
  const cols = normCols(rows, columns);
  const head = cols.map((c) => `<th>${escHtml(c.label)}</th>`).join('');
  const body = rows
    .map((r) => `<tr>${cols.map((c) => `<td>${escHtml(r[c.key])}</td>`).join('')}</tr>`)
    .join('');
  const when = new Date().toLocaleString();
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(
    `<html><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>` +
      `*{font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}` +
      `body{margin:24px;color:#111}` +
      `h1{font-size:20px;margin:0 0 2px}` +
      `.meta{color:#777;font-size:12px;margin-bottom:16px}` +
      `table{width:100%;border-collapse:collapse;font-size:12px}` +
      `th,td{border:1px solid #ddd;padding:8px 10px;text-align:left}` +
      `thead th{background:#111;color:#fff}` +
      `tbody tr:nth-child(even){background:#f6f6f6}` +
      `@page{margin:14mm}` +
      `</style></head><body>` +
      `<h1>${escHtml(title)}</h1><div class="meta">Generated ${escHtml(when)} · ${rows.length} record(s)</div>` +
      `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>` +
      `</body></html>`
  );
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 300);
}

/** Parse a CSV string into an array of row objects keyed by the header row. */
export function parseCsv(text) {
  const rows = csvToRows(text.replace(/^﻿/, '')); // strip BOM
  if (rows.length < 2) return [];
  // Normalise headers: "Low Stock Alert", "Price (₹)", "free-shipping" -> low_stock_alert, price, free_shipping
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\(.*?\)/g, '').trim().replace(/[\s-]+/g, '_'));
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c.trim() !== '')) // skip blank lines
    .map((r) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
      return obj;
    });
}

/** Tokenize CSV text into rows of cells, honouring quotes and escaped quotes. */
function csvToRows(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch === '\r') { /* ignore */ }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

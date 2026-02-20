import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { EXPECTED_COLUMNS } from './sampleData';

// Vite resolves this ?url import at build time, giving pdfjs-dist's worker
// a proper hashed asset URL that works in both dev and Vercel production.
// The old `new URL('pdfjs-dist/...', import.meta.url)` pattern fails in
// production because Vite can't trace node_modules paths that way.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Scan the first 15 rows to find the real header row.
// Strategy 1 (strong signal): find the first row with a cell containing "categor"
//   — catches "Category", "L2 Categories", "Product Category", etc.
// Strategy 2 (fallback): first row with 3+ text cells where row[0] isn't "TOTAL"
function findHeaderRowIndex(rows) {
  const limit = Math.min(15, rows.length);

  // Strong signal: any cell contains "categor"
  for (let i = 0; i < limit; i++) {
    const hasCategory = rows[i].some(
      (cell) => typeof cell === 'string' && cell.toLowerCase().includes('categor'),
    );
    if (hasCategory) return i;
  }

  // Fallback: first row with 3+ text cells that doesn't start with "TOTAL"
  for (let i = 0; i < limit; i++) {
    const first = String(rows[i][0] ?? '').trim().toUpperCase();
    if (first === 'TOTAL') continue;
    const textCells = rows[i].filter(
      (cell) => typeof cell === 'string' && cell.trim().length > 1,
    );
    if (textCells.length >= 3) return i;
  }

  return 0;
}

// Match raw column headers from the file to our internal field names
function mapColumns(headers) {
  const mapping = {};
  headers.forEach((header) => {
    const normalized = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(EXPECTED_COLUMNS)) {
      if (aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))) {
        if (!mapping[field]) mapping[field] = header;
      }
    }
  });
  return mapping;
}

function normalizeNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/[$,%\s]/g, '').replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// Percentage fields stored as decimals (e.g. 0.936) need to be multiplied by 100.
// We detect this by checking if the value is between -1 and 1 exclusive.
const PERCENT_FIELDS = new Set(['mbGpMargin', 'mmsGpMargin', 'penetration', 'coverage', 'marketGrowth']);
function normalizePercent(val) {
  const n = normalizeNumber(val);
  if (n == null) return null;
  // Already looks like a percentage (e.g. 93.6, 45.2)
  if (Math.abs(n) > 1) return n;
  // Stored as decimal fraction (e.g. 0.936) — convert to percent
  return n * 100;
}

// Exported so FileUpload can show the user which headers were detected
export function rowsToRecords(rows) {
  if (!rows || rows.length < 2) return [];

  // Find the real header row — skips blank / totals rows at the top
  const headerRowIdx = findHeaderRowIndex(rows);
  const headers      = rows[headerRowIdx].map(String);
  const colMap       = mapColumns(headers);
  const headerIdx    = {};
  headers.forEach((h, i) => { headerIdx[h] = i; });

  // If nothing mapped to "category", fall back to the first column
  if (!colMap.category && headers.length > 0) {
    colMap.category = headers[0];
  }

  const records = rows
    .slice(headerRowIdx + 1)                          // data starts after the header row
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ''))
    .map((row, idx) => {
      const record = { id: idx + 1 };

      for (const [field, originalHeader] of Object.entries(colMap)) {
        const colIdx = headerIdx[originalHeader];
        const rawVal = colIdx !== undefined ? row[colIdx] : undefined;

        if (field === 'category') {
          record[field] = rawVal != null ? String(rawVal).trim() : '';
        } else if (PERCENT_FIELDS.has(field)) {
          // Handle percentages stored as decimals (0.936) or whole numbers (93.6)
          record[field] = normalizePercent(rawVal);
        } else {
          record[field] = normalizeNumber(rawVal);
        }
      }

      // Derive MB GP$ from revenue + MB GP% when one is missing
      if (record.mbGpDollars == null && record.revenue != null && record.mbGpMargin != null) {
        record.mbGpDollars = record.revenue * (record.mbGpMargin / 100);
      }
      if (record.mbGpMargin == null && record.revenue != null && record.mbGpDollars != null && record.revenue > 0) {
        record.mbGpMargin = (record.mbGpDollars / record.revenue) * 100;
      }

      // Snap tier to 1–4; default to 3 if missing
      if (record.tier != null) {
        record.tier = Math.min(4, Math.max(1, Math.round(record.tier)));
      } else {
        record.tier = 3;
      }

      return record;
    })
    .filter((r) => r.category);

  // Attach detected header info so the UI can show it in error messages
  records._detectedHeaders = headers;
  records._mappedFields    = Object.keys(colMap);
  return records;
}

// --- File type parsers ---

export async function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data     = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet    = workbook.Sheets[workbook.SheetNames[0]];
        const rows     = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        resolve(rowsToRecords(rows));
      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (result) => {
        try   { resolve(rowsToRecords(result.data)); }
        catch (err) { reject(new Error('Failed to process CSV: ' + err.message)); }
      },
      error: (err) => reject(new Error('Failed to parse CSV: ' + err.message)),
      skipEmptyLines: true,
    });
  });
}

// startPage and endPage are 1-based page numbers (inclusive).
// Defaulting to pages 1-5 prevents timeouts on large PDFs.
export async function parsePdf(file, { startPage = 1, endPage = 5 } = {}) {
  try {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');

    // pdfWorkerUrl is resolved by Vite at build time — works in production
    GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

    const arrayBuffer = await file.arrayBuffer();
    const pdf         = await getDocument({ data: arrayBuffer }).promise;

    // Clamp the requested range to what the document actually has
    const first = Math.max(1, startPage);
    const last  = Math.min(pdf.numPages, endPage);

    if (first > pdf.numPages) {
      throw new Error(
        `This PDF only has ${pdf.numPages} page(s). ` +
        `Please set the start page to ${pdf.numPages} or lower.`
      );
    }

    const allLines = [];

    for (let pageNum = first; pageNum <= last; pageNum++) {
      const page    = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      // Group text items by Y coordinate to reconstruct each visual row
      const byY = {};
      content.items.forEach((item) => {
        const y = Math.round(item.transform[5]);
        if (!byY[y]) byY[y] = [];
        byY[y].push({ x: item.transform[4], text: item.str });
      });
      Object.keys(byY)
        .map(Number)
        .sort((a, b) => b - a) // top of page first
        .forEach((y) => {
          const row = byY[y]
            .sort((a, b) => a.x - b.x)
            .map((i) => i.text.trim())
            .filter(Boolean);
          if (row.length) allLines.push(row);
        });
    }

    if (allLines.length < 2) {
      throw new Error(
        `No table data found on pages ${first}–${last}. ` +
        `Try a different page range, or use Excel/CSV for best results.`
      );
    }

    return rowsToRecords(allLines);
  } catch (err) {
    // Re-throw with a clean prefix so the UI shows a readable message
    throw new Error('PDF parsing failed: ' + err.message);
  }
}

export async function parseImage(file) {
  return new Promise((resolve) => {
    resolve({
      type: 'image',
      name: file.name,
      message:
        'Image files cannot be parsed automatically. Please convert your data to Excel or CSV format, or load the sample data to get started.',
    });
  });
}

// options.startPage / options.endPage are only used for PDF files
export async function parseFile(file, options = {}) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const type = file.type.toLowerCase();

  if (ext === 'xlsx' || ext === 'xls' || type.includes('spreadsheet') || type.includes('excel')) {
    return { data: await parseExcel(file), source: file.name };
  }
  if (ext === 'csv' || type.includes('csv')) {
    return { data: await parseCsv(file), source: file.name };
  }
  if (ext === 'pdf' || type.includes('pdf')) {
    return { data: await parsePdf(file, options), source: file.name };
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || type.includes('image')) {
    const result = await parseImage(file);
    return { data: null, source: file.name, imageResult: result };
  }
  throw new Error(`Unsupported file type: .${ext}`);
}

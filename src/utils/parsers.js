import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { EXPECTED_COLUMNS } from './sampleData';

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

function rowsToRecords(rows) {
  if (!rows || rows.length < 2) return [];

  const headers   = rows[0].map(String);
  const colMap    = mapColumns(headers);
  const headerIdx = {};
  headers.forEach((h, i) => { headerIdx[h] = i; });

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ''))
    .map((row, idx) => {
      const record = { id: idx + 1 };

      for (const [field, originalHeader] of Object.entries(colMap)) {
        const colIdx = headerIdx[originalHeader];
        const rawVal = colIdx !== undefined ? row[colIdx] : undefined;

        if (field === 'category') {
          record[field] = rawVal != null ? String(rawVal).trim() : '';
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

export async function parsePdf(file) {
  try {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
    GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf         = await getDocument({ data: arrayBuffer }).promise;
    const allLines    = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page    = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      // Group text items by their Y position to reconstruct table rows
      const byY = {};
      content.items.forEach((item) => {
        const y = Math.round(item.transform[5]);
        if (!byY[y]) byY[y] = [];
        byY[y].push({ x: item.transform[4], text: item.str });
      });
      Object.keys(byY)
        .map(Number)
        .sort((a, b) => b - a)
        .forEach((y) => {
          const row = byY[y].sort((a, b) => a.x - b.x).map((i) => i.text.trim()).filter(Boolean);
          if (row.length) allLines.push(row);
        });
    }

    if (allLines.length < 2) {
      throw new Error('Could not extract tabular data from PDF. Use Excel or CSV format instead.');
    }
    return rowsToRecords(allLines);
  } catch (err) {
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

export async function parseFile(file) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const type = file.type.toLowerCase();

  if (ext === 'xlsx' || ext === 'xls' || type.includes('spreadsheet') || type.includes('excel')) {
    return { data: await parseExcel(file), source: file.name };
  }
  if (ext === 'csv' || type.includes('csv')) {
    return { data: await parseCsv(file), source: file.name };
  }
  if (ext === 'pdf' || type.includes('pdf')) {
    return { data: await parsePdf(file), source: file.name };
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || type.includes('image')) {
    const result = await parseImage(file);
    return { data: null, source: file.name, imageResult: result };
  }
  throw new Error(`Unsupported file type: .${ext}`);
}

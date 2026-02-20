import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { EXPECTED_COLUMNS } from './sampleData';

// Map raw column headers to canonical field names
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
  const headers = rows[0].map(String);
  const colMap = mapColumns(headers);
  const headerIndex = {};
  headers.forEach((h, i) => { headerIndex[h] = i; });

  return rows.slice(1)
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ''))
    .map((row, idx) => {
      const record = { id: idx + 1 };
      for (const [field, originalHeader] of Object.entries(colMap)) {
        const colIdx = headerIndex[originalHeader];
        const rawVal = colIdx !== undefined ? row[colIdx] : undefined;
        if (field === 'category') {
          record[field] = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
        } else {
          record[field] = normalizeNumber(rawVal);
        }
      }
      // Derive missing fields where possible
      if (record.gpDollars == null && record.revenue != null && record.gpMargin != null) {
        record.gpDollars = record.revenue * (record.gpMargin / 100);
      }
      if (record.gpMargin == null && record.revenue != null && record.gpDollars != null && record.revenue > 0) {
        record.gpMargin = (record.gpDollars / record.revenue) * 100;
      }
      return record;
    })
    .filter((r) => r.category);
}

// Parse Excel (.xlsx / .xls)
export async function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        resolve(rowsToRecords(rows));
      } catch (err) {
        reject(new Error('Failed to parse Excel file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsArrayBuffer(file);
  });
}

// Parse CSV
export async function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (result) => {
        try {
          resolve(rowsToRecords(result.data));
        } catch (err) {
          reject(new Error('Failed to process CSV: ' + err.message));
        }
      },
      error: (err) => reject(new Error('Failed to parse CSV: ' + err.message)),
      skipEmptyLines: true,
    });
  });
}

// Parse PDF — extracts text and attempts table detection
export async function parsePdf(file) {
  try {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
    GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const allLines = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      // Group items by approximate Y position to reconstruct rows
      const itemsByY = {};
      content.items.forEach((item) => {
        const y = Math.round(item.transform[5]);
        if (!itemsByY[y]) itemsByY[y] = [];
        itemsByY[y].push({ x: item.transform[4], text: item.str });
      });
      const sortedYs = Object.keys(itemsByY).map(Number).sort((a, b) => b - a);
      sortedYs.forEach((y) => {
        const row = itemsByY[y].sort((a, b) => a.x - b.x).map((i) => i.text.trim()).filter(Boolean);
        if (row.length > 0) allLines.push(row);
      });
    }

    if (allLines.length < 2) {
      throw new Error('Could not extract tabular data from PDF. Please use Excel or CSV format.');
    }
    return rowsToRecords(allLines);
  } catch (err) {
    throw new Error('PDF parsing failed: ' + err.message);
  }
}

// Parse JPG/PNG — returns structured prompt for manual mapping
// Since browser OCR is limited, we provide a template download and guidance
export async function parseImage(file) {
  return new Promise((resolve) => {
    // Return a placeholder result with instructions
    resolve({
      type: 'image',
      name: file.name,
      message:
        'Image files cannot be parsed automatically. Please convert your data to Excel or CSV format, or use the sample data to get started.',
    });
  });
}

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
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

import { useCallback, useState } from 'react';
import {
  Upload, FileSpreadsheet, FileText, Image,
  AlertCircle, CheckCircle, X, FileSearch,
} from 'lucide-react';
import { parseFile, getExcelSheetNames } from '../utils/parsers';

const ACCEPTED = '.xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png';

function FileIcon({ name }) {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png'].includes(ext)) return <Image size={16} className="text-purple-500" />;
  if (ext === 'pdf')                         return <FileText size={16} className="text-red-500" />;
  return <FileSpreadsheet size={16} className="text-green-600" />;
}

function isPdf(file) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const type = file.type.toLowerCase();
  return ext === 'pdf' || type.includes('pdf');
}

export default function FileUpload({ onDataLoaded, onLoadSample }) {
  const [dragging,    setDragging]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [status,      setStatus]      = useState(null); // { type: 'success'|'error'|'info', message }

  // Incrementing this key remounts the <input> element, which clears its
  // internal value. This lets the same file be re-uploaded without issue —
  // browsers won't fire onChange if the path hasn't changed on the same element.
  const [inputKey,    setInputKey]    = useState(0);

  // PDF staging: hold the file here until the user confirms the page range
  const [pendingPdf,  setPendingPdf]  = useState(null);
  const [pdfStart,    setPdfStart]    = useState(1);
  const [pdfEnd,      setPdfEnd]      = useState(5);

  // Excel staging: hold the file + sheet list until the user picks a tab
  const [pendingExcel,   setPendingExcel]   = useState(null);
  const [excelSheets,    setExcelSheets]    = useState([]);
  const [selectedSheet,  setSelectedSheet]  = useState('');

  // Run the actual parse (used for non-PDF files immediately, PDF on button click)
  const runParse = useCallback(async (file, options = {}) => {
    setLoading(true);
    setStatus(null);
    try {
      const result = await parseFile(file, options);
      if (result.imageResult) {
        setStatus({ type: 'info', message: result.imageResult.message });
        setLoading(false);
        return;
      }
      if (!result.data || result.data.length === 0) {
        // If headers were detected, show them so the user knows what was found
        const detected = result.data?._detectedHeaders;
        const headerHint = detected?.length
          ? ` Headers detected: "${detected.slice(0, 6).join('", "')}"`
          : '';
        setStatus({
          type: 'error',
          message:
            'No data rows found. Check that your file has a header row and at least one ' +
            'data row with a category/product name in the first column.' + headerHint,
        });
      } else {
        onDataLoaded(result.data, result.source);
        setStatus({
          type: 'success',
          message: `Loaded ${result.data.length} categories from ${result.source}`,
        });
        setPendingPdf(null); // clear PDF staging after success
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
    setLoading(false);
  }, [onDataLoaded]);

  const isExcel = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    return ext === 'xlsx' || ext === 'xls';
  };

  // When a file is selected or dropped
  const handleFile = useCallback(async (file) => {
    setStatus(null);
    if (isPdf(file)) {
      // Stage the PDF and show the page range UI — don't parse yet
      setPendingExcel(null);
      setPendingPdf(file);
      setPdfStart(1);
      setPdfEnd(5);
    } else if (isExcel(file)) {
      // Read sheet names; if there are multiple, let the user pick one
      setPendingPdf(null);
      setPendingExcel(null);
      setLoading(true);
      try {
        const sheets = await getExcelSheetNames(file);
        if (sheets.length <= 1) {
          // Single sheet — parse straight away (runParse manages loading state)
          setLoading(false);
          runParse(file);
        } else {
          // Multiple sheets — show the tab picker
          const preferred = ['FinalVercel', 'Final', 'Data', 'Categories', 'Sheet1']
            .find((s) => sheets.includes(s)) ?? sheets[0];
          setExcelSheets(sheets);
          setSelectedSheet(preferred);
          setPendingExcel(file);
          setLoading(false);
        }
      } catch (err) {
        setStatus({ type: 'error', message: err.message });
        setLoading(false);
      }
    } else {
      // CSV / image / etc — parse immediately
      setPendingPdf(null);
      setPendingExcel(null);
      runParse(file);
    }
  }, [runParse]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    // Remount the input after every selection so the same file can be
    // picked again immediately (browsers skip onChange if path is unchanged)
    setInputKey((k) => k + 1);
  }, [handleFile]);

  const handleParsePdf = () => {
    if (!pendingPdf) return;
    const start = Math.max(1, parseInt(pdfStart, 10) || 1);
    const end   = Math.max(start, parseInt(pdfEnd, 10) || start);
    runParse(pendingPdf, { startPage: start, endPage: end });
  };

  const cancelPdf = () => {
    setPendingPdf(null);
    setStatus(null);
  };

  const handleParseExcel = () => {
    if (!pendingExcel) return;
    runParse(pendingExcel, { sheetName: selectedSheet });
    setPendingExcel(null);
  };

  const cancelExcel = () => {
    setPendingExcel(null);
    setStatus(null);
  };

  return (
    <div className="space-y-3">

      {/* Drop zone — hidden while staging a PDF or Excel sheet picker */}
      {!pendingPdf && !pendingExcel && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
            dragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/40'
          }`}
        >
          <input
            key={inputKey}
            type="file"
            accept={ACCEPTED}
            onChange={onInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={loading}
          />
          <Upload size={28} className={`mx-auto mb-2 ${dragging ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-sm font-medium text-gray-700">
            {loading ? 'Processing file…' : 'Drop file here or click to browse'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Excel (.xlsx/.xls), CSV, PDF, JPG/PNG</p>
          {loading && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-blue-600">Parsing file…</span>
            </div>
          )}
        </div>
      )}

      {/* PDF page range selector — shown after a PDF is dropped/selected */}
      {pendingPdf && (
        <div className="bg-white border-2 border-blue-200 rounded-xl p-4 space-y-3">
          {/* File name row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch size={16} className="text-red-500" />
              <span className="text-sm font-medium text-gray-800 truncate max-w-[220px]">
                {pendingPdf.name}
              </span>
            </div>
            <button onClick={cancelPdf} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          {/* Page range inputs */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Select page range to parse
            </p>
            <p className="text-xs text-gray-400 mb-3 leading-relaxed">
              Large PDFs can timeout if you parse all pages at once.
              Pick only the pages that contain your data table.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">From page</label>
                <input
                  type="number"
                  min={1}
                  value={pdfStart}
                  onChange={(e) => setPdfStart(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-center
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-gray-400 mt-4">→</span>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">To page</label>
                <input
                  type="number"
                  min={pdfStart}
                  value={pdfEnd}
                  onChange={(e) => setPdfEnd(Math.max(pdfStart, parseInt(e.target.value, 10) || pdfStart))}
                  className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-center
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1" />
              <div className="mt-4 text-xs text-gray-400">
                {pdfEnd - pdfStart + 1} page{pdfEnd - pdfStart !== 0 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Parse button */}
          <button
            onClick={handleParsePdf}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg
              text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#0066CC' }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Parsing pages {pdfStart}–{pdfEnd}…
              </>
            ) : (
              <>
                <FileSearch size={15} />
                Parse pages {pdfStart}–{pdfEnd}
              </>
            )}
          </button>
        </div>
      )}

      {/* Excel sheet picker — shown when the workbook has multiple tabs */}
      {pendingExcel && (
        <div className="bg-white border-2 border-blue-200 rounded-xl p-4 space-y-3">
          {/* File name row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-green-600" />
              <span className="text-sm font-medium text-gray-800 truncate max-w-[220px]">
                {pendingExcel.name}
              </span>
            </div>
            <button onClick={cancelExcel} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          {/* Sheet dropdown */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">
              Which tab contains your data?
            </p>
            <p className="text-xs text-gray-400 mb-3">
              This workbook has {excelSheets.length} sheets. Pick the one with your category data.
            </p>
            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
            >
              {excelSheets.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Load button */}
          <button
            onClick={handleParseExcel}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg
              text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#0066CC' }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <FileSpreadsheet size={15} />
                Load "{selectedSheet}"
              </>
            )}
          </button>
        </div>
      )}

      {/* Status message (success / error / info) */}
      {status && (
        <div
          className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
            status.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : status.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {status.type === 'success'
            ? <CheckCircle size={16} className="mt-0.5 shrink-0" />
            : <AlertCircle size={16} className="mt-0.5 shrink-0" />
          }
          <span className="flex-1">{status.message}</span>
          <button onClick={() => setStatus(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Load sample data */}
      <button
        onClick={onLoadSample}
        className="w-full py-2 px-4 text-sm font-medium rounded-lg transition-colors border"
        style={{ color: '#0066CC', backgroundColor: '#e6f0ff', borderColor: '#b3d1ff' }}
      >
        Load sample data (57 categories)
      </button>

    </div>
  );
}

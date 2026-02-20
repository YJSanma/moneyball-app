import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, FileText, Image, AlertCircle, CheckCircle, X } from 'lucide-react';
import { parseFile } from '../utils/parsers';

const ACCEPTED = '.xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png';

function FileIcon({ name }) {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png'].includes(ext)) return <Image size={16} className="text-purple-500" />;
  if (ext === 'pdf') return <FileText size={16} className="text-red-500" />;
  return <FileSpreadsheet size={16} className="text-green-600" />;
}

export default function FileUpload({ onDataLoaded, onLoadSample }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error'|'info', message }
  const [fileName, setFileName] = useState(null);

  const handleFile = useCallback(async (file) => {
    setLoading(true);
    setStatus(null);
    setFileName(file.name);
    try {
      const result = await parseFile(file);
      if (result.imageResult) {
        setStatus({ type: 'info', message: result.imageResult.message });
        setLoading(false);
        return;
      }
      if (!result.data || result.data.length === 0) {
        setStatus({
          type: 'error',
          message: 'No valid data rows found. Ensure your file has a header row with columns like Category, Revenue, GP$, GP%, Market Growth, etc.',
        });
      } else {
        onDataLoaded(result.data, result.source);
        setStatus({
          type: 'success',
          message: `Loaded ${result.data.length} categories from ${result.source}`,
        });
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
    setLoading(false);
  }, [onDataLoaded]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  return (
    <div className="space-y-3">
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
          type="file"
          accept={ACCEPTED}
          onChange={onInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={loading}
        />
        <Upload
          size={28}
          className={`mx-auto mb-2 ${dragging ? 'text-blue-500' : 'text-gray-400'}`}
        />
        <p className="text-sm font-medium text-gray-700">
          {loading ? 'Processing file...' : 'Drop file here or click to browse'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Supports Excel (.xlsx/.xls), CSV, PDF, JPG/PNG
        </p>
        {fileName && !loading && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            <FileIcon name={fileName} />
            <span className="truncate max-w-[200px]">{fileName}</span>
          </div>
        )}
        {loading && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-blue-600">Parsing file...</span>
          </div>
        )}
      </div>

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
          {status.type === 'success' ? (
            <CheckCircle size={16} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
          )}
          <span className="flex-1">{status.message}</span>
          <button
            onClick={() => setStatus(null)}
            className="shrink-0 text-current opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        onClick={onLoadSample}
        className="w-full py-2 px-4 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
      >
        Load sample data (12 categories)
      </button>

      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-xs font-semibold text-gray-600 mb-2">Expected columns (flexible naming):</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {[
            ['Category', 'Product name / segment'],
            ['Revenue', 'Net sales ($)'],
            ['GP$', 'Gross profit dollars'],
            ['GP%', 'Gross margin %'],
            ['Market Growth', 'YoY growth rate %'],
            ['Market Share', 'Relative market share'],
            ['Attractiveness', 'Market score (0–100)'],
            ['Comp. Position', 'Competitive score (0–100)'],
          ].map(([col, desc]) => (
            <div key={col} className="flex flex-col">
              <span className="text-xs font-medium text-gray-700">{col}</span>
              <span className="text-xs text-gray-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

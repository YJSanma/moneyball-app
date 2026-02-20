import { useMemo, useState } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { formatCurrency, formatPercent, formatNumber, CHART_COLORS } from '../../utils/formatters';

const COLUMNS = [
  { key: 'category', label: 'Category', align: 'left', format: (v) => v || '—' },
  { key: 'revenue', label: 'Revenue', align: 'right', format: (v) => formatCurrency(v) },
  { key: 'gpDollars', label: 'GP$', align: 'right', format: (v) => formatCurrency(v) },
  { key: 'gpMargin', label: 'GP%', align: 'right', format: (v) => formatPercent(v) },
  { key: 'marketGrowth', label: 'Mkt Growth', align: 'right', format: (v) => formatPercent(v) },
  { key: 'marketShare', label: 'Rel. Share', align: 'right', format: (v) => (v != null ? `${v.toFixed(2)}x` : '—') },
  { key: 'marketAttractiveness', label: 'Attractiveness', align: 'right', format: (v) => (v != null ? `${v.toFixed(0)}/100` : '—') },
  { key: 'competitivePosition', label: 'Comp. Position', align: 'right', format: (v) => (v != null ? `${v.toFixed(0)}/100` : '—') },
  { key: 'units', label: 'Units', align: 'right', format: (v) => formatNumber(v, true) },
];

function SortIcon({ col, sortCol, sortDir }) {
  if (col !== sortCol) return <ArrowUpDown size={12} className="text-gray-300" />;
  if (sortDir === 'asc') return <ArrowUp size={12} className="text-blue-500" />;
  return <ArrowDown size={12} className="text-blue-500" />;
}

function GPMarginBadge({ value }) {
  if (value == null) return <span className="text-gray-400">—</span>;
  const color =
    value >= 40
      ? 'bg-green-50 text-green-700 border-green-200'
      : value >= 30
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {formatPercent(value)}
    </span>
  );
}

function exportToCsv(data) {
  const headers = COLUMNS.map((c) => c.label);
  const rows = data.map((d) =>
    COLUMNS.map((c) => {
      const v = d[c.key];
      if (v == null) return '';
      if (typeof v === 'number') return v;
      return `"${String(v).replace(/"/g, '""')}"`;
    }),
  );
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'moneyball-data.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataTable({ data }) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('gpDollars');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (col) => {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter((d) =>
      !q || (d.category || '').toLowerCase().includes(q),
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totals = useMemo(
    () => ({
      revenue: sorted.reduce((s, d) => s + (d.revenue || 0), 0),
      gpDollars: sorted.reduce((s, d) => s + (d.gpDollars || 0), 0),
      gpMargin:
        sorted.filter((d) => d.gpMargin != null).length > 0
          ? sorted.filter((d) => d.gpMargin != null).reduce((s, d) => s + d.gpMargin, 0) /
            sorted.filter((d) => d.gpMargin != null).length
          : null,
      units: sorted.reduce((s, d) => s + (d.units || 0), 0),
    }),
    [sorted],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Data Table</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {sorted.length} of {data.length} categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-48"
            />
          </div>
          <button
            onClick={() => exportToCsv(sorted)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-800 transition-colors ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1 ${
                        col.align === 'right' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {col.label}
                      <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((row, idx) => (
                <tr
                  key={row.id}
                  className="hover:bg-blue-50/30 transition-colors"
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2.5 ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      } ${col.key === 'category' ? 'font-medium text-gray-900' : 'text-gray-600'}`}
                    >
                      {col.key === 'gpMargin' ? (
                        <GPMarginBadge value={row.gpMargin} />
                      ) : col.key === 'category' ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                          />
                          {row.category}
                        </div>
                      ) : (
                        col.format(row[col.key])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {sorted.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                  <td className="px-4 py-2.5 text-gray-700 text-xs uppercase tracking-wide">Totals / Avg</td>
                  <td className="px-4 py-2.5 text-right text-gray-900">{formatCurrency(totals.revenue)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-900">{formatCurrency(totals.gpDollars)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <GPMarginBadge value={totals.gpMargin} />
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-400">—</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">—</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">—</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">—</td>
                  <td className="px-4 py-2.5 text-right text-gray-900">{formatNumber(totals.units)}</td>
                </tr>
              </tfoot>
            )}
          </table>
          {sorted.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Search size={28} className="mx-auto mb-2 opacity-50" />
              <p>No categories match your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

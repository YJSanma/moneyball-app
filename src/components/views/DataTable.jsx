// Data Table — sortable, searchable, filterable by tier
// Includes CSV export and totals row

import { useMemo, useState } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import {
  formatCurrency, formatPercent, getTier,
  getPenCovQuadrant, getGrowthQuadrant,
} from '../../utils/formatters';

// compute: optional function(row) => value, used for derived columns
const COLUMNS = [
  { key: 'category',     label: 'Category',      align: 'left',  format: (v) => v || '—' },
  { key: 'tier',         label: 'Tier',           align: 'left',  format: null },
  { key: 'mbGpDollars',  label: 'MB GP$',         align: 'right', format: (v) => formatCurrency(v) },
  { key: 'mbGpMargin',   label: 'MB GP%',         align: 'right', format: null },
  { key: 'mmsGpDollars', label: 'MMS GP$',        align: 'right', format: (v) => formatCurrency(v) },
  { key: 'penetration',  label: 'Penetration',    align: 'right', format: (v) => formatPercent(v, 0) },
  { key: 'coverage',     label: 'Coverage',       align: 'right', format: (v) => formatPercent(v, 0) },
  { key: 'marketGrowth', label: 'Mkt Growth',     align: 'right', format: (v) => formatPercent(v) },
  { key: 'marketShare',  label: 'Rel. Share',     align: 'right', format: (v) => v != null ? `${v.toFixed(2)}x` : '—' },
  // Derived quadrant columns — computed from other fields, not stored on the row
  {
    key: 'f1Quadrant',
    label: 'F1 Quadrant',
    align: 'left',
    format: null,
    compute: (row) => row.penetration != null && row.coverage != null
      ? getPenCovQuadrant(row.penetration, row.coverage)
      : null,
  },
  {
    key: 'f2Quadrant',
    label: 'F2 Quadrant',
    align: 'left',
    format: null,
    compute: (row) => row.mbOutpaceMms != null && row.mmsOutpaceMarket != null
      ? getGrowthQuadrant(row.mbOutpaceMms, row.mmsOutpaceMarket)
      : null,
  },
];

// Returns the sortable value for a row given a column definition
function getVal(row, col) {
  if (col.compute) {
    const q = col.compute(row);
    return q ? q.label : '';
  }
  return row[col.key];
}

function SortIcon({ col, sortCol, sortDir }) {
  if (col !== sortCol) return <ArrowUpDown size={12} className="text-gray-300" />;
  return sortDir === 'asc'
    ? <ArrowUp size={12} className="text-blue-500" />
    : <ArrowDown size={12} className="text-blue-500" />;
}

function TierBadge({ tier }) {
  if (tier == null) return <span className="text-gray-400">—</span>;
  const t = getTier(tier);
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: t.bg, color: t.color, border: `1px solid ${t.border}` }}>
      {t.label}
    </span>
  );
}

function MarginBadge({ value }) {
  if (value == null) return <span className="text-gray-400">—</span>;
  const cls = value >= 45 ? 'bg-green-50 text-green-700 border-green-200'
    : value >= 35         ? 'bg-blue-50 text-blue-700 border-blue-200'
    :                       'bg-amber-50 text-amber-700 border-amber-200';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {formatPercent(value)}
    </span>
  );
}

function QuadrantBadge({ quadrant }) {
  if (!quadrant) return <span className="text-gray-400">—</span>;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: quadrant.bg, color: quadrant.color }}>
      {quadrant.label}
    </span>
  );
}

function exportToCsv(rows) {
  const headers = COLUMNS.map((c) => c.label);
  const lines   = rows.map((row) =>
    COLUMNS.map((col) => {
      if (col.compute) {
        const q = col.compute(row);
        return q ? `"${q.label}"` : '';
      }
      const v = row[col.key];
      if (v == null) return '';
      if (typeof v === 'number') return v;
      return `"${String(v).replace(/"/g, '""')}"`;
    }),
  );
  const csv  = [headers, ...lines].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'moneyball-data.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataTable({ data }) {
  const [search,     setSearch]     = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortCol,    setSortCol]    = useState('mbGpDollars');
  const [sortDir,    setSortDir]    = useState('desc');

  const handleSort = (colKey) => {
    if (colKey === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colKey);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter((d) => {
      const matchSearch = !q || (d.category || '').toLowerCase().includes(q);
      const matchTier   = tierFilter === 'all' || String(d.tier) === tierFilter;
      return matchSearch && matchTier;
    });
  }, [data, search, tierFilter]);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sortCol);
    return [...filtered].sort((a, b) => {
      const av = col ? getVal(a, col) : a[sortCol];
      const bv = col ? getVal(b, col) : b[sortCol];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totals = useMemo(() => ({
    mbGpDollars:  sorted.reduce((s, d) => s + (d.mbGpDollars  || 0), 0),
    mmsGpDollars: sorted.reduce((s, d) => s + (d.mmsGpDollars || 0), 0),
    mbGpMargin:   sorted.filter((d) => d.mbGpMargin != null).length > 0
      ? sorted.filter((d) => d.mbGpMargin != null).reduce((s, d) => s + d.mbGpMargin, 0) /
        sorted.filter((d) => d.mbGpMargin != null).length
      : null,
    penetration: sorted.filter((d) => d.penetration != null).length > 0
      ? sorted.filter((d) => d.penetration != null).reduce((s, d) => s + d.penetration, 0) /
        sorted.filter((d) => d.penetration != null).length
      : null,
    coverage: sorted.filter((d) => d.coverage != null).length > 0
      ? sorted.filter((d) => d.coverage != null).reduce((s, d) => s + d.coverage, 0) /
        sorted.filter((d) => d.coverage != null).length
      : null,
  }), [sorted]);

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Data Table</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {sorted.length} of {data.length} categories
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Tier filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All tiers</option>
            <option value="1">Tier 1 — Invest & Grow</option>
            <option value="2">Tier 2 — Grow Selectively</option>
            <option value="3">Tier 3 — Maintain</option>
            <option value="4">Tier 4 — Monitor</option>
          </select>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search categories..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white w-48
                focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {/* Export */}
          <button
            onClick={() => exportToCsv(sorted)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600
              bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {COLUMNS.map((col) => (
                  <th key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide
                      cursor-pointer select-none hover:text-gray-800 transition-colors whitespace-nowrap
                      ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                      {col.label}
                      <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50/20 transition-colors">
                  {COLUMNS.map((col) => {
                    let cell;
                    if (col.key === 'tier')        cell = <TierBadge tier={row.tier} />;
                    else if (col.key === 'mbGpMargin') cell = <MarginBadge value={row.mbGpMargin} />;
                    else if (col.compute)          cell = <QuadrantBadge quadrant={col.compute(row)} />;
                    else if (col.format)           cell = col.format(row[col.key]);
                    else                           cell = row[col.key] ?? '—';
                    return (
                      <td key={col.key}
                        className={`px-3 py-2.5 whitespace-nowrap
                          ${col.align === 'right' ? 'text-right' : ''}
                          ${col.key === 'category' ? 'font-medium text-gray-900' : 'text-gray-600'}`}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            {/* Totals / averages footer */}
            {sorted.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-xs">
                  <td className="px-3 py-2.5 text-gray-500 uppercase tracking-wide">
                    Totals / Avg ({sorted.length})
                  </td>
                  <td className="px-3 py-2.5 text-gray-400">—</td>
                  <td className="px-3 py-2.5 text-right text-gray-900">{formatCurrency(totals.mbGpDollars)}</td>
                  <td className="px-3 py-2.5 text-right"><MarginBadge value={totals.mbGpMargin} /></td>
                  <td className="px-3 py-2.5 text-right text-gray-900">{formatCurrency(totals.mmsGpDollars)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{formatPercent(totals.penetration, 0)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{formatPercent(totals.coverage, 0)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-400">—</td>
                  <td className="px-3 py-2.5 text-right text-gray-400">—</td>
                  <td className="px-3 py-2.5 text-gray-400">—</td>
                  <td className="px-3 py-2.5 text-gray-400">—</td>
                </tr>
              </tfoot>
            )}
          </table>

          {sorted.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Search size={28} className="mx-auto mb-2 opacity-40" />
              <p>No categories match your filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

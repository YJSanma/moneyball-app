// Data Table — dynamic columns matching the uploaded file, sortable/searchable
// When an uploaded file is loaded, columns mirror the Excel headers exactly.
// Sample data falls back to a fixed column set.
// A synchronized top scrollbar lets users scroll right without going to the bottom.

import { useMemo, useState, useRef, useEffect } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import {
  formatCurrency, formatPercent, getTier,
  getPenCovQuadrant, getGrowthQuadrant,
} from '../../utils/formatters';

// ── Static columns used when there is no raw Excel data (sample data) ─────────
const STATIC_COLUMNS = [
  { key: 'category',     label: 'Category',    align: 'left',  format: (v) => v || '—' },
  { key: '__tier__',     label: 'Tier',        align: 'left',  special: 'tier' },
  { key: 'mbGpDollars',  label: 'MB GP$',      align: 'right', format: (v) => formatCurrency(v) },
  { key: 'mbGpMargin',   label: 'MB GP%',      align: 'right', special: 'margin' },
  { key: 'mmsGpDollars', label: 'MMS GP$',     align: 'right', format: (v) => formatCurrency(v) },
  { key: 'penetration',  label: 'Penetration', align: 'right', format: (v) => formatPercent(v, 0) },
  { key: 'coverage',     label: 'Coverage',    align: 'right', format: (v) => formatPercent(v, 0) },
  { key: 'marketGrowth', label: 'Mkt Growth',  align: 'right', format: (v) => formatPercent(v) },
  { key: 'marketShare',  label: 'Rel. Share',  align: 'right', format: (v) => v != null ? `${v.toFixed(2)}x` : '—' },
  {
    key: '__f1q__', label: 'F1 Quadrant', align: 'left', special: 'f1q',
    compute: (row) => row.penetration != null && row.coverage != null
      ? getPenCovQuadrant(row.penetration, row.coverage) : null,
  },
  {
    key: '__f2q__', label: 'F2 Quadrant', align: 'left', special: 'f2q',
    compute: (row) => row.mbOutpaceMms != null && row.mmsOutpaceMarket != null
      ? getGrowthQuadrant(row.mbOutpaceMms, row.mmsOutpaceMarket) : null,
  },
];

// ── Build columns dynamically from the raw Excel headers ─────────────────────
// Inserts a Tier column after the first (category) column.
// Appends F1 / F2 Quadrant columns at the end.
function buildDynamicColumns(headers) {
  const raw = headers
    .map((h, i) => {
      const label = h?.trim();
      if (!label) return null;
      const hl = label.toLowerCase();

      let align = 'right';
      let format;
      let isCategory = false;

      if (i === 0) {
        // First column is always the category name
        isCategory = true;
        align = 'left';
        format = (v) => (v != null ? String(v) : '—');
      } else if (hl.includes('$m')) {
        // Already in millions — show as $X.XM
        format = (v) => {
          const n = Number(v);
          return v == null || v === '' || isNaN(n) ? '—' : `$${n.toFixed(1)}M`;
        };
      } else if (
        hl.includes('%') || hl.includes('penetration') || hl.includes('coverage') ||
        hl.includes('growth') || hl.includes('share')  || hl.includes('outpace') ||
        hl.includes('rate')  || hl.includes('pct')
      ) {
        // Decimal percentages (e.g. 0.58 → 58.0%)
        format = (v) => {
          const n = Number(v);
          if (v == null || v === '' || isNaN(n)) return '—';
          const pct = Math.abs(n) <= 1.5 ? n * 100 : n;
          return `${pct.toFixed(1)}%`;
        };
      } else {
        format = (v) => {
          if (v == null || v === '') return '—';
          const n = Number(v);
          return isNaN(n) ? String(v) : n.toFixed(2);
        };
      }

      return { key: label, label, rawHeader: label, align, format, isCategory };
    })
    .filter(Boolean);

  // Tier badge column always after the first (category) column
  const tierCol = { key: '__tier__', label: 'Tier', align: 'left', special: 'tier' };

  // Quadrant columns appended at the end
  const f1Col = {
    key: '__f1q__', label: 'F1 Quadrant', align: 'left', special: 'f1q',
    compute: (row) => row.penetration != null && row.coverage != null
      ? getPenCovQuadrant(row.penetration, row.coverage) : null,
  };
  const f2Col = {
    key: '__f2q__', label: 'F2 Quadrant', align: 'left', special: 'f2q',
    compute: (row) => row.mbOutpaceMms != null && row.mmsOutpaceMarket != null
      ? getGrowthQuadrant(row.mbOutpaceMms, row.mmsOutpaceMarket) : null,
  };

  return [raw[0], tierCol, ...raw.slice(1), f1Col, f2Col];
}

// Get the sortable value for a row given a column definition
function getVal(row, col) {
  if (col.compute)    return col.compute(row)?.label ?? '';
  if (col.rawHeader)  return row._raw?.[col.rawHeader] ?? null;
  if (col.special === 'tier') return row.tier ?? null;
  return row[col.key] ?? null;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SortIcon({ colKey, sortCol, sortDir }) {
  if (colKey !== sortCol) return <ArrowUpDown size={12} className="text-gray-300" />;
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

// ── CSV export ────────────────────────────────────────────────────────────────
function exportToCsv(rows, columns) {
  const headers = columns.map((c) => c.label);
  const lines   = rows.map((row) =>
    columns.map((col) => {
      if (col.special === 'tier')              return row.tier ?? '';
      if (col.compute)                         return col.compute(row)?.label ?? '';
      const v = col.rawHeader ? (row._raw?.[col.rawHeader] ?? '') : (row[col.key] ?? '');
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

// ── Main component ────────────────────────────────────────────────────────────
export default function DataTable({ data }) {
  const [search,     setSearch]     = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortCol,    setSortCol]    = useState(null);
  const [sortDir,    setSortDir]    = useState('desc');

  // Refs for synchronized top scrollbar
  const tableWrapRef = useRef(null);
  const topScrollRef = useRef(null);
  const phantomRef   = useRef(null);

  // Dynamic mode when records carry _raw (uploaded file); static for sample data
  const isDynamic = data.length > 0 && !!data[0]?._raw;

  const columns = useMemo(() => {
    if (isDynamic) {
      const rawHeaders = data._detectedHeaders || [];
      return buildDynamicColumns(rawHeaders);
    }
    return STATIC_COLUMNS;
  }, [isDynamic, data]);

  // Pick a sensible default sort column when columns change
  useEffect(() => {
    const firstNumeric = columns.find((c) => c.align === 'right' && !c.compute && !c.special);
    setSortCol(firstNumeric?.key ?? null);
  }, [columns]);

  // Sync the phantom top scrollbar with the table wrapper
  useEffect(() => {
    const wrap    = tableWrapRef.current;
    const top     = topScrollRef.current;
    const phantom = phantomRef.current;
    if (!wrap || !top || !phantom) return;

    // Keep the phantom div the same width as the scrollable content
    const ro = new ResizeObserver(() => {
      phantom.style.width = wrap.scrollWidth + 'px';
    });
    ro.observe(wrap);
    phantom.style.width = wrap.scrollWidth + 'px';

    // Bidirectional scroll sync (flag prevents infinite loop)
    let syncing = false;
    const onTop  = () => { if (syncing) return; syncing = true; wrap.scrollLeft = top.scrollLeft;  syncing = false; };
    const onWrap = () => { if (syncing) return; syncing = true; top.scrollLeft  = wrap.scrollLeft; syncing = false; };

    top.addEventListener('scroll',  onTop);
    wrap.addEventListener('scroll', onWrap);
    return () => {
      ro.disconnect();
      top.removeEventListener('scroll',  onTop);
      wrap.removeEventListener('scroll', onWrap);
    };
  }, []);

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
    if (!sortCol) return filtered;
    const col = columns.find((c) => c.key === sortCol);
    return [...filtered].sort((a, b) => {
      const av = col ? getVal(a, col) : null;
      const bv = col ? getVal(b, col) : null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir, columns]);

  // Footer aggregates: sum for $ columns, average for % columns
  const footVals = useMemo(() =>
    columns.map((col) => {
      if (col.isCategory) return `Totals / Avg (${sorted.length})`;
      if (col.special)    return '—';

      const nums = sorted
        .map((row) => {
          const v = col.rawHeader ? row._raw?.[col.rawHeader] : row[col.key];
          return Number(v);
        })
        .filter((n) => !isNaN(n));

      if (!nums.length) return '—';
      const hl = col.label.toLowerCase();

      if (isDynamic && hl.includes('$m')) {
        return `$${nums.reduce((s, v) => s + v, 0).toFixed(1)}M`;
      }
      if (!isDynamic && (col.key === 'mbGpDollars' || col.key === 'mmsGpDollars')) {
        return formatCurrency(nums.reduce((s, v) => s + v, 0));
      }
      if (col.key === 'mbGpMargin') {
        // Rendered as a badge — return the raw avg value flagged specially
        return { _badge: true, value: nums.reduce((s, v) => s + v, 0) / nums.length };
      }
      if (
        hl.includes('%') || hl.includes('penetration') || hl.includes('coverage') ||
        hl.includes('growth') || hl.includes('share')  || hl.includes('outpace')
      ) {
        const avg = nums.reduce((s, v) => s + v, 0) / nums.length;
        const pct = isDynamic && Math.abs(avg) <= 1.5 ? avg * 100 : avg;
        return `${pct.toFixed(1)}%`;
      }
      return '—';
    }),
  [sorted, columns, isDynamic]);

  // Render a single table cell
  function renderCell(row, col) {
    if (col.special === 'tier')   return <TierBadge tier={row.tier} />;
    if (col.special === 'margin') return <MarginBadge value={row.mbGpMargin} />;
    if (col.special === 'f1q' || col.special === 'f2q')
      return <QuadrantBadge quadrant={col.compute(row)} />;
    if (col.rawHeader) return col.format(row._raw?.[col.rawHeader]);
    if (col.format)    return col.format(row[col.key]);
    return row[col.key] ?? '—';
  }

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Data Table</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {sorted.length} of {data.length} categories · {columns.length} columns
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search categories..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white w-48
                focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button
            onClick={() => exportToCsv(sorted, columns)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600
              bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Phantom top scrollbar — always accessible without scrolling to the bottom */}
        <div
          ref={topScrollRef}
          className="overflow-x-auto border-b border-gray-100"
          style={{ height: 14 }}
        >
          <div ref={phantomRef} style={{ height: 1, minWidth: '100%' }} />
        </div>

        {/* Table */}
        <div ref={tableWrapRef} className="overflow-x-auto">
          <table className="text-sm border-collapse" style={{ minWidth: 'max-content' }}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`
                      px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide
                      cursor-pointer select-none hover:text-gray-800 transition-colors whitespace-nowrap
                      bg-gray-50 border-b border-gray-200 sticky top-0 z-10
                      ${col.align === 'right' ? 'text-right' : 'text-left'}
                    `}
                  >
                    <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                      {col.label}
                      <SortIcon colKey={col.key} sortCol={sortCol} sortDir={sortDir} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {sorted.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50/20 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`
                        px-3 py-2.5 whitespace-nowrap
                        ${col.align === 'right' ? 'text-right' : ''}
                        ${col.isCategory ? 'font-medium text-gray-900' : 'text-gray-600'}
                      `}
                    >
                      {renderCell(row, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>

            {sorted.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-xs">
                  {footVals.map((val, i) => {
                    const col = columns[i];
                    return (
                      <td
                        key={col.key}
                        className={`
                          px-3 py-2.5 whitespace-nowrap
                          ${col.align === 'right' ? 'text-right' : ''}
                          ${i === 0 ? 'text-gray-500 uppercase tracking-wide' : 'text-gray-400'}
                        `}
                      >
                        {val?._badge
                          ? <MarginBadge value={val.value} />
                          : val}
                      </td>
                    );
                  })}
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

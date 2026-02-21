// Data Table — dynamic columns matching the uploaded file, sortable/searchable
// Tier/rank/score are computed in App.jsx and passed in via props so all views stay in sync.

import { useMemo, useState, useRef, useEffect } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import {
  formatCurrency, formatPercent, getTier,
  getPenCovQuadrant, getGrowthQuadrant,
} from '../../utils/formatters';
import { WEIGHT_COLUMNS, DEFAULT_WEIGHTS } from '../../utils/scoring';

// ── Static columns used when there is no raw Excel data (sample data) ─────────
const STATIC_COLUMNS = [
  { key: 'category',         label: 'Category',          align: 'left',  format: (v) => v || '—', isCategory: true },
  { key: '__tier__',         label: 'Tier',              align: 'left',  special: 'tier' },
  { key: 'mbGpDollars',      label: 'MB GP$',            align: 'right', format: (v) => formatCurrency(v) },
  { key: 'mbGpMargin',       label: 'MB GP%',            align: 'right', special: 'margin' },
  { key: 'mmsGpDollars',     label: 'NB GP$',            align: 'right', format: (v) => formatCurrency(v) },
  { key: 'mmsGpMargin',      label: 'NB GP%',            align: 'right', format: (v) => formatPercent(v) },
  { key: 'penetration',      label: 'Penetration',       align: 'right', format: (v) => formatPercent(v, 0) },
  { key: 'coverage',         label: 'Coverage',          align: 'right', format: (v) => formatPercent(v, 0) },
  { key: 'totalMarket',      label: 'Total Market $m',   align: 'right', format: (v) => v != null ? `$${v}M` : '—' },
  { key: 'marketGrowth',     label: 'Mkt Growth',        align: 'right', format: (v) => formatPercent(v) },
  { key: 'marketShare',      label: 'MMS Mkt Share',     align: 'right', format: (v) => formatPercent(v) },
  { key: 'mmsGrowth',        label: 'NB Growth',         align: 'right', format: (v) => formatPercent(v) },
  { key: 'revenue',          label: 'MB Sales$',         align: 'right', format: (v) => formatCurrency(v) },
  { key: 'mbGrowth',         label: 'MB Growth',         align: 'right', format: (v) => formatPercent(v) },
  { key: 'mbOutpaceMms',     label: 'MB outpace NB %',   align: 'right', format: (v) => formatPercent(v) },
  { key: 'mmsOutpaceMarket', label: 'NB outpace Non-PL', align: 'right', format: (v) => formatPercent(v) },
  { key: 'mbVsMmsGp',        label: 'MB GP > NB GP',     align: 'right', format: (v) => formatPercent(v) },
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
        isCategory = true;
        align = 'left';
        format = (v) => (v != null ? String(v) : '—');
      } else if (hl.includes('$m')) {
        format = (v) => {
          const n = Number(v);
          return v == null || v === '' || isNaN(n) ? '—' : `$${n.toFixed(1)}M`;
        };
      } else if (
        hl.includes('%') || hl.includes('penetration') || hl.includes('coverage') ||
        hl.includes('growth') || hl.includes('share')  || hl.includes('outpace') ||
        hl.includes('rate')  || hl.includes('pct')
      ) {
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

  const tierCol = { key: '__tier__', label: 'Tier', align: 'left', special: 'tier' };
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
  if (col.special === 'rank')  return row._rank ?? null;
  if (col.special === 'score') return row._score ?? null;
  if (col.compute)             return col.compute(row)?.label ?? '';
  if (col.rawHeader)           return row._raw?.[col.rawHeader] ?? null;
  if (col.special === 'tier')  return row.tier ?? null;
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
      if (col.special === 'rank')              return row._rank ?? '';
      if (col.special === 'score')             return row._score != null ? row._score.toFixed(1) : '';
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
// data already contains _rank, _score, and overridden tier from App.jsx scoring
// onCategoryClick(row) — called when the user clicks a category name cell
export default function DataTable({ data, weights, setWeights, onCategoryClick }) {
  const [search,      setSearch]      = useState('');
  const [tierFilter,  setTierFilter]  = useState('all');
  const [sortCol,     setSortCol]     = useState(null);
  const [sortDir,     setSortDir]     = useState('asc');
  const [showWeights, setShowWeights] = useState(false);

  // Refs for synchronized top scrollbar
  const tableWrapRef = useRef(null);
  const topScrollRef = useRef(null);
  const phantomRef   = useRef(null);

  // Dynamic mode when records carry _raw (uploaded file); static for sample data
  const isDynamic = data.length > 0 && !!data[0]?._raw;

  // Base columns from headers or static definition
  const columns = useMemo(() => {
    if (isDynamic) {
      const rawHeaders = data._detectedHeaders || [];
      return buildDynamicColumns(rawHeaders);
    }
    return STATIC_COLUMNS;
  }, [isDynamic, data]);

  // Inject Rank (#) and Score columns around the Tier column
  const displayColumns = useMemo(() => {
    const rankCol  = { key: '__rank__',  label: '#',     align: 'center', special: 'rank'  };
    const scoreCol = { key: '__score__', label: 'Score', align: 'right',  special: 'score' };
    const result   = [...columns];
    const tierIdx  = result.findIndex(c => c.key === '__tier__');
    if (tierIdx >= 0) {
      result.splice(tierIdx + 1, 0, scoreCol);
    } else {
      result.push(scoreCol);
    }
    return [rankCol, ...result];
  }, [columns]);

  // Default sort on the rank column when columns change
  useEffect(() => {
    setSortCol('__rank__');
    setSortDir('asc');
  }, [columns]);

  // Sync the phantom top scrollbar with the table wrapper
  useEffect(() => {
    const wrap    = tableWrapRef.current;
    const top     = topScrollRef.current;
    const phantom = phantomRef.current;
    if (!wrap || !top || !phantom) return;

    const ro = new ResizeObserver(() => {
      phantom.style.width = wrap.scrollWidth + 'px';
    });
    ro.observe(wrap);
    phantom.style.width = wrap.scrollWidth + 'px';

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
      // Rank and score sort ascending by default (lower = better)
      setSortDir(colKey === '__rank__' || colKey === '__score__' ? 'asc' : 'desc');
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
    const col = displayColumns.find((c) => c.key === sortCol);
    return [...filtered].sort((a, b) => {
      const av = col ? getVal(a, col) : null;
      const bv = col ? getVal(b, col) : null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir, displayColumns]);

  // Footer aggregates
  const footVals = useMemo(() =>
    displayColumns.map((col) => {
      if (col.isCategory) return `Totals / Avg (${sorted.length})`;
      if (col.special === 'rank' || col.special === 'score') return '—';
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
  [sorted, displayColumns, isDynamic]);

  // Render a single table cell
  function renderCell(row, col) {
    if (col.special === 'rank') {
      if (row._rank == null) return <span className="text-gray-400">—</span>;
      const t = getTier(row.tier);
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: t.color }}>
          {row._rank}
        </span>
      );
    }
    if (col.special === 'score') {
      return row._score != null
        ? <span className="font-mono text-xs text-gray-600">{row._score.toFixed(1)}</span>
        : <span className="text-gray-400">—</span>;
    }
    if (col.special === 'tier')   return <TierBadge tier={row.tier} />;
    if (col.special === 'margin') return <MarginBadge value={row.mbGpMargin} />;
    if (col.special === 'f1q' || col.special === 'f2q')
      return <QuadrantBadge quadrant={col.compute(row)} />;
    if (col.rawHeader) return col.format(row._raw?.[col.rawHeader]);
    if (col.format)    return col.format(row[col.key]);
    return row[col.key] ?? '—';
  }

  const totalW = WEIGHT_COLUMNS.reduce((s, c) => s + (weights[c.id] ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Data Table</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {sorted.length} of {data.length} categories · {displayColumns.length} columns
            <span className="ml-2 text-xs" style={{ color: '#0066CC' }}>· Click a category name to view its full profile</span>
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
            onClick={() => exportToCsv(sorted, displayColumns)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600
              bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Scoring weights panel */}
      <div className={`bg-white rounded-xl border overflow-hidden ${totalW !== 100 ? 'border-red-300' : 'border-gray-200'}`}>
        <button
          onClick={() => setShowWeights(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span>⚖ Scoring Weights</span>
            {totalW !== 100
              ? <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  Total = {totalW} — must equal 100
                </span>
              : <span className="text-xs font-normal text-gray-400">
                  — adjust to recalculate tier & rank
                </span>
            }
          </div>
          {showWeights ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {showWeights && (
          <div className="border-t border-gray-100 p-4">
            {totalW !== 100 && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <span className="font-semibold">Weights must total 100.</span>
                <span className="text-red-500">Current total: <strong>{totalW}</strong> ({totalW < 100 ? `${100 - totalW} short` : `${totalW - 100} over`})</span>
                <button onClick={() => setWeights(DEFAULT_WEIGHTS)} className="ml-auto text-xs font-medium text-red-600 hover:text-red-800 underline">
                  Reset to defaults
                </button>
              </div>
            )}
            <p className="text-xs text-gray-400 mb-3">
              Higher value = more influence. Columns scored by rank (1 = best). Score = weighted average rank (lower = better).
              Total weight: <strong className={totalW === 100 ? 'text-green-600' : 'text-red-600'}>{totalW} / 100</strong>
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-4 gap-y-3 mb-4">
              {WEIGHT_COLUMNS.map(wCol => (
                <div key={wCol.id} className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 leading-tight">{wCol.label}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights[wCol.id] ?? wCol.defaultWeight}
                    onChange={e => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setWeights(prev => ({ ...prev, [wCol.id]: val }));
                    }}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded text-center
                      focus:outline-none focus:ring-1 focus:ring-blue-400 text-gray-700"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => setWeights(DEFAULT_WEIGHTS)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              ↩ Reset to defaults
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Phantom top scrollbar */}
        <div
          ref={topScrollRef}
          className="overflow-x-auto border-b border-gray-100"
          style={{ height: 14 }}
        >
          <div ref={phantomRef} style={{ height: 1, minWidth: '100%' }} />
        </div>

        <div ref={tableWrapRef} className="overflow-x-auto">
          <table className="text-sm border-collapse" style={{ minWidth: 'max-content' }}>
            <thead>
              <tr>
                {displayColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={col.isCategory ? { boxShadow: '2px 0 5px rgba(0,0,0,0.06)' } : undefined}
                    className={`
                      px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide
                      cursor-pointer select-none hover:text-gray-800 transition-colors whitespace-nowrap
                      bg-gray-50 border-b border-gray-200 sticky top-0
                      ${col.isCategory ? 'left-0 z-30 border-r border-gray-200' : 'z-20'}
                      ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                    `}
                  >
                    <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                      {col.label}
                      <SortIcon colKey={col.key} sortCol={sortCol} sortDir={sortDir} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {sorted.map((row) => (
                <tr
                  key={row.id}
                  onClick={onCategoryClick ? () => onCategoryClick(row) : undefined}
                  className="transition-colors"
                  style={onCategoryClick ? { cursor: 'pointer' } : undefined}
                  onMouseEnter={e => { if (onCategoryClick) e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                  onMouseLeave={e => { if (onCategoryClick) e.currentTarget.style.backgroundColor = ''; }}
                >
                  {displayColumns.map((col) => (
                    <td
                      key={col.key}
                      style={col.isCategory ? { boxShadow: '2px 0 5px rgba(0,0,0,0.05)' } : undefined}
                      className={`
                        px-3 py-2.5 whitespace-nowrap
                        ${col.isCategory ? 'sticky left-0 z-10 bg-white border-r border-gray-100 font-medium' : 'text-gray-600'}
                        ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                      `}
                    >
                      {col.isCategory ? (
                        <span
                          className="flex items-center gap-1"
                          style={{ color: '#0066CC', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                        >
                          {renderCell(row, col)}
                          <ExternalLink size={11} style={{ color: '#0066CC', opacity: 0.5, flexShrink: 0 }} />
                        </span>
                      ) : renderCell(row, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>

            {sorted.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-xs">
                  {footVals.map((val, i) => {
                    const col = displayColumns[i];
                    return (
                      <td
                        key={col.key}
                        style={col.isCategory ? { boxShadow: '2px 0 5px rgba(0,0,0,0.05)' } : undefined}
                        className={`
                          px-3 py-2.5 whitespace-nowrap
                          ${col.isCategory ? 'sticky left-0 z-10 bg-gray-50 border-r border-gray-200 text-gray-500 uppercase tracking-wide' : i === 0 ? 'text-gray-500' : 'text-gray-400'}
                          ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                        `}
                      >
                        {val?._badge ? <MarginBadge value={val.value} /> : val}
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

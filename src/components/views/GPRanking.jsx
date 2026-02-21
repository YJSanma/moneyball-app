// Visualization — pick any numeric column to render as a ranked bar chart + table

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { useMemo, useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { formatCurrency, formatPercent, getTier } from '../../utils/formatters';

// ── Column helpers ─────────────────────────────────────────────────────────────

// Build a list of selectable numeric columns from the dataset.
// For uploaded files (row._raw) we scan the raw headers; for sample data we use known fields.
function buildColOptions(data) {
  if (!data.length) return [];
  const isDynamic = !!data[0]._raw;

  if (isDynamic) {
    const headers = Object.keys(data[0]._raw || {});
    return headers
      .filter((h, i) => {
        if (i === 0) return false; // skip category name column
        const nums = data.map(d => Number(d._raw?.[h])).filter(n => !isNaN(n));
        return nums.length > 0;
      })
      .map(h => ({ key: h, label: h, isRaw: true }));
  }

  return [
    { key: 'mbGpDollars',      label: 'MB GP$',                isRaw: false },
    { key: 'mbGpMargin',       label: 'MB GP%',                isRaw: false },
    { key: 'mmsGpDollars',     label: 'NB GP$',                isRaw: false },
    { key: 'mmsGpMargin',      label: 'NB GP%',                isRaw: false },
    { key: 'penetration',      label: 'Penetration %',         isRaw: false },
    { key: 'coverage',         label: 'Coverage %',            isRaw: false },
    { key: 'totalMarket',      label: 'Total Market $m',       isRaw: false },
    { key: 'marketGrowth',     label: 'Total Market Growth %', isRaw: false },
    { key: 'marketShare',      label: 'MMS Market Share %',    isRaw: false },
    { key: 'mmsGrowth',        label: 'NB Growth %',           isRaw: false },
    { key: 'revenue',          label: 'MB Sales $',            isRaw: false },
    { key: 'mbGrowth',         label: 'MB Growth %',           isRaw: false },
    { key: 'mbOutpaceMms',     label: 'MB outpace NB %',       isRaw: false },
    { key: 'mmsOutpaceMarket', label: 'NB outpace Non-PL market', isRaw: false },
    { key: 'mbVsMmsGp',        label: 'MB GP higher than NB GP %', isRaw: false },
  ];
}

// Pull the numeric value for a row given a column option
function getColValue(row, col) {
  if (!col) return null;
  if (col.isRaw) {
    const n = Number(row._raw?.[col.key]);
    return isNaN(n) ? null : n;
  }
  const v = row[col.key];
  return v != null ? Number(v) : null;
}

// Format a value for display based on the column label/key
function fmtColValue(val, col, compact = false) {
  if (val == null) return '—';
  if (!col) return String(val);
  const lbl = col.label.toLowerCase();
  if (lbl.includes('$')) return formatCurrency(val, compact);
  if (lbl.includes('%') || lbl.includes('penetration') || lbl.includes('coverage') ||
      lbl.includes('growth') || lbl.includes('outpace') || lbl.includes('margin')) {
    // Dynamic columns store decimals ≤ 1.5 as fractions
    const pct = col.isRaw && Math.abs(val) <= 1.5 ? val * 100 : val;
    return formatPercent(pct, 1);
  }
  if (!col.isRaw && col.key === 'totalMarket') return compact ? `$${val}M` : `$${val}M`;
  return val.toFixed(2);
}

// Short name for bar chart axis labels
const shorten = (name) => {
  if (!name || name.length <= 16) return name;
  const words = name.split(/\s+/);
  return words.length > 2 ? words.slice(0, 2).join(' ') + '…' : name;
};

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, activeCol }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const t = getTier(d.tier);
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-1">{d.category}</p>
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2"
        style={{ backgroundColor: t.bg, color: t.color }}>{t.label}</span>
      <div className="flex justify-between gap-6 text-xs text-gray-600">
        <span>{activeCol?.label}</span>
        <span className="font-medium text-gray-900">{fmtColValue(getColValue(d, activeCol), activeCol)}</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function GPRanking({ data }) {
  const colOptions = useMemo(() => buildColOptions(data), [data]);

  const [selectedKey, setSelectedKey] = useState('');
  const [tierFilter,  setTierFilter]  = useState('all');
  const [search,      setSearch]      = useState('');

  // Set default column once options are ready
  useEffect(() => {
    if (colOptions.length && !selectedKey) setSelectedKey(colOptions[0].key);
  }, [colOptions, selectedKey]);

  const activeCol = colOptions.find(c => c.key === selectedKey) ?? colOptions[0];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter(d =>
      (!q || (d.category || '').toLowerCase().includes(q)) &&
      (tierFilter === 'all' || String(d.tier) === tierFilter),
    );
  }, [data, search, tierFilter]);

  // Sorted by selected column descending
  const sorted = useMemo(() =>
    [...filtered]
      .filter(d => getColValue(d, activeCol) != null)
      .sort((a, b) => (getColValue(b, activeCol) || 0) - (getColValue(a, activeCol) || 0)),
  [filtered, activeCol]);

  const chartData = sorted.slice(0, 20);

  // KPI stats for selected column across full filtered set
  const colVals = filtered.map(d => getColValue(d, activeCol)).filter(v => v != null);
  const colMax   = colVals.length ? Math.max(...colVals)                        : null;
  const colMin   = colVals.length ? Math.min(...colVals)                        : null;
  const colAvg   = colVals.length ? colVals.reduce((s, v) => s + v, 0) / colVals.length : null;
  const colTotal = colVals.length ? colVals.reduce((s, v) => s + v, 0)          : null;

  return (
    <div className="space-y-6">

      {/* Title + controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Visualization</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Ranked bar chart for any column — {filtered.length} categories shown
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Column picker */}
          <label className="text-sm text-gray-500">Column:</label>
          <select
            value={selectedKey}
            onChange={e => setSelectedKey(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[220px]"
          >
            {colOptions.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>

          {/* Tier filter */}
          <label className="text-sm text-gray-500">Tier:</label>
          <select
            value={tierFilter}
            onChange={e => setTierFilter(e.target.value)}
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
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
            />
          </div>
        </div>
      </div>

      {/* KPI stats for selected column */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Highest',  value: fmtColValue(colMax,   activeCol) },
          { label: 'Lowest',   value: fmtColValue(colMin,   activeCol) },
          { label: 'Average',  value: fmtColValue(colAvg,   activeCol) },
          { label: 'Total',    value: fmtColValue(colTotal, activeCol, true) },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 mb-1">{kpi.label} — {activeCol?.label}</p>
            <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-1">{activeCol?.label} by Category</h3>
        <p className="text-xs text-gray-400 mb-4">Top 20 — sorted highest to lowest · colored by tier</p>
        {chartData.length === 0 ? (
          <p className="text-sm text-gray-400 py-12 text-center">No data available for this column.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 30 + 60)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 90, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={v => fmtColValue(v, activeCol, true)}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                type="category" dataKey="category" width={130}
                tick={{ fontSize: 10, fill: '#374151' }} tickFormatter={shorten}
              />
              <Tooltip content={<ChartTooltip activeCol={activeCol} />} />
              <Bar dataKey={d => getColValue(d, activeCol)} radius={[0, 3, 3, 0]} barSize={10}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={getTier(d.tier).color} fillOpacity={0.85} />
                ))}
                <LabelList
                  valueAccessor={d => getColValue(d, activeCol)}
                  position="right"
                  formatter={v => fmtColValue(v, activeCol, true)}
                  style={{ fontSize: 10, fill: '#374151', fontWeight: 500 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Ranked table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">
            Ranked by {activeCol?.label}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['#', 'Category', 'Tier', activeCol?.label ?? '—'].map(h => (
                  <th key={h}
                    className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((d, i) => {
                const t = getTier(d.tier);
                return (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: t.color }}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900 max-w-[200px] truncate">
                      {d.category}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                        style={{ backgroundColor: t.bg, color: t.color }}>
                        {t.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-medium">
                      {fmtColValue(getColValue(d, activeCol), activeCol)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <p className="py-12 text-center text-sm text-gray-400">No categories match your filter.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// GP Ranking — Grouped MB GP$ vs MMS GP$ bars + GP% chart
// Includes tier filter and ranked summary table

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, Legend,
} from 'recharts';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { formatCurrency, formatPercent, formatNumber, getTier, TIER_CONFIG } from '../../utils/formatters';

function DollarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-1.5">{d?.category}</p>
      <div className="space-y-1 text-xs text-gray-600">
        <Row label="MB GP$"  value={formatCurrency(d?.mbGpDollars)} />
        <Row label="MB GP%"  value={formatPercent(d?.mbGpMargin)} />
        <Row label="MMS GP$" value={formatCurrency(d?.mmsGpDollars)} />
        {d?.penetration != null && <Row label="Penetration" value={formatPercent(d?.penetration, 0)} />}
        {d?.coverage    != null && <Row label="Coverage"    value={formatPercent(d?.coverage, 0)} />}
      </div>
    </div>
  );
}

function MarginTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-1">{d?.category}</p>
      <Row label="MB GP%" value={formatPercent(d?.mbGpMargin)} />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-6">
      <span>{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

// Shorten long category names for bar chart labels
const shorten = (name) => {
  if (!name || name.length <= 16) return name;
  const words = name.split(/\s+/);
  return words.length > 2 ? words.slice(0, 2).join(' ') + '…' : name;
};

export default function GPRanking({ data }) {
  const [activeTiers, setActiveTiers] = useState(new Set([1, 2, 3, 4]));
  const [sortBy, setSortBy]           = useState('mbGpDollars');
  const [search, setSearch]           = useState('');

  const toggleTier = (tier) => {
    setActiveTiers((prev) => {
      const next = new Set(prev);
      next.has(tier) ? next.delete(tier) : next.add(tier);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter(
      (d) => activeTiers.has(d.tier) && (q === '' || (d.category || '').toLowerCase().includes(q)),
    );
  }, [data, activeTiers, search]);

  // Sorted for the ranked table (respects active sort)
  const sorted = useMemo(
    () => [...filtered].filter((d) => d[sortBy] != null).sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0)),
    [filtered, sortBy],
  );

  // GP$ grouped bar data — sorted by mbGpDollars
  const gpDollarData = useMemo(
    () =>
      [...filtered]
        .filter((d) => d.mbGpDollars != null)
        .sort((a, b) => (b.mbGpDollars || 0) - (a.mbGpDollars || 0))
        .slice(0, 20), // cap at 20 for readability
    [filtered],
  );

  // GP% bar data — sorted by mbGpMargin
  const gpMarginData = useMemo(
    () =>
      [...filtered]
        .filter((d) => d.mbGpMargin != null)
        .sort((a, b) => (b.mbGpMargin || 0) - (a.mbGpMargin || 0))
        .slice(0, 20),
    [filtered],
  );

  // KPI totals
  const totalMbGP   = filtered.reduce((s, d) => s + (d.mbGpDollars  || 0), 0);
  const totalMmsGP  = filtered.reduce((s, d) => s + (d.mmsGpDollars || 0), 0);
  const avgMbMargin = filtered.filter((d) => d.mbGpMargin != null).length > 0
    ? filtered.filter((d) => d.mbGpMargin != null).reduce((s, d) => s + d.mbGpMargin, 0) /
      filtered.filter((d) => d.mbGpMargin != null).length
    : null;
  const avgPen = filtered.filter((d) => d.penetration != null).length > 0
    ? filtered.filter((d) => d.penetration != null).reduce((s, d) => s + d.penetration, 0) /
      filtered.filter((d) => d.penetration != null).length
    : null;

  const tierCounts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0 };
    data.forEach((d) => { if (d.tier) c[d.tier] = (c[d.tier] || 0) + 1; });
    return c;
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header + search + sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">GP Ranking</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gross profit analysis across McKesson Brands categories</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
          </div>
          <label className="text-sm text-gray-500">Rank by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="mbGpDollars">MB GP$</option>
            <option value="mbGpMargin">MB GP%</option>
            <option value="mmsGpDollars">MMS GP$</option>
            <option value="penetration">Penetration %</option>
            <option value="coverage">Coverage %</option>
          </select>
        </div>
      </div>

      {/* Tier filter */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((tier) => {
          const t      = getTier(tier);
          const active = activeTiers.has(tier);
          return (
            <button
              key={tier}
              onClick={() => toggleTier(tier)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
              style={
                active
                  ? { backgroundColor: t.bg, color: t.color, borderColor: t.border }
                  : { backgroundColor: '#f9fafb', color: '#9ca3af', borderColor: '#e5e7eb' }
              }
            >
              <span className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: active ? t.color : '#d1d5db' }} />
              {t.label} — {t.desc}
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={active ? { backgroundColor: t.color + '20' } : { backgroundColor: '#f3f4f6' }}>
                {tierCounts[tier]}
              </span>
            </button>
          );
        })}
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total MB GP$',   value: formatCurrency(totalMbGP, true),    sub: `${filtered.length} categories` },
          { label: 'Total MMS GP$',  value: formatCurrency(totalMmsGP, true),   sub: 'McKesson Medical-Surgical' },
          { label: 'Avg MB GP%',     value: formatPercent(avgMbMargin),          sub: 'Portfolio margin average' },
          { label: 'Avg Penetration',value: formatPercent(avgPen, 0),            sub: 'Account penetration' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-gray-400">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* MB GP$ vs MMS GP$ — grouped horizontal bars */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-1">MB GP$ vs MMS GP$ by Category</h3>
        <p className="text-xs text-gray-400 mb-4">Top 20 by MB GP$ — sorted highest to lowest</p>
        <ResponsiveContainer width="100%" height={Math.max(320, gpDollarData.length * 30 + 60)}>
          <BarChart data={gpDollarData} layout="vertical" margin={{ top: 0, right: 90, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => formatCurrency(v, true)}
              tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis type="category" dataKey="category" width={130}
              tick={{ fontSize: 10, fill: '#374151' }} tickFormatter={shorten} />
            <Tooltip content={<DollarTooltip />} />
            <Legend
              formatter={(value) => value === 'mbGpDollars' ? 'MB GP$' : 'MMS GP$'}
              iconType="circle" iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar dataKey="mbGpDollars"  name="mbGpDollars"  radius={[0, 3, 3, 0]} barSize={10}>
              {gpDollarData.map((d, i) => (
                <Cell key={i} fill={getTier(d.tier).color} fillOpacity={0.85} />
              ))}
              <LabelList dataKey="mbGpDollars" position="right"
                formatter={(v) => formatCurrency(v, true)}
                style={{ fontSize: 10, fill: '#374151', fontWeight: 500 }} />
            </Bar>
            <Bar dataKey="mmsGpDollars" name="mmsGpDollars" radius={[0, 3, 3, 0]} barSize={10}>
              {gpDollarData.map((d, i) => (
                <Cell key={i} fill={getTier(d.tier).color} fillOpacity={0.35} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* MB GP% bar chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-1">MB GP% by Category</h3>
        <p className="text-xs text-gray-400 mb-4">Sorted by highest gross margin</p>
        <ResponsiveContainer width="100%" height={Math.max(320, gpMarginData.length * 30 + 60)}>
          <BarChart data={gpMarginData} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => `${v}%`} domain={[0, 'dataMax + 5']}
              tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis type="category" dataKey="category" width={130}
              tick={{ fontSize: 10, fill: '#374151' }} tickFormatter={shorten} />
            <Tooltip content={<MarginTooltip />} />
            <Bar dataKey="mbGpMargin" radius={[0, 3, 3, 0]} barSize={10}>
              {gpMarginData.map((d, i) => (
                <Cell key={i} fill={getTier(d.tier).color} fillOpacity={0.82} />
              ))}
              <LabelList dataKey="mbGpMargin" position="right"
                formatter={(v) => `${v?.toFixed(1)}%`}
                style={{ fontSize: 10, fill: '#374151', fontWeight: 500 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranked table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">
            Ranked by {
              { mbGpDollars: 'MB GP$', mbGpMargin: 'MB GP%', mmsGpDollars: 'MMS GP$',
                penetration: 'Penetration', coverage: 'Coverage' }[sortBy]
            }
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['#', 'Category', 'Tier', 'MB GP$', 'MB GP%', 'MMS GP$', 'Pen.', 'Coverage'].map((h) => (
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
                    <td className="px-3 py-2 font-medium text-gray-900 max-w-[180px] truncate">
                      {d.category}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                        style={{ backgroundColor: t.bg, color: t.color }}>
                        {t.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{formatCurrency(d.mbGpDollars)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`font-medium ${
                        (d.mbGpMargin || 0) >= 45 ? 'text-green-600'
                        : (d.mbGpMargin || 0) >= 35 ? 'text-blue-600'
                        : 'text-amber-600'
                      }`}>
                        {formatPercent(d.mbGpMargin)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{formatCurrency(d.mmsGpDollars)}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatPercent(d.penetration, 0)}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatPercent(d.coverage, 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

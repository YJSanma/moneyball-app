import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { useMemo, useState } from 'react';
import { formatCurrency, formatPercent, formatNumber, CHART_COLORS } from '../../utils/formatters';

const SORT_OPTIONS = [
  { value: 'gpDollars', label: 'GP Dollars' },
  { value: 'gpMargin', label: 'GP Margin %' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'units', label: 'Units Sold' },
];

function DollarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-2">{d?.category}</p>
      <div className="space-y-1 text-gray-600">
        <div className="flex justify-between gap-6">
          <span>GP$</span>
          <span className="font-medium text-gray-900">{formatCurrency(d?.gpDollars)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>GP%</span>
          <span className="font-medium text-gray-900">{formatPercent(d?.gpMargin)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Revenue</span>
          <span className="font-medium text-gray-900">{formatCurrency(d?.revenue)}</span>
        </div>
        {d?.units != null && (
          <div className="flex justify-between gap-6">
            <span>Units</span>
            <span className="font-medium text-gray-900">{formatNumber(d?.units, true)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MarginTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-2">{d?.category}</p>
      <div className="flex justify-between gap-6 text-gray-600">
        <span>GP%</span>
        <span className="font-medium text-gray-900">{formatPercent(d?.gpMargin)}</span>
      </div>
    </div>
  );
}

export default function GPRanking({ data }) {
  const [sortBy, setSortBy] = useState('gpDollars');

  const sorted = useMemo(
    () =>
      [...data]
        .filter((d) => d[sortBy] != null)
        .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0)),
    [data, sortBy],
  );

  const totalGP = useMemo(
    () => sorted.reduce((s, d) => s + (d.gpDollars || 0), 0),
    [sorted],
  );

  const avgMargin = useMemo(() => {
    const withMargin = sorted.filter((d) => d.gpMargin != null);
    return withMargin.length
      ? withMargin.reduce((s, d) => s + d.gpMargin, 0) / withMargin.length
      : 0;
  }, [sorted]);

  // GP$ bar chart data
  const gpDollarData = useMemo(
    () =>
      [...data]
        .filter((d) => d.gpDollars != null)
        .sort((a, b) => (b.gpDollars || 0) - (a.gpDollars || 0))
        .map((d, i) => ({ ...d, rank: i + 1, fill: CHART_COLORS[i % CHART_COLORS.length] })),
    [data],
  );

  // GP% bar chart data
  const gpMarginData = useMemo(
    () =>
      [...data]
        .filter((d) => d.gpMargin != null)
        .sort((a, b) => (b.gpMargin || 0) - (a.gpMargin || 0))
        .map((d, i) => ({ ...d, fill: CHART_COLORS[i % CHART_COLORS.length] })),
    [data],
  );

  const shortLabel = (name) => {
    if (!name) return '';
    const words = name.split(' ');
    if (words.length <= 2 || name.length <= 14) return name;
    return words.slice(0, 2).join(' ') + '…';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">GP Ranking</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gross profit analysis by product category</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total GP$', value: formatCurrency(totalGP, true), sub: 'Across all categories' },
          { label: 'Avg GP Margin', value: formatPercent(avgMargin), sub: 'Portfolio average' },
          {
            label: '#1 Category',
            value: gpDollarData[0]?.category || '—',
            sub: `${formatCurrency(gpDollarData[0]?.gpDollars, true)} GP$`,
          },
          {
            label: 'Highest Margin',
            value: gpMarginData[0]?.category || '—',
            sub: `${formatPercent(gpMarginData[0]?.gpMargin)} GP%`,
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-lg font-bold text-gray-900 truncate">{kpi.value}</p>
            <p className="text-xs text-gray-400">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* GP$ Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Gross Profit Dollars by Category</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={gpDollarData}
            layout="vertical"
            margin={{ top: 0, right: 80, bottom: 0, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => formatCurrency(v, true)}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={120}
              tick={{ fontSize: 11, fill: '#374151' }}
              tickFormatter={shortLabel}
            />
            <Tooltip content={<DollarTooltip />} />
            <Bar dataKey="gpDollars" radius={[0, 4, 4, 0]} barSize={20}>
              {gpDollarData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="gpDollars"
                position="right"
                formatter={(v) => formatCurrency(v, true)}
                style={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* GP% Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Gross Profit Margin % by Category</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={gpMarginData}
            layout="vertical"
            margin={{ top: 0, right: 70, bottom: 0, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: '#64748b' }}
              domain={[0, 'dataMax + 5']}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={120}
              tick={{ fontSize: 11, fill: '#374151' }}
              tickFormatter={shortLabel}
            />
            <Tooltip content={<MarginTooltip />} />
            <Bar dataKey="gpMargin" radius={[0, 4, 4, 0]} barSize={20}>
              {gpMarginData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="gpMargin"
                position="right"
                formatter={(v) => `${v?.toFixed(1)}%`}
                style={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranked table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">
            Ranked by {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">GP$</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">GP%</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((d, i) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{d.category}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{formatCurrency(d.gpDollars)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`font-medium ${
                        (d.gpMargin || 0) >= 40
                          ? 'text-green-600'
                          : (d.gpMargin || 0) >= 30
                          ? 'text-blue-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {formatPercent(d.gpMargin)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{formatCurrency(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

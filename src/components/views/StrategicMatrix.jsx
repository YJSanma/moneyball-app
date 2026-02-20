import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  Label,
} from 'recharts';
import { useMemo } from 'react';
import { formatCurrency, formatPercent, getQuadrant, CHART_COLORS } from '../../utils/formatters';

const QUADRANT_INFO = [
  { label: 'Stars', color: '#2563eb', bg: '#eff6ff', desc: 'High growth, high share — invest to maintain' },
  { label: 'Question Marks', color: '#d97706', bg: '#fffbeb', desc: 'High growth, low share — selective investment' },
  { label: 'Cash Cows', color: '#16a34a', bg: '#f0fdf4', desc: 'Low growth, high share — harvest profits' },
  { label: 'Dogs', color: '#dc2626', bg: '#fef2f2', desc: 'Low growth, low share — divest or maintain' },
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const q = getQuadrant(d.marketGrowth, d.marketShare);
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm max-w-[220px]">
      <p className="font-semibold text-gray-900 mb-1.5">{d.category}</p>
      <div
        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2"
        style={{ backgroundColor: q.bg, color: q.color }}
      >
        {q.label}
      </div>
      <div className="space-y-1 text-gray-600">
        <div className="flex justify-between gap-4">
          <span>Revenue</span>
          <span className="font-medium text-gray-900">{formatCurrency(d.revenue, true)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>GP$</span>
          <span className="font-medium text-gray-900">{formatCurrency(d.gpDollars, true)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>GP%</span>
          <span className="font-medium text-gray-900">{formatPercent(d.gpMargin)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Market Growth</span>
          <span className="font-medium text-gray-900">{formatPercent(d.marketGrowth)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Rel. Market Share</span>
          <span className="font-medium text-gray-900">{d.marketShare?.toFixed(2)}x</span>
        </div>
      </div>
    </div>
  );
}

function CustomDot(props) {
  const { cx, cy, payload, r } = props;
  const q = getQuadrant(payload.marketGrowth, payload.marketShare);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={q.color}
      fillOpacity={0.75}
      stroke={q.color}
      strokeWidth={1.5}
    />
  );
}

export default function StrategicMatrix({ data }) {
  const { chartData, avgGrowth, avgShare, maxRevenue } = useMemo(() => {
    const valid = data.filter(
      (d) => d.marketGrowth != null && d.marketShare != null,
    );
    const avgG = valid.length ? valid.reduce((s, d) => s + d.marketGrowth, 0) / valid.length : 5;
    const avgS = valid.length ? valid.reduce((s, d) => s + d.marketShare, 0) / valid.length : 1;
    const maxR = Math.max(...valid.map((d) => d.revenue || 0), 1);
    return { chartData: valid, avgGrowth: avgG, avgShare: avgS, maxRevenue: maxR };
  }, [data]);

  // Scale bubble radius based on revenue
  const getRadius = (revenue) => {
    const minR = 8;
    const maxR = 32;
    const ratio = Math.sqrt((revenue || 0) / maxRevenue);
    return minR + ratio * (maxR - minR);
  };

  const quadrantCounts = useMemo(() => {
    const counts = { Stars: 0, 'Question Marks': 0, 'Cash Cows': 0, Dogs: 0 };
    chartData.forEach((d) => {
      const q = getQuadrant(d.marketGrowth, d.marketShare, avgGrowth, avgShare);
      counts[q.label] = (counts[q.label] || 0) + 1;
    });
    return counts;
  }, [chartData, avgGrowth, avgShare]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Strategic Matrix</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          BCG-style portfolio analysis — bubble size represents revenue
        </p>
      </div>

      {/* Quadrant summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUADRANT_INFO.map((q) => (
          <div
            key={q.label}
            className="rounded-lg p-3 border"
            style={{ backgroundColor: q.bg, borderColor: q.color + '40' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold" style={{ color: q.color }}>{q.label}</span>
              <span
                className="text-lg font-bold"
                style={{ color: q.color }}
              >
                {quadrantCounts[q.label] || 0}
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-tight">{q.desc}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={480}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              type="number"
              dataKey="marketShare"
              domain={['auto', 'auto']}
              tickFormatter={(v) => `${v.toFixed(1)}x`}
              tick={{ fontSize: 12, fill: '#64748b' }}
            >
              <Label
                value="Relative Market Share"
                position="insideBottom"
                offset={-25}
                style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="marketGrowth"
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12, fill: '#64748b' }}
            >
              <Label
                value="Market Growth Rate (%)"
                angle={-90}
                position="insideLeft"
                offset={10}
                style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
              />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={avgShare}
              stroke="#94a3b8"
              strokeDasharray="6 3"
              strokeWidth={1.5}
            />
            <ReferenceLine
              y={avgGrowth}
              stroke="#94a3b8"
              strokeDasharray="6 3"
              strokeWidth={1.5}
            />
            <Scatter
              data={chartData}
              shape={(props) => <CustomDot {...props} r={getRadius(props.payload.revenue)} />}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Category labels legend */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Categories</p>
          <div className="flex flex-wrap gap-2">
            {chartData.map((d) => {
              const q = getQuadrant(d.marketGrowth, d.marketShare, avgGrowth, avgShare);
              return (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                  style={{ backgroundColor: q.bg, color: q.color }}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: q.color }}
                  />
                  {d.category}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reference lines note */}
      <p className="text-xs text-gray-400 text-center">
        Dashed lines represent average market growth ({formatPercent(avgGrowth)}) and average relative market share ({avgShare.toFixed(2)}x)
      </p>
    </div>
  );
}

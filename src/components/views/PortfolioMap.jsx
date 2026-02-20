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
import { formatCurrency, formatPercent, getPortfolioQuadrant } from '../../utils/formatters';

const ZONE_INFO = [
  { label: 'Invest/Grow', color: '#2563eb', desc: 'High attractiveness & position — priority investment' },
  { label: 'Selective Growth', color: '#7c3aed', desc: 'Strong in one dimension — selective resource allocation' },
  { label: 'Selectivity', color: '#d97706', desc: 'Medium priority — manage for selectivity' },
  { label: 'Harvest/Divest', color: '#dc2626', desc: 'Low priority — harvest cash or exit' },
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const zone = getPortfolioQuadrant(d.marketAttractiveness, d.competitivePosition);
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm max-w-[220px]">
      <p className="font-semibold text-gray-900 mb-1.5">{d.category}</p>
      <div
        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 text-white"
        style={{ backgroundColor: zone.color }}
      >
        {zone.label}
      </div>
      <div className="space-y-1 text-gray-600">
        <div className="flex justify-between gap-4">
          <span>GP$</span>
          <span className="font-medium text-gray-900">{formatCurrency(d.gpDollars, true)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>GP%</span>
          <span className="font-medium text-gray-900">{formatPercent(d.gpMargin)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Attractiveness</span>
          <span className="font-medium text-gray-900">{d.marketAttractiveness?.toFixed(0)}/100</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Comp. Position</span>
          <span className="font-medium text-gray-900">{d.competitivePosition?.toFixed(0)}/100</span>
        </div>
      </div>
    </div>
  );
}

// 3x3 GE-McKinsey grid background zones
function GridBackground() {
  const zones = [
    // row high (67-100), cols: high, medium, low
    { x: '67%', y: '0%', w: '33%', h: '33%', color: '#dbeafe' },
    { x: '33%', y: '0%', w: '34%', h: '33%', color: '#ede9fe' },
    { x: '0%', y: '0%', w: '33%', h: '33%', color: '#fef3c7' },
    // row medium (33-67)
    { x: '67%', y: '33%', w: '33%', h: '34%', color: '#ede9fe' },
    { x: '33%', y: '33%', w: '34%', h: '34%', color: '#fef3c7' },
    { x: '0%', y: '33%', w: '33%', h: '34%', color: '#fee2e2' },
    // row low (0-33)
    { x: '67%', y: '67%', w: '33%', h: '33%', color: '#fef3c7' },
    { x: '33%', y: '67%', w: '34%', h: '33%', color: '#fee2e2' },
    { x: '0%', y: '67%', w: '33%', h: '33%', color: '#fee2e2' },
  ];
  return null; // handled via reference lines
}

export default function PortfolioMap({ data }) {
  const chartData = useMemo(
    () => data.filter((d) => d.marketAttractiveness != null && d.competitivePosition != null),
    [data],
  );

  const maxGP = Math.max(...chartData.map((d) => d.gpDollars || 0), 1);

  const getRadius = (gpDollars) => {
    const minR = 8;
    const maxR = 32;
    const ratio = Math.sqrt((gpDollars || 0) / maxGP);
    return minR + ratio * (maxR - minR);
  };

  const zoneCounts = useMemo(() => {
    const counts = { 'Invest/Grow': 0, 'Selective Growth': 0, Selectivity: 0, 'Harvest/Divest': 0 };
    chartData.forEach((d) => {
      const z = getPortfolioQuadrant(d.marketAttractiveness, d.competitivePosition);
      counts[z.label] = (counts[z.label] || 0) + 1;
    });
    return counts;
  }, [chartData]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Portfolio Map</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          GE–McKinsey 9-box matrix — bubble size represents GP dollars
        </p>
      </div>

      {/* Zone summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ZONE_INFO.map((z) => (
          <div
            key={z.label}
            className="rounded-lg p-3 border border-gray-100 bg-white"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold" style={{ color: z.color }}>{z.label}</span>
              <span className="text-lg font-bold" style={{ color: z.color }}>
                {zoneCounts[z.label] || 0}
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-tight">{z.desc}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        {/* 3x3 grid labels */}
        <div className="relative mb-2">
          <div className="flex justify-between text-xs text-gray-400 px-12">
            <span className="text-red-400">Low Position</span>
            <span className="text-gray-400">Medium</span>
            <span className="text-blue-500">Strong Position</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={460}>
          <ScatterChart margin={{ top: 10, right: 30, bottom: 40, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              type="number"
              dataKey="competitivePosition"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              ticks={[0, 33, 67, 100]}
              tickFormatter={(v) => `${v}`}
            >
              <Label
                value="Competitive Position (0–100)"
                position="insideBottom"
                offset={-25}
                style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="marketAttractiveness"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              ticks={[0, 33, 67, 100]}
            >
              <Label
                value="Market Attractiveness (0–100)"
                angle={-90}
                position="insideLeft"
                offset={10}
                style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
              />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            {/* 9-box grid reference lines */}
            <ReferenceLine x={33} stroke="#e2e8f0" strokeWidth={2} />
            <ReferenceLine x={67} stroke="#e2e8f0" strokeWidth={2} />
            <ReferenceLine y={33} stroke="#e2e8f0" strokeWidth={2} />
            <ReferenceLine y={67} stroke="#e2e8f0" strokeWidth={2} />
            <Scatter
              data={chartData}
              shape={(props) => {
                const { cx, cy, payload } = props;
                const r = getRadius(payload.gpDollars);
                const zone = getPortfolioQuadrant(payload.marketAttractiveness, payload.competitivePosition);
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={zone.color}
                    fillOpacity={0.75}
                    stroke={zone.color}
                    strokeWidth={1.5}
                  />
                );
              }}
            >
              {chartData.map((_, i) => <Cell key={i} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Categories</p>
          <div className="flex flex-wrap gap-2">
            {chartData.map((d) => {
              const zone = getPortfolioQuadrant(d.marketAttractiveness, d.competitivePosition);
              return (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs text-white"
                  style={{ backgroundColor: zone.color + 'cc' }}
                >
                  {d.category}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

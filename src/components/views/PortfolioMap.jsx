// Portfolio Map — Penetration vs Coverage scatter chart
// Axes: Coverage % (X) vs Penetration % (Y)
// Bubble size: MB GP$   |   Color: Tier
// Quadrant labels reflect McKesson distribution/activation strategy

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell, Label,
} from 'recharts';
import { useMemo, useState } from 'react';
import { formatCurrency, formatPercent, getTier, getPenCovQuadrant } from '../../utils/formatters';

// Threshold lines for the 4 quadrants
const PEN_LINE = 60;
const COV_LINE = 65;

const QUADRANT_LABELS = [
  { label: 'Core Strength',            color: '#0066CC', desc: 'High pen & coverage — protect and grow' },
  { label: 'Activation Opportunity',   color: '#d97706', desc: 'High coverage, low pen — drive trial' },
  { label: 'Distribution Opportunity', color: '#7c3aed', desc: 'High pen, low coverage — expand distribution' },
  { label: 'Investment Needed',        color: '#dc2626', desc: 'Low pen & coverage — assess viability' },
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const t = getTier(d.tier);
  const q = getPenCovQuadrant(d.penetration, d.coverage);
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm max-w-[220px]">
      <p className="font-semibold text-gray-900 mb-1">{d.category}</p>
      <div className="flex gap-1.5 mb-2">
        <span
          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: t.bg, color: t.color }}
        >
          {t.label}
        </span>
        <span
          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: q.color }}
        >
          {q.label}
        </span>
      </div>
      <div className="space-y-1 text-gray-600 text-xs">
        <Row label="MB GP$"      value={formatCurrency(d.mbGpDollars, true)} />
        <Row label="MB GP%"      value={formatPercent(d.mbGpMargin)} />
        <Row label="MMS GP$"     value={formatCurrency(d.mmsGpDollars, true)} />
        <Row label="Penetration" value={formatPercent(d.penetration, 0)} />
        <Row label="Coverage"    value={formatPercent(d.coverage, 0)} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default function PortfolioMap({ data }) {
  const [activeTiers, setActiveTiers] = useState(new Set([1, 2, 3, 4]));

  const toggleTier = (tier) => {
    setActiveTiers((prev) => {
      const next = new Set(prev);
      next.has(tier) ? next.delete(tier) : next.add(tier);
      return next;
    });
  };

  const { chartData, maxGP } = useMemo(() => {
    const valid = data.filter(
      (d) => d.penetration != null && d.coverage != null && activeTiers.has(d.tier),
    );
    const maxG = Math.max(...data.map((d) => d.mbGpDollars || 0), 1);
    return { chartData: valid, maxGP: maxG };
  }, [data, activeTiers]);

  const getRadius = (mbGp) => {
    const min = 7, max = 28;
    return min + Math.sqrt((mbGp || 0) / maxGP) * (max - min);
  };

  // Count categories per quadrant
  const quadrantCounts = useMemo(() => {
    const c = {};
    chartData.forEach((d) => {
      const q = getPenCovQuadrant(d.penetration, d.coverage);
      c[q.label] = (c[q.label] || 0) + 1;
    });
    return c;
  }, [chartData]);

  const tierCounts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0 };
    data.forEach((d) => { if (d.tier) c[d.tier] = (c[d.tier] || 0) + 1; });
    return c;
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Portfolio Map</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Penetration vs coverage — bubble size = MB GP$, color = tier
        </p>
      </div>

      {/* Quadrant summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUADRANT_LABELS.map((q) => (
          <div key={q.label} className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold" style={{ color: q.color }}>
                {q.label}
              </span>
              <span className="text-lg font-bold" style={{ color: q.color }}>
                {quadrantCounts[q.label] || 0}
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-tight">{q.desc}</p>
          </div>
        ))}
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
              {t.label}
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={active ? { backgroundColor: t.color + '20' } : { backgroundColor: '#f3f4f6' }}>
                {tierCounts[tier]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        {/* Axis context labels */}
        <div className="flex justify-between text-xs text-gray-400 mb-1 px-14">
          <span>Low Coverage ←</span>
          <span>→ High Coverage</span>
        </div>

        <ResponsiveContainer width="100%" height={480}>
          <ScatterChart margin={{ top: 10, right: 40, bottom: 40, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              type="number" dataKey="coverage" domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12, fill: '#64748b' }}
              ticks={[0, 25, 50, 65, 75, 100]}
            >
              <Label value="Coverage (%)" position="insideBottom" offset={-25}
                style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
            </XAxis>
            <YAxis
              type="number" dataKey="penetration" domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12, fill: '#64748b' }}
              ticks={[0, 25, 50, 60, 75, 100]}
            >
              <Label value="Penetration (%)" angle={-90} position="insideLeft" offset={10}
                style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            {/* Quadrant dividers */}
            <ReferenceLine x={COV_LINE} stroke="#cbd5e1" strokeWidth={2} strokeDasharray="6 3" />
            <ReferenceLine y={PEN_LINE} stroke="#cbd5e1" strokeWidth={2} strokeDasharray="6 3" />
            <Scatter
              data={chartData}
              shape={({ cx, cy, payload }) => {
                const t = getTier(payload.tier);
                const r = getRadius(payload.mbGpDollars);
                return (
                  <circle cx={cx} cy={cy} r={r}
                    fill={t.color} fillOpacity={0.72}
                    stroke={t.color} strokeWidth={1.5}
                  />
                );
              }}
            >
              {chartData.map((_, i) => <Cell key={i} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Category legend */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            Categories ({chartData.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {chartData.map((d) => {
              const t = getTier(d.tier);
              return (
                <span key={d.id}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
                  style={{ backgroundColor: t.bg, color: t.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
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

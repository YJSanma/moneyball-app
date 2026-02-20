// Strategic Matrix — BCG-style scatter chart
// Axes: Market Growth % (Y) vs Relative Market Share (X)
// Bubble size: MB GP$   |   Color: Tier

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell, Label,
} from 'recharts';
import { useMemo, useState } from 'react';
import { formatCurrency, formatPercent, getTier, TIER_CONFIG } from '../../utils/formatters';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d  = payload[0]?.payload;
  if (!d) return null;
  const t  = getTier(d.tier);
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm max-w-[220px]">
      <p className="font-semibold text-gray-900 mb-1">{d.category}</p>
      <span
        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2"
        style={{ backgroundColor: t.bg, color: t.color, border: `1px solid ${t.border}` }}
      >
        {t.label} — {t.desc}
      </span>
      <div className="space-y-1 text-gray-600 text-xs">
        <Row label="MB GP$"         value={formatCurrency(d.mbGpDollars, true)} />
        <Row label="MB GP%"         value={formatPercent(d.mbGpMargin)} />
        <Row label="MMS GP$"        value={formatCurrency(d.mmsGpDollars, true)} />
        <Row label="Market Growth"  value={formatPercent(d.marketGrowth)} />
        <Row label="Rel. Mkt Share" value={d.marketShare != null ? `${d.marketShare.toFixed(2)}x` : '—'} />
        <Row label="Penetration"    value={formatPercent(d.penetration, 0)} />
        <Row label="Coverage"       value={formatPercent(d.coverage, 0)} />
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

export default function StrategicMatrix({ data }) {
  const [activeTiers, setActiveTiers] = useState(new Set([1, 2, 3, 4]));

  const toggleTier = (tier) => {
    setActiveTiers((prev) => {
      const next = new Set(prev);
      next.has(tier) ? next.delete(tier) : next.add(tier);
      return next;
    });
  };

  const { chartData, avgGrowth, avgShare, maxGP } = useMemo(() => {
    const valid = data.filter(
      (d) => d.marketGrowth != null && d.marketShare != null && activeTiers.has(d.tier),
    );
    const allValid = data.filter((d) => d.marketGrowth != null && d.marketShare != null);
    const avgG = allValid.length ? allValid.reduce((s, d) => s + d.marketGrowth, 0) / allValid.length : 5;
    const avgS = allValid.length ? allValid.reduce((s, d) => s + d.marketShare,  0) / allValid.length : 1;
    const maxG = Math.max(...data.map((d) => d.mbGpDollars || 0), 1);
    return { chartData: valid, avgGrowth: avgG, avgShare: avgS, maxGP: maxG };
  }, [data, activeTiers]);

  // Scale bubble radius by MB GP$
  const getRadius = (mbGp) => {
    const min = 7, max = 28;
    return min + Math.sqrt((mbGp || 0) / maxGP) * (max - min);
  };

  const tierCounts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0 };
    data.forEach((d) => { if (d.tier) c[d.tier] = (c[d.tier] || 0) + 1; });
    return c;
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Strategic Matrix</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Market growth vs relative market share — bubble size = MB GP$, color = tier
        </p>
      </div>

      {/* Tier filter pills */}
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
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: active ? t.color : '#d1d5db' }}
              />
              {t.label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={active ? { backgroundColor: t.color + '20' } : { backgroundColor: '#f3f4f6' }}
              >
                {tierCounts[tier]}
              </span>
            </button>
          );
        })}
        <span className="text-xs text-gray-400 self-center ml-1">
          {chartData.length} of {data.length} categories shown
        </span>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              type="number" dataKey="marketShare" domain={['auto', 'auto']}
              tickFormatter={(v) => `${v.toFixed(1)}x`}
              tick={{ fontSize: 12, fill: '#64748b' }}
            >
              <Label value="Relative Market Share" position="insideBottom" offset={-25}
                style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
            </XAxis>
            <YAxis
              type="number" dataKey="marketGrowth"
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12, fill: '#64748b' }}
            >
              <Label value="Market Growth Rate (%)" angle={-90} position="insideLeft" offset={10}
                style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            {/* Quadrant dividers */}
            <ReferenceLine x={avgShare}  stroke="#94a3b8" strokeDasharray="6 3" strokeWidth={1.5} />
            <ReferenceLine y={avgGrowth} stroke="#94a3b8" strokeDasharray="6 3" strokeWidth={1.5} />
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
                <span
                  key={d.id}
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

      <p className="text-xs text-gray-400 text-center">
        Dashed lines = portfolio averages (growth {formatPercent(avgGrowth)}, share {avgShare.toFixed(2)}x)
      </p>
    </div>
  );
}

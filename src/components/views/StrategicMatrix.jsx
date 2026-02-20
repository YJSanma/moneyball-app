// Framework 2: Mapping Sales Growth Performance among MB, NB and the Market
// Axes: MB Outpace NB Growth (X) vs MMS Outpace Market Growth % (Y)
// Bubble size: MB GP$   |   Color: Tier
// Reference lines at x=0 and y=0 divide the four strategic quadrants

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell, Label,
} from 'recharts';
import { useMemo, useState } from 'react';
import { formatCurrency, formatPercent, getTier } from '../../utils/formatters';

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
        <Row label="MB Outpace NB Growth"  value={formatPercent(d.mbOutpaceMms, 1)} />
        <Row label="MMS Outpace Market %"  value={formatPercent(d.mmsOutpaceMarket, 1)} />
        <Row label="MB GP$"               value={formatCurrency(d.mbGpDollars, true)} />
        <Row label="MB GP%"               value={formatPercent(d.mbGpMargin)} />
        <Row label="MMS GP$"              value={formatCurrency(d.mmsGpDollars, true)} />
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

  const { chartData, maxGP } = useMemo(() => {
    const valid = data.filter(
      (d) => d.mbOutpaceMms != null && d.mmsOutpaceMarket != null && activeTiers.has(d.tier),
    );
    const maxG = Math.max(...data.map((d) => d.mbGpDollars || 0), 1);
    return { chartData: valid, maxGP: maxG };
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
        <h2 className="text-xl font-bold text-gray-900">
          Framework 2: Mapping Sales Growth Performance among MB, NB and the Market
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          MB Outpace NB Growth (X) vs MMS Outpace Market Growth % (Y) — bubble size = MB GP$, color = tier
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
        {/* Chart with corner quadrant labels overlaid */}
        <div className="relative">
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number" dataKey="mbOutpaceMms" domain={['auto', 'auto']}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
                tick={{ fontSize: 12, fill: '#64748b' }}
              >
                <Label value="MB Outpace NB Growth" position="insideBottom" offset={-25}
                  style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
              </XAxis>
              <YAxis
                type="number" dataKey="mmsOutpaceMarket"
                tickFormatter={(v) => `${v.toFixed(1)}%`}
                tick={{ fontSize: 12, fill: '#64748b' }}
              >
                <Label value="MMS Outpace Market Growth %" angle={-90} position="insideLeft" offset={10}
                  style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
              </YAxis>
              <Tooltip content={<CustomTooltip />} />
              {/* Quadrant dividers at zero */}
              <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="6 3" strokeWidth={1.5} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="6 3" strokeWidth={1.5} />
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

          {/* Bold corner labels for each quadrant */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ paddingTop: 20, paddingBottom: 42, paddingLeft: 68, paddingRight: 42 }}>
            <div className="relative w-full h-full text-xs font-bold text-slate-400">
              <span className="absolute top-1 left-1">Opportunity Gap</span>
              <span className="absolute top-1 right-1 text-right">Strategy Star</span>
              <span className="absolute bottom-1 left-1">Evaluation Candidates</span>
              <span className="absolute bottom-1 right-1 text-right">McKesson Brands Champions</span>
            </div>
          </div>
        </div>

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
    </div>
  );
}

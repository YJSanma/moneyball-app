// Framework 2: Mapping Sales Growth Performance among MB, NB and the Market
// Axes: MB Outpace NB Growth (X) vs MMS Outpace Market Growth % (Y)
// Quadrant thresholds: x=0%, y=0%

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer, Cell, Label,
} from 'recharts';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { formatCurrency, formatPercent, getTier, getGrowthQuadrant } from '../../utils/formatters';

const QUADRANT_LABELS = [
  { label: 'Strategy Star',            color: '#1d4ed8', bg: '#dbeafe', desc: 'MB & MMS both outpacing — strongest position' },
  { label: 'Opportunity Gap',          color: '#3b82f6', bg: '#eff6ff', desc: 'MMS outpacing market but MB lagging — close the gap' },
  { label: 'McKesson Brands Champions',color: '#3b82f6', bg: '#eff6ff', desc: 'MB outpacing NB but MMS behind market — defend share' },
  { label: 'Evaluation Candidates',    color: '#6b7280', bg: '#f3f4f6', desc: 'Both metrics lagging — review and reassess' },
];

const BIG = 999;
const LIGHT_BLUE = '#bfdbfe';
const DARK_BLUE  = '#1d4ed8';
const LIGHT_GRAY = '#e5e7eb';

const C_MARGIN = { top: 20, right: 50, bottom: 40, left: 20 };

// Generate tick marks at a sensible interval within [lo, hi]
function makeTicks(lo, hi) {
  const range = hi - lo;
  const step  = range > 40 ? 25 : range > 16 ? 10 : range > 6 ? 5 : range > 2 ? 2 : 1;
  const t = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 0.001; v += step) t.push(Math.round(v * 10) / 10);
  return t;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const t = getTier(d.tier);
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm max-w-[220px]">
      <p className="font-semibold text-gray-900 mb-1">{d.category}</p>
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2"
        style={{ backgroundColor: t.bg, color: t.color, border: `1px solid ${t.border}` }}>
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
      <span>{label}</span><span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default function StrategicMatrix({ data }) {
  const [activeTiers, setActiveTiers] = useState(new Set([1, 2, 3, 4]));
  const [search, setSearch] = useState('');

  const toggleTier = (tier) => {
    setActiveTiers((prev) => {
      const next = new Set(prev);
      next.has(tier) ? next.delete(tier) : next.add(tier);
      return next;
    });
  };

  const { chartData, maxGP, xDomain, yDomain, clippedCats } = useMemo(() => {
    const q = search.toLowerCase();
    const all = data.filter(
      (d) => d.mbOutpaceMms != null && d.mmsOutpaceMarket != null && activeTiers.has(d.tier) &&
        (q === '' || (d.category || '').toLowerCase().includes(q)),
    );
    const maxG = Math.max(...data.map((d) => d.mbGpDollars || 0), 1);

    if (all.length === 0) {
      return { chartData: [], maxGP: maxG, xDomain: [-10, 10], yDomain: [-10, 10], clippedCats: [] };
    }

    const xVals = all.map((d) => d.mbOutpaceMms).sort((a, b) => a - b);
    const yVals = all.map((d) => d.mmsOutpaceMarket).sort((a, b) => a - b);
    const pct   = (arr, p) => arr[Math.max(0, Math.min(arr.length - 1, Math.floor(arr.length * p)))];

    const xMin = Math.min(Math.floor((pct(xVals, 0.05) - 2) / 5) * 5, -5);
    const xMax = Math.max(Math.ceil((pct(xVals, 0.95) + 2) / 5) * 5, 5);
    const yMin = Math.min(Math.floor((pct(yVals, 0.05) - 2) / 5) * 5, -5);
    const yMax = Math.max(Math.ceil((pct(yVals, 0.95) + 2) / 5) * 5, 5);

    const clipped = [];
    const chartItems = all.map((d) => {
      const xOut = d.mbOutpaceMms < xMin || d.mbOutpaceMms > xMax;
      const yOut = d.mmsOutpaceMarket < yMin || d.mmsOutpaceMarket > yMax;
      if (xOut || yOut) clipped.push(d.category);
      return {
        ...d,
        _xPlot: Math.max(xMin, Math.min(xMax, d.mbOutpaceMms)),
        _yPlot: Math.max(yMin, Math.min(yMax, d.mmsOutpaceMarket)),
      };
    });

    return { chartData: chartItems, maxGP: maxG, xDomain: [xMin, xMax], yDomain: [yMin, yMax], clippedCats: clipped };
  }, [data, activeTiers, search]);

  const getRadius = (mbGp) => {
    const min = 7, max = 28;
    return min + Math.sqrt((mbGp || 0) / maxGP) * (max - min);
  };

  const tierCounts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0 };
    data.forEach((d) => { if (d.tier) c[d.tier] = (c[d.tier] || 0) + 1; });
    return c;
  }, [data]);

  const quadrantCounts = useMemo(() => {
    const c = {};
    chartData.forEach((d) => {
      const q = getGrowthQuadrant(d.mbOutpaceMms, d.mmsOutpaceMarket);
      if (q) c[q.label] = (c[q.label] || 0) + 1;
    });
    return c;
  }, [chartData]);

  // ── Axis range inputs for zoom ────────────────────────────────────────────
  const [xMinIn, setXMinIn] = useState('');
  const [xMaxIn, setXMaxIn] = useState('');
  const [yMinIn, setYMinIn] = useState('');
  const [yMaxIn, setYMaxIn] = useState('');

  const toNum = (s, fallback) => (s !== '' && !isNaN(Number(s)) ? Number(s) : fallback);
  const isZoomed = xMinIn !== '' || xMaxIn !== '' || yMinIn !== '' || yMaxIn !== '';
  const resetZoom = () => { setXMinIn(''); setXMaxIn(''); setYMinIn(''); setYMaxIn(''); };

  const activeDomain = {
    x: [toNum(xMinIn, xDomain[0]), toNum(xMaxIn, xDomain[1])],
    y: [toNum(yMinIn, yDomain[0]), toNum(yMaxIn, yDomain[1])],
  };
  const activeXTicks = makeTicks(activeDomain.x[0], activeDomain.x[1]);
  const activeYTicks = makeTicks(activeDomain.y[0], activeDomain.y[1]);
  // ──────────────────────────────────────────────────────────────────────────

  const inputCls = 'w-14 px-1.5 py-0.5 border border-gray-200 rounded text-gray-700 text-center focus:outline-none focus:ring-1 focus:ring-blue-400';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Framework 2: Mapping Sales Growth Performance among MB, NB and the Market
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          MB Outpace NB Growth (X) vs MMS Outpace Market Growth % (Y) — bubble size = MB GP$, color = tier
        </p>
      </div>

      {/* Quadrant summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUADRANT_LABELS.map((q) => (
          <div key={q.label} className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold" style={{ color: q.color }}>{q.label}</span>
              <span className="text-lg font-bold" style={{ color: q.color }}>{quadrantCounts[q.label] || 0}</span>
            </div>
            <p className="text-xs text-gray-500 leading-tight">{q.desc}</p>
          </div>
        ))}
      </div>

      {/* Tier filter pills + search */}
      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4].map((tier) => {
          const t      = getTier(tier);
          const active = activeTiers.has(tier);
          return (
            <button key={tier} onClick={() => toggleTier(tier)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
              style={active
                ? { backgroundColor: t.bg, color: t.color, borderColor: t.border }
                : { backgroundColor: '#f9fafb', color: '#9ca3af', borderColor: '#e5e7eb' }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: active ? t.color : '#d1d5db' }} />
              {t.label}
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={active ? { backgroundColor: t.color + '20' } : { backgroundColor: '#f3f4f6' }}>
                {tierCounts[tier]}
              </span>
            </button>
          );
        })}
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search categories…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
        </div>
        <span className="text-xs text-gray-400 self-center">
          {chartData.length} of {data.length} categories shown
        </span>
      </div>

      {/* Chart card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">

        {/* Axis range inputs */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-xs text-gray-500">
          <span className="font-medium text-gray-600">Axis range:</span>
          <div className="flex items-center gap-1.5">
            <span>X</span>
            <input type="number" value={xMinIn} placeholder={String(xDomain[0])}
              onChange={e => setXMinIn(e.target.value)} className={inputCls} />
            <span>–</span>
            <input type="number" value={xMaxIn} placeholder={String(xDomain[1])}
              onChange={e => setXMaxIn(e.target.value)} className={inputCls} />
            <span>%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Y</span>
            <input type="number" value={yMinIn} placeholder={String(yDomain[0])}
              onChange={e => setYMinIn(e.target.value)} className={inputCls} />
            <span>–</span>
            <input type="number" value={yMaxIn} placeholder={String(yDomain[1])}
              onChange={e => setYMaxIn(e.target.value)} className={inputCls} />
            <span>%</span>
          </div>
          {isZoomed && (
            <button onClick={resetZoom} className="text-blue-600 hover:text-blue-800 font-medium">
              ↩ Reset
            </button>
          )}
        </div>

        {/* Chart + corner labels */}
        <div className="relative">
          <ResponsiveContainer width="100%" height={520}>
            <ScatterChart margin={C_MARGIN}>
              {/* Quadrant shaded backgrounds */}
              <ReferenceArea x1={-BIG} x2={0} y1={0}    y2={BIG}  fill={LIGHT_BLUE} fillOpacity={0.3} stroke="none" />
              <ReferenceArea x1={0}    x2={BIG} y1={0}   y2={BIG}  fill={DARK_BLUE}  fillOpacity={0.1} stroke="none" />
              <ReferenceArea x1={-BIG} x2={0} y1={-BIG}  y2={0}    fill={LIGHT_GRAY} fillOpacity={0.5} stroke="none" />
              <ReferenceArea x1={0}    x2={BIG} y1={-BIG} y2={0}   fill={LIGHT_BLUE} fillOpacity={0.3} stroke="none" />

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

              <XAxis type="number" dataKey="_xPlot" height={30}
                domain={activeDomain.x} ticks={activeXTicks}
                tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#64748b' }}>
                <Label value="MB Outpace NB Growth" position="insideBottom" offset={-25}
                  style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
              </XAxis>
              <YAxis type="number" dataKey="_yPlot" width={60}
                domain={activeDomain.y} ticks={activeYTicks}
                tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#64748b' }}>
                <Label value="MMS Outpace Market Growth %" angle={-90} position="insideLeft" offset={10}
                  style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
              </YAxis>

              <Tooltip content={<CustomTooltip />} />

              <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="6 3" strokeWidth={1.5} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="6 3" strokeWidth={1.5} />

              <Scatter data={chartData}
                shape={({ cx, cy, payload }) => {
                  if (cx == null || cy == null) return null;
                  const t = getTier(payload.tier);
                  const r = getRadius(payload.mbGpDollars);
                  const name = (payload.category || '').length > 13
                    ? payload.category.slice(0, 12) + '…' : (payload.category || '');
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={r} fill={t.color} fillOpacity={0.72} stroke={t.color} strokeWidth={1.5} />
                      <text x={cx + r + 3} y={cy + 4} fontSize={9} fill="#1e293b"
                        stroke="white" strokeWidth={2.5} strokeLinejoin="round" paintOrder="stroke">
                        {name}
                      </text>
                    </g>
                  );
                }}>
                {chartData.map((_, i) => <Cell key={i} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>

          {/* Corner quadrant labels — CSS-positioned */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ paddingTop: 20, paddingBottom: 42, paddingLeft: 70, paddingRight: 52 }}>
            <div className="relative w-full h-full text-xs font-bold">
              <span className="absolute top-1 left-1 text-blue-900">Opportunity Gap</span>
              <span className="absolute top-1 right-1 text-right text-blue-900">Strategy Star</span>
              <span className="absolute bottom-1 left-1 text-gray-600">Evaluation Candidates</span>
              <span className="absolute bottom-1 right-1 text-right text-blue-900">McKesson Brands Champions</span>
            </div>
          </div>
        </div>

        {/* Clamped outlier note */}
        {clippedCats.length > 0 && (
          <p className="text-xs text-gray-400 mt-2 italic">
            * Axis range auto-fitted to bulk of data. {clippedCats.join(', ')}{' '}
            {clippedCats.length === 1 ? 'is' : 'are'} clamped to the axis boundary.
          </p>
        )}

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
                  style={{ backgroundColor: t.bg, color: t.color }}>
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

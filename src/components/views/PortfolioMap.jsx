// Framework 1: Balancing Portfolio Completeness and Sales Penetration
// Axes: Penetration by Sales % (X) vs Portfolio Coverage % (Y)
// Fixed quadrant thresholds: x=25%, y=25%

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer, Cell, Label,
} from 'recharts';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { formatCurrency, formatPercent, getTier, getPenCovQuadrant } from '../../utils/formatters';

const LIGHT_BLUE = '#bfdbfe';
const DARK_BLUE  = '#1d4ed8';

const QUADRANT_LABELS = [
  { label: 'Assortment Leader',  color: '#0066CC', desc: 'High penetration & coverage — core portfolio strength' },
  { label: 'Selective Winner',   color: '#1d4ed8', desc: 'High penetration, low coverage — selective distribution success' },
  { label: 'Reassessment',       color: '#3b82f6', desc: 'High coverage, low penetration — expand trial and activation' },
  { label: 'Untapped Potential', color: '#6b7280', desc: 'Low penetration & coverage — build reach and awareness' },
];

const C_MARGIN = { top: 20, right: 50, bottom: 40, left: 20 };

// Generate tick marks within [lo, hi] at a sensible step size
function makeTicks(lo, hi) {
  const range = hi - lo;
  const step  = range > 40 ? 25 : range > 16 ? 10 : range > 6 ? 5 : range > 2 ? 2 : 1;
  const t = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 0.001; v += step) t.push(Math.round(v * 10) / 10);
  return t;
}

function CustomTooltip({ active, payload, penThreshold = 25, covThreshold = 25 }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const t = getTier(d.tier);
  const q = getPenCovQuadrant(d.penetration, d.coverage, penThreshold, covThreshold);
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm max-w-[220px]">
      <p className="font-semibold text-gray-900 mb-1">{d.category}</p>
      <div className="flex gap-1.5 mb-2">
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: t.bg, color: t.color }}>
          {t.label}
        </span>
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: q.color }}>
          {q.label}
        </span>
      </div>
      <div className="space-y-1 text-gray-600 text-xs">
        <Row label="Penetration"  value={formatPercent(d.penetration, 0)} />
        <Row label="Coverage"     value={formatPercent(d.coverage, 0)} />
        <Row label="MB GP$"       value={formatCurrency(d.mbGpDollars, true)} />
        <Row label="MB GP%"       value={formatPercent(d.mbGpMargin)} />
        <Row label="NB GP$"       value={formatCurrency(d.mmsGpDollars, true)} />
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

export default function PortfolioMap({ data, penThreshold = 25, covThreshold = 25, setPenThreshold, setCovThreshold }) {
  const [activeTiers, setActiveTiers] = useState(new Set([1, 2, 3, 4, 5]));
  const [search, setSearch] = useState('');

  const toggleTier = (tier) => {
    setActiveTiers((prev) => {
      const next = new Set(prev);
      next.has(tier) ? next.delete(tier) : next.add(tier);
      return next;
    });
  };

  const { chartData, maxGP } = useMemo(() => {
    const q = search.toLowerCase();
    const valid = data.filter(
      (d) => d.penetration != null && d.coverage != null && activeTiers.has(d.tier) &&
        (q === '' || (d.category || '').toLowerCase().includes(q)),
    );
    const maxG = Math.max(...data.map((d) => d.mbGpDollars || 0), 1);
    return { chartData: valid, maxGP: maxG };
  }, [data, activeTiers, search]);

  const getRadius = (mbGp) => {
    const min = 7, max = 28;
    return min + Math.sqrt((mbGp || 0) / maxGP) * (max - min);
  };

  const quadrantCounts = useMemo(() => {
    const c = {};
    chartData.forEach((d) => {
      const q = getPenCovQuadrant(d.penetration, d.coverage, penThreshold, covThreshold);
      c[q.label] = (c[q.label] || 0) + 1;
    });
    return c;
  }, [chartData, penThreshold, covThreshold]);

  const tierCounts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    data.forEach((d) => { if (d.tier) c[d.tier] = (c[d.tier] || 0) + 1; });
    return c;
  }, [data]);

  // ── Axis range inputs for zoom ────────────────────────────────────────────
  const [xMinIn, setXMinIn] = useState('');
  const [xMaxIn, setXMaxIn] = useState('');
  const [yMinIn, setYMinIn] = useState('');
  const [yMaxIn, setYMaxIn] = useState('');

  const toNum = (s, fallback) => (s !== '' && !isNaN(Number(s)) ? Number(s) : fallback);
  const isZoomed = xMinIn !== '' || xMaxIn !== '' || yMinIn !== '' || yMaxIn !== '';
  const resetZoom = () => { setXMinIn(''); setXMaxIn(''); setYMinIn(''); setYMaxIn(''); };

  // Default domain: X (penetration) 0–15%, Y (coverage) 0–100%
  const activeDomain = {
    x: [toNum(xMinIn, 0), toNum(xMaxIn, 15)],
    y: [toNum(yMinIn, 0), toNum(yMaxIn, 100)],
  };
  const activeXTicks = makeTicks(activeDomain.x[0], activeDomain.x[1]);
  const activeYTicks = makeTicks(activeDomain.y[0], activeDomain.y[1]);
  // ──────────────────────────────────────────────────────────────────────────

  const inputCls = 'w-14 px-1.5 py-0.5 border border-gray-200 rounded text-gray-700 text-center focus:outline-none focus:ring-1 focus:ring-blue-400';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Framework 1: Balancing Portfolio Completeness and Sales Penetration
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Penetration by Sales % (X) vs Portfolio Coverage % (Y) — bubble size = MB GP$, color = tier
        </p>
      </div>

      {/* Quadrant summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUADRANT_LABELS.map((q) => (
          <div key={q.label} className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold" style={{ color: q.color }}>{q.label}</span>
              <span className="text-lg font-bold" style={{ color: q.color }}>
                {quadrantCounts[q.label] || 0}
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-tight">{q.desc}</p>
          </div>
        ))}
      </div>

      {/* Tier filter + search */}
      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((tier) => {
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
        {/* Search box */}
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>
        <span className="text-xs text-gray-400 self-center">
          {chartData.length} of {data.length} categories shown
        </span>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">

        {/* Quadrant threshold controls */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 text-xs text-gray-500">
          <span className="font-medium text-gray-600">Quadrant thresholds:</span>
          <div className="flex items-center gap-1.5">
            <span>Penetration ≥</span>
            <input type="number" min="0" max="100" value={penThreshold}
              onChange={e => setPenThreshold?.(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className={inputCls} />
            <span>%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Coverage ≥</span>
            <input type="number" min="0" max="100" value={covThreshold}
              onChange={e => setCovThreshold?.(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className={inputCls} />
            <span>%</span>
          </div>
        </div>

        {/* Axis range inputs */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-xs text-gray-500">
          <span className="font-medium text-gray-600">Axis range:</span>
          <div className="flex items-center gap-1.5">
            <span>X</span>
            <input type="number" value={xMinIn} placeholder="0"
              onChange={e => setXMinIn(e.target.value)} className={inputCls} />
            <span>–</span>
            <input type="number" value={xMaxIn} placeholder="15"
              onChange={e => setXMaxIn(e.target.value)} className={inputCls} />
            <span>%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Y</span>
            <input type="number" value={yMinIn} placeholder="0"
              onChange={e => setYMinIn(e.target.value)} className={inputCls} />
            <span>–</span>
            <input type="number" value={yMaxIn} placeholder="100"
              onChange={e => setYMaxIn(e.target.value)} className={inputCls} />
            <span>%</span>
          </div>
          {isZoomed && (
            <button onClick={resetZoom} className="text-blue-600 hover:text-blue-800 font-medium">
              ↩ Reset
            </button>
          )}
        </div>

        <ResponsiveContainer width="100%" height={520}>
          <ScatterChart margin={C_MARGIN}>

            {/* Quadrant shaded backgrounds — rendered first so dots appear on top */}
            <ReferenceArea x1={0} x2={penThreshold} y1={covThreshold} y2={100}
              fill={LIGHT_BLUE} fillOpacity={0.3} stroke="none">
              <Label value="Reassessment" position="insideTopLeft"
                style={{ fontSize: 11, fontWeight: 700, fill: '#1e3a8a' }} />
            </ReferenceArea>
            <ReferenceArea x1={penThreshold} x2={100} y1={covThreshold} y2={100}
              fill={DARK_BLUE} fillOpacity={0.1} stroke="none">
              <Label value="Assortment Leader" position="insideTopRight"
                style={{ fontSize: 11, fontWeight: 700, fill: '#1e3a8a' }} />
            </ReferenceArea>
            <ReferenceArea x1={0} x2={penThreshold} y1={0} y2={covThreshold}
              fill={LIGHT_BLUE} fillOpacity={0.3} stroke="none">
              <Label value="Untapped Potential" position="insideBottomLeft"
                style={{ fontSize: 11, fontWeight: 700, fill: '#1e3a8a' }} />
            </ReferenceArea>
            <ReferenceArea x1={penThreshold} x2={100} y1={0} y2={covThreshold}
              fill={DARK_BLUE} fillOpacity={0.1} stroke="none">
              <Label value="Selective Winner" position="insideBottomRight"
                style={{ fontSize: 11, fontWeight: 700, fill: '#1e3a8a' }} />
            </ReferenceArea>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

            <XAxis
              type="number" dataKey="penetration" height={30} allowDataOverflow
              domain={activeDomain.x} ticks={activeXTicks}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12, fill: '#64748b' }}
            >
              <Label value="Penetration by Sales %" position="insideBottom" offset={-25}
                style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
            </XAxis>
            <YAxis
              type="number" dataKey="coverage" width={55} allowDataOverflow
              domain={activeDomain.y} ticks={activeYTicks}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12, fill: '#64748b' }}
            >
              <Label value="Portfolio Coverage %" angle={-90} position="insideLeft" offset={10}
                style={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} />
            </YAxis>

            <Tooltip content={<CustomTooltip penThreshold={penThreshold} covThreshold={covThreshold} />} />

            {/* Dashed divider lines at the quadrant thresholds */}
            <ReferenceLine x={penThreshold} stroke="#94a3b8" strokeDasharray="6 3" strokeWidth={1.5} />
            <ReferenceLine y={covThreshold} stroke="#94a3b8" strokeDasharray="6 3" strokeWidth={1.5} />

            <Scatter
              data={chartData}
              shape={({ cx, cy, payload }) => {
                if (cx == null || cy == null) return null;
                const t = getTier(payload.tier);
                const r = getRadius(payload.mbGpDollars);
                const name = (payload.category || '').length > 13
                  ? payload.category.slice(0, 12) + '…'
                  : (payload.category || '');
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={r}
                      fill={t.color} fillOpacity={0.72}
                      stroke={t.color} strokeWidth={1.5}
                    />
                    <text x={cx + r + 3} y={cy + 4} fontSize={9} fill="#1e293b"
                      stroke="white" strokeWidth={2.5} strokeLinejoin="round" paintOrder="stroke">
                      {name}
                    </text>
                  </g>
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

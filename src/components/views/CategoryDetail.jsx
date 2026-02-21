// Category Detail page — shown when a user clicks a category in the Data Table.
// Displays every metric for a single category, organized into sections with visual indicators.

import { useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip as RechartsTooltip,
} from 'recharts';
import {
  formatCurrency, formatPercent, getTier,
  getPenCovQuadrant, getGrowthQuadrant,
} from '../../utils/formatters';
import { WEIGHT_COLUMNS, getWeightVal, DEFAULT_WEIGHTS } from '../../utils/scoring';

// Normalize a value to 0–100 within the portfolio's min/max range
function normalize(value, min, max) {
  if (max === min || value == null) return 0;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

// Arrow indicator for growth/outpace metrics
function TrendIcon({ value }) {
  if (value == null) return null;
  if (value > 0)  return <TrendingUp  size={14} className="text-green-500" />;
  if (value < 0)  return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-gray-400" />;
}

// A single metric tile
function MetricTile({ label, value, sub, color = '#0066CC', bg = '#e6f0ff', trend }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: bg, borderColor: color + '30' }}>
      <p className="text-xs font-medium mb-1 truncate" style={{ color: color + 'aa' }}>{label}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-lg font-bold leading-tight" style={{ color }}>{value ?? '—'}</p>
        {trend != null && <TrendIcon value={trend} />}
      </div>
      {sub && <p className="text-xs mt-0.5" style={{ color: color + '88' }}>{sub}</p>}
    </div>
  );
}

// A quadrant badge with its label and colour
function QuadrantBadge({ quadrant, label }) {
  if (!quadrant) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <span
        className="px-3 py-1 rounded-full text-xs font-semibold w-fit"
        style={{ backgroundColor: quadrant.bg, color: quadrant.color }}
      >
        {quadrant.label}
      </span>
    </div>
  );
}

// Section wrapper with a heading
function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{title}</h3>
      {children}
    </div>
  );
}

// A mini 2×2 quadrant diagram with the active quadrant highlighted.
// topLeft/topRight/bottomLeft/bottomRight each: { label, color, bg }
function FrameworkDiagram({ title, xLabel, yLabel, topLeft, topRight, bottomLeft, bottomRight, activeLabel }) {
  const cells = [topLeft, topRight, bottomLeft, bottomRight];

  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 8 }}>{title}</p>
      <div style={{ display: 'flex', gap: 6 }}>

        {/* Y-axis label */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 30, paddingBottom: 20 }}>
          <span style={{ fontSize: 9, color: '#9ca3af', textAlign: 'right', lineHeight: 1.2 }}>High<br />{yLabel}</span>
          <span style={{ fontSize: 9, color: '#9ca3af', textAlign: 'right', lineHeight: 1.2 }}>Low<br />{yLabel}</span>
        </div>

        <div style={{ flex: 1 }}>
          {/* 2×2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            {cells.map((cell) => {
              const isActive = cell.label === activeLabel;
              return (
                <div
                  key={cell.label}
                  style={{
                    backgroundColor: isActive ? cell.bg : '#f9fafb',
                    border: `${isActive ? 2 : 1}px solid ${isActive ? cell.color : '#e5e7eb'}`,
                    borderRadius: 6,
                    padding: '7px 9px',
                    minHeight: 56,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{
                    fontSize: 10,
                    lineHeight: 1.3,
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? cell.color : '#d1d5db',
                  }}>
                    {cell.label}
                  </span>
                  {/* "You are here" dot */}
                  {isActive && (
                    <span style={{
                      display: 'block', width: 7, height: 7,
                      borderRadius: '50%', backgroundColor: cell.color,
                      alignSelf: 'flex-end', marginTop: 4,
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* X-axis label */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: '#9ca3af' }}>Low</span>
            <span style={{ fontSize: 9, color: '#9ca3af' }}>{xLabel}</span>
            <span style={{ fontSize: 9, color: '#9ca3af' }}>High</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Horizontal progress bar used in the relative performance section
function RelativeBar({ label, score, color }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-gray-500 w-28 shrink-0 truncate">{label}</p>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs font-semibold text-gray-700 w-8 text-right">{score}</p>
    </div>
  );
}

export default function CategoryDetail({ category, allData, onBack, penThreshold = 25, covThreshold = 25, weights }) {
  const tier = getTier(category.tier);

  // Per-dimension score breakdown — shows exactly why this category ranks where it does.
  // For each active scoring dimension: value, portfolio rank (1=best), weight used.
  const scoreBreakdown = useMemo(() => {
    const w = weights ?? DEFAULT_WEIGHTS;
    return WEIGHT_COLUMNS
      .filter(wCol => (w[wCol.id] ?? 0) > 0)
      .map(wCol => {
        const weight = w[wCol.id];
        const myVal  = getWeightVal(category, wCol);
        const allVals = allData
          .map(d => getWeightVal(d, wCol))
          .filter(v => v != null)
          .sort((a, b) => b - a); // descending: rank 1 = highest value

        if (myVal == null || !allVals.length) {
          return { label: wCol.label, value: null, rank: null, total: allVals.length, weight, normRank: 0 };
        }

        // Rank uses same tied-rank logic as computeScoring
        let rank = 1;
        for (let i = 0; i < allVals.length; i++) {
          if (i > 0 && allVals[i] < allVals[i - 1]) rank = i + 1;
          if (allVals[i] <= myVal) break;
        }
        // Normalise rank to 0-100 bar (100 = rank 1, 0 = last)
        const normRank = allVals.length > 1
          ? Math.round((1 - (rank - 1) / (allVals.length - 1)) * 100)
          : 100;

        return { label: wCol.label, value: myVal, rank, total: allVals.length, weight, normRank };
      });
  }, [category, allData, weights]);

  // Quadrant classifications (use the same thresholds as Page 1 and the Data Table)
  const f1q = category.penetration != null && category.coverage != null
    ? getPenCovQuadrant(category.penetration, category.coverage, penThreshold, covThreshold) : null;
  const f2q = category.mbOutpaceMms != null && category.mmsOutpaceMarket != null
    ? getGrowthQuadrant(category.mbOutpaceMms, category.mmsOutpaceMarket) : null;
  // MB GP% - NB GP% computed directly from margin fields (avoids relying on a potentially misaligned data column)
  const mbVsNbGpDiff = category.mbGpMargin != null && category.mmsGpMargin != null
    ? category.mbGpMargin - category.mmsGpMargin : null;

  // NB Sales: use uploaded "NB sales $" column directly when available (same $m normalisation as totalMarket)
  // Fall back to: Total Market × Market Share − MB Sales
  const nbSalesDollars = (() => {
    if (category.nbSales != null) {
      return category.nbSales >= 1_000_000 ? category.nbSales : category.nbSales * 1_000_000;
    }
    const mktDollars = category.totalMarket != null
      ? (category.totalMarket >= 1_000_000 ? category.totalMarket : category.totalMarket * 1_000_000)
      : null;
    const mms = mktDollars != null && category.marketShare != null
      ? mktDollars * (category.marketShare / 100) : null;
    return mms != null && category.revenue != null ? Math.max(0, mms - category.revenue) : null;
  })();
  // MMS Sales = MB Sales + NB Sales
  const mmsSalesDollars = category.revenue != null && nbSalesDollars != null
    ? category.revenue + nbSalesDollars : null;

  // Radar chart — 6 dimensions normalised within the portfolio
  const radarDimensions = [
    { key: 'mbGpMargin',   label: 'MB Margin'   },
    { key: 'penetration',  label: 'Penetration'  },
    { key: 'coverage',     label: 'Coverage'     },
    { key: 'marketGrowth', label: 'Mkt Growth'   },
    { key: 'marketShare',  label: 'Mkt Share'    },
    { key: 'mbGrowth',     label: 'MB Growth'    },
  ];

  const radarData = radarDimensions.map(({ key, label }) => {
    const vals = allData.map(d => d[key]).filter(v => v != null && !isNaN(v));
    const min = vals.length ? Math.min(...vals) : 0;
    const max = vals.length ? Math.max(...vals) : 100;
    const score = Math.round(normalize(category[key], min, max));
    return { subject: label, score, fullMark: 100 };
  });

  // Portfolio rank context
  const totalCategories = allData.length;
  const rank = category._rank;

  // Relative performance bars (same dimensions as radar)
  const relativePerf = radarData.map(d => ({
    label: d.subject,
    score: d.score,
    color: d.score >= 66 ? '#059669' : d.score >= 33 ? '#d97706' : '#dc2626',
  }));

  return (
    <div className="space-y-5">

      {/* ── Back button + header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800
            transition-colors self-start px-3 py-1.5 rounded-lg hover:bg-gray-100 border border-gray-200"
        >
          <ArrowLeft size={15} />
          Back to Data Table
        </button>

        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{category.category}</h2>
            <p className="text-sm text-gray-400 mt-0.5">Level 2 Category — Full Profile</p>
          </div>

          {/* Tier + rank chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-3 py-1 rounded-full text-sm font-bold border"
              style={{ backgroundColor: tier.bg, color: tier.color, borderColor: tier.border }}
            >
              {tier.label} — {tier.desc}
            </span>
            {rank != null && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: tier.color }}
                >
                  {rank}
                </span>
                of {totalCategories}
              </span>
            )}
            {category._score != null && (
              <span className="px-3 py-1 rounded-full text-sm font-mono bg-gray-50 text-gray-500 border border-gray-200">
                Score {category._score.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT — metric sections (spans 2 cols) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Financial Performance */}
          <Section title="Financial Performance">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricTile
                label="MB GP$"
                value={formatCurrency(category.mbGpDollars, true)}
                color="#0066CC" bg="#e6f0ff"
              />
              <MetricTile
                label="MB GP%"
                value={formatPercent(category.mbGpMargin)}
                color="#7c3aed" bg="#f5f3ff"
              />
              <MetricTile
                label="MB Sales$"
                value={formatCurrency(category.revenue, true)}
                color="#0891b2" bg="#ecfeff"
              />
              <MetricTile
                label="NB GP$"
                value={formatCurrency(category.mmsGpDollars, true)}
                color="#059669" bg="#ecfdf5"
              />
              <MetricTile
                label="NB GP%"
                value={formatPercent(category.mmsGpMargin)}
                color="#059669" bg="#ecfdf5"
              />
              <MetricTile
                label="MMS Sales$"
                value={formatCurrency(mmsSalesDollars, true)}
                sub="Total Market × Market Share"
                color="#059669" bg="#ecfdf5"
              />
              <MetricTile
                label="NB Sales$"
                value={formatCurrency(nbSalesDollars, true)}
                sub="MMS Sales − MB Sales"
                color="#0891b2" bg="#ecfeff"
              />
              <MetricTile
                label="MB GP higher than NB GP"
                value={formatPercent(mbVsNbGpDiff)}
                sub="MB GP% − NB GP%"
                color="#4f46e5" bg="#eef2ff"
              />
            </div>
          </Section>

          {/* Market Position */}
          <Section title="Market Position">
            <div className="grid grid-cols-3 gap-3">
              <MetricTile
                label="Total Market"
                value={
                  category.totalMarket != null
                    ? category.totalMarket >= 1_000_000
                      ? formatCurrency(category.totalMarket, true)   // uploaded: stored as raw dollars
                      : `$${category.totalMarket}M`                  // sample: stored as millions
                    : '—'
                }
                sub="addressable market size"
                color="#0066CC" bg="#e6f0ff"
              />
              <MetricTile
                label="Market Growth"
                value={formatPercent(category.marketGrowth)}
                trend={category.marketGrowth}
                color={category.marketGrowth >= 5 ? '#059669' : category.marketGrowth >= 0 ? '#d97706' : '#dc2626'}
                bg={category.marketGrowth >= 5 ? '#ecfdf5' : category.marketGrowth >= 0 ? '#fffbeb' : '#fef2f2'}
              />
              <MetricTile
                label="MMS Market Share"
                value={formatPercent(category.marketShare)}
                color="#7c3aed" bg="#f5f3ff"
              />
            </div>
          </Section>

          {/* Distribution */}
          <Section title="Distribution">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <MetricTile
                label="Penetration"
                value={formatPercent(category.penetration, 0)}
                sub="% of accounts selling MB"
                color="#0066CC" bg="#e6f0ff"
              />
              <MetricTile
                label="Coverage"
                value={formatPercent(category.coverage, 0)}
                sub="% of SKUs listed"
                color="#0891b2" bg="#ecfeff"
              />
            </div>
            {/* Penetration & Coverage bars */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-24 shrink-0">Penetration</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full"
                    style={{ width: `${Math.min(100, category.penetration ?? 0)}%`, backgroundColor: '#0066CC' }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-10 text-right">
                  {formatPercent(category.penetration, 0)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-24 shrink-0">Coverage</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full"
                    style={{ width: `${Math.min(100, category.coverage ?? 0)}%`, backgroundColor: '#0891b2' }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-10 text-right">
                  {formatPercent(category.coverage, 0)}
                </span>
              </div>
            </div>
          </Section>

          {/* Growth Dynamics */}
          <Section title="Growth Dynamics">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricTile
                label="MB Growth"
                value={formatPercent(category.mbGrowth)}
                trend={category.mbGrowth}
                color={category.mbGrowth > 0 ? '#059669' : '#dc2626'}
                bg={category.mbGrowth > 0 ? '#ecfdf5' : '#fef2f2'}
              />
              <MetricTile
                label="NB Growth"
                value={formatPercent(category.mmsGrowth)}
                trend={category.mmsGrowth}
                color={category.mmsGrowth > 0 ? '#059669' : '#dc2626'}
                bg={category.mmsGrowth > 0 ? '#ecfdf5' : '#fef2f2'}
              />
              <MetricTile
                label="Market Growth"
                value={formatPercent(category.marketGrowth)}
                trend={category.marketGrowth}
                color={category.marketGrowth > 0 ? '#0891b2' : '#dc2626'}
                bg={category.marketGrowth > 0 ? '#ecfeff' : '#fef2f2'}
              />
              <MetricTile
                label="MB outpace NB %"
                value={formatPercent(category.mbOutpaceMms)}
                sub="MB growth − NB growth"
                trend={category.mbOutpaceMms}
                color={category.mbOutpaceMms >= 0 ? '#059669' : '#dc2626'}
                bg={category.mbOutpaceMms >= 0 ? '#ecfdf5' : '#fef2f2'}
              />
              <MetricTile
                label="NB outpace Non-PL market"
                value={formatPercent(category.mmsOutpaceMarket)}
                sub="NB growth − Non-PL market growth"
                trend={category.mmsOutpaceMarket}
                color={category.mmsOutpaceMarket >= 0 ? '#059669' : '#dc2626'}
                bg={category.mmsOutpaceMarket >= 0 ? '#ecfdf5' : '#fef2f2'}
              />
            </div>
          </Section>
        </div>

        {/* RIGHT — radar + strategic quadrants */}
        <div className="space-y-5">

          {/* Relative Performance radar */}
          <Section title="Portfolio Relative Performance">
            <p className="text-xs text-gray-400 mb-3">
              6 key metrics normalised 0–100 within the portfolio. Full score breakdown below.
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#0066CC"
                    fill="#0066CC"
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                  <RechartsTooltip
                    formatter={(v) => [`${v} / 100`, 'Portfolio Score']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Score breakdown — all active scoring dimensions with actual rank */}
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Score Breakdown — why this rank?
              </p>
              <p className="text-xs text-gray-400 mb-2">
                Bar fills right = ranked 1st. #rank/total × weight shows each dimension's contribution.
              </p>
              <div className="space-y-1.5">
                {scoreBreakdown.map(({ label, rank, total, weight, normRank }) => (
                  <div key={label} className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 w-32 shrink-0 truncate">{label}</p>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: rank != null ? `${normRank}%` : '0%',
                          backgroundColor: normRank >= 66 ? '#059669' : normRank >= 33 ? '#d97706' : '#dc2626',
                        }}
                      />
                    </div>
                    <p className="text-xs font-mono text-gray-700 w-12 text-right shrink-0">
                      {rank != null ? `#${rank}/${total}` : '—'}
                    </p>
                    <p className="text-xs text-gray-400 w-6 text-right shrink-0">×{weight}</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Strategic Quadrants */}
          <Section title="Strategic Classification">
            <div className="space-y-6">

              {/* Framework 1 — Penetration × Coverage */}
              <FrameworkDiagram
                title="Framework 1 — Penetration × Coverage"
                yLabel="Pen"
                xLabel="Coverage"
                activeLabel={f1q?.label}
                topLeft={{    label: 'Selective Winner',   color: '#1d4ed8', bg: '#dbeafe' }}
                topRight={{   label: 'Assortment Leader',  color: '#0066CC', bg: '#dbeafe' }}
                bottomLeft={{  label: 'Untapped Potential', color: '#6b7280', bg: '#f3f4f6' }}
                bottomRight={{ label: 'Reassessment',       color: '#3b82f6', bg: '#eff6ff' }}
              />

              <div className="border-t border-gray-100" />

              {/* Framework 2 — MB outpace NB × NB outpace Non-PL market */}
              <FrameworkDiagram
                title="Framework 2 — Growth Dynamics"
                yLabel="MB vs NB"
                xLabel="NB vs Non-PL Market"
                activeLabel={f2q?.label}
                topLeft={{    label: 'McKesson Brands Champions', color: '#3b82f6', bg: '#eff6ff' }}
                topRight={{   label: 'Strategy Star',             color: '#1d4ed8', bg: '#dbeafe' }}
                bottomLeft={{  label: 'Evaluation Candidates',    color: '#6b7280', bg: '#f3f4f6' }}
                bottomRight={{ label: 'Opportunity Gap',          color: '#3b82f6', bg: '#eff6ff' }}
              />

            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

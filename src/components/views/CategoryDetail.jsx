// Category Detail page — shown when a user clicks a category in the Data Table.
// Displays every metric for a single category, organized into sections with visual indicators.

import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts';
import {
  formatCurrency, formatPercent, getTier,
  getPenCovQuadrant, getGrowthQuadrant, getQuadrant,
} from '../../utils/formatters';

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

export default function CategoryDetail({ category, allData, onBack }) {
  const tier = getTier(category.tier);

  // Quadrant classifications
  const f1q = category.penetration != null && category.coverage != null
    ? getPenCovQuadrant(category.penetration, category.coverage) : null;
  const f2q = category.mbOutpaceMms != null && category.mmsOutpaceMarket != null
    ? getGrowthQuadrant(category.mbOutpaceMms, category.mmsOutpaceMarket) : null;
  const bcgq = category.marketGrowth != null && category.marketShare != null
    ? getQuadrant(category.marketGrowth, category.marketShare) : null;

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

  // Bar chart — side-by-side MB vs MMS GP$
  const gpComparisonData = [
    { name: 'MB GP$',  value: category.mbGpDollars  ?? 0, fill: '#0066CC' },
    { name: 'MMS GP$', value: category.mmsGpDollars ?? 0, fill: '#059669' },
  ];

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
                label="MMS GP$"
                value={formatCurrency(category.mmsGpDollars, true)}
                color="#059669" bg="#ecfdf5"
              />
              <MetricTile
                label="MMS GP%"
                value={formatPercent(category.mmsGpMargin)}
                color="#059669" bg="#ecfdf5"
              />
              <MetricTile
                label="MB GP > MMS GP"
                value={formatPercent(category.mbVsMmsGp)}
                sub="MB margin advantage"
                color="#4f46e5" bg="#eef2ff"
              />
            </div>

            {/* GP comparison bar chart */}
            {(category.mbGpDollars != null || category.mmsGpDollars != null) && (
              <div className="mt-4 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gpComparisonData} layout="vertical"
                    margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={52} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <RechartsTooltip
                      formatter={(v) => formatCurrency(v, true)}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                      {gpComparisonData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
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
                label="MMS Growth"
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
                label="MB outpace MMS"
                value={formatPercent(category.mbOutpaceMms)}
                sub="MB growth − MMS growth"
                trend={category.mbOutpaceMms}
                color={category.mbOutpaceMms >= 0 ? '#059669' : '#dc2626'}
                bg={category.mbOutpaceMms >= 0 ? '#ecfdf5' : '#fef2f2'}
              />
              <MetricTile
                label="MMS outpace Market"
                value={formatPercent(category.mmsOutpaceMarket)}
                sub="MMS growth − Mkt growth"
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
              How this category ranks across key metrics within the portfolio (0 = lowest, 100 = highest).
            </p>
            <div className="h-52">
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

            {/* Bar breakdown */}
            <div className="space-y-2 mt-2">
              {relativePerf.map(({ label, score, color }) => (
                <RelativeBar key={label} label={label} score={score} color={color} />
              ))}
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

              {/* Framework 2 — MB outpace MMS × MMS outpace Market */}
              <FrameworkDiagram
                title="Framework 2 — Growth Dynamics"
                yLabel="MB vs MMS"
                xLabel="MMS vs Market"
                activeLabel={f2q?.label}
                topLeft={{    label: 'McKesson Brands Champions', color: '#3b82f6', bg: '#eff6ff' }}
                topRight={{   label: 'Strategy Star',             color: '#1d4ed8', bg: '#dbeafe' }}
                bottomLeft={{  label: 'Evaluation Candidates',    color: '#6b7280', bg: '#f3f4f6' }}
                bottomRight={{ label: 'Opportunity Gap',          color: '#3b82f6', bg: '#eff6ff' }}
              />

              <div className="border-t border-gray-100" />

              {/* BCG text badge */}
              <QuadrantBadge quadrant={bcgq} label="BCG — Market Growth × Market Share" />

            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

// --- Number formatters ---

export function formatCurrency(value, compact = false) {
  if (value == null) return '—';
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value, decimals = 1) {
  if (value == null) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value, compact = false) {
  if (value == null) return '—';
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000)     return `${(value / 1_000).toFixed(0)}K`;
    return value.toFixed(0);
  }
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

// --- Tier config (Tier 1 = highest priority, Tier 4 = lowest) ---
// McKesson brand blue anchors Tier 1

export const TIER_CONFIG = {
  1: { label: 'Tier 1', color: '#0066CC', bg: '#e6f0ff', border: '#b3d1ff', desc: 'Invest & Grow'           },
  2: { label: 'Tier 2', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', desc: 'Grow Selectively'        },
  3: { label: 'Tier 3', color: '#d97706', bg: '#fffbeb', border: '#fcd34d', desc: 'Maintain'                },
  4: { label: 'Tier 4', color: '#6b7280', bg: '#f9fafb', border: '#d1d5db', desc: 'Monitor / Rationalize'   },
};

export function getTier(tier) {
  return TIER_CONFIG[tier] ?? TIER_CONFIG[4];
}

// --- Strategic Matrix quadrant helpers (BCG-style) ---
// Still used to label quadrant regions on the chart

export function getQuadrant(marketGrowth, marketShare, avgGrowth = 5, avgShare = 1.0) {
  const highGrowth = marketGrowth >= avgGrowth;
  const highShare  = marketShare  >= avgShare;
  if  (highGrowth &&  highShare) return { label: 'Stars',          color: '#2563eb', bg: '#eff6ff' };
  if  (highGrowth && !highShare) return { label: 'Question Marks', color: '#d97706', bg: '#fffbeb' };
  if (!highGrowth &&  highShare) return { label: 'Cash Cows',      color: '#16a34a', bg: '#f0fdf4' };
  return                                { label: 'Dogs',           color: '#dc2626', bg: '#fef2f2' };
}

// --- Portfolio Map penetration/coverage quadrant labels ---

export function getPenCovQuadrant(penetration, coverage) {
  const highPen = penetration >= 25;
  const highCov = coverage   >= 25;
  if  (highPen &&  highCov) return { label: 'Assortment Leader',        color: '#0066CC', bg: '#dbeafe' };
  if  (highPen && !highCov) return { label: 'Selective Winner',         color: '#1d4ed8', bg: '#dbeafe' };
  if (!highPen &&  highCov) return { label: 'Reassessment',             color: '#3b82f6', bg: '#eff6ff' };
  return                           { label: 'Untapped Potential',       color: '#6b7280', bg: '#f3f4f6' };
}

// Framework 2 quadrant — x=0 and y=0 thresholds
export function getGrowthQuadrant(mbOutpaceMms, mmsOutpaceMarket) {
  const highMb  = mbOutpaceMms     >= 0;
  const highMms = mmsOutpaceMarket >= 0;
  if  (highMb &&  highMms) return { label: 'Strategy Star',             color: '#1d4ed8', bg: '#dbeafe' };
  if  (highMb && !highMms) return { label: 'MB Champions',              color: '#3b82f6', bg: '#eff6ff' };
  if (!highMb &&  highMms) return { label: 'Opportunity Gap',           color: '#3b82f6', bg: '#eff6ff' };
  return                          { label: 'Evaluation Candidates',     color: '#6b7280', bg: '#f3f4f6' };
}

// Chart color palette (fallback when not using tier colors)
export const CHART_COLORS = [
  '#0066CC', '#059669', '#d97706', '#6b7280',
  '#7c3aed', '#0891b2', '#ea580c', '#4f46e5',
  '#16a34a', '#b45309', '#6d28d9', '#0369a1',
];

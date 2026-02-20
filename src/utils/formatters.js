export function formatCurrency(value, compact = false) {
  if (value == null) return '—';
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value, decimals = 1) {
  if (value == null) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value, compact = false) {
  if (value == null) return '—';
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toFixed(0);
  }
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

// Quadrant classification for Strategic Matrix (BCG-style)
export function getQuadrant(marketGrowth, marketShare, avgGrowth = 5, avgShare = 1.0) {
  const highGrowth = marketGrowth >= avgGrowth;
  const highShare = marketShare >= avgShare;
  if (highGrowth && highShare) return { label: 'Stars', color: '#2563eb', bg: '#eff6ff' };
  if (highGrowth && !highShare) return { label: 'Question Marks', color: '#d97706', bg: '#fffbeb' };
  if (!highGrowth && highShare) return { label: 'Cash Cows', color: '#16a34a', bg: '#f0fdf4' };
  return { label: 'Dogs', color: '#dc2626', bg: '#fef2f2' };
}

// Quadrant classification for Portfolio Map (GE/McKinsey-style)
export function getPortfolioQuadrant(attractiveness, position) {
  const high = 67;
  const low = 33;
  if (attractiveness >= high && position >= high) return { label: 'Invest/Grow', color: '#2563eb' };
  if (attractiveness >= high && position >= low) return { label: 'Selective Growth', color: '#7c3aed' };
  if (attractiveness >= high && position < low) return { label: 'Selectivity', color: '#d97706' };
  if (attractiveness >= low && position >= high) return { label: 'Selective Growth', color: '#7c3aed' };
  if (attractiveness >= low && position >= low) return { label: 'Selectivity', color: '#d97706' };
  if (attractiveness >= low && position < low) return { label: 'Harvest/Divest', color: '#dc2626' };
  if (attractiveness < low && position >= high) return { label: 'Selectivity', color: '#d97706' };
  return { label: 'Harvest/Divest', color: '#dc2626' };
}

export const CHART_COLORS = [
  '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#ea580c', '#4f46e5', '#059669', '#b45309',
  '#6d28d9', '#0369a1',
];

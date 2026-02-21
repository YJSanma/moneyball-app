import { useState, useMemo } from 'react';
import {
  BarChart2, ScatterChart, Map, Table2,
  Upload, ChevronRight, TrendingUp, Database, X, Menu,
} from 'lucide-react';
import FileUpload from './components/FileUpload';
import StrategicMatrix from './components/views/StrategicMatrix';
import PortfolioMap    from './components/views/PortfolioMap';
import GPRanking       from './components/views/GPRanking';
import DataTable       from './components/views/DataTable';
import CategoryDetail  from './components/views/CategoryDetail';
import { SAMPLE_DATA }   from './utils/sampleData';
import { formatCurrency, formatPercent, getTier, TIER_CONFIG } from './utils/formatters';
import { computeScoring, DEFAULT_WEIGHTS } from './utils/scoring';

const VIEWS = [
  { id: 'portfolio', label: 'Coverage and Penetration', shortLabel: 'Coverage', icon: Map,          component: PortfolioMap    },
  { id: 'strategic', label: 'Growth Assessment',        shortLabel: 'Growth',   icon: ScatterChart, component: StrategicMatrix },
  { id: 'gp',        label: 'Visualization',             shortLabel: 'Viz',      icon: BarChart2,    component: GPRanking       },
  { id: 'table',     label: 'Data Table',               shortLabel: 'Table',    icon: Table2,       component: DataTable       },
];

export default function App() {
  const [data,           setData]           = useState(SAMPLE_DATA);
  const [dataSource,     setDataSource]     = useState('Sample Data');
  const [activeView,     setActiveView]     = useState('portfolio');
  // When the user changes tabs, clear any open category detail page
  const handleSetActiveView = (id) => { setActiveView(id); setSelectedCategory(null); };
  const [showUpload,     setShowUpload]     = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [weights,        setWeights]        = useState(DEFAULT_WEIGHTS);
  const [penThreshold,   setPenThreshold]   = useState(5);
  const [covThreshold,   setCovThreshold]   = useState(35);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Apply weighted scoring once; all views receive the same scored data with overridden tiers.
  // Re-attach _detectedHeaders from the original array — computeScoring returns a new array
  // so array-level properties like _detectedHeaders would otherwise be lost.
  const scoredData = useMemo(() => {
    const result = computeScoring(data, weights);
    if (result && data?._detectedHeaders) result._detectedHeaders = data._detectedHeaders;
    return result;
  }, [data, weights]);

  const handleDataLoaded = (rows, source) => {
    setData(rows);
    setDataSource(source);
    setShowUpload(false);
    setActiveView('portfolio');
    setSelectedCategory(null);
  };

  const handleLoadSample = () => {
    setData(SAMPLE_DATA);
    setDataSource('Sample Data');
    setShowUpload(false);
    setActiveView('portfolio');
    setSelectedCategory(null);
  };

  // KPI calculations — use scoredData so tier counts reflect computed tiers
  const totalMbSales = scoredData?.reduce((s, d) => s + (d.revenue     || 0), 0) ?? 0;
  const totalMbGP    = scoredData?.reduce((s, d) => s + (d.mbGpDollars || 0), 0) ?? 0;

  // Card 3: true portfolio GP% = total GP$ / total Sales$ (not an average of individual margins)
  const portfolioMbGpPct = totalMbSales > 0 ? (totalMbGP / totalMbSales * 100) : null;

  // NB GP%: NB Sales = MMS Sales − MB Sales (MMS Sales = Total Market × Market Share)
  const totalNbGp      = scoredData?.reduce((s, d) => s + (d.mmsGpDollars || 0), 0) ?? 0;
  const totalMmsSales  = scoredData?.reduce((s, d) => {
    if (d.totalMarket == null || d.marketShare == null) return s;
    const mktDollars = d.totalMarket >= 1_000_000 ? d.totalMarket : d.totalMarket * 1_000_000;
    return s + mktDollars * (d.marketShare / 100);
  }, 0) ?? 0;
  const totalNbSales   = Math.max(0, totalMmsSales - totalMbSales);
  const portfolioNbGpPct = totalNbSales > 0 ? (totalNbGp / totalNbSales * 100) : null;

  // Card 4: penetration = total MB Sales$ / total Market$ (true market penetration rate)
  // Sample data stores totalMarket in millions; uploaded data stores as actual dollars — normalise via threshold
  const totalMarketDollars = scoredData?.reduce((s, d) => {
    if (d.totalMarket == null) return s;
    return s + (d.totalMarket >= 1_000_000 ? d.totalMarket : d.totalMarket * 1_000_000);
  }, 0) ?? 0;
  const portfolioPenetration = totalMarketDollars > 0 ? (totalMbSales / totalMarketDollars * 100) : null;

  // Coverage: mean across all categories
  const withCov    = scoredData?.filter((d) => d.coverage != null) ?? [];
  const avgCoverage = withCov.length ? withCov.reduce((s, d) => s + d.coverage, 0) / withCov.length : null;

  const ActiveComponent = VIEWS.find((v) => v.id === activeView)?.component;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ backgroundColor: '#0066CC' }}>
                <TrendingUp size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">Moneyball</h1>
                <p className="text-xs text-gray-400 leading-tight hidden sm:block">
                  McKesson Brands — Category Prioritization
                </p>
              </div>
            </div>

            {/* Desktop nav tabs */}
            {data && (
              <nav className="hidden md:flex items-center gap-1">
                {VIEWS.map((view) => {
                  const Icon = view.icon;
                  return (
                    <button
                      key={view.id}
                      onClick={() => handleSetActiveView(view.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      style={
                        activeView === view.id
                          ? { backgroundColor: '#0066CC', color: '#ffffff' }
                          : { color: '#4b5563' }
                      }
                      onMouseEnter={(e) => {
                        if (activeView !== view.id) e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }}
                      onMouseLeave={(e) => {
                        if (activeView !== view.id) e.currentTarget.style.backgroundColor = '';
                      }}
                    >
                      <Icon size={15} />
                      {view.label}
                    </button>
                  );
                })}
              </nav>
            )}

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {data && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-500">
                  <Database size={12} />
                  <span className="truncate max-w-[180px]">{dataSource}</span>
                </div>
              )}
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border"
                style={
                  showUpload
                    ? { backgroundColor: '#0066CC', color: '#ffffff', borderColor: '#0066CC' }
                    : { backgroundColor: '#e6f0ff', color: '#0066CC', borderColor: '#b3d1ff' }
                }
              >
                <Upload size={14} />
                <span className="hidden sm:inline">{data ? 'Change Data' : 'Load Data'}</span>
              </button>
              {data && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {data && mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              {VIEWS.map((view) => {
                const Icon = view.icon;
                return (
                  <button key={view.id}
                    onClick={() => { handleSetActiveView(view.id); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={
                      activeView === view.id
                        ? { backgroundColor: '#0066CC', color: '#ffffff' }
                        : { color: '#4b5563', backgroundColor: '#f9fafb' }
                    }
                  >
                    <Icon size={15} />
                    {view.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* ── Upload panel ── */}
      {showUpload && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
            <div className="max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800">Load Data</h2>
                <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <FileUpload onDataLoaded={handleDataLoaded} onLoadSample={handleLoadSample} />
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6">
        {!data ? (
          /* Welcome screen */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ backgroundColor: '#e6f0ff' }}>
              <TrendingUp size={32} style={{ color: '#0066CC' }} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Moneyball</h2>
            <p className="text-gray-500 mb-1 max-w-md">
              McKesson Brands product category prioritization dashboard.
            </p>
            <p className="text-gray-400 text-sm mb-8 max-w-md">
              Upload your data file or load the built-in 57-category sample to explore
              strategic positioning, portfolio performance, and GP rankings.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-6 py-3 text-white rounded-xl font-semibold shadow-sm transition-colors"
                style={{ backgroundColor: '#0066CC' }}
              >
                <Upload size={18} />
                Upload Data File
              </button>
              <button
                onClick={handleLoadSample}
                className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl font-semibold
                  hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
              >
                <Database size={18} />
                Load Sample Data (57 categories)
                <ChevronRight size={16} className="text-gray-400" />
              </button>
            </div>

            {/* View preview cards */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl w-full">
              {VIEWS.map((view) => {
                const Icon = view.icon;
                return (
                  <div key={view.id} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2"
                      style={{ backgroundColor: '#e6f0ff' }}>
                      <Icon size={18} style={{ color: '#0066CC' }} />
                    </div>
                    <p className="text-xs font-medium text-gray-700">{view.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* KPI bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <KPICard label="Total MB Sales" value={totalMbSales > 0 ? formatCurrency(totalMbSales, true) : '—'}
                sub={`${data.length} categories`} color="#0066CC" bg="#e6f0ff" />
              <KPICard label="MB GP$" value={formatCurrency(totalMbGP, true)}
                sub="McKesson Brands GP"   color="#059669" bg="#ecfdf5" />
              <DualKPICard
                label="GP Margin"
                label1="MB GP%" val1={portfolioMbGpPct != null ? formatPercent(portfolioMbGpPct) : '—'}
                label2="NB GP%" val2={portfolioNbGpPct  != null ? formatPercent(portfolioNbGpPct)  : '—'}
                color="#7c3aed" bg="#f5f3ff"
              />
              <DualKPICard
                label="Portfolio Reach"
                label1="Coverage" val1={portfolioPenetration != null ? formatPercent(portfolioPenetration, 1) : '—'}
                label2="Penetration" val2={avgCoverage != null ? formatPercent(avgCoverage, 0) : '—'}
                color="#d97706" bg="#fffbeb"
              />
            </div>

            {/* Tier breakdown pills — reflect computed tiers from scoring */}
            <div className="flex flex-wrap gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((tier) => {
                const t     = getTier(tier);
                const count = scoredData.filter((d) => d.tier === tier).length;
                return (
                  <div key={tier}
                    className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border"
                    style={{ backgroundColor: t.bg, color: t.color, borderColor: t.border }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.label} — {t.desc}
                    <span className="font-bold">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Active view — all views receive the same scored data with overridden tiers */}
            {ActiveComponent && (
              selectedCategory ? (
                <CategoryDetail
                  category={selectedCategory}
                  allData={scoredData}
                  onBack={() => setSelectedCategory(null)}
                  penThreshold={penThreshold}
                  covThreshold={covThreshold}
                  weights={weights}
                />
              ) : activeView === 'table'
                ? <DataTable
                    data={scoredData}
                    weights={weights}
                    setWeights={setWeights}
                    onCategoryClick={setSelectedCategory}
                    penThreshold={penThreshold}
                    covThreshold={covThreshold}
                  />
                : activeView === 'portfolio'
                  ? <PortfolioMap
                      data={scoredData}
                      penThreshold={penThreshold}
                      covThreshold={covThreshold}
                      setPenThreshold={setPenThreshold}
                      setCovThreshold={setCovThreshold}
                    />
                  : <ActiveComponent data={scoredData} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-gray-400">Moneyball — McKesson Brands Category Prioritization</p>
          <p className="text-xs text-gray-400">
            Built {new Date(__BUILD_TIME__).toLocaleString('en-AU', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
            })}
          </p>
        </div>
      </footer>
    </div>
  );
}

function KPICard({ label, value, sub, color, bg }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: bg, borderColor: color + '30' }}>
      <p className="text-xs font-medium mb-1" style={{ color: color + 'aa' }}>{label}</p>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: color + '88' }}>{sub}</p>}
    </div>
  );
}

// Two side-by-side metrics in one card
function DualKPICard({ label, val1, label1, val2, label2, color, bg }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: bg, borderColor: color + '30' }}>
      <p className="text-xs font-medium mb-2" style={{ color: color + 'aa' }}>{label}</p>
      <div className="flex gap-3">
        <div className="flex-1">
          <p className="text-[10px] mb-0.5" style={{ color: color + '88' }}>{label1}</p>
          <p className="text-xl font-bold" style={{ color }}>{val1}</p>
        </div>
        <div className="flex-1 border-l pl-3" style={{ borderColor: color + '30' }}>
          <p className="text-[10px] mb-0.5" style={{ color: color + '88' }}>{label2}</p>
          <p className="text-xl font-bold" style={{ color }}>{val2}</p>
        </div>
      </div>
    </div>
  );
}

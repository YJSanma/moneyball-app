import { useState } from 'react';
import {
  BarChart2,
  ScatterChart,
  Map,
  Table2,
  Upload,
  ChevronRight,
  TrendingUp,
  Database,
  X,
  Menu,
} from 'lucide-react';
import FileUpload from './components/FileUpload';
import StrategicMatrix from './components/views/StrategicMatrix';
import PortfolioMap from './components/views/PortfolioMap';
import GPRanking from './components/views/GPRanking';
import DataTable from './components/views/DataTable';
import { SAMPLE_DATA } from './utils/sampleData';
import { formatCurrency, formatPercent } from './utils/formatters';

const VIEWS = [
  {
    id: 'strategic',
    label: 'Strategic Matrix',
    shortLabel: 'Strategic',
    icon: ScatterChart,
    component: StrategicMatrix,
  },
  {
    id: 'portfolio',
    label: 'Portfolio Map',
    shortLabel: 'Portfolio',
    icon: Map,
    component: PortfolioMap,
  },
  {
    id: 'gp',
    label: 'GP Ranking',
    shortLabel: 'GP Rank',
    icon: BarChart2,
    component: GPRanking,
  },
  {
    id: 'table',
    label: 'Data Table',
    shortLabel: 'Table',
    icon: Table2,
    component: DataTable,
  },
];

function KPICard({ label, value, sub, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [dataSource, setDataSource] = useState(null);
  const [activeView, setActiveView] = useState('strategic');
  const [showUpload, setShowUpload] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleDataLoaded = (rows, source) => {
    setData(rows);
    setDataSource(source);
    setShowUpload(false);
    setActiveView('strategic');
  };

  const handleLoadSample = () => {
    setData(SAMPLE_DATA);
    setDataSource('Sample Data (12 categories)');
    setShowUpload(false);
    setActiveView('strategic');
  };

  const totalRevenue = data?.reduce((s, d) => s + (d.revenue || 0), 0) ?? 0;
  const totalGP = data?.reduce((s, d) => s + (d.gpDollars || 0), 0) ?? 0;
  const avgMargin =
    data && data.filter((d) => d.gpMargin != null).length > 0
      ? data.filter((d) => d.gpMargin != null).reduce((s, d) => s + d.gpMargin, 0) /
        data.filter((d) => d.gpMargin != null).length
      : null;
  const topCategory = data
    ? [...data].sort((a, b) => (b.gpDollars || 0) - (a.gpDollars || 0))[0]
    : null;

  const ActiveComponent = VIEWS.find((v) => v.id === activeView)?.component;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Brand */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
                <TrendingUp size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">Moneyball</h1>
                <p className="text-xs text-gray-400 leading-tight hidden sm:block">
                  McKesson Brands — Category Prioritization
                </p>
              </div>
            </div>

            {/* Desktop nav */}
            {data && (
              <nav className="hidden md:flex items-center gap-1">
                {VIEWS.map((view) => {
                  const Icon = view.icon;
                  return (
                    <button
                      key={view.id}
                      onClick={() => setActiveView(view.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        activeView === view.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
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
                  <span className="truncate max-w-[160px]">{dataSource}</span>
                </div>
              )}
              <button
                onClick={() => setShowUpload(!showUpload)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showUpload
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
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
                  <button
                    key={view.id}
                    onClick={() => { setActiveView(view.id); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeView === view.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                    }`}
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

      {/* Upload panel */}
      {showUpload && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
            <div className="max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-800">Load Data</h2>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>
              <FileUpload onDataLoaded={handleDataLoaded} onLoadSample={handleLoadSample} />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6">
        {!data ? (
          /* Welcome / empty state */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
              <TrendingUp size={32} className="text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to Moneyball
            </h2>
            <p className="text-gray-500 mb-1 max-w-md">
              McKesson Brands product category prioritization dashboard.
            </p>
            <p className="text-gray-400 text-sm mb-8 max-w-md">
              Upload your Excel, CSV, or PDF data file to visualize strategic positioning, portfolio performance, and GP rankings.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Upload size={18} />
                Upload Data File
              </button>
              <button
                onClick={handleLoadSample}
                className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm"
              >
                <Database size={18} />
                Load Sample Data
                <ChevronRight size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Feature preview */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl w-full">
              {VIEWS.map((view) => {
                const Icon = view.icon;
                return (
                  <div
                    key={view.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 text-center"
                  >
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Icon size={18} className="text-blue-600" />
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
              <KPICard
                label="Total Revenue"
                value={formatCurrency(totalRevenue, true)}
                sub={`${data.length} categories`}
                color="blue"
              />
              <KPICard
                label="Total GP$"
                value={formatCurrency(totalGP, true)}
                sub="Gross profit dollars"
                color="green"
              />
              <KPICard
                label="Avg GP Margin"
                value={avgMargin != null ? formatPercent(avgMargin) : '—'}
                sub="Portfolio average"
                color="purple"
              />
              <KPICard
                label="Top Category"
                value={topCategory?.category ?? '—'}
                sub={`${formatCurrency(topCategory?.gpDollars, true)} GP$`}
                color="amber"
              />
            </div>

            {/* Active view */}
            {ActiveComponent && <ActiveComponent data={data} />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Moneyball — McKesson Brands Category Prioritization
          </p>
          <p className="text-xs text-gray-400">
            {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

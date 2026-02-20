# Copilot Instructions — Moneyball App

## Project Overview
**Moneyball** is a React dashboard for McKesson Brands product category prioritization. It visualizes 57 product categories across four business intelligence views using BCG/GE-McKinsey matrices and GP ranking analysis.

The app supports multi-format data uploads (Excel, CSV, PDF) with flexible column mapping and outputs four core analytical views.

---

## Architecture

### Data Flow
- **App.jsx** manages central state: `data` (category array), `activeView` (current view), `dataSource` (upload source)
- Each view component (`StrategicMatrix`, `PortfolioMap`, `GPRanking`, `DataTable`) receives raw data and renders independently
- Components filter/transform data via `useMemo` to avoid recalculation on parent re-renders
- No prop drilling beyond App → View; views are responsible for their own state (e.g., tier filters, sort order)

### Data Model
All categories follow this shape (from [sampleData.js](src/utils/sampleData.js)):
```javascript
{
  id,                // numeric ID
  category,          // string name
  tier,              // 1-4 (1=Invest, 4=Monitor/Rationalize)
  mbGpDollars,       // McKesson Brands gross profit dollars
  mbGpMargin,        // McKesson Brands gross profit margin %
  mmsGpDollars,      // McKesson Medical-Surgical gross profit dollars
  penetration,       // % of target accounts actively purchasing
  coverage,          // % of relevant accounts carrying ≥1 SKU
  marketGrowth,      // YoY market growth rate %
  marketShare,       // relative market share (e.g., 1.5 = 1.5x competitor average)
  // + optional fields from uploads: units, attractiveness, compPosition
}
```
Upload parsing normalizes flexible column names via [parsers.js](src/utils/parsers.js) — no strict order required.

### View Components
- **StrategicMatrix** — BCG-style scatter (Market Growth % vs. Relative Market Share); bubbles color-coded by Tier; supports tier filtering
- **PortfolioMap** — GE-McKinsey 9-box (Market Attractiveness vs. Competitive Position); uses `penetration`/`coverage` when attractiveness/position missing
- **GPRanking** — Dual bar charts (MB GP$ and MB GP% ranked); toggleable sort/aggregation by tier
- **DataTable** — Sortable, searchable table with column visibility; CSV download support

All use [Recharts](https://recharts.org/) for charts. See examples in [views/](src/components/views/).

---

## Styling & Branding

- **Theme**: Light/white background (gray-50). No dark mode.
- **Brand Color**: McKesson blue `#0066CC` is the Tier 1 accent and logo background
- **Tier Color Palette** ([formatters.js](src/utils/formatters.js#L23-L27)):
  - Tier 1: Blue `#0066CC` (bg: `#e6f0ff`)
  - Tier 2: Green `#059669` (bg: `#ecfdf5`)
  - Tier 3: Amber `#d97706` (bg: `#fffbeb`)
  - Tier 4: Gray `#6b7280` (bg: `#f9fafb`)
- **CSS Framework**: Tailwind 4 via `@tailwindcss/vite`
- **Icons**: Lucide React (18–24px sizes)

---

## Key Patterns & Conventions

### Formatting Helpers
All numeric display uses [formatters.js](src/utils/formatters.js):
- `formatCurrency(value, compact=false)` → `$X.XM` / `$XXK` / `$X.XX` (compact or full)
- `formatPercent(value, decimals=1)` → `X.X%`
- `formatNumber(value, compact=false)` → `1.2M` / `100K` format

**Always use compact in charts**, full format in tables and tooltips.

### Chart Tooltips
Custom tooltip components receive `{ active, payload }` from Recharts. Always extract payload[0]?.payload for data and use a styled div with border/shadow:
```jsx
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm">
      {/* render d.category, d.mbGpDollars, etc. */}
    </div>
  );
}
```

### Data Filtering & Memoization
Views frequently filter data and calculate aggregates (e.g., averages, totals) in a `useMemo` block to avoid re-renders:
```jsx
const { chartData, avgGrowth, avgShare } = useMemo(() => {
  const valid = data.filter(d => activeTiers.has(d.tier));
  return {
    chartData: valid,
    avgGrowth: valid.reduce((s, d) => s + d.marketGrowth, 0) / valid.length,
    avgShare: /* ... */,
  };
}, [data, activeTiers]);
```

### Tier Filtering UI
Most views include tier toggle buttons (Tier 1–4). Use a `Set` to track active tiers:
```jsx
const [activeTiers, setActiveTiers] = useState(new Set([1, 2, 3, 4]));
const toggleTier = (tier) => {
  setActiveTiers(prev => {
    const next = new Set(prev);
    next.has(tier) ? next.delete(tier) : next.add(tier);
    return next;
  });
};
```

### File Upload Flow
[FileUpload.jsx](src/components/FileUpload.jsx) handles three file types:
1. **Excel/CSV** — parsed immediately via `parseFile()`; result includes `{ data, source }`
2. **PDF** — user selects page range, then parsed with `parseFile(file, { pdfStart, pdfEnd })`
3. **Images** — detected and return special message (informational, not data)

Parser returns normalized data matching the Data Model shape above.

---

## Build & Development

- **Dev server**: `npm run dev` → Vite on `http://localhost:5173`
- **Production build**: `npm run build` → `dist/` folder; chunks vendor/charts/parsers separately for better caching
- **Linting**: `npm run lint` (ESLint); check before commits
- **Preview**: `npm run preview` to test production build locally

No environment variables required. Sample data loads by default; users upload custom datasets via UI.

---

## Integration Points

### External Libraries
- **Recharts** — all charting (ScatterChart, XAxis, Tooltip, etc.); always wrap ResponsiveContainer for responsive sizing
- **XLSX** — Excel parsing in [parsers.js](src/utils/parsers.js)
- **PapaParse** — CSV parsing
- **PDF.js** — PDF text extraction (page range support built in)
- **Tailwind CSS** — all styling (no CSS modules or inline styles except brand colors via `style={}`)

### CSV/Vercel Deployment
- Project is Vercel-ready; no build or env config needed
- Static build artifacts in `dist/`; can deploy via GitHub integration or `vercel --prod` CLI

---

## Common Tasks

### Adding a New Chart View
1. Create [src/components/views/MyView.jsx](src/components/views/) with default export component
2. Import into [App.jsx](src/App.jsx) and add to `VIEWS` array with icon, label, id
3. Receive `data` prop; use `useMemo` to filter by `activeTiers` if needed
4. Wrap chart in `<ResponsiveContainer width="100%" height={400}><YourChart /></ResponsiveContainer>`
5. Use tier colors and custom tooltips per patterns above

### Parsing New File Formats
Extend [src/utils/parsers.js](src/utils/parsers.js):
1. Add parser function that returns `{ data: [...], source: 'Format Name' }`
2. Register in `parseFile()` switch statement
3. Test with sample file in [FileUpload.jsx](src/components/FileUpload.jsx)

### Modifying Data Calculations
- Chart-level calculations (averages, quadrant labels) live in view components via `useMemo`
- Tier definitions and formatting live in [formatters.js](src/utils/formatters.js#L23)
- App-level KPIs (total GP$, avg margin) live in [App.jsx](src/App.jsx#L38-L48)

---

## References
- **Design**: [CLAUDE.md](CLAUDE.md) — brand colors, conventions
- **Data**: [sampleData.js](src/utils/sampleData.js) — 57 sample categories
- **Recharts docs**: https://recharts.org/

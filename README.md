# Moneyball — McKesson Brands Category Prioritization

A professional React dashboard for product category prioritization, powered by Vite and Recharts.

## Features

- **Strategic Matrix** — BCG-style scatter chart (market growth vs. relative market share)
- **Portfolio Map** — GE-McKinsey 9-box matrix (market attractiveness vs. competitive position)
- **GP Ranking** — Dual bar charts for gross profit dollars and margin % with ranked table
- **Data Table** — Sortable, searchable, exportable data table with CSV download
- **File Upload** — Drag & drop support for Excel (.xlsx/.xls), CSV, and PDF files
- **Sample Data** — 12 pre-loaded McKesson Brands product categories

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to Vercel

This project is ready for Vercel. Either:
1. Connect your GitHub repo at [vercel.com](https://vercel.com) and import the project
2. Or use the Vercel CLI: `npx vercel --prod`

No environment variables are required.

## Data Format

Upload Excel, CSV, or PDF files with these columns (flexible naming):

| Column | Description |
|---|---|
| Category | Product category / segment name |
| Revenue | Net sales ($) |
| GP$ | Gross profit dollars |
| GP% | Gross profit margin % |
| Market Growth | YoY market growth rate % |
| Market Share | Relative market share (e.g. 1.5 = 1.5x) |
| Attractiveness | Market attractiveness score (0–100) |
| Comp. Position | Competitive position score (0–100) |
| Units | Unit sales volume |

Missing GP$ or GP% values are derived from each other when possible.

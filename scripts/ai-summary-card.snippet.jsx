// AI Summary card — paste this block into CategoryDetail.jsx
// inside the LEFT column <div className="lg:col-span-2 space-y-5">
// right after the Financial Performance <Section> block, before Market Position.
//
// The summary data lives in src/utils/sampleData.js (all 105 categories have it).
// It is hidden for uploaded data (no summary field) via the {category.summary && ...} guard.

{category.summary && (
  <Section title="AI Summary">
    <p className="text-sm text-gray-700 mb-3 leading-relaxed">{category.summary.headline}</p>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-semibold text-emerald-700 mb-1.5 uppercase tracking-wide">Strengths</p>
        <ul className="space-y-1">
          {category.summary.pros.map((p, i) => (
            <li key={i} className="flex gap-2 text-xs text-gray-600">
              <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>{p}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-semibold text-amber-700 mb-1.5 uppercase tracking-wide">Watch-outs</p>
        <ul className="space-y-1">
          {category.summary.cons.map((c, i) => (
            <li key={i} className="flex gap-2 text-xs text-gray-600">
              <span className="text-amber-500 mt-0.5 shrink-0">▲</span>{c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </Section>
)}

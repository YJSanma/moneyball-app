// Weighted scoring and quartile-based tier assignment
// Used by App.jsx so all views share the same computed tiers.

// Each entry maps a scoring dimension to a parsed field name and raw Excel header aliases.
export const WEIGHT_COLUMNS = [
  { id: 'penetration',      label: 'Penetration',           defaultWeight: 5,  field: 'penetration',      aliases: ['penetration'] },
  { id: 'coverage',         label: 'Coverage',              defaultWeight: 0,  field: 'coverage',         aliases: ['coverage'] },
  { id: 'totalMarket',      label: 'Total Market $m',       defaultWeight: 10, field: 'totalMarket',      aliases: ['total market'] },
  { id: 'marketGrowth',     label: 'Total Market Growth %', defaultWeight: 10, field: 'marketGrowth',     aliases: ['market growth', 'total market growth'] },
  { id: 'marketShare',      label: 'MMS Market Share %',    defaultWeight: 10, field: 'marketShare',      aliases: ['mms market share', 'market share', 'mms share'] },
  { id: 'mmsGpDollars',     label: 'NB GP $m',              defaultWeight: 0,  field: 'mmsGpDollars',     aliases: ['mms gp', 'nb gp'] },
  { id: 'mmsGpMargin',      label: 'NB GP %',               defaultWeight: 0,  field: 'mmsGpMargin',      aliases: ['mms gp %', 'mms gp margin', 'nb gp %', 'nb gp margin'] },
  { id: 'mmsGrowth',        label: 'NB Growth',             defaultWeight: 10, field: 'mmsGrowth',        aliases: ['mms growth', 'nb growth'] },
  { id: 'revenue',          label: 'MB Sales $m',           defaultWeight: 5,  field: 'revenue',          aliases: ['mb sales'] },
  { id: 'mbGpDollars',      label: 'MB GP $m',              defaultWeight: 10, field: 'mbGpDollars',      aliases: ['mb gp $m', 'mb gp dollars'] },
  { id: 'mbGpMargin',       label: 'MB GP %',               defaultWeight: 10, field: 'mbGpMargin',       aliases: ['mb gp %', 'mb gp margin', 'mb margin'] },
  { id: 'mbGrowth',         label: 'MB Growth',             defaultWeight: 10, field: 'mbGrowth',         aliases: ['mb growth'] },
  { id: 'mbOutpaceMms',     label: 'MB outpace NB %',       defaultWeight: 5,  field: 'mbOutpaceMms',     aliases: ['mb outpace mms', 'mb outpace nb'] },
  { id: 'mmsOutpaceMarket', label: 'NB outpace Non-PL market', defaultWeight: 5, field: 'mmsOutpaceMarket', aliases: ['mms outpace market', 'mms outpace', 'nb outpace non-pl', 'nb outpace market', 'nb outpace'] },
  { id: 'mbVsMmsGp',        label: 'MB GP higher than NB GP %', defaultWeight: 10, field: 'mbVsMmsGp',    aliases: ['mb gp higher than mms gp', 'mb gp higher than nb gp', 'mb vs mms gp', 'mb vs nb gp', 'mb gp higher', 'mb higher than mms'] },
];

export const DEFAULT_WEIGHTS = Object.fromEntries(WEIGHT_COLUMNS.map(c => [c.id, c.defaultWeight]));

// Pull a numeric value for a weight column from a data row.
// Tries the parsed internal field first, then searches raw Excel headers by alias.
export function getWeightVal(row, wCol) {
  if (wCol.field != null && row[wCol.field] != null) {
    const n = Number(row[wCol.field]);
    return isNaN(n) ? null : n;
  }
  if (row._raw) {
    const rawKeys = Object.keys(row._raw);
    for (const alias of wCol.aliases) {
      const hit = rawKeys.find(k => {
        const kl = k.toLowerCase();
        return kl.includes(alias) || alias.includes(kl);
      });
      if (hit != null) {
        const n = Number(row._raw[hit]);
        if (!isNaN(n)) return n;
      }
    }
  }
  return null;
}

// Rank all rows for each active weight column, compute a weighted average score,
// assign overall rank and quartile-based tier.
// Returns a new array with _score, _rank, and an overridden tier field.
export function computeScoring(allData, weights) {
  if (!allData || !allData.length) return allData;

  const activeCols = WEIGHT_COLUMNS.filter(c => (weights[c.id] ?? 0) > 0);
  if (!activeCols.length) {
    return allData.map(r => ({ ...r, _rank: null, _score: null }));
  }

  // Rank each column — higher value → rank 1 (best)
  const rankMaps = {};
  activeCols.forEach(wCol => {
    const vals = allData
      .map(row => ({ id: row.id, val: getWeightVal(row, wCol) }))
      .filter(x => x.val != null)
      .sort((a, b) => b.val - a.val);

    const rMap = new Map();
    let rank = 1;
    vals.forEach((x, i) => {
      if (i > 0 && vals[i].val < vals[i - 1].val) rank = i + 1;
      rMap.set(x.id, rank);
    });
    rankMaps[wCol.id] = rMap;
  });

  // Weighted average score per row (lower = better)
  const scored = allData.map(row => {
    let weightedSum = 0;
    let usedW = 0;
    activeCols.forEach(wCol => {
      const w    = weights[wCol.id] ?? 0;
      const rank = rankMaps[wCol.id]?.get(row.id);
      if (rank != null) {
        weightedSum += rank * w;
        usedW += w;
      }
    });
    return { ...row, _score: usedW > 0 ? weightedSum / usedW : null };
  });

  // Overall rank assignment — sorted by score (lower = better)
  const withScores = scored.filter(r => r._score != null).sort((a, b) => a._score - b._score);
  const rankMap = new Map();
  const tierMap = new Map();

  // Fixed bucket sizes: top 15 → Tier 1, next 15 → Tier 2, next 15 → Tier 3
  // After that: has MB Sales (revenue > 0) → Tier 4, no MB Sales → Tier 5
  withScores.forEach((r, i) => {
    rankMap.set(r.id, i + 1);
    let tier;
    if      (i < 15) tier = 1;
    else if (i < 30) tier = 2;
    else if (i < 45) tier = 3;
    else             tier = (r.revenue != null && r.revenue > 0) ? 4 : 5;
    tierMap.set(r.id, tier);
  });

  // Rows with no score still get tier 4/5 based on MB Sales
  return scored.map(row => {
    if (!tierMap.has(row.id)) {
      tierMap.set(row.id, (row.revenue != null && row.revenue > 0) ? 4 : 5);
    }
    return {
      ...row,
      _rank: rankMap.get(row.id) ?? null,
      tier:  tierMap.get(row.id),
    };
  });
}

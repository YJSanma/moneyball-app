// Weighted scoring and quartile-based tier assignment
// Used by App.jsx so all views share the same computed tiers.

// Each entry maps a scoring dimension to a parsed field name and raw Excel header aliases.
export const WEIGHT_COLUMNS = [
  { id: 'penetration',      label: 'Penetration',           defaultWeight: 10, field: 'penetration',      aliases: ['penetration'] },
  { id: 'coverage',         label: 'Coverage',              defaultWeight: 0,  field: 'coverage',         aliases: ['coverage'] },
  { id: 'totalMarket',      label: 'Total Market $m',       defaultWeight: 10, field: 'totalMarket',      aliases: ['total market'] },
  { id: 'marketGrowth',     label: 'Total Market Growth %', defaultWeight: 10, field: 'marketGrowth',     aliases: ['market growth', 'total market growth'] },
  { id: 'marketShare',      label: 'MMS Market Share %',    defaultWeight: 10, field: 'marketShare',      aliases: ['mms market share', 'market share', 'mms share'] },
  { id: 'mmsGpDollars',     label: 'MMS GP $m',             defaultWeight: 0,  field: 'mmsGpDollars',     aliases: ['mms gp'] },
  { id: 'mmsGpMargin',      label: 'MMS GP %',              defaultWeight: 0,  field: 'mmsGpMargin',      aliases: ['mms gp %', 'mms gp margin'] },
  { id: 'mmsGrowth',        label: 'MMS Growth',            defaultWeight: 10, field: 'mmsGrowth',        aliases: ['mms growth'] },
  { id: 'revenue',          label: 'MB Sales $m',           defaultWeight: 5,  field: 'revenue',          aliases: ['mb sales'] },
  { id: 'mbGpDollars',      label: 'MB GP $m',              defaultWeight: 10, field: 'mbGpDollars',      aliases: ['mb gp $m', 'mb gp dollars'] },
  { id: 'mbGpMargin',       label: 'MB GP %',               defaultWeight: 10, field: 'mbGpMargin',       aliases: ['mb gp %', 'mb gp margin', 'mb margin'] },
  { id: 'mbGrowth',         label: 'MB Growth',             defaultWeight: 10, field: 'mbGrowth',         aliases: ['mb growth'] },
  { id: 'mbOutpaceMms',     label: 'MB outpace MMS %',      defaultWeight: 5,  field: 'mbOutpaceMms',     aliases: ['mb outpace mms', 'mb outpace nb'] },
  { id: 'mmsOutpaceMarket', label: 'MMS outpace Market %',  defaultWeight: 5,  field: 'mmsOutpaceMarket', aliases: ['mms outpace market', 'mms outpace'] },
  { id: 'mbVsMmsGp',        label: 'MB GP > MMS GP %',      defaultWeight: 10, field: 'mbVsMmsGp',        aliases: ['mb gp higher than mms gp', 'mb vs mms gp', 'mb gp higher', 'mb higher than mms'] },
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

  // Overall rank and quartile tier assignment
  const withScores = scored.filter(r => r._score != null).sort((a, b) => a._score - b._score);
  const n = withScores.length;
  const rankMap = new Map();
  const tierMap = new Map();
  withScores.forEach((r, i) => {
    rankMap.set(r.id, i + 1);
    const tier =
      i < Math.ceil(n * 0.25) ? 1 :
      i < Math.ceil(n * 0.50) ? 2 :
      i < Math.ceil(n * 0.75) ? 3 : 4;
    tierMap.set(r.id, tier);
  });

  return scored.map(row => ({
    ...row,
    _rank: rankMap.get(row.id) ?? null,
    tier:  tierMap.get(row.id) ?? row.tier,
  }));
}

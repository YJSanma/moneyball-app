// 57 McKesson Brands Level 2 product categories
// Metrics: MB GP$ = McKesson Brands gross profit dollars
//          MB GP% = McKesson Brands gross margin
//          MMS GP$ = McKesson Medical-Surgical gross profit dollars
//          penetration = % of target accounts actively purchasing
//          coverage = % of relevant accounts carrying at least 1 SKU
//          tier = 1 (Invest) → 4 (Monitor/Rationalize)
//          mbOutpaceMms = MB growth outpacing MMS growth (percentage points)
//          mmsOutpaceMarket = MMS growth outpacing total market growth (percentage points)

export const SAMPLE_DATA = [
  // Pain Management (7)
  { id: 1,  category: 'Analgesics — Internal',         tier: 1, mbGpDollars: 68200000, mbGpMargin: 34.1, mmsGpDollars: 42100000, penetration: 88, coverage: 91, marketGrowth: 3.2,  marketShare: 2.8, mbOutpaceMms:  5.2, mmsOutpaceMarket:  3.1 },
  { id: 2,  category: 'Topical Analgesics',            tier: 2, mbGpDollars: 38400000, mbGpMargin: 38.2, mmsGpDollars: 24200000, penetration: 72, coverage: 80, marketGrowth: 5.8,  marketShare: 1.6, mbOutpaceMms:  1.8, mmsOutpaceMarket:  2.4 },
  { id: 3,  category: 'Migraine Relief',               tier: 2, mbGpDollars: 29100000, mbGpMargin: 41.8, mmsGpDollars: 18300000, penetration: 61, coverage: 68, marketGrowth: 7.4,  marketShare: 1.3, mbOutpaceMms:  2.9, mmsOutpaceMarket:  1.8 },
  { id: 4,  category: 'Arthritis Care',                tier: 1, mbGpDollars: 54300000, mbGpMargin: 36.4, mmsGpDollars: 31400000, penetration: 82, coverage: 85, marketGrowth: 4.6,  marketShare: 2.1, mbOutpaceMms:  4.1, mmsOutpaceMarket:  2.6 },
  { id: 5,  category: 'Muscle & Joint Relief',         tier: 3, mbGpDollars: 19200000, mbGpMargin: 35.1, mmsGpDollars: 12100000, penetration: 55, coverage: 64, marketGrowth: 2.1,  marketShare: 1.4, mbOutpaceMms: -2.4, mmsOutpaceMarket: -1.2 },
  { id: 6,  category: 'NSAIDs',                        tier: 2, mbGpDollars: 43800000, mbGpMargin: 31.3, mmsGpDollars: 28100000, penetration: 84, coverage: 88, marketGrowth: 2.8,  marketShare: 2.4, mbOutpaceMms:  1.4, mmsOutpaceMarket: -0.8 },
  { id: 7,  category: 'Fibromyalgia & Nerve Pain',     tier: 3, mbGpDollars: 14100000, mbGpMargin: 44.2, mmsGpDollars:  9100000, penetration: 38, coverage: 45, marketGrowth: 8.9,  marketShare: 0.8, mbOutpaceMms: -1.8, mmsOutpaceMarket:  3.2 },

  // Vitamins & Supplements (10)
  { id: 8,  category: 'Multivitamins',                 tier: 1, mbGpDollars: 82100000, mbGpMargin: 48.3, mmsGpDollars: 38400000, penetration: 94, coverage: 96, marketGrowth: 6.8,  marketShare: 1.9, mbOutpaceMms:  6.1, mmsOutpaceMarket:  4.2 },
  { id: 9,  category: 'Vitamin D3',                    tier: 1, mbGpDollars: 61200000, mbGpMargin: 52.1, mmsGpDollars: 27900000, penetration: 89, coverage: 91, marketGrowth: 9.4,  marketShare: 1.7, mbOutpaceMms:  7.4, mmsOutpaceMarket:  5.1 },
  { id: 10, category: 'Omega-3 / Fish Oil',            tier: 2, mbGpDollars: 42300000, mbGpMargin: 46.4, mmsGpDollars: 19200000, penetration: 78, coverage: 82, marketGrowth: 7.1,  marketShare: 1.4, mbOutpaceMms:  2.1, mmsOutpaceMarket:  1.4 },
  { id: 11, category: 'Vitamin C',                     tier: 2, mbGpDollars: 35100000, mbGpMargin: 44.1, mmsGpDollars: 16200000, penetration: 85, coverage: 89, marketGrowth: 5.2,  marketShare: 1.8, mbOutpaceMms:  1.6, mmsOutpaceMarket:  0.9 },
  { id: 12, category: 'B-Complex',                     tier: 3, mbGpDollars: 17800000, mbGpMargin: 41.2, mmsGpDollars:  8200000, penetration: 66, coverage: 72, marketGrowth: 4.1,  marketShare: 1.1, mbOutpaceMms: -1.2, mmsOutpaceMarket: -0.4 },
  { id: 13, category: 'Calcium & Bone Health',         tier: 2, mbGpDollars: 31400000, mbGpMargin: 42.8, mmsGpDollars: 14100000, penetration: 73, coverage: 78, marketGrowth: 3.8,  marketShare: 1.5, mbOutpaceMms:  0.8, mmsOutpaceMarket:  1.1 },
  { id: 14, category: 'Iron Supplements',              tier: 3, mbGpDollars: 15200000, mbGpMargin: 39.4, mmsGpDollars:  7100000, penetration: 58, coverage: 65, marketGrowth: 2.9,  marketShare: 1.2, mbOutpaceMms: -2.1, mmsOutpaceMarket: -1.8 },
  { id: 15, category: 'Magnesium',                     tier: 3, mbGpDollars: 16100000, mbGpMargin: 43.1, mmsGpDollars:  7200000, penetration: 52, coverage: 61, marketGrowth: 10.2, marketShare: 0.9, mbOutpaceMms: -0.9, mmsOutpaceMarket:  4.8 },
  { id: 16, category: 'Probiotics',                    tier: 1, mbGpDollars: 57900000, mbGpMargin: 51.4, mmsGpDollars: 25100000, penetration: 82, coverage: 86, marketGrowth: 12.4, marketShare: 1.6, mbOutpaceMms:  5.8, mmsOutpaceMarket:  3.9 },
  { id: 17, category: 'Collagen & Beauty Supplements', tier: 3, mbGpDollars: 12100000, mbGpMargin: 49.2, mmsGpDollars:  5100000, penetration: 41, coverage: 48, marketGrowth: 14.8, marketShare: 0.6, mbOutpaceMms: -3.1, mmsOutpaceMarket:  6.2 },

  // Allergy (4)
  { id: 18, category: 'Antihistamines',                tier: 1, mbGpDollars: 46800000, mbGpMargin: 37.9, mmsGpDollars: 26100000, penetration: 91, coverage: 93, marketGrowth: 6.4,  marketShare: 2.2, mbOutpaceMms:  4.8, mmsOutpaceMarket:  2.8 },
  { id: 19, category: 'Nasal Allergy Sprays',          tier: 2, mbGpDollars: 28200000, mbGpMargin: 42.1, mmsGpDollars: 15100000, penetration: 68, coverage: 74, marketGrowth: 8.1,  marketShare: 1.3, mbOutpaceMms:  3.2, mmsOutpaceMarket:  2.4 },
  { id: 20, category: 'Allergy Eye Drops',             tier: 3, mbGpDollars: 13100000, mbGpMargin: 44.4, mmsGpDollars:  6100000, penetration: 49, coverage: 58, marketGrowth: 5.6,  marketShare: 1.0, mbOutpaceMms: -1.4, mmsOutpaceMarket:  0.2 },
  { id: 21, category: 'Allergy Combo Products',        tier: 4, mbGpDollars:  6100000, mbGpMargin: 34.2, mmsGpDollars:  3100000, penetration: 32, coverage: 40, marketGrowth: 2.1,  marketShare: 0.6, mbOutpaceMms: -5.2, mmsOutpaceMarket: -2.1 },

  // Cold & Flu (5)
  { id: 22, category: 'Cold Combination Products',     tier: 1, mbGpDollars: 52100000, mbGpMargin: 36.2, mmsGpDollars: 29200000, penetration: 87, coverage: 90, marketGrowth: 4.2,  marketShare: 2.0, mbOutpaceMms:  3.9, mmsOutpaceMarket:  1.8 },
  { id: 23, category: 'Cough Suppressants',            tier: 2, mbGpDollars: 33100000, mbGpMargin: 36.9, mmsGpDollars: 17800000, penetration: 76, coverage: 82, marketGrowth: 3.1,  marketShare: 1.7, mbOutpaceMms:  1.2, mmsOutpaceMarket: -0.6 },
  { id: 24, category: 'Decongestants',                 tier: 3, mbGpDollars: 21200000, mbGpMargin: 32.8, mmsGpDollars: 11100000, penetration: 69, coverage: 76, marketGrowth: 1.8,  marketShare: 1.9, mbOutpaceMms: -2.8, mmsOutpaceMarket: -2.4 },
  { id: 25, category: 'Throat Lozenges',               tier: 4, mbGpDollars:  8100000, mbGpMargin: 35.4, mmsGpDollars:  3900000, penetration: 45, coverage: 52, marketGrowth: 0.8,  marketShare: 1.1, mbOutpaceMms: -4.1, mmsOutpaceMarket: -3.8 },
  { id: 26, category: 'Pediatric Fever Reducers',      tier: 2, mbGpDollars: 27100000, mbGpMargin: 40.2, mmsGpDollars: 13200000, penetration: 74, coverage: 80, marketGrowth: 5.9,  marketShare: 1.5, mbOutpaceMms:  2.4, mmsOutpaceMarket:  1.6 },

  // Digestive Health (6)
  { id: 27, category: 'Antacids & Acid Reducers',      tier: 1, mbGpDollars: 65100000, mbGpMargin: 35.1, mmsGpDollars: 33200000, penetration: 92, coverage: 94, marketGrowth: 4.8,  marketShare: 2.5, mbOutpaceMms:  4.4, mmsOutpaceMarket:  2.2 },
  { id: 28, category: 'Laxatives',                     tier: 2, mbGpDollars: 33900000, mbGpMargin: 36.4, mmsGpDollars: 16800000, penetration: 78, coverage: 83, marketGrowth: 3.4,  marketShare: 1.8, mbOutpaceMms:  1.8, mmsOutpaceMarket:  0.6 },
  { id: 29, category: 'Anti-Diarrheal',                tier: 3, mbGpDollars: 16900000, mbGpMargin: 33.8, mmsGpDollars:  8900000, penetration: 62, coverage: 70, marketGrowth: 2.2,  marketShare: 1.6, mbOutpaceMms: -1.6, mmsOutpaceMarket: -1.1 },
  { id: 30, category: 'Gas & Bloating Relief',         tier: 3, mbGpDollars: 14200000, mbGpMargin: 37.1, mmsGpDollars:  7100000, penetration: 55, coverage: 62, marketGrowth: 3.8,  marketShare: 1.2, mbOutpaceMms: -2.2, mmsOutpaceMarket:  0.4 },
  { id: 31, category: 'Fiber Supplements',             tier: 2, mbGpDollars: 29200000, mbGpMargin: 42.4, mmsGpDollars: 12100000, penetration: 67, coverage: 74, marketGrowth: 7.6,  marketShare: 1.3, mbOutpaceMms:  2.8, mmsOutpaceMarket:  2.9 },
  { id: 32, category: 'Digestive Enzymes',             tier: 4, mbGpDollars:  9100000, mbGpMargin: 46.2, mmsGpDollars:  4100000, penetration: 36, coverage: 44, marketGrowth: 9.1,  marketShare: 0.5, mbOutpaceMms: -3.8, mmsOutpaceMarket:  3.4 },

  // Diabetes Care (5)
  { id: 33, category: 'Blood Glucose Monitors',        tier: 1, mbGpDollars: 71200000, mbGpMargin: 33.8, mmsGpDollars: 52100000, penetration: 86, coverage: 88, marketGrowth: 8.2,  marketShare: 2.3, mbOutpaceMms:  6.4, mmsOutpaceMarket:  4.8 },
  { id: 34, category: 'Test Strips & Lancets',         tier: 1, mbGpDollars: 78100000, mbGpMargin: 31.2, mmsGpDollars: 57900000, penetration: 84, coverage: 87, marketGrowth: 7.8,  marketShare: 2.6, mbOutpaceMms:  5.9, mmsOutpaceMarket:  4.2 },
  { id: 35, category: 'Insulin Delivery Devices',      tier: 2, mbGpDollars: 35900000, mbGpMargin: 29.4, mmsGpDollars: 27900000, penetration: 71, coverage: 76, marketGrowth: 9.5,  marketShare: 1.8, mbOutpaceMms:  2.6, mmsOutpaceMarket:  3.1 },
  { id: 36, category: 'Diabetes Foot Care',            tier: 3, mbGpDollars: 16200000, mbGpMargin: 41.4, mmsGpDollars:  8100000, penetration: 48, coverage: 56, marketGrowth: 6.4,  marketShare: 0.9, mbOutpaceMms: -1.9, mmsOutpaceMarket:  1.2 },
  { id: 37, category: 'Glucose Tablets & Gels',        tier: 3, mbGpDollars: 11100000, mbGpMargin: 43.2, mmsGpDollars:  5200000, penetration: 44, coverage: 51, marketGrowth: 5.1,  marketShare: 1.1, mbOutpaceMms: -2.4, mmsOutpaceMarket:  0.8 },

  // Skin Care (6)
  { id: 38, category: 'Acne Treatment',                tier: 2, mbGpDollars: 24100000, mbGpMargin: 45.4, mmsGpDollars: 11200000, penetration: 62, coverage: 70, marketGrowth: 6.8,  marketShare: 1.1, mbOutpaceMms:  1.4, mmsOutpaceMarket:  1.6 },
  { id: 39, category: 'Antifungal Topical',            tier: 2, mbGpDollars: 26100000, mbGpMargin: 41.2, mmsGpDollars: 12100000, penetration: 65, coverage: 72, marketGrowth: 4.4,  marketShare: 1.4, mbOutpaceMms:  0.9, mmsOutpaceMarket:  0.2 },
  { id: 40, category: 'Anti-Itch & Hydrocortisone',   tier: 3, mbGpDollars: 17900000, mbGpMargin: 37.8, mmsGpDollars:  8900000, penetration: 58, coverage: 66, marketGrowth: 2.8,  marketShare: 1.5, mbOutpaceMms: -1.8, mmsOutpaceMarket: -1.4 },
  { id: 41, category: 'Wound Care',                   tier: 2, mbGpDollars: 31200000, mbGpMargin: 35.9, mmsGpDollars: 15900000, penetration: 74, coverage: 80, marketGrowth: 3.6,  marketShare: 1.7, mbOutpaceMms:  1.6, mmsOutpaceMarket:  0.4 },
  { id: 42, category: 'Dry Skin & Eczema',            tier: 3, mbGpDollars: 14900000, mbGpMargin: 42.8, mmsGpDollars:  6100000, penetration: 47, coverage: 55, marketGrowth: 5.2,  marketShare: 0.8, mbOutpaceMms: -2.8, mmsOutpaceMarket:  1.4 },
  { id: 43, category: 'Sunscreen & UV Protection',    tier: 4, mbGpDollars:  8200000, mbGpMargin: 38.9, mmsGpDollars:  3900000, penetration: 34, coverage: 42, marketGrowth: 7.9,  marketShare: 0.5, mbOutpaceMms: -4.8, mmsOutpaceMarket:  2.8 },

  // Eye Care (3)
  { id: 44, category: 'Artificial Tears & Dry Eye',   tier: 2, mbGpDollars: 31900000, mbGpMargin: 47.1, mmsGpDollars: 13900000, penetration: 70, coverage: 76, marketGrowth: 8.4,  marketShare: 1.5, mbOutpaceMms:  3.4, mmsOutpaceMarket:  3.2 },
  { id: 45, category: 'Allergy & Redness Eye Relief', tier: 3, mbGpDollars: 14100000, mbGpMargin: 43.8, mmsGpDollars:  6200000, penetration: 51, coverage: 60, marketGrowth: 5.9,  marketShare: 1.1, mbOutpaceMms: -1.2, mmsOutpaceMarket:  0.8 },
  { id: 46, category: 'Contact Lens Solutions',       tier: 3, mbGpDollars: 11200000, mbGpMargin: 35.9, mmsGpDollars:  5100000, penetration: 42, coverage: 50, marketGrowth: 1.4,  marketShare: 1.3, mbOutpaceMms: -2.9, mmsOutpaceMarket: -2.6 },

  // Oral Care (3)
  { id: 47, category: 'Toothache & Oral Pain',        tier: 3, mbGpDollars: 12900000, mbGpMargin: 37.9, mmsGpDollars:  5900000, penetration: 52, coverage: 60, marketGrowth: 1.8,  marketShare: 1.4, mbOutpaceMms: -1.8, mmsOutpaceMarket: -2.8 },
  { id: 48, category: 'Whitening & Sensitivity',      tier: 4, mbGpDollars:  7100000, mbGpMargin: 41.8, mmsGpDollars:  3100000, penetration: 36, coverage: 44, marketGrowth: 3.6,  marketShare: 0.7, mbOutpaceMms: -3.4, mmsOutpaceMarket: -1.8 },
  { id: 49, category: 'Oral Antiseptic Rinse',        tier: 4, mbGpDollars:  5900000, mbGpMargin: 35.9, mmsGpDollars:  2900000, penetration: 31, coverage: 38, marketGrowth: 0.4,  marketShare: 0.8, mbOutpaceMms: -5.6, mmsOutpaceMarket: -4.2 },

  // Baby & Child Health (4)
  { id: 50, category: 'Infant & Children Analgesics', tier: 2, mbGpDollars: 29900000, mbGpMargin: 41.2, mmsGpDollars: 13900000, penetration: 76, coverage: 81, marketGrowth: 4.8,  marketShare: 1.6, mbOutpaceMms:  1.9, mmsOutpaceMarket:  1.2 },
  { id: 51, category: "Children's Cough & Cold",      tier: 3, mbGpDollars: 16900000, mbGpMargin: 37.9, mmsGpDollars:  7900000, penetration: 58, coverage: 65, marketGrowth: 3.2,  marketShare: 1.2, mbOutpaceMms: -1.4, mmsOutpaceMarket: -0.6 },
  { id: 52, category: 'Baby Vitamins',                tier: 3, mbGpDollars: 12100000, mbGpMargin: 47.8, mmsGpDollars:  5100000, penetration: 44, coverage: 52, marketGrowth: 7.4,  marketShare: 0.8, mbOutpaceMms: -2.1, mmsOutpaceMarket:  2.1 },
  { id: 53, category: 'Diaper Rash & Skin Barrier',   tier: 4, mbGpDollars:  6200000, mbGpMargin: 39.9, mmsGpDollars:  2900000, penetration: 33, coverage: 40, marketGrowth: 2.6,  marketShare: 0.6, mbOutpaceMms: -4.2, mmsOutpaceMarket: -1.4 },

  // Sleep & Relaxation (2)
  { id: 54, category: 'Sleep Aids',                   tier: 2, mbGpDollars: 27900000, mbGpMargin: 43.1, mmsGpDollars: 12100000, penetration: 65, coverage: 72, marketGrowth: 6.2,  marketShare: 1.4, mbOutpaceMms:  2.2, mmsOutpaceMarket:  1.8 },
  { id: 55, category: 'Melatonin',                    tier: 1, mbGpDollars: 44900000, mbGpMargin: 51.2, mmsGpDollars: 17900000, penetration: 81, coverage: 85, marketGrowth: 11.8, marketShare: 1.5, mbOutpaceMms:  7.8, mmsOutpaceMarket:  5.4 },

  // Women's Health (2)
  { id: 56, category: 'UTI Treatment',                tier: 2, mbGpDollars: 22100000, mbGpMargin: 45.9, mmsGpDollars:  9900000, penetration: 62, coverage: 68, marketGrowth: 5.6,  marketShare: 1.3, mbOutpaceMms:  1.8, mmsOutpaceMarket:  1.4 },
  { id: 57, category: 'Vaginal Health',               tier: 3, mbGpDollars: 12900000, mbGpMargin: 43.9, mmsGpDollars:  5900000, penetration: 46, coverage: 54, marketGrowth: 4.2,  marketShare: 0.9, mbOutpaceMms: -1.4, mmsOutpaceMarket:  0.6 },
];

// Flexible column name mapping for uploaded files.
// Each list is checked with both "includes" directions so partial matches work.
export const EXPECTED_COLUMNS = {
  category:         ['category level 2', 'l2 categories', 'l2 category',
                     'level 2 categories', 'level 2',
                     'category', 'product category', 'product name', 'item', 'item name',
                     'description', 'name', 'product', 'brand', 'segment',
                     'sub category', 'subcategory'],
  tier:             ['tier', 'priority tier', 'tier level', 'priority', 'ranking'],
  revenue:          ['mb sales $m', 'mb sales', 'total l12m sales', 'total sales',
                     'l12m sales', 'total revenue', 'net sales', 'revenue', 'sales'],
  mbGpDollars:      ['mb gp $m', 'mb gp$', 'mb gp dollars', 'mb gross profit', 'mb gp',
                     'total l12m mckb sales', 'mckb sales', 'l12m mckb sales',
                     'gp$', 'gp dollars', 'gross profit $', 'gross profit dollars',
                     'gross profit', 'gp amount'],
  mbGpMargin:       ['mb gp %', 'mb gp%', 'mb gp margin', 'mb gross margin', 'mb margin',
                     'mckb %', 'mckb%', 'mckb pct', 'mckb share',
                     'new mck %', 'new mck%',
                     'gp%', 'gp margin', 'gross margin', 'gross margin %',
                     'margin %', 'margin percent', 'gp rate'],
  mmsGpDollars:     ['mms gp $m', 'mms gp$', 'mms gp dollars', 'mms gross profit', 'mms gp',
                     'med surg gp', 'medical surgical gp'],
  penetration:      ['penetration', 'penetration %', 'pen %', 'pen',
                     'account penetration', 'acct pen', '% penetration'],
  coverage:         ['coverage', 'coverage %', 'cov %', 'cov',
                     'distribution coverage', 'distribution', 'dist coverage', '% coverage'],
  marketGrowth:     ['total market growth %', 'total market growth', 'market growth %',
                     'market growth', 'growth rate', 'growth %', 'growth rate %',
                     'market growth rate', 'yoy growth', 'yoy %', 'growth'],
  marketShare:      ['mms market share %', 'mms market share', 'mms share %',
                     'market share', 'relative market share', 'rel. market share',
                     'share', 'rms', 'rel market share', 'mkt share'],
  mbOutpaceMms:     ['mb outpace mms %', 'mb outpace mms', 'mb outpace nb %',
                     'mb outpace nb', 'mb vs mms growth', 'mb outpace'],
  mmsOutpaceMarket: ['mms outpace market %', 'mms outpace market', 'mms vs market growth',
                     'mms outpace market growth', 'mms outpace'],
};

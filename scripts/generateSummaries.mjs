// One-off script: generate AI summaries for all categories in sampleData.js
// Usage: ANTHROPIC_API_KEY=sk-ant-... node scripts/generateSummaries.mjs
//
// Calls claude-haiku-4-5 for each of the 106 categories (batches of 10).
// Adds a `summary: { headline, pros, cons }` field to each row and rewrites
// src/utils/sampleData.js in-place.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

// ── Check API key ──────────────────────────────────────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY is not set.');
  console.error('Run: ANTHROPIC_API_KEY=sk-ant-... node scripts/generateSummaries.mjs');
  process.exit(1);
}
const client = new Anthropic();

// ── Load sample data ───────────────────────────────────────────────────────
const { SAMPLE_DATA } = await import('../src/utils/sampleData.js');

// ── Quadrant helpers (inline to avoid ESM/CJS issues) ─────────────────────
function f1Quadrant(pen, cov, penT = 25, covT = 5) {
  if (pen == null || cov == null) return null;
  const hp = pen >= penT, hc = cov >= covT;
  if  (hp &&  hc) return 'Assortment Leader';
  if  (hp && !hc) return 'Selective Winner';
  if (!hp &&  hc) return 'Reassessment';
  return 'Untapped Potential';
}
function f2Quadrant(mbNb, nbMkt) {
  if (mbNb == null || nbMkt == null) return null;
  const hm = mbNb >= 0, hn = nbMkt >= 0;
  if  (hm &&  hn) return 'Strategy Star';
  if  (hm && !hn) return 'McKesson Brands Champions';
  if (!hm &&  hn) return 'Opportunity Gap';
  return 'Evaluation Candidates';
}

// ── Build prompt for one category ─────────────────────────────────────────
function buildPrompt(row) {
  const fmt  = (v, d = 1) => v != null ? Number(v).toFixed(d) : 'N/A';
  const fmtM = (v) => v != null ? `$${(v / 1_000_000).toFixed(1)}M` : 'N/A';
  const tier = row.tier ?? '?';
  const q1   = f1Quadrant(row.penetration, row.coverage) ?? 'N/A';
  const q2   = f2Quadrant(row.mbOutpaceMms, row.mmsOutpaceMarket) ?? 'N/A';

  return `You are analyzing a McKesson Brands product category for a sales prioritization dashboard.

Category: ${row.category}
Tier: ${tier} (1 = highest priority, 4 = lowest priority, 5 = no MB sales)
Framework 1 quadrant (penetration vs coverage): ${q1}
Framework 2 quadrant (MB vs NB growth dynamics): ${q2}

Key metrics:
- MB Sales: ${fmtM(row.revenue)}  |  MB GP%: ${fmt(row.mbGpMargin)}%
- Penetration: ${fmt(row.penetration, 0)}%  |  Coverage: ${fmt(row.coverage, 1)}%
- Total market: ${fmtM(row.totalMarket)}  |  Market growth: ${fmt(row.marketGrowth)}%  |  MMS market share: ${fmt(row.marketShare)}%
- MB growth: ${fmt(row.mbGrowth)}%  |  MB outpacing NB by: ${fmt(row.mbOutpaceMms)}%
- NB GP%: ${fmt(row.mmsGpMargin)}%

Write a JSON response with exactly these three fields:
{
  "headline": "one sentence (max 20 words) summarising why this is Tier ${tier}",
  "pros": ["strength 1 (max 10 words)", "strength 2 (max 10 words)", "strength 3 (max 10 words)"],
  "cons": ["watch-out 1 (max 10 words)", "watch-out 2 (max 10 words)", "watch-out 3 (max 10 words)"]
}
Return ONLY valid JSON — no markdown fences, no extra text.`;
}

// ── Call API for one category ──────────────────────────────────────────────
async function generateSummary(row) {
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: buildPrompt(row) }],
    });
    // Strip markdown fences if present (```json ... ```)
    let text = msg.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const summary = JSON.parse(text);
    if (!summary.headline || !Array.isArray(summary.pros) || !Array.isArray(summary.cons)) {
      throw new Error('Unexpected JSON shape');
    }
    return summary;
  } catch (err) {
    console.error(`  ✗ Failed for "${row.category}": ${err.message}`);
    return null;  // null = skip, keep retrying below
  }
}

// ── Process in batches of 5 (50 req/min limit → 2.5s between batches) ────
const BATCH = 5;
const results = [];

for (let i = 0; i < SAMPLE_DATA.length; i += BATCH) {
  const batch = SAMPLE_DATA.slice(i, i + BATCH);
  console.log(`Processing ${i + 1}–${Math.min(i + BATCH, SAMPLE_DATA.length)} of ${SAMPLE_DATA.length}…`);
  const summaries = await Promise.all(batch.map(generateSummary));
  results.push(...summaries);
  if (i + BATCH < SAMPLE_DATA.length) await new Promise(r => setTimeout(r, 2500));
}

// ── Merge summaries back into SAMPLE_DATA ────────────────────────────────
const enriched = SAMPLE_DATA.map((row, i) => ({ ...row, summary: results[i] }));

// ── Rewrite sampleData.js ─────────────────────────────────────────────────
const samplePath = join(ROOT, 'src/utils/sampleData.js');
const original   = readFileSync(samplePath, 'utf8');

// Replace everything up to (but not including) "export const EXPECTED_COLUMNS"
const ecIdx = original.indexOf('export const EXPECTED_COLUMNS');
if (ecIdx === -1) { console.error('Could not find EXPECTED_COLUMNS in sampleData.js'); process.exit(1); }
const expectedColsBlock = original.slice(ecIdx);

const newContent =
  `// Auto-generated from Moneyball 2025.xlsx — AI summaries added by generateSummaries.mjs\n` +
  `export const SAMPLE_DATA = ${JSON.stringify(enriched, null, 2)};\n\n` +
  expectedColsBlock;

writeFileSync(samplePath, newContent, 'utf8');
console.log(`\n✓ Done! Summaries written to src/utils/sampleData.js`);

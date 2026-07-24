/**
 * Round 1: Merge FAQ files into unified collection
 * - Use faq_auto.json as base (533 entries, most complete)
 * - Enrich subfield categorization from faq_auto_fixed.json
 * - Remove any version metadata
 * - Output: data/faq_unified.json
 */
const fs = require('fs');
const path = require('path');

const BASE = __dirname;
const AUTO = path.join(BASE, 'data', 'faq_auto.json');
const FIXED = path.join(BASE, 'data', 'faq_auto_fixed.json');
const OUT = path.join(BASE, 'data', 'faq_unified.json');
const REPORT = path.join(BASE, 'faq_merge_report.json');

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`FAILED to parse: ${p} — ${e.message}`);
    return null;
  }
}

const auto = readJSON(AUTO);
const fixed = readJSON(FIXED);

if (!auto || !Array.isArray(auto)) { console.error('faq_auto.json is invalid'); process.exit(1); }
if (!fixed || !Array.isArray(fixed)) { console.error('faq_auto_fixed.json is invalid'); process.exit(1); }

console.log(`faq_auto.json: ${auto.length} entries`);
console.log(`faq_auto_fixed.json: ${fixed.length} entries`);

// Build enrichment map from fixed by 'q' field
const fixedMap = new Map();
fixed.forEach(e => { fixedMap.set(e.q, e); });

// Stats
let enrichedSubfield = 0;
let keptAutoSubfield = 0;
let uniqueToAuto = 0;
const report = { enriched: [], uniqueToAuto: [], issues: [] };

// Merge: use auto as base, enrich subfield from fixed
const merged = auto.map((entry, i) => {
  const match = fixedMap.get(entry.q);
  if (!match) {
    uniqueToAuto++;
    report.uniqueToAuto.push({ index: i, q: entry.q });
    return entry; // keep as-is
  }

  // Enrich subfield if fixed has a string value (non-boolean)
  if (typeof match.subfield === 'string' && match.subfield.trim()) {
    enrichedSubfield++;
    report.enriched.push({ index: i, q: entry.q, from: entry.subfield, to: match.subfield });
    return { ...entry, subfield: match.subfield };
  }

  keptAutoSubfield++;
  return entry;
});

// Remove any top-level version field (merged is already a clean array)
// Ensure no wrapper object with version persists

console.log(`\n=== Round 1 Merge Results ===`);
console.log(`Total merged entries: ${merged.length}`);
console.log(`Enriched subfield (from fixed): ${enrichedSubfield}`);
console.log(`Kept auto subfield (fixed had boolean): ${keptAutoSubfield}`);
console.log(`Unique to auto (no match in fixed): ${uniqueToAuto}`);

// Check for potential duplicates (similar q values)
const qList = merged.map(e => e.q);
const duplicates = [];
for (let i = 0; i < qList.length; i++) {
  for (let j = i + 1; j < qList.length; j++) {
    if (qList[i] === qList[j]) {
      duplicates.push({ i, j, q: qList[i] });
    }
  }
}
if (duplicates.length > 0) {
  console.log(`\n⚠ Exact duplicate q fields: ${duplicates.length}`);
  duplicates.forEach(d => console.log(`  [${d.i}] = [${d.j}]: "${d.q}"`));
  report.issues.push({ type: 'exact_duplicate_q', count: duplicates.length, details: duplicates });
} else {
  console.log(`✓ No exact duplicate q fields found`);
}

// Check for required fields
const requiredFields = ['q', 'answer', 'subfield', 'keys', 'ents', 'detail', 'title'];
const missingFields = [];
merged.forEach((entry, i) => {
  requiredFields.forEach(f => {
    if (!(f in entry)) {
      missingFields.push({ index: i, q: entry.q, missing: f });
    }
  });
});
if (missingFields.length > 0) {
  console.log(`\n⚠ Missing required fields: ${missingFields.length}`);
  missingFields.forEach(m => console.log(`  [${m.index}] "${m.q}" missing "${m.missing}"`));
  report.issues.push({ type: 'missing_fields', count: missingFields.length, details: missingFields });
} else {
  console.log(`✓ All entries have required fields`);
}

// Write output
fs.writeFileSync(OUT, JSON.stringify(merged, null, 2), 'utf8');
console.log(`\n✓ Written: ${OUT} (${merged.length} entries)`);

// Write report
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf8');
console.log(`✓ Report: ${REPORT}`);

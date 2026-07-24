/**
 * Extract all fixes, questions, scores, reviews from the 10-cycle workflow output
 * and apply them to faq_unified.json
 *
 * Data sources:
 * - result.cycles[] → fixes, scores, flaggedQuestions (from workflow return value)
 * - workflowProgress[] → agent resultPreviews (full question sets from 乙 agents)
 */
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = process.argv[2] ||
  'C:\\Users\\LITTLE~1\\AppData\\Local\\Temp\\claude\\C--Users-Little-Alety-Desktop-Claude-Code\\22c4f4d1-3eb2-40ec-95af-af945ef354f9\\tasks\\wh71bxcci.output';

const BASE = __dirname;
const FAQ_PATH = path.join(BASE, 'data', 'faq_unified.json');
const FIXES_LOG = path.join(BASE, '10cycle_fixes_log.json');
const QUESTIONS_OUT = path.join(BASE, 'data', 'all_cycle_questions.json');
const REPORT_OUT = path.join(BASE, '10cycle_final_report.json');

// Read and parse
const raw = fs.readFileSync(OUTPUT_FILE, 'utf8');
const wf = JSON.parse(raw);

const resultData = wf.result || {};
const cycles = resultData.cycles || [];
const progressAgents = (wf.workflowProgress || []).filter(e => e.type === 'workflow_agent');

console.log(`Workflow: ${wf.summary}`);
console.log(`Cycles: ${cycles.length} | Agent entries: ${progressAgents.length}`);
console.log(`Total tokens: ${wf.totalTokens}`);

// ===== 1. Extract fixes from result.cycles (甲's output) =====
// Also supplement from agent resultPreviews for full fix data
const allFixes = [];
const fixAgentPreviews = progressAgents
  .filter(a => a.label && a.label.startsWith('甲-修复'))
  .map(a => {
    try { return { cycle: parseInt(a.label.replace('甲-修复-C','')), data: JSON.parse(a.resultPreview || '{}') }; }
    catch(e) { return null; }
  })
  .filter(Boolean);

// Use agent previews as primary source (full fix data)
fixAgentPreviews.forEach(({ cycle, data }) => {
  if (data.fixes && Array.isArray(data.fixes)) {
    data.fixes.forEach(f => { f._cycle = cycle; });
    allFixes.push(...data.fixes);
  }
});

// Also merge any fixes from result.cycles that might differ
cycles.forEach(c => {
  if (c.fixes && Array.isArray(c.fixes)) {
    c.fixes.forEach(cf => {
      if (!allFixes.some(af => af.q === cf.q && af._cycle === c.cycle)) {
        cf._cycle = c.cycle;
        allFixes.push(cf);
      }
    });
  }
});

// ===== 2. Extract questions from 乙 agent resultPreviews =====
const allQuestions = [];
progressAgents
  .filter(a => a.label && a.label.startsWith('乙-出题'))
  .forEach(a => {
    try {
      const cycle = parseInt(a.label.replace('乙-出题-C', ''));
      const data = JSON.parse(a.resultPreview || '{}');
      if (data.questions && Array.isArray(data.questions)) {
        data.questions.forEach(q => { q._cycle = cycle; });
        allQuestions.push(...data.questions);
        console.log(`  Cycle ${cycle} questions: ${data.questions.length}`);
      }
    } catch(e) {
      console.log(`  Failed to parse questions from ${a.label}: ${e.message}`);
    }
  });

// ===== 3. Extract scores from result.cycles (丙's output) =====
const allScores = [];
const cycleStats = [];
cycles.forEach(c => {
  if (c.scores && Array.isArray(c.scores)) {
    c.scores.forEach(s => { s._cycle = c.cycle; });
    allScores.push(...c.scores);
  }
  cycleStats.push({
    cycle: c.cycle,
    fixes: (c.fixes || []).length,
    questions: c.questionCount || 0,
    avgOverall: c.avgOverall || 0,
    weakAreas: c.weakAreas || '',
    flagged: (c.flaggedQuestions || []).length,
    goodCount: c.goodCount || 0,
    fixSummary: c.fixSummary || '',
    reviewSummary: c.reviewSummary || ''
  });
});

// ===== 4. Extract reviews from result.cycles (丁's output) =====
const allReviews = [];
cycles.forEach(c => {
  if (c.flaggedQuestions && Array.isArray(c.flaggedQuestions)) {
    c.flaggedQuestions.forEach(r => { r._cycle = c.cycle; });
    allReviews.push(...c.flaggedQuestions);
  }
});

// ===== SUMMARY =====
console.log(`\n=== EXTRACTED DATA ===`);
console.log(`All fixes: ${allFixes.length}`);
console.log(`All questions: ${allQuestions.length}`);
console.log(`All scores: ${allScores.length}`);
console.log(`All flagged reviews: ${allReviews.length}`);

console.log(`\n=== PER-CYCLE OVERVIEW ===`);
cycleStats.sort((a,b) => a.cycle - b.cycle).forEach(s => {
  console.log(`  C${s.cycle}: ${s.fixes} fixes | ${s.questions} Qs | avg ${s.avgOverall} | ${s.flagged} flagged | ${s.goodCount} good`);
});

// Save extractions
fs.writeFileSync(FIXES_LOG, JSON.stringify(allFixes, null, 2), 'utf8');
console.log(`\n✓ Fixes log: ${FIXES_LOG}`);

const questionsOut = {
  total: allQuestions.length,
  byCategory: {},
  byDifficulty: {},
  byCycle: {},
  questions: allQuestions
};
allQuestions.forEach(q => {
  const cat = q.category || '未分类';
  questionsOut.byCategory[cat] = (questionsOut.byCategory[cat] || 0) + 1;
  const diff = q.difficulty || '未标注';
  questionsOut.byDifficulty[diff] = (questionsOut.byDifficulty[diff] || 0) + 1;
  const c = `C${q._cycle}`;
  questionsOut.byCycle[c] = (questionsOut.byCycle[c] || 0) + 1;
});
fs.writeFileSync(QUESTIONS_OUT, JSON.stringify(questionsOut, null, 2), 'utf8');
console.log(`✓ Questions: ${QUESTIONS_OUT} (${allQuestions.length} total)`);

// ===== APPLY FIXES TO FAQ =====
console.log(`\n=== APPLYING FIXES ===`);
const faq = JSON.parse(fs.readFileSync(FAQ_PATH, 'utf8'));
console.log(`Current FAQ: ${faq.length} entries`);

let applied = 0, newEntries = 0, skipped = 0;
const appliedLog = [];

// Group fixes by q to avoid duplicates (keep latest cycle's fix)
const fixMap = new Map();
allFixes.forEach(f => {
  const key = `${f.action}:${f.q}`;
  const existing = fixMap.get(key);
  if (!existing || f._cycle > existing._cycle) {
    fixMap.set(key, f);
  }
});

console.log(`Unique fixes after dedup: ${fixMap.size}`);

fixMap.forEach(fix => {
  if (fix.action === 'new_entry') {
    try {
      let newEntry;
      if (typeof fix.new_value === 'string' && fix.new_value.trim().startsWith('{')) {
        newEntry = JSON.parse(fix.new_value);
      } else if (typeof fix.new_value === 'object' && fix.new_value.q) {
        newEntry = fix.new_value;
      } else {
        skipped++; return;
      }
      newEntry.subfield = newEntry.subfield || '综合研究';
      newEntry.keys = newEntry.keys || [];
      newEntry.ents = newEntry.ents || [];
      newEntry.detail = newEntry.detail || '';
      newEntry.title = newEntry.title || newEntry.q;
      newEntry.q = newEntry.q || newEntry.title;
      if (!faq.find(e => e.q === newEntry.q)) {
        faq.push(newEntry);
        newEntries++;
        applied++;
        appliedLog.push({ action: 'new_entry', q: newEntry.q, cycle: fix._cycle });
      } else {
        skipped++;
      }
    } catch(e) { skipped++; }
    return;
  }

  const idx = faq.findIndex(e => e.q === fix.q);
  if (idx < 0) { skipped++; return; }

  const entry = faq[idx];
  switch (fix.action) {
    case 'enrich_answer':
      if (fix.new_value && fix.new_value.length > (entry.answer || '').length) {
        entry.answer = fix.new_value;
        applied++;
        appliedLog.push({ action: 'enrich_answer', q: fix.q, cycle: fix._cycle });
      } else { skipped++; }
      break;
    case 'add_detail':
      if (fix.new_value && (!entry.detail || fix.new_value.length > entry.detail.length)) {
        entry.detail = fix.new_value;
        applied++;
        appliedLog.push({ action: 'add_detail', q: fix.q, cycle: fix._cycle });
      } else { skipped++; }
      break;
    case 'add_keys':
      if (Array.isArray(fix.new_value) && fix.new_value.length > 0) {
        const existing = new Set((entry.keys || []).map(k => k.toLowerCase()));
        const toAdd = fix.new_value.filter(k => !existing.has(String(k).toLowerCase()));
        if (toAdd.length > 0) {
          entry.keys = [...(entry.keys || []), ...toAdd];
          applied++;
          appliedLog.push({ action: 'add_keys', q: fix.q, added: toAdd.length, cycle: fix._cycle });
        } else { skipped++; }
      } else { skipped++; }
      break;
    case 'add_ents':
      if (Array.isArray(fix.new_value) && fix.new_value.length > 0) {
        const existing = new Set((entry.ents || []).map(e => e.toLowerCase()));
        const toAdd = fix.new_value.filter(e => !existing.has(String(e).toLowerCase()));
        if (toAdd.length > 0) {
          entry.ents = [...(entry.ents || []), ...toAdd];
          applied++;
          appliedLog.push({ action: 'add_ents', q: fix.q, added: toAdd.length, cycle: fix._cycle });
        } else { skipped++; }
      } else { skipped++; }
      break;
    case 'fix_error':
      if (fix.field && fix.new_value !== undefined) {
        entry[fix.field] = fix.new_value;
        applied++;
        appliedLog.push({ action: 'fix_error', q: fix.q, field: fix.field, cycle: fix._cycle });
      } else { skipped++; }
      break;
    default:
      skipped++;
  }
});

console.log(`Applied: ${applied} (${newEntries} new, ${applied - newEntries} mods)`);
console.log(`Skipped: ${skipped}`);
console.log(`FAQ final: ${faq.length} entries`);

fs.writeFileSync(FAQ_PATH, JSON.stringify(faq, null, 2), 'utf8');
console.log(`✓ FAQ written: ${FAQ_PATH}`);

// Final report
const avgScore = cycleStats.reduce((s, c) => s + c.avgOverall, 0) / cycleStats.length;
const report = {
  generatedAt: new Date().toISOString(),
  totalCycles: 10,
  totalAgents: 40,
  totalTokens: wf.totalTokens,
  summary: {
    totalFixes: allFixes.length,
    uniqueFixesApplied: applied,
    newEntriesAdded: newEntries,
    totalQuestionsGenerated: allQuestions.length,
    totalScores: allScores.length,
    totalFlagged: allReviews.length,
    avgScoreAcrossCycles: avgScore.toFixed(2),
    faqFinalCount: faq.length
  },
  perCycle: cycleStats.sort((a, b) => a.cycle - b.cycle),
  appliedFixes: appliedLog.slice(0, 50),
  questionDistribution: questionsOut.byCategory,
  difficultyDistribution: questionsOut.byDifficulty,
  criticalDataFixes: [
    '烘干温度: 110℃ → 50℃ (manual ch4-s1)',
    '失结晶水温度: 113℃ → 110℃ (manual ch2-s1)',
    'Fe(OH)₃ Ksp: 统一为 2.79×10⁻³⁹',
    '母液体积: 10-15mL → 25-30mL',
    'pH=3 C₂O₄²⁻分布系数: 0.35 → 0.05',
  ],
  newEntriesCreated: allFixes.filter(f => f.action === 'new_entry').map(f => f.q)
};

fs.writeFileSync(REPORT_OUT, JSON.stringify(report, null, 2), 'utf8');
console.log(`✓ Report: ${REPORT_OUT}`);
console.log(`\n=== DONE ===`);

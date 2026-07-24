/**
 * Round 2: Refine unified FAQ — categorize subfield, fix issues, quality check
 * Input:  data/faq_unified.json (Round 1 output)
 * Output: data/faq_unified.json (overwritten with refined version)
 */
const fs = require('fs');
const path = require('path');

const BASE = __dirname;
const IN = path.join(BASE, 'data', 'faq_unified.json');
const REPORT = path.join(BASE, 'faq_r2_report.json');

const merged = JSON.parse(fs.readFileSync(IN, 'utf8'));
console.log(`Loaded ${merged.length} entries from faq_unified.json`);

// === Subfield classification rules ===
// Each rule: { pattern: RegExp (on q+answer+keys), category: string }
// Ordered — first match wins
const CATEGORIES = [
  { pattern: /磁性|磁化率|磁矩|磁天平|顺磁|抗磁|铁磁|反铁磁|磁耦合/i, cat: '磁性研究' },
  { pattern: /光化学|光解|光照|避光|蓝晒|光致|光还|LMCT|量子产|紫外光|暗处|曝光|晒图/i, cat: '光化学应用' },
  { pattern: /滴定|KMnO4|标定|浓度|测定|分析|定量|含量|检测|标准溶液|指示剂|终点/i, cat: '分析测定' },
  { pattern: /热分解|TG|DSC|热重|热分析|热解|热稳定|分解温|脱水|差热|焙烧|TG-DSC|热行为|煅烧/i, cat: '热分析' },
  { pattern: /UV-Vis|红外|IR|光谱|吸收峰|吸收带|XRD|衍射|晶体结构|晶系|晶胞|空间群|SEM|TEM|表征|单晶|X射线/i, cat: '结构表征' },
  { pattern: /合成|制备|步骤|流程|操作步骤|合成路线|投料|加料|反应条件|产率/i, cat: '合成制备' },
  { pattern: /废物|废液|安全|防护|中毒|处理|回收|泄漏|溅入|误食|灭火|急救|危险|禁忌|MSDS|CAS|分类|标签/i, cat: '安全与废物处理' },
  { pattern: /教学|实验目的|教学目|学习目|课前|考核|思政|素养|课程|能力目|知识目|预习|实验报告/i, cat: '实验教学' },
  { pattern: /晶体场|配位场|d-d|d轨道|分裂能|稳定化能|CFSE|CFT|LFT|高自旋|低自旋|姜-泰勒|Jahn|光谱化学序|Δo|Δt|t2g|eg/i, cat: '配位化学理论' },
  { pattern: /配位理论|维尔纳|螯合|稳定常数|配位数|内外界|价键|EAN|Sidgwick|Lewis|主价|副价|配位键|配体|中心离子|螯合效应|螯合环|五元环/i, cat: '配位化学理论' },
  { pattern: /溶解度|溶解|结晶|过滤|抽滤|洗涤|干燥|烘干|蒸发|浓缩|称量|倾滗|沉淀|离心|搅拌|加热|水浴|冷却|冰水|热水/i, cat: '实验操作' },
  { pattern: /产率|计算|公式|理论产量|收率|转化率|过量|摩尔|质量/i, cat: '实验操作' },
  { pattern: /颜色|外观|形状|晶形|晶体|粉末|颗粒|绿色|黄色|褐色|变色|光泽|透明度/i, cat: '结构表征' },
  { pattern: /方程|反应式|化学式|分子式|化学方程式|离子方程式|机理|反应历程|中间体|自由基|氧化还原|还原剂|氧化剂|半反应/i, cat: '反应原理' },
  { pattern: /电子|电化学|电位|电势|能斯特|循环伏安|电极|电解|导电|CV/i, cat: '反应原理' },
  { pattern: /发展|历史|阶段|发现|诺贝尔|奠基|萌芽|谁提出|哪一年|最早/i, cat: '化学史' },
  { pattern: /草酸|K2C2O4|KHC2O4|H2C2O4|C2O4|草酸盐|草酸根|乙二酸|oxalate|oxalic/i, cat: '反应原理' },
  { pattern: /K3\[Fe|产物品?名称|目标产物|三草酸合铁|配合物简介|其他草酸|草酸配合物|铬配合|二草酸合铜|普鲁士蓝|FeC2O4|FeC2O4/i, cat: '综合研究' },
  { pattern: /对比|比较|区别|区别|vs|优缺点|不同|哪个好|选/i, cat: '综合研究' },
];

// Also a specific fix for the single missing entry
const FIXES = {
  '蒸发浓缩法vs溶剂替换法结晶对比': { subfield: '实验操作' },
};

// === Main refinement ===
let categorized = 0;
let fixedMissing = 0;
let stillBoolean = 0;
const categoryCount = {};
const details = [];

merged.forEach((entry, i) => {
  // Apply explicit fixes first
  if (FIXES[entry.q]) {
    Object.assign(entry, FIXES[entry.q]);
    fixedMissing++;
  }

  // Only categorize if subfield is still boolean or missing
  if (typeof entry.subfield !== 'string' || !entry.subfield.trim()) {
    const haystack = [entry.q, entry.answer, ...(entry.keys || []), entry.title || ''].join(' ');
    let matched = false;
    for (const rule of CATEGORIES) {
      if (rule.pattern.test(haystack)) {
        entry.subfield = rule.cat;
        categoryCount[rule.cat] = (categoryCount[rule.cat] || 0) + 1;
        categorized++;
        matched = true;
        break;
      }
    }
    if (!matched) {
      stillBoolean++;
      entry.subfield = '综合研究'; // fallback
      categoryCount['综合研究'] = (categoryCount['综合研究'] || 0) + 1;
      details.push({ index: i, q: entry.q, note: 'no category match, defaulted to 综合研究' });
    }
  } else {
    categoryCount[entry.subfield] = (categoryCount[entry.subfield] || 0) + 1;
  }
});

console.log(`\n=== Round 2 Results ===`);
console.log(`Entries with subfield already set (from fixed): ${merged.length - categorized - fixedMissing}`);
console.log(`Fixed missing subfield: ${fixedMissing}`);
console.log(`Auto-categorized from boolean: ${categorized}`);
console.log(`Still uncategorized (defaulted to 综合研究): ${stillBoolean}`);
console.log(`\n=== Subfield Distribution ===`);
Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => {
  console.log(`  ${cat}: ${n}`);
});

// Quality checks
const issues = [];

// Check for very short answers (< 60 chars)
const shortAnswers = merged
  .map((e, i) => ({ i, q: e.q, len: e.answer.length }))
  .filter(e => e.len < 60);
if (shortAnswers.length > 0) {
  console.log(`\n⚠ Very short answers (< 60 chars): ${shortAnswers.length}`);
  issues.push({ type: 'short_answers', count: shortAnswers.length, entries: shortAnswers.map(e => e.q) });
}

// Check for empty detail
const emptyDetail = merged
  .map((e, i) => ({ i, q: e.q }))
  .filter(e => !merged[e.i].detail || !merged[e.i].detail.trim());
console.log(`\n⚠ Empty detail: ${emptyDetail.length}`);
issues.push({ type: 'empty_detail', count: emptyDetail.length });

// Check for empty ents
const emptyEnts = merged
  .map((e, i) => ({ i, q: e.q }))
  .filter(e => !merged[e.i].ents || merged[e.i].ents.length === 0);
console.log(`\n⚠ Empty ents: ${emptyEnts.length}`);
issues.push({ type: 'empty_ents', count: emptyEnts.length });

// Check for missing keys
const fewKeys = merged
  .map((e, i) => ({ i, q: e.q, n: (e.keys || []).length }))
  .filter(e => e.n < 3);
console.log(`\n⚠ Few keys (< 3): ${fewKeys.length}`);
issues.push({ type: 'few_keys', count: fewKeys.length });

// Verify all subfields are now strings
const nonStringSubfields = merged
  .map((e, i) => ({ i, q: e.q, subfield: e.subfield, type: typeof e.subfield }))
  .filter(e => typeof e.subfield !== 'string');
if (nonStringSubfields.length > 0) {
  console.log(`\n⚠ Non-string subfields remaining: ${nonStringSubfields.length}`);
  nonStringSubfields.forEach(s => console.log(`  [${s.i}] "${s.q}" subfield=${s.subfield} (${s.type})`));
  issues.push({ type: 'non_string_subfield', count: nonStringSubfields.length, entries: nonStringSubfields });
} else {
  console.log(`\n✓ All subfields are now strings`);
}

// Write final unified FAQ
fs.writeFileSync(IN, JSON.stringify(merged, null, 2), 'utf8');
console.log(`\n✓ Written refined FAQ: ${IN} (${merged.length} entries)`);

// Write report
const report = {
  round: 2,
  totalEntries: merged.length,
  fixedMissing,
  autoCategorized: categorized,
  categoryDistribution: categoryCount,
  issues,
  defaultedToComprehensive: details,
};
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf8');
console.log(`✓ Report: ${REPORT}`);

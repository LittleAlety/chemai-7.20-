/**
 * Auto-generate FAQ entries from kb.json and inject into assistant.html
 * Run: node buildFAQ.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

function readJSON(fp) {
  let raw = fs.readFileSync(fp, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  return JSON.parse(raw);
}

const KB = readJSON(path.join(__dirname, 'data', 'kb.json'));
const CORPUS = readJSON(path.join(__dirname, 'data', 'corpus.json'));

// Subfield mapping based on chapter
const CHAPTER_SUBFIELD = {
  'ch1': '实验教学', 'ch2': '综合研究', 'ch3': '合成制备', 'ch4': '合成制备',
  'ch5': '分析测定', 'ch6': '光化学应用', 'ch7': '结构表征', 'ch8': '安全规范',
  'ch9': '实验教学', 'ch10': '综合研究', 'ch11': '实验教学', 'ch12': '实验教学'
};

// KNodes by chapter/topic
function guessKnode(en) {
  const t = (en.topic || '').toLowerCase();
  if (/原理|方程式|反应|氧化|还原|沉淀|配位|机理/.test(t)) return '反应原理';
  if (/步骤|操作|流程|抽滤|洗涤|加热|水浴|结晶|干燥|称量|溶解/.test(t)) return '操作流程';
  if (/产率|计算|基准|理论产量|误差/.test(t)) return '产率计算';
  if (/颜色|外观|晶系|密度|溶解|稳定/.test(t)) return '物理性质';
  if (/红外|ir|光谱|热重|tga|xrd|表征|结构/.test(t)) return '结构表征';
  if (/磁性|磁化率|磁矩|古埃|自旋/.test(t)) return '磁性研究';
  if (/光化学|光解|lmct|避光|见光|光敏|蓝晒|cyanotype|感光/.test(t)) return '光化学应用';
  if (/安全|废液|防护|毒性|msds|应急/.test(t)) return '安全规范';
  if (/维尔纳|历史|发现|诺贝尔|理论|配位化学史/.test(t)) return '配位化学史';
  if (/晶体场|cft|分裂能|d-d|跃迁|光谱化学|cfse/.test(t)) return '晶体场理论';
  if (/莫尔盐|摩尔盐|硫酸亚铁铵/.test(t)) return '莫尔盐';
  if (/草酸|h2c2o4|乙二酸/.test(t)) return '草酸化学';
  if (/过氧化氢|h2o2|双氧水/.test(t)) return '氧化剂';
  if (/乙醇|酒精/.test(t)) return '溶剂与结晶';
  if (/组成|测定|含量|滴定|kmno4|高锰酸钾/.test(t)) return '组成测定';
  if (/报告|写作|格式|引用|有效数字/.test(t)) return '报告撰写';
  if (/故障|异常|失败|排查|偏低|偏高/.test(t)) return '故障排查';
  if (/应用|用途|拓展|工业/.test(t)) return '拓展应用';
  return '综合知识';
}

// Generate a natural question from KB entry topic + keys
function generateQuestion(en) {
  const topic = en.topic || '';
  const keys = (en.keys || []).slice(0, 5);

  // If answer starts with a question-like pattern, use topic as-is
  if (/^什么|^如何|^为什么|^怎么|^哪些|^简述|^请/.test(topic)) {
    return topic;
  }

  // Generate question from topic + first key
  const firstKey = keys[0] || '';

  if (/.*化学式|.*分子式|.*叫什么|.*名称/.test(topic + ' ' + firstKey)) {
    return (topic + '是什么？').replace(/是什么？是什么？/, '是什么？');
  }
  if (/.*原理|.*机理/.test(topic)) {
    return topic + '是什么？';
  }
  if (/.*步骤|.*流程|.*操作|.*怎么|.*如何/.test(topic)) {
    return topic + '？';
  }
  if (/.*为什么|.*原因/.test(topic)) {
    return topic + '？';
  }
  if (/.*温度|.*多少|.*用量|.*浓度|.*质量/.test(topic)) {
    return topic + '是多少？';
  }

  // Default: generate "what is" question
  return topic + '是什么？';
}

// Build FAQ entries from KB
function buildFAQEntries() {
  const entries = [];
  const seen = new Set();

  // Sort KB entries by quality: prefer hand-curated (non-st, non-sec IDs) with longer answers
  const sorted = [...KB].sort((a, b) => {
    const aId = String(a.id || '');
    const bId = String(b.id || '');
    const aSt = aId.indexOf('st-') === 0 || aId.indexOf('sec-') === 0;
    const bSt = bId.indexOf('st-') === 0 || bId.indexOf('sec-') === 0;
    if (aSt && !bSt) return 1;
    if (!aSt && bSt) return -1;
    return (b.answer || '').length - (a.answer || '').length;
  });

  for (const en of sorted) {
    const topic = en.topic || '';
    if (!topic || topic.length < 2) continue;
    if (seen.has(topic)) continue;
    seen.add(topic);

    const keys = (en.keys || []).filter(k => k && k.length >= 2);
    const ents = (en.ents || []).filter(e => e && e.length >= 2);
    const answer = (en.answer || '').trim();
    const detail = (en.detail || '').trim();

    if (!answer || answer.length < 10) continue;
    if (!keys.length && !ents.length) continue;

    const q = generateQuestion(en);
    const chapter = en.chapter || 'ch0';
    const subfield = CHAPTER_SUBFIELD[chapter] || '综合研究';
    const knode = guessKnode(en);

    // Escape for JS string
    const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');

    entries.push({
      keys: keys.slice(0, 12),
      ents: ents.slice(0, 4),
      title: topic,
      q: q,
      knode: knode,
      subfield: subfield,
      answer: answer.slice(0, 500),
      detail: detail.slice(0, 800),
      _kb: en.id
    });
  }

  return entries;
}

// ========== MAIN ==========
console.log('Building FAQ entries from KB...');
const faqEntries = buildFAQEntries();
console.log('Generated ' + faqEntries.length + ' FAQ entries from KB');

// Read current assistant.html
let html = fs.readFileSync(path.join(__dirname, 'assistant.html'), 'utf8');

// Find the FAQ array closing bracket
const faqStart = html.indexOf('const FAQ=[');
const faqEndMarker = '];\n/* FAQ 匹配';
const faqEnd = html.indexOf(faqEndMarker, faqStart);

if (faqStart < 0 || faqEnd < 0) {
  console.error('Could not find FAQ array in assistant.html');
  process.exit(1);
}

// Build the new FAQ array
let faqJS = 'const FAQ=[\n';

// Keep existing 37 hand-curated FAQ entries (extract them)
const existingFaqBlock = html.slice(faqStart + 11, faqEnd);
// We'll keep the existing entries as-is and append new ones

// Generate new FAQ entries as JS code
let newCount = 0;
const addedTopics = new Set();

// First pass: collect existing FAQ topics to avoid duplicates
const existingTopicMatch = existingFaqBlock.match(/title:'([^']*)'/g);
if (existingTopicMatch) {
  existingTopicMatch.forEach(m => {
    const t = m.slice(7, -1);
    addedTopics.add(t);
  });
}

for (const en of faqEntries) {
  if (addedTopics.has(en.title)) continue;
  if (newCount >= 300) break; // Cap at 300 new entries
  addedTopics.add(en.title);

  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

  faqJS += ' {' +
    'keys:' + JSON.stringify(en.keys) + ',' +
    'ents:' + JSON.stringify(en.ents) + ',' +
    "title:'" + esc(en.title) + "'," +
    "q:'" + esc(en.q) + "'," +
    "knode:'" + esc(en.knode) + "'," +
    "subfield:'" + esc(en.subfield) + "'," +
    "answer:'" + esc(en.answer) + "'," +
    "detail:'" + esc(en.detail) + "'," +
    "_kb:'" + esc(en._kb || '') + "'" +
    '},\n';
  newCount++;
}

// Close array
faqJS += '];\n/* FAQ 匹配';

// Replace in HTML: keep existing entries + add new ones
// We need to replace the FAQ closing bracket and append new entries
const beforeFaqEnd = html.slice(0, faqEnd);
const afterFaqEnd = html.slice(faqEnd + 2); // skip '];'

// Combine: existing content + new entries (the '];' is in both so need to handle)
// Actually, the cleanest approach: replace the '];' with the new entries + '];'
const newBlock = html.slice(0, faqEnd) + ',\n' +
  faqEntries.filter(e => !addedTopics.has(e.title) || addedTopics.size <= 37 + newCount)
  .slice(0, 300)
  .map(en => {
    const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    return ' {' +
      'keys:' + JSON.stringify(en.keys) + ',' +
      'ents:' + JSON.stringify(en.ents) + ',' +
      "title:'" + esc(en.title) + "'," +
      "q:'" + esc(en.q) + "'," +
      "knode:'" + esc(en.knode) + "'," +
      "subfield:'" + esc(en.subfield) + "'," +
      "answer:'" + esc(en.answer.slice(0, 400)) + "'," +
      "detail:'" + esc(en.detail.slice(0, 600)) + "'," +
      "_kb:'" + esc(en._kb || '') + "'" +
      '}';
  }).join(',\n') +
  '];\n/* FAQ 匹配';

// Replace
let finalHtml = html.slice(0, faqEnd) + ',\n' +
  faqEntries.slice(0, 300).map(en => {
    const esc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    return ' {' +
      'keys:' + JSON.stringify(en.keys) + ',' +
      'ents:' + JSON.stringify(en.ents) + ',' +
      "title:'" + esc(en.title) + "'," +
      "q:'" + esc(en.q) + "'," +
      "knode:'" + esc(en.knode) + "'," +
      "subfield:'" + esc(en.subfield) + "'," +
      "answer:'" + esc(en.answer.slice(0, 400)) + "'," +
      "detail:'" + esc(en.detail.slice(0, 600)) + "'" +
      '}';
  }).join(',\n') +
  html.slice(faqEnd);

// Update version
finalHtml = finalHtml.replace(/\/\* AI_VERSION: 3 \*\//, '/* AI_VERSION: 4 */');

// Write back
fs.writeFileSync(path.join(__dirname, 'assistant.html'), finalHtml, 'utf8');
console.log('Wrote assistant.html with ' + newCount + ' new FAQ entries (300 total)');
console.log('Total FAQ entries: ~' + (37 + newCount));
console.log('AI_VERSION updated to 4');

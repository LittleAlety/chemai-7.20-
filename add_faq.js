// Cleanly add FAQ entries from faq_unified.json into assistant.html
const fs = require('fs');
const path = require('path');

// Restore to 9067dae first
const cp = require('child_process');
cp.execSync('git checkout 9067dae -- assistant.html', {cwd: __dirname});

// Read files
let html = fs.readFileSync(path.join(__dirname, 'assistant.html'), 'utf8');
let faqRaw = fs.readFileSync(path.join(__dirname, 'data', 'faq_unified.json'), 'utf8');
if (faqRaw.charCodeAt(0) === 0xFEFF) faqRaw = faqRaw.slice(1);
const faqEntries = JSON.parse(faqRaw);

// Find FAQ array boundary
const faqStart = html.indexOf('const FAQ=[');
// Find the closing ]; followed by /* FAQ 匹配
const endMatch = html.slice(faqStart).match(/\];\s*\/\*\s*FAQ\s*匹配/);
if (!endMatch) { console.error('Cannot find FAQ end'); process.exit(1); }
const endPos = faqStart + endMatch.index;

console.log('FAQ array: ' + faqStart + ' to ' + endPos);

// Build new FAQ entries
const esc = s => String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'');

let newEntries = '';
let count = 0;
for (const e of faqEntries) {
  const title = e.title, answer = e.answer;
  if (!title || !answer || answer.length < 10) continue;
  const keys = (e.keys||[]).filter(k=>k&&k.length>=2).slice(0,15);
  const ents = (e.ents||[]).filter(k=>k&&k.length>=2).slice(0,5);
  if (!keys.length && !ents.length) continue;

  newEntries += ',\r\n {' +
    'keys:' + JSON.stringify(keys) + ',' +
    'ents:' + JSON.stringify(ents) + ',' +
    "title:'" + esc(title) + "'," +
    "q:'" + esc(e.q||title) + "'," +
    "knode:'" + esc(e.knode||'') + "'," +
    "subfield:'" + esc(e.subfield||'综合研究') + "'," +
    "answer:'" + esc(answer.slice(0,400)) + "'," +
    "detail:'" + esc((e.detail||'').slice(0,400)) + "'" +
    '}';
  count++;
}

// Insert before ];
html = html.slice(0, endPos) + newEntries + '\r\n' + html.slice(endPos);

// Write
fs.writeFileSync(path.join(__dirname, 'assistant.html'), html, 'utf8');
console.log('Added ' + count + ' FAQ entries');

// Verify
const finalHtml = fs.readFileSync(path.join(__dirname, 'assistant.html'), 'utf8');
const faqCount = (finalHtml.match(/title:'([^']*)'/g)||[]).length;
const litR = (finalHtml.match(/\\r/g)||[]).length;
console.log('FAQ: ' + faqCount + ' | lit \\r: ' + litR + ' | size: ' + finalHtml.length);
console.log('First 80: ' + finalHtml.slice(0,80));
console.log('LLM panel: ' + (finalHtml.includes('llmConfig')?'YES':'NO'));
console.log('LLM API: ' + (finalHtml.includes('callLLM')?'YES':'NO'));

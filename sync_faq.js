/**
 * Sync faq_auto.json entries into assistant.html's hardcoded FAQ array
 */
const fs = require('fs');
const path = require('path');

// Read faq_auto.json
let faqRaw = fs.readFileSync(path.join(__dirname, 'data', 'faq_auto.json'), 'utf8');
if (faqRaw.charCodeAt(0) === 0xFEFF) faqRaw = faqRaw.slice(1);
const faqEntries = JSON.parse(faqRaw);

// Read assistant.html
let html = fs.readFileSync(path.join(__dirname, 'assistant.html'), 'utf8');

// Find the FAQ array
const faqStart = html.indexOf('const FAQ=[');
// Find the end by searching for the comment AFTER the FAQ array
// The FAQ array is followed by: ];\r\r\n/* FAQ 匹配：多关键词命中率
const commentMarker = '/* FAQ 匹配：多关键词命中率';
const commentPos = html.indexOf(commentMarker, faqStart);
let faqEnd, faqEndMarker;
if (commentPos > 0) {
  // Search backwards from the comment to find ];
  const before = html.slice(Math.max(0, commentPos - 30), commentPos);
  const bracketMatch = before.match(/\];\s*$/);
  if (bracketMatch) {
    faqEnd = commentPos - before.length + bracketMatch.index;
    faqEndMarker = html.slice(faqEnd, commentPos);
    console.log('Found FAQ end via comment marker:', faqEnd);
  }
}

if (faqStart < 0 || faqEnd < 0) {
  console.error('Could not find FAQ array boundaries');
  process.exit(1);
}

console.log('FAQ array at position', faqStart, 'to', faqEnd);
console.log('Old FAQ block length:', faqEnd - faqStart);

// Build new FAQ array as JS code
const esc = s => {
  s = String(s || '');
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
};

let faqJS = 'const FAQ=[\n';
let count = 0;
for (const entry of faqEntries) {
  const keys = (entry.keys || []).filter(k => k && String(k).length >= 2).slice(0, 15);
  const ents = (entry.ents || []).filter(e => e && String(e).length >= 2).slice(0, 5);
  const title = entry.title || '';
  const answer = (entry.answer || '').slice(0, 500);
  const detail = (entry.detail || '').slice(0, 800);
  const q = entry.q || title;
  const knode = entry.knode || '';
  const subfield = entry.subfield || '综合研究';

  if (!title || !answer || answer.length < 10) continue;
  if (!keys.length && !ents.length) continue;

  faqJS += ' {' +
    'keys:' + JSON.stringify(keys) + ',' +
    'ents:' + JSON.stringify(ents) + ',' +
    "title:'" + esc(title) + "'," +
    "q:'" + esc(q) + "'," +
    "knode:'" + esc(knode) + "'," +
    "subfield:'" + esc(subfield) + "'," +
    "answer:'" + esc(answer) + "'," +
    "detail:'" + esc(detail) + "'" +
    '},\n';
  count++;
}

faqJS += '];\r\r\n/* FAQ 匹配';
console.log('New FAQ entries:', count);

// Replace in HTML - use the comment position as the anchor
const newHtml = html.slice(0, faqStart) + faqJS + html.slice(commentPos);
fs.writeFileSync(path.join(__dirname, 'assistant.html'), newHtml, 'utf8');

console.log('Done! HTML now has', count, 'FAQ entries');
console.log('File size:', newHtml.length, 'bytes');

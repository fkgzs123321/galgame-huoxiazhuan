import fs from 'fs';
const html = fs.readFileSync('e:/Games/写卡/tavern_helper_template/src/欲妈群/正则/状态栏.html', 'utf-8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
const js = m[1];
const startIdx = js.indexOf('var DEFAULT_STAT');
let endOfObject = js.indexOf('};', startIdx) + 2;
console.log('DEFAULT_STAT object from', startIdx, 'to', endOfObject, 'length=', endOfObject - startIdx);
console.log('After DEFAULT_STAT (next 200 chars):', JSON.stringify(js.substring(endOfObject, endOfObject + 200)));

// 验证 DEFAULT_STAT 内部是否有不平衡引号
const segment = js.substring(startIdx, endOfObject);
let dqCount = 0;
let sqCount = 0;
for (let i = 0; i < segment.length; i++) {
  const c = segment[i];
  if (c === '"') dqCount++;
  if (c === "'") sqCount++;
}
console.log('Double-quote count in DEFAULT_STAT:', dqCount);
console.log('Single-quote count in DEFAULT_STAT:', sqCount);

// 找 DEFAULT_STAT 内的字符串，检查长度
// 简单检查：找第一个 " 和它后面第一个 "
const firstQuoteIdx = segment.indexOf('"');
console.log('First " at:', firstQuoteIdx, 'context:', JSON.stringify(segment.substring(Math.max(0, firstQuoteIdx - 20), firstQuoteIdx + 30)));

// 模拟脚本扫描 DEFAULT_STAT 内部，检查是否能正确退出
let pos = 0;
let state = 'normal'; // normal, inString, inRegex
let stringQuote = null;
while (pos < segment.length) {
  const ch = segment[pos];
  if (state === 'normal') {
    if (ch === '"' || ch === "'") {
      state = 'inString';
      stringQuote = ch;
    }
  } else if (state === 'inString') {
    if (ch === '\\') { pos += 2; continue; }
    if (ch === stringQuote) {
      state = 'normal';
      stringQuote = null;
    }
  }
  pos++;
}
console.log('Final state after DEFAULT_STAT scan:', state);
console.log('Final pos:', pos, 'segment length:', segment.length);

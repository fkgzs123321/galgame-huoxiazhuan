import fs from 'fs';
const f1 = 'e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge/数据库/chatSheets.json';
const f2 = 'e:/Games/写卡/tavern_helper_template/src/不要玩弄我的鸡吧-forge/世界书/[SPV]表格模板JSON.txt';
const c1 = fs.readFileSync(f1, 'utf8');
const c2 = fs.readFileSync(f2, 'utf8');
const j1 = JSON.parse(c1);
const j2 = JSON.parse(c2);
console.log('=== chatSheets.json keys ===');
Object.keys(j1).forEach(k => console.log(' -', k, j1[k]?.name || ''));
console.log('=== [SPV]表格模板JSON.txt keys ===');
Object.keys(j2).forEach(k => console.log(' -', k, j2[k]?.name || ''));
console.log('\n=== diff first 200 chars ===');
const minLen = Math.min(c1.length, c2.length);
let firstDiff = -1;
for (let i = 0; i < minLen; i++) {
  if (c1[i] !== c2[i]) { firstDiff = i; break; }
}
console.log('First diff at:', firstDiff);
if (firstDiff >= 0) {
  console.log('chatSheets around diff:', JSON.stringify(c1.substring(Math.max(0, firstDiff - 100), firstDiff + 200)));
  console.log('SPV around diff:', JSON.stringify(c2.substring(Math.max(0, firstDiff - 100), firstDiff + 200)));
}

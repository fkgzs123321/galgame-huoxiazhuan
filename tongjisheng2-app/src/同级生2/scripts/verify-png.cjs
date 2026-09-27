// 验证 PNG 中包含关键修复内容
const fs = require('fs');
const buf = fs.readFileSync('e:/Games/写卡/tavern_resource-main/src/角色卡/同级生2/同级生2.png');
let offset = 8;
const chunks = [];
while (offset < buf.length) {
  if (offset + 8 > buf.length) break;
  const length = buf.readUInt32BE(offset);
  const type = buf.toString('ascii', offset + 4, offset + 8);
  chunks.push({ offset, length, type });
  if (type === 'IEND') break;
  offset += 12 + length;
}

// 找 tEXt chunk
let charaBase64 = null;
for (const c of chunks) {
  if (c.type === 'tEXt') {
    const data = buf.slice(c.offset + 8, c.offset + 8 + c.length);
    const nullIdx = data.indexOf(0);
    const keyword = data.slice(0, nullIdx).toString('ascii');
    const text = data.slice(nullIdx + 1).toString('utf8');
    if (keyword === 'chara') {
      charaBase64 = text;
      break;
    }
  }
}

if (!charaBase64) { console.log('chara chunk not found'); process.exit(1); }
const jsonStr = Buffer.from(charaBase64, 'base64').toString('utf8');
console.log('PNG chara JSON size:', (jsonStr.length / 1024).toFixed(2), 'KB');

const checks = [
  ['GENERATION_ENDED listener', "onEvent('GENERATION_ENDED'"],
  ['MESSAGE_EDITED listener', "onEvent('MESSAGE_EDITED'"],
  ['DEFAULT_STAT constant', 'var DEFAULT_STAT='],
  ['deepMergeStat function', 'function deepMergeStat('],
  ['readStatData with deepMergeStat', 'return deepMergeStat(DEFAULT_STAT, cachedStatFromBridge)'],
  ['autoRefresh 800ms', 'setTimeout(() => { void scheduleRefresh(); }, 800)'],
  ['generation_ended fallback', "t.indexOf('generation_ended')"],
];

for (const [name, needle] of checks) {
  const count = jsonStr.split(needle).length - 1;
  console.log(`${count > 0 ? '✓' : '✗'} ${name}: ${count} occurrences`);
}

import fs from 'fs';

function readPng(path) {
  const buf = fs.readFileSync(path);
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    if (type === 'tEXt') {
      const d = buf.slice(off + 8, off + 8 + len);
      const ne = d.indexOf(0);
      const kw = d.toString('ascii', 0, ne);
      if (kw === 'chara_card_v3' || kw === 'ccv3') {
        const b64 = d.toString('ascii', ne + 1);
        const json = Buffer.from(b64, 'base64').toString('utf8');
        return JSON.parse(json);
      }
    }
    if (type === 'IEND') break;
    off = off + 8 + len + 4;
  }
  return null;
}

console.log('=== 同级生2 世界书结构 ===');
const obj2 = readPng('src/同级生2/同级生2.png');
const cb2 = obj2.data.character_book;
console.log('character_book keys:', Object.keys(cb2));
console.log('character_book.name:', cb2.name);
console.log('extensions.world:', obj2.data.extensions.world);
console.log('entries count:', cb2.entries ? cb2.entries.length : 0);
if (cb2.entries && cb2.entries.length > 0) {
  const e = cb2.entries[0];
  console.log('entry[0] keys:', Object.keys(e).join(','));
  console.log('entry[0] comment:', e.comment);
  console.log('entry[0] id type:', typeof e.id);
}

console.log('\n=== 当前项目 世界书结构 ===');
const obj1 = readPng('src/不要玩弄我的鸡吧-forge/不要玩弄我的鸡吧-forge.png');
const cb1 = obj1.data.character_book;
console.log('character_book keys:', Object.keys(cb1));
console.log('character_book.name:', cb1.name);
console.log('extensions.world:', obj1.data.extensions.world);
console.log('entries count:', cb1.entries ? cb1.entries.length : 0);
if (cb1.entries && cb1.entries.length > 0) {
  const e = cb1.entries[0];
  console.log('entry[0] keys:', Object.keys(e).join(','));
  console.log('entry[0] comment:', e.comment);
  console.log('entry[0] id type:', typeof e.id);
}

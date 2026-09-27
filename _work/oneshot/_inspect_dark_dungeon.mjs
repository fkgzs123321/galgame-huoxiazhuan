// 临时脚本：检查暗黑地牢 PNG 内世界书结构
import fs from 'fs';
import path from 'path';

const PNG_PATH = 'src/暗黑地牢/暗黑地牢v2.6.1.png';
const buf = fs.readFileSync(PNG_PATH);

let off = 8;
const chunks = [];
while (off < buf.length) {
  const len = buf.readUInt32BE(off);
  const type = buf.toString('ascii', off + 4, off + 8);
  const dataStart = off + 8;
  const dataEnd = dataStart + len;
  chunks.push({ type, len, data: buf.slice(dataStart, dataEnd) });
  if (type === 'IEND') break;
  off = dataEnd + 4;
}

let ccv3Obj = null;
for (const c of chunks) {
  if (c.type === 'tEXt') {
    const kwEnd = c.data.indexOf(0);
    const kw = c.data.toString('ascii', 0, kwEnd);
    const b64 = c.data.toString('ascii', kwEnd + 1);
    try {
      const json = Buffer.from(b64, 'base64').toString('utf8');
      const obj = JSON.parse(json);
      if (kw === 'ccv3' || kw === 'chara') {
        ccv3Obj = obj;
        break;
      }
    } catch (err) {}
  }
}

if (!ccv3Obj) {
  console.log('未找到 ccv3/chara chunk');
  process.exit(1);
}

console.log('=== 暗黑地牢 v2.6.1 ===');
console.log('spec:', ccv3Obj.spec);
console.log('name:', ccv3Obj.data?.name);
console.log('worldbook entries count:', ccv3Obj.data?.character_book?.entries?.length);

const entries = ccv3Obj.data?.character_book?.entries || [];

console.log('\n--- 亮灯条目 (enabled=true) ---');
for (const e of entries) {
  if (e.enabled) {
    console.log(`  - ${e.comment} | const=${e.constant} | pos=${e.position} | depth=${e.extensions?.depth} | order=${e.insertion_order} | keys=${JSON.stringify(e.keys)}`);
  }
}

console.log('\n--- 关灯条目数 ---');
console.log('总条目:', entries.length, '| 亮灯:', entries.filter(e=>e.enabled).length, '| 关灯:', entries.filter(e=>!e.enabled).length);

console.log('\n--- MVU相关条目 ---');
for (const e of entries) {
  if (e.comment && (e.comment.includes('InitVar') || e.comment.includes('变量') || e.comment.includes('MVU') || e.comment.includes('mvu') || e.comment.includes('Variable'))) {
    console.log(`  - ${e.comment} | enabled=${e.enabled} | const=${e.constant} | pos=${e.position} | depth=${e.extensions?.depth} | order=${e.insertion_order}`);
  }
}

console.log('\n--- 脚本/正则相关条目 ---');
for (const e of entries) {
  if (e.comment && (e.comment.includes('加载') || e.comment.includes('状态栏') || e.comment.includes('Bridge') || e.comment.includes('D0'))) {
    console.log(`  - ${e.comment} | enabled=${e.enabled} | pos=${e.position} | depth=${e.extensions?.depth} | order=${e.insertion_order}`);
  }
}

// 检查 alternate_greetings
console.log('\n--- alternate_greetings ---');
const ag = ccv3Obj.data?.alternate_greetings || [];
console.log('数量:', ag.length);
for (let i=0; i<Math.min(ag.length, 5); i++) {
  const g = ag[i];
  console.log(`  [${i}] 长度=${(g||'').length} | 前200字符: ${(g||'').slice(0,200).replace(/\n/g,'\\n')}`);
}

// 检查 first_mes
console.log('\n--- first_mes ---');
const fm = ccv3Obj.data?.first_mes || '';
console.log('长度:', fm.length);
console.log('前500字符:', fm.slice(0, 500).replace(/\n/g, '\\n'));
console.log('\n--- 包含 StatusPlaceHolderImpl?', fm.includes('StatusPlaceHolderImpl'));
console.log('--- 包含 <UpdateVariable>?', fm.includes('<UpdateVariable>'));

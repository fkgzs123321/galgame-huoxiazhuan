// _compare_json.mjs - 对比原始PNG与新PNG的角色卡JSON内容
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const CARD_DIR = path.join('src', '不要玩弄我的鸡吧-forge');
const OLD = path.join(CARD_DIR, '不要玩弄我的鸡吧.png');
const NEW = path.join(CARD_DIR, '不要玩弄我的鸡吧-forge.png');

function readChunks(buf) {
  const chunks = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const dataStart = off + 8;
    const dataEnd = dataStart + len;
    const data = buf.slice(dataStart, dataEnd);
    chunks.push({ type, data });
    if (type === 'IEND') break;
    off = dataEnd + 4;
  }
  return chunks;
}

function extractCards(pngPath) {
  const buf = fs.readFileSync(pngPath);
  const chunks = readChunks(buf);
  const cards = {};
  for (const c of chunks) {
    if (c.type === 'tEXt') {
      const kwEnd = c.data.indexOf(0);
      const kw = c.data.toString('ascii', 0, kwEnd);
      const b64 = c.data.toString('ascii', kwEnd + 1);
      const json = Buffer.from(b64, 'base64').toString('utf8');
      cards[kw] = { json, obj: JSON.parse(json) };
    }
  }
  return cards;
}

const oldCards = extractCards(OLD);
const newCards = extractCards(NEW);

function sizeInfo(label, json) {
  console.log(`${label}: 字符数=${json.length}, 字节数=${Buffer.byteLength(json, 'utf8')}`);
}

function fieldSizes(label, obj) {
  const d = obj.data || {};
  const fields = {
    name: d.name,
    description: d.description,
    personality: d.personality,
    scenario: d.scenario,
    first_mes: d.first_mes,
    mes_example: d.mes_example,
    creator_notes: d.creator_notes,
    system_prompt: d.system_prompt,
    post_history_instructions: d.post_history_instructions,
    tags: d.tags,
    creator: d.creator,
    character_version: d.character_version,
    alternate_greetings: d.alternate_greetings,
    character_book: d.character_book,
    extensions: d.extensions,
  };
  console.log(`\n${label} 字段大小:`);
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) {
      console.log(`  ${k}: (无)`);
    } else if (typeof v === 'string') {
      console.log(`  ${k}: 字符=${v.length}`);
    } else if (Array.isArray(v)) {
      console.log(`  ${k}: 数组长度=${v.length}, JSON字符=${JSON.stringify(v).length}`);
    } else if (typeof v === 'object') {
      console.log(`  ${k}: 对象, JSON字符=${JSON.stringify(v).length}`);
    } else {
      console.log(`  ${k}: ${v}`);
    }
  }
}

console.log('========== 原始PNG ==========');
for (const [kw, c] of Object.entries(oldCards)) sizeInfo(`  ${kw}`, c.json);
fieldSizes('原始 ccv3', oldCards.ccv3.obj);

console.log('\n========== 新打包PNG ==========');
for (const [kw, c] of Object.entries(newCards)) sizeInfo(`  ${kw}`, c.json);
fieldSizes('新 ccv3', newCards.ccv3.obj);

// character_book 子项大小
function bookDetails(label, obj) {
  const book = obj.data?.character_book;
  if (!book) return;
  console.log(`\n${label} character_book详情:`);
  console.log(`  entries数: ${book.entries?.length}`);
  // 计算每个entry平均大小
  const entries = book.entries || [];
  let total = 0;
  let largest = { name: '', size: 0 };
  for (const e of entries) {
    const s = JSON.stringify(e).length;
    total += s;
    if (s > largest.size) largest = { name: e.comment || e.key?.[0] || '(无名)', size: s };
  }
  console.log(`  entries总字符: ${total}`);
  console.log(`  最大entry: ${largest.name} (${largest.size}字符)`);
  // 找出最大的5个
  const sorted = entries.map(e => ({ name: e.comment || e.key?.[0] || '(无名)', size: JSON.stringify(e).length }))
    .sort((a, b) => b.size - a.size).slice(0, 10);
  console.log(`  Top10大entry:`);
  sorted.forEach((e, i) => console.log(`    [${i+1}] ${e.size}字符 - ${e.name}`));
}

bookDetails('原始', oldCards.ccv3.obj);
bookDetails('新', newCards.ccv3.obj);

// extensions详情
function extDetails(label, obj) {
  const ext = obj.data?.extensions;
  if (!ext) return;
  console.log(`\n${label} extensions详情:`);
  for (const [k, v] of Object.entries(ext)) {
    if (typeof v === 'string') console.log(`  ${k}: 字符=${v.length}`);
    else if (Array.isArray(v)) console.log(`  ${k}: 数组=${v.length}, JSON字符=${JSON.stringify(v).length}`);
    else if (typeof v === 'object') console.log(`  ${k}: 对象, JSON字符=${JSON.stringify(v).length}`);
    else console.log(`  ${k}: ${v}`);
  }
}

extDetails('原始', oldCards.ccv3.obj);
extDetails('新', newCards.ccv3.obj);

// 差异字段
console.log('\n========== 差异分析 ==========');
const oldObj = oldCards.ccv3.obj.data;
const newObj = newCards.ccv3.obj.data;
for (const k of Object.keys(newObj)) {
  const ov = JSON.stringify(oldObj[k]) || '(无)';
  const nv = JSON.stringify(newObj[k]) || '(无)';
  if (ov !== nv) {
    console.log(`  ${k}: 原始=${ov.length}字符 → 新=${nv.length}字符 (差异=${nv.length - ov.length})`);
  }
}

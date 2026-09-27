// extract_dd.mjs - 从暗黑地牢.png提取世界书和tavern_helper配置用于对比
// 用法: node extract_dd.mjs

import fs from 'fs';
import path from 'path';

const PNG_PATH = 'e:/Games/写卡/tavern_helper_template/src/暗黑地牢/暗黑地牢v2.6.1.png';
const OUT_DIR = 'e:/Games/写卡/tavern_helper_template/_暗黑地牢_提取';

function parsePngChunks(buf) {
  if (buf.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('Not a PNG file');
  }
  let offset = 8;
  const chunks = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.slice(offset + 4, offset + 8).toString('ascii');
    const data = buf.slice(offset + 8, offset + 8 + length);
    chunks.push({ type, length, data });
    offset += 8 + length + 4; // length + type + data + CRC
  }
  return chunks;
}

function findChunk(chunks, type) {
  return chunks.find(c => c.type === type);
}

// 从tEXt/iTXt chunk提取字符
function extractTextChunks(chunks) {
  const result = {};
  for (const c of chunks) {
    if (c.type === 'tEXt') {
      const s = c.data.toString('utf-8');
      const idx = s.indexOf('\0');
      if (idx > 0) {
        const key = s.slice(0, idx);
        const val = s.slice(idx + 1);
        result[key] = val;
      }
    } else if (c.type === 'iTXt') {
      const s = c.data.toString('utf-8');
      // iTXt format: keyword\0 compression_flag compression_method language_tag\0 translated_keyword\0 text
      const idx = s.indexOf('\0');
      if (idx > 0) {
        const key = s.slice(0, idx);
        const rest = s.slice(idx + 1);
        // Skip compression flag (1) + method (1)
        const langEnd = rest.indexOf('\0', 2);
        const transEnd = rest.indexOf('\0', langEnd + 1);
        const text = rest.slice(transEnd + 1);
        result[key] = text;
      }
    }
  }
  return result;
}

// Base64 decode and parse JSON
function decodeJson(b64) {
  try {
    const buf = Buffer.from(b64, 'base64');
    const text = buf.toString('utf-8');
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

if (!fs.existsSync(PNG_PATH)) {
  console.error('PNG not found:', PNG_PATH);
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const buf = fs.readFileSync(PNG_PATH);
console.log('PNG size:', buf.length, 'bytes');

const chunks = parsePngChunks(buf);
console.log('Chunks:', chunks.map(c => `${c.type}(${c.length})`).join(', '));

const textChunks = extractTextChunks(chunks);
console.log('Text chunks:', Object.keys(textChunks).join(', '));

let cardJson = null;
// Try ccv3 first
if (textChunks.ccv3) {
  console.log('Found ccv3 chunk, decoding...');
  cardJson = decodeJson(textChunks.ccv3);
}
// Fallback to chara
if (!cardJson && textChunks.chara) {
  console.log('Found chara chunk, decoding...');
  cardJson = decodeJson(textChunks.chara);
}

if (!cardJson) {
  console.error('No ccv3/chara chunk found!');
  console.error('Available text chunks:', Object.keys(textChunks));
  process.exit(1);
}

console.log('Card JSON parsed. Top-level keys:', Object.keys(cardJson).join(', '));

// Save full JSON
fs.writeFileSync(path.join(OUT_DIR, 'card.json'), JSON.stringify(cardJson, null, 2), 'utf-8');
console.log('Saved full card.json');

// Extract world book entries
const wbKey = Object.keys(cardJson).find(k =>
  k === 'world_book_characterInfo' || k === 'character_book' || k === 'world_book'
);

let entries = null;
let wbObj = null;

if (wbKey) {
  wbObj = cardJson[wbKey];
  console.log(`Found world book under key: ${wbKey}`);
  entries = wbObj.entries || wbObj.entries_entries || wbObj;
} else {
  // try data.character_book
  if (cardJson.data && cardJson.data.character_book) {
    wbObj = cardJson.data.character_book;
    entries = wbObj.entries || wbObj.entries_entries;
    console.log('Found world book under data.character_book');
  }
}

if (!entries) {
  console.error('No entries found in card!');
  // dump keys
  if (cardJson.data) console.log('data keys:', Object.keys(cardJson.data).join(', '));
  process.exit(1);
}

// Normalize to array
let entryArr = [];
if (Array.isArray(entries)) {
  entryArr = entries;
} else if (typeof entries === 'object') {
  for (const k of Object.keys(entries)) {
    const e = entries[k];
    if (e && typeof e === 'object') {
      entryArr.push(e);
    }
  }
}

console.log(`Total entries: ${entryArr.length}`);

// Extract MVU-related entries
const mvuKeywords = ['变量列表', '变量输出格式', '变量更新规则', 'InitVar', 'initvar', 'mvu', 'status_current_variable', 'update_variable_rules', '请勿打开'];

const mvuEntries = entryArr.filter(e => {
  const comment = String(e.comment || e.name || '');
  return mvuKeywords.some(kw => comment.includes(kw) || comment.toLowerCase().includes(kw.toLowerCase()));
});

console.log(`MVU-related entries: ${mvuEntries.length}`);

// Save MVU entries
const mvuDir = path.join(OUT_DIR, 'MVU');
if (!fs.existsSync(mvuDir)) fs.mkdirSync(mvuDir, { recursive: true });

for (const e of mvuEntries) {
  const comment = String(e.comment || e.name || `entry_${e.uid || e.id}`);
  const safeName = comment.replace(/[\\/:*?"<>|]/g, '_').slice(0, 100);
  const content = e.content || '';
  const meta = {
    comment: e.comment,
    keys: e.keys,
    enabled: e.enabled,
    constant: e.constant,
    selective: e.selective,
    insertion_order: e.insertion_order,
    position: e.position,
    depth: e.depth,
    role: e.role,
    extensions: e.extensions,
  };
  const fname = `${safeName}.txt`;
  fs.writeFileSync(path.join(mvuDir, fname), content, 'utf-8');
  fs.writeFileSync(path.join(mvuDir, `${safeName}.meta.json`), JSON.stringify(meta, null, 2), 'utf-8');
  console.log(`  - ${fname} (${content.length} chars)`);
}

// Save status bar HTML if found in regex_scripts or tavern_helper
const regexScripts = cardJson.regex_scripts || (cardJson.data && cardJson.data.regex_scripts) || [];
const statusBarScripts = regexScripts.filter(r =>
  (r.comment || r.scriptName || '').includes('状态栏') || (r.findRegex || '').includes('StatusPlaceHolder')
);
if (statusBarScripts.length > 0) {
  const sbDir = path.join(OUT_DIR, '状态栏相关');
  if (!fs.existsSync(sbDir)) fs.mkdirSync(sbDir, { recursive: true });
  for (const r of statusBarScripts) {
    const name = r.comment || r.scriptName || `regex_${r.id}`;
    fs.writeFileSync(path.join(sbDir, `${name}.json`), JSON.stringify(r, null, 2), 'utf-8');
    console.log(`Saved regex: ${name}`);
  }
}

// Save tavern_helper scripts
const tavernHelper = cardJson.extensions && cardJson.extensions.tavern_helper
  || (cardJson.data && cardJson.data.extensions && cardJson.data.extensions.tavern_helper);
if (tavernHelper && tavernHelper.scripts) {
  const thDir = path.join(OUT_DIR, 'tavern_helper_scripts');
  if (!fs.existsSync(thDir)) fs.mkdirSync(thDir, { recursive: true });
  fs.writeFileSync(path.join(thDir, 'scripts.json'), JSON.stringify(tavernHelper.scripts, null, 2), 'utf-8');
  console.log('Saved tavern_helper scripts.json');
}

// Save regex_scripts
if (regexScripts.length > 0) {
  fs.writeFileSync(path.join(OUT_DIR, 'regex_scripts.json'), JSON.stringify(regexScripts, null, 2), 'utf-8');
  console.log(`Saved regex_scripts.json (${regexScripts.length} scripts)`);
}

// Save first_mes and alternate_greetings
const data = cardJson.data || cardJson;
if (data.first_mes) {
  fs.writeFileSync(path.join(OUT_DIR, 'first_mes.txt'), data.first_mes, 'utf-8');
  console.log('Saved first_mes.txt');
}
if (data.alternate_greetings && data.alternate_greetings.length > 0) {
  fs.writeFileSync(path.join(OUT_DIR, 'alternate_greetings.json'), JSON.stringify(data.alternate_greetings, null, 2), 'utf-8');
  console.log(`Saved alternate_greetings.json (${data.alternate_greetings.length} greetings)`);
}

// Save book metadata
if (wbObj) {
  const meta = { ...wbObj };
  delete meta.entries;
  delete meta.entries_entries;
  fs.writeFileSync(path.join(OUT_DIR, 'world_book_meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
}

console.log('\nDone! Output:', OUT_DIR);

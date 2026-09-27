// 临时脚本：批量合并 正则/*.json 和 正则/*.txt 到 tavern-cards-state.json 的 regex_scripts 对象
// 用法: node scripts/merge-regex-scripts.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CARD_DIR = path.join(__dirname, '..', 'src', '不要玩弄我的鸡吧-forge');
const REGEX_DIR = path.join(CARD_DIR, '正则');
const STATE_PATH = path.join(CARD_DIR, 'tavern-cards-state.json');

// 1. 读取所有 .json 和 .txt 文件
const files = fs.readdirSync(REGEX_DIR).filter(f => f.endsWith('.json') || f.endsWith('.txt'));
console.log(`Found ${files.length} regex script files`);

// 2. 解析每个文件，提取 scriptName 作为 key
const regexScripts = {};
const order = [];
for (const file of files.sort()) {
  const fullPath = path.join(REGEX_DIR, file);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    console.error(`[SKIP] ${file}: JSON parse error - ${e.message}`);
    continue;
  }
  if (!obj.scriptName) {
    console.warn(`[WARN] ${file}: no scriptName, skip`);
    continue;
  }
  const name = obj.scriptName;
  delete obj.scriptName;
  // 把 null 值的 minDepth/maxDepth 删除（forge schema 是 optional）
  if (obj.minDepth === null) delete obj.minDepth;
  if (obj.maxDepth === null) delete obj.maxDepth;
  regexScripts[name] = obj;
  order.push(name);
  console.log(`[OK] ${name} <- ${file}`);
}

console.log(`\nTotal: ${order.length} regex scripts merged`);

// 3. 读取 state.json，替换 regex_scripts
const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
state.regex_scripts = regexScripts;

// 4. 写回 state.json
fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
console.log(`\nWritten to ${STATE_PATH}`);
console.log(`Order: ${order.join(' | ')}`);

// 修复真实 getwi 调用：路径格式 → 条目名格式（基于 index.yaml 文件→名称映射）
// 只匹配 EJS 执行调用 `<%- await getwi('x') %>`，不动注释/规划文档文字
import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

const ROOT = 'src/同级生2';
const index = parse(fs.readFileSync(path.join(ROOT, 'index.yaml'), 'utf-8'));

// 建立 文件相对路径(相对世界书/) → 条目名称 映射
const fileToName = new Map();
const names = [];
function walk(list) {
  for (const item of list) {
    if (item.文件夹 && item.条目) walk(item.条目);
    else if (item.名称) {
      names.push(item.名称);
      if (item.文件) {
        const fp = item.文件.replace(/^世界书\//, '').replace(/\.(txt|yaml)$/, '');
        fileToName.set(fp, item.名称);
        fileToName.set(fp + '.txt', item.名称);
      }
    }
  }
}
walk(index.条目);
const nameSet = new Set(names);

// 扫描所有世界书文件
const wbFiles = [];
function walkDir(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p);
    else wbFiles.push(p);
  }
}
walkDir(path.join(ROOT, '世界书'));

// 匹配真实 EJS getwi 调用：<%- await getwi('x') %> 或 <%- await getwi("x") %>
// 也兼容 <%-getwi(...)%>、<% await getwi(...) %> 变体
const CALL_RE = /(<%[-=_]*\s*await getwi\(['"])([^'"]+)(['"]\)\s*%>)/g;

let totalCalls = 0, fixedCalls = 0, skipped = 0, unresolved = [];
const perFile = [];

for (const f of wbFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  const m = c.match(CALL_RE);
  if (!m) continue;
  const fileCalls = { file: f, fixed: 0, total: m.length, items: [] };
  const replaced = c.replace(CALL_RE, (whole, pre, target, post) => {
    totalCalls++;
    let newTarget = target;
    if (nameSet.has(target)) { skipped++; }
    else if (fileToName.has(target)) { newTarget = fileToName.get(target); fixedCalls++; fileCalls.fixed++; }
    else { unresolved.push({ target, file: f }); }
    fileCalls.items.push(`${target} → ${newTarget}`);
    return pre + newTarget + post;
  });
  if (replaced !== c) {
    fs.writeFileSync(f, replaced, 'utf-8');
    perFile.push(fileCalls);
  }
}

console.log('真实 getwi 调用总数:', totalCalls);
console.log('已修复(路径→条目名):', fixedCalls);
console.log('本就正确(已是条目名):', skipped);
console.log('无法解析:', unresolved.length);
if (unresolved.length) {
  console.log('=== 无法解析的真实调用 ===');
  for (const u of unresolved) console.log('  ✗', u.target, '←', u.file.split(/[\\/]/).slice(-3).join('/'));
}
console.log();
console.log('=== 各文件修复统计 ===');
for (const pf of perFile) {
  console.log(`  ${pf.file.split(/[\\/]/).slice(-3).join('/')}: 修复 ${pf.fixed}/${pf.total}`);
}
console.log();
console.log('=== 修复示例（前 30）===');
let shown = 0;
for (const pf of perFile) {
  for (const it of pf.items) {
    if (shown++ < 30) console.log('  ', it);
  }
}

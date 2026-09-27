// 检查 EJS 中 getvar/setvar 的变量路径与变量列表一致性
import fs from 'fs';
import path from 'path';

// 1. 收集变量列表中的路径
const varlist = fs.readFileSync('src/同级生2/世界书/变量/变量列表.txt', 'utf-8');
const varPaths = new Set();
for (const line of varlist.split('\n')) {
  const m = line.match(/^- ([^\s|]+)/);
  if (m) varPaths.add(m[1].trim());
}
console.log('变量列表路径数:', varPaths.size);

// 2. 扫描所有 EJS 文件中的 getvar/setvar 调用
const wbFiles = [];
function walkDir(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p);
    else if (e.name.endsWith('.txt')) wbFiles.push(p);
  }
}
walkDir('src/同级生2/世界书');

const used = new Map(); // path -> [files]
const RE = /\b(getvar|setvar|replaceVariables|mvu_get|mvu_set)\(['"]([^'"]+)['"]/g;
for (const f of wbFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  let m;
  while ((m = RE.exec(c))) {
    const p = m[2].trim();
    if (!p.startsWith('stat_data')) continue; // 只查 stat_data 体系
    if (!used.has(p)) used.set(p, []);
    used.get(p).push(f.split(/[\\/]/).slice(-2).join('/'));
  }
}
console.log('EJS 中使用的 stat_data 路径数:', used.size);

// 3. 对比
const missing = [];
for (const [p, files] of used) {
  // 变量列表路径支持前缀匹配（stat_data.时间.当前日期 对应列表里的 stat_data.时间.当前日期）
  if (!varPaths.has(p)) {
    missing.push({ p, files });
  }
}
console.log();
console.log('=== 使用但未在变量列表中定义的路径 ===');
if (missing.length === 0) {
  console.log('  全部一致 ✓');
} else {
  for (const { p, files } of missing) {
    console.log(`  ⚠ ${p}  ← ${[...new Set(files)].join(', ')}`);
  }
}

// 检查所有 getwi 目标条目在 index.yaml 中的灯状态（getwi 拉取的条目应关灯，避免双份注入）
import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

const index = parse(fs.readFileSync('src/同级生2/index.yaml', 'utf-8'));
const entries = []; // {name, enabled, strategy, position}
function walk(list, folderPath = []) {
  for (const it of list) {
    if (it.文件夹 && it.条目) walk(it.条目, [...folderPath, it.文件夹]);
    else if (it.名称) {
      entries.push({
        name: it.名称,
        enabled: it.启用 !== false,
        strategy: it.激活策略?.类型 || '?',
        file: it.文件 || '',
      });
    }
  }
}
walk(index.条目);
const byName = new Map(entries.map((e) => [e.name, e]));

// 收集所有 getwi 目标（字面量 + 动态映射表值）
const wbFiles = [];
function walkDir(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p);
    else wbFiles.push(p);
  }
}
walkDir('src/同级生2/世界书');

const targets = new Set();
for (const f of wbFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  let m;
  const re = /await getwi\(['"]([^'"]+)['"]\)/g;
  while ((m = re.exec(c))) targets.add(m[1]);
}

console.log('getwi 目标总数（字面量）:', targets.size);
console.log();
console.log('=== getwi 目标条目灯状态（应全部关灯/禁用）===');
const issues = [];
for (const t of [...targets].sort()) {
  const e = byName.get(t);
  if (!e) { console.log(`  ❌ ${t}: index.yaml 中无此条目`); issues.push(t); continue; }
  const status = e.enabled ? `启用(${e.strategy})` : '关灯';
  if (e.enabled) console.log(`  ⚠ ${t}: ${status} ← getwi 也会拉取 → 双份注入风险`);
  else console.log(`  ✓ ${t}: 关灯`);
}
console.log();
console.log('存在风险的启用条目数:', issues.length > 0 ? '（见上 ⚠）' : '0 — 全部关灯');

// 同级生2 全面审查脚本：getwi 目标 vs index.yaml 条目注册一致性 + 顺序冲突检测
import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

const ROOT = 'src/同级生2';

// 1. 解析 index.yaml
const indexYaml = fs.readFileSync(path.join(ROOT, 'index.yaml'), 'utf-8');
const index = parse(indexYaml);

// 收集所有条目：文件夹 → 名称 → 配置
const entries = [];
function walk(folders, list) {
  for (const item of list) {
    if (item.文件夹 && item.条目) {
      walk([...folders, item.文件夹], item.条目);
    } else if (item.名称) {
      entries.push({
        folder: folders.join('/'),
        name: item.名称,
        enabled: item.启用,
        strategy: item.激活策略?.类型,
        keys: item.激活策略?.关键字 || [],
        position: item.插入位置?.类型,
        order: item.插入位置?.顺序,
        file: item.文件,
      });
    }
  }
}
walk([], index.条目);

console.log('=== index.yaml 条目统计 ===');
console.log('总条目:', entries.length);
const enabled = entries.filter(e => e.enabled);
console.log('启用条目:', enabled.length);
const disabled = entries.filter(e => !e.enabled);
console.log('禁用条目:', disabled.length);
console.log();

// 灯状态统计
const byStrategy = {};
for (const e of entries) {
  const key = e.enabled ? (e.strategy || '?') : '关灯';
  byStrategy[key] = (byStrategy[key] || 0) + 1;
}
console.log('灯状态分布:', JSON.stringify(byStrategy, null, 1));
console.log();

// 2. 检查 getwi 目标是否都有对应条目
const worldbookDir = path.join(ROOT, '世界书');
function walkDir(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walkDir(p));
    else out.push(p);
  }
  return out;
}
const wbFiles = walkDir(worldbookDir);
const getwiTargets = new Set();
for (const f of wbFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  const re = /getwi\(['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = re.exec(c))) getwiTargets.add(m[1]);
}

// 条目的标识：文件夹/名称（getwi 用此格式）
const entryPaths = new Set();
for (const e of entries) {
  if (e.folder && e.name) entryPaths.add(`${e.folder}/${e.name}`);
  else if (e.name) entryPaths.add(e.name);
}

console.log('=== getwi 目标 vs 条目注册 ===');
const missing = [...getwiTargets].filter(t => !entryPaths.has(t));
console.log('getwi 目标总数:', getwiTargets.size);
console.log('未注册条目（getwi 但无条目）:');
for (const t of missing) console.log('  ✗', t);
if (missing.length === 0) console.log('  ✓ 全部命中');
console.log();

// 3. 检查重复 order
console.log('=== 插入位置/顺序检查 ===');
const orderGroups = {};
for (const e of entries) {
  const k = `${e.position}|${e.order}`;
  if (!orderGroups[k]) orderGroups[k] = [];
  orderGroups[k].push(e.name);
}
const dupOrders = Object.entries(orderGroups).filter(([k, v]) => v.length > 1);
if (dupOrders.length > 0) {
  console.log('重复顺序 (position|order → 条目):');
  for (const [k, v] of dupOrders.slice(0, 20)) {
    console.log('  ⚠', k, '→', v.join(', '));
  }
} else {
  console.log('✓ 无重复顺序');
}
console.log();

// 4. 检查绿灯 keys 规范（单汉字关键词、泛用词）
console.log('=== 绿灯关键词规范检查 ===');
const green = entries.filter(e => e.enabled && e.strategy === '绿灯');
for (const e of green) {
  for (const k of e.keys) {
    if (k.length === 1) console.log('  ⚠ 单汉字关键词:', e.name, '→', k);
  }
}
console.log('绿灯条目数:', green.length);
console.log();

// 5. 检查 EJS 条目是否被 getwi（不应重复加载）
console.log('=== 蓝灯条目被 getwi 引用检查 ===');
const blueNames = entries.filter(e => e.enabled && e.strategy === '蓝灯').map(e => e.name);
for (const t of getwiTargets) {
  const base = t.split('/').pop();
  if (blueNames.includes(base)) {
    console.log('  ⚠ 蓝灯条目被 getwi 引用（可能双份加载）:', t);
  }
}
console.log('检查完成');

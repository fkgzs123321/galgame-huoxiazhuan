// 模拟 ST-Prompt-Template getwi 的真实匹配逻辑，检查同级生2 所有 getwi 目标的命中率
import fs from 'fs';
import path from 'path';

const ROOT = 'src/同级生2';

// 读取打包 PNG 的条目 comment 列表
import { execSync } from 'child_process';
// 直接从 index.yaml 推导条目名（tavern_sync 打包后 comment = 条目「名称」字段）
import { parse } from 'yaml';

const index = parse(fs.readFileSync(path.join(ROOT, 'index.yaml'), 'utf-8'));
const comments = [];
function walk(list, folderPath) {
  for (const item of list) {
    if (item.文件夹 && item.条目) walk(item.条目, [...folderPath, item.文件夹]);
    else if (item.名称) comments.push(item.名称);
  }
}
walk(index.条目, []);
const commentSet = new Set(comments);

// 收集所有 getwi 目标
const wbFiles = [];
function walkDir(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p);
    else wbFiles.push(p);
  }
}
walkDir(path.join(ROOT, '世界书'));

const getwiCalls = []; // {target, source}
for (const f of wbFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  const re = /getwi\(['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = re.exec(c))) {
    getwiCalls.push({ target: m[1], source: f.split(/[\\/]/).slice(-3).join('/') });
  }
}

// 按 getWorldInfoEntry 的真实逻辑模拟匹配：
// data.comment === title || data.uid === title || data.comment.match(title)
function matchStatus(title) {
  // 1. 精确匹配
  if (commentSet.has(title)) return '精确匹配 ✓';
  // 2. 正则匹配（title 作为正则去 match comment）
  try {
    const re = new RegExp(title);
    for (const c of comments) {
      if (re.test(c)) return `正则匹配 ✓ (comment: ${c})`;
    }
  } catch (e) {
    return `正则语法错误 ✗ (${e.message})`;
  }
  // 3. 完全失败
  return '未命中 ✗';
}

console.log('=== getwi 目标命中率分析（共 ' + getwiCalls.length + ' 个调用）===');
const stats = { ok: 0, fail: 0, regexErr: 0 };
const details = [];
for (const { target, source } of getwiCalls) {
  const status = matchStatus(target);
  if (status.startsWith('精确匹配')) stats.ok++;
  else if (status.startsWith('正则匹配')) stats.ok++;
  else if (status.startsWith('正则语法错误')) stats.regexErr++;
  else stats.fail++;
  details.push({ target, source, status });
}

console.log('精确/正则命中:', stats.ok, '| 未命中:', stats.fail, '| 正则语法错误:', stats.regexErr);
console.log();
console.log('=== 未命中的 getwi 调用 ===');
for (const d of details) {
  if (d.status.includes('✗')) {
    console.log(`  ✗ ${d.target}  ← ${d.source}`);
  }
}
console.log();
console.log('=== 命中但依赖正则的 getwi（可能误匹配其他条目）===');
for (const d of details) {
  if (d.status.startsWith('正则匹配')) {
    console.log(`  ~ ${d.target} → ${d.status} ← ${d.source}`);
  }
}

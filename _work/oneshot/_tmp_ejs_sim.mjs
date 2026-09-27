// EJS 渲染输出估算器：mock getvar/getwi，统计三个控制器渲染后的注入量
// 处理：<% code %> 不输出；<%= expr %> 输出占位；<%- await getwi('X') %> 展开 X 的静态输出
import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

const ROOT = 'src/同级生2/世界书';
const cache = new Map();

// 条目名 → 世界书相对路径（无扩展名）
const index = parse(fs.readFileSync('src/同级生2/index.yaml', 'utf-8'));
const nameToRel = new Map();
function walk(list) {
  for (const it of list) {
    if (it.文件夹 && it.条目) walk(it.条目);
    else if (it.名称 && it.文件) {
      nameToRel.set(it.名称, it.文件.replace('世界书/', '').replace(/\.(txt|yaml)$/, ''));
    }
  }
}
walk(index.条目);

// 解析 EJS 的静态输出 + 递归展开 getwi
function renderStatic(relPath, depth = 0, stack = []) {
  if (cache.has(relPath)) return cache.get(relPath);
  const full = path.join(ROOT, relPath + '.txt');
  if (!fs.existsSync(full)) {
    // 尝试按条目名反查
    const mapped = nameToRel.get(relPath);
    if (mapped) return renderStatic(mapped, depth, stack);
    console.log(`  [MISS] ${relPath}.txt`);
    return `【缺失条目:${relPath}】`;
  }
  const content = fs.readFileSync(full, 'utf-8');
  // 去掉 @@ 指令行
  let text = content.replace(/^@@[^\n]*\n/, '');
  let out = '';
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf('<%', i);
    if (start === -1) { out += text.slice(i); break; }
    out += text.slice(i, start);
    let end = text.indexOf('%>', start + 2);
    if (end === -1) { out += text.slice(start); break; }
    const inner = text.slice(start + 2, end).trim();
    // getwi 调用：<%- await getwi('X') %> 或 <%- await getwi(X) %>
    const gwi = inner.match(/^[-=_]*\s*await getwi\((['"])([^'"]+)\1\)/);
    if (gwi) {
      if (stack.includes(gwi[2])) { out += `【循环引用:${gwi[2]}】`; }
      else if (depth < 4) {
        out += renderStatic(gwi[2], depth + 1, [...stack, gwi[2]]);
      } else { out += `【深度截断:${gwi[2]}】`; }
    } else if (inner.startsWith('=')) {
      // 输出表达式：按表达式名估算（变量值假设短）
      const expr = inner.slice(1).trim();
      if (expr.includes('getvar(')) out += `[var]`;
      else if (expr.length > 60) out += `[expr:${expr.slice(0, 40)}]`;
      else out += `[${expr.slice(0, 30)}]`;
    }
    // else: 代码块不输出
    i = end + 2;
  }
  cache.set(relPath, out);
  return out;
}

const targets = [
  ['D0系统控制器', 'EJS预处理/D0系统控制器'],
  ['角色性格控制器', 'EJS预处理/角色性格控制器'],
  ['世界观场景控制器', 'EJS预处理/世界观场景控制器'],
];

let grandTotal = 0;
for (const [name, rel] of targets) {
  const out = renderStatic(rel);
  const src = fs.statSync(path.join(ROOT, rel + '.txt')).size;
  console.log(`=== ${name} ===`);
  console.log(`  源码: ${src}B | 渲染输出估算: ${out.length}B ≈ ${Math.round(out.length / 1.5)} token`);
  grandTotal += out.length;
  // 显示输出开头
  const head = out.replace(/\n+/g, ' ').slice(0, 200);
  console.log(`  输出开头: ${head.slice(0, 150)}`);
  console.log();
}
console.log('三个控制器渲染输出合计:', grandTotal, 'B ≈', Math.round(grandTotal / 1.5), 'token');

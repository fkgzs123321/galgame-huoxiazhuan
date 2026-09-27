// 检查控制器依赖的大写常量：定义位置 + 是否有 getwi 拉取
import fs from 'fs';
import path from 'path';

const ROOT = 'src/同级生2/世界书';
const ctrlFiles = [
  'EJS预处理/D0系统控制器.txt',
  'EJS预处理/角色性格控制器.txt',
  'EJS预处理/世界观场景控制器.txt',
  'EJS预处理/寒假日程调度器/_公共时段.txt',
  'EJS预处理/主动事件触发器.txt',
];

// 1. 收集每个文件的顶层 var/const 定义（大写常量）
const definedIn = new Map(); // 常量名 -> 文件
const allFiles = [];
function walkDir(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p);
    else if (e.name.endsWith('.txt')) allFiles.push(p);
  }
}
walkDir(ROOT);
for (const f of allFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  // 匹配 var/const/let 大写标识符 = 
  const re = /(?:var|const|let)\s+([A-Z][A-Z0-9_]{2,})\s*=/g;
  let m;
  while ((m = re.exec(c))) {
    if (!definedIn.has(m[1])) definedIn.set(m[1], f.split(/[\\/]/).slice(-2).join('/'));
  }
  // 也匹配 this.XXX = 形式
  const re2 = /this\.([A-Z][A-Z0-9_]{2,})\s*=/g;
  while ((m = re2.exec(c))) {
    if (!definedIn.has(m[1])) definedIn.set(m[1], f.split(/[\\/]/).slice(-2).join('/') + ' (this.)');
  }
}

// 2. 提取控制器引用的大写常量
const refs = new Map(); // 常量名 -> [文件...]
for (const cf of ctrlFiles) {
  const full = path.join(ROOT, cf);
  if (!fs.existsSync(full)) continue;
  const c = fs.readFileSync(full, 'utf-8');
  const re = /\b([A-Z][A-Z0-9_]{3,})\b/g;
  let m;
  while ((m = re.exec(c))) {
    // 排除常见 JS 内置/伪常量
    if (['JSON', 'Object', 'Array', 'String', 'Number', 'Math', 'Date', 'Promise', 'RegExp', 'NaN', 'undefined', 'typeof'].includes(m[1])) continue;
    // 排除属性访问（.XXX）——正则已限定词首，但 JSON.stringify 的 key 可能误报
    if (!refs.has(m[1])) refs.set(m[1], []);
    refs.get(m[1]).push(cf.split('/').pop());
  }
}

console.log('=== 控制器引用的大写标识符（检查定义位置）===');
for (const [name, files] of [...refs.entries()].sort()) {
  const def = definedIn.get(name);
  if (def) {
    // 定义在控制器自身？
    const selfDefined = files.some((f) => def.includes(f.replace('.txt', '')));
    console.log(`  ${name}: 定义于 ${def} ${selfDefined ? '(同文件✓)' : '(其他文件→需getwi)'}`);
  } else {
    console.log(`  ${name}: ⚠ 未找到定义 ← ${[...new Set(files)].join(', ')}`);
  }
}

// 全局扫描：世界书文件中残留的路径格式字符串（对应 index.yaml 条目文件路径但值≠条目名）
import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

const index = parse(fs.readFileSync('src/同级生2/index.yaml', 'utf-8'));
const fileToName = new Map();
function walk(list) {
  for (const it of list) {
    if (it.文件夹 && it.条目) walk(it.条目);
    else if (it.名称) {
      if (it.文件) {
        const fp = it.文件.replace('世界书/', '').replace(/\.(txt|yaml)$/, '');
        fileToName.set(fp, it.名称);
      }
    }
  }
}
walk(index.条目);

const files = [];
function walkDir(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p);
    else files.push(p);
  }
}
walkDir('src/同级生2/世界书');

const RE = /['"]([^'"\s]+(?:\/[^'"\s]+)+)['"]/g;
let found = 0;
const knownPrefixes = ['角色/', '地理/', '事件/', 'D0指令/', 'EJS预处理/', '阶段指导/', '时间线/', '扮演准则/', '世界观/', '变量/', '界面/', '系统/', '寒假日程调度器/'];
for (const f of files) {
  const c = fs.readFileSync(f, 'utf-8');
  const rel = f.split(path.sep).join('/').split('同级生2/世界书/')[1];
  let m;
  while ((m = RE.exec(c))) {
    const s = m[1];
    if (s.includes('http') || s.includes('://') || s.includes('\\')) continue;
    const isKnownPath = knownPrefixes.some((p) => s.startsWith(p));
    if (!isKnownPath) continue;
    if (fileToName.has(s) && fileToName.get(s) !== s) {
      found++;
      const line = c.slice(0, m.index).split('\n').length;
      console.log(`⚠ ${rel}:${line}  '${s}' → 条目名 '${fileToName.get(s)}'`);
    }
  }
}
console.log('漏网路径引用数:', found);

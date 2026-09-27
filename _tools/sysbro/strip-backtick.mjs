// 去掉条目内容里的 Markdown 反引号（保留 MVU 官方模板 变量输出格式.txt 不动）
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日';
const SKIP = new Set(['世界书/变量/变量输出格式.txt']);
const EXTS = new Set(['.txt', '.yaml']);

const walk = (dir) => {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (EXTS.has(path.extname(e.name))) out.push(p);
  }
  return out;
};

let changed = 0;
for (const p of walk(ROOT)) {
  const rel = path.relative(ROOT, p).split(path.sep).join('/');
  if (SKIP.has(rel)) continue;
  const src = fs.readFileSync(p, 'utf8');
  if (!src.includes('`')) continue;
  const out = src.replace(/`/g, '');
  fs.writeFileSync(p, out);
  changed++;
  console.log('cleaned:', rel);
}
console.log('\n改到', changed, '个文件');

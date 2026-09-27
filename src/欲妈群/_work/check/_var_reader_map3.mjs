// 变量读者地图 v3：逐字段统计「非声明文件里的出现次数」，并区分是 EJS 读点还是散文提及
import fs from 'fs';
import path from 'path';

const CARD = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';
const schema = fs.readFileSync(path.join(CARD, 'schema.ts'), 'utf8');

const DECL = new Set([
  '世界书/变量/变量列表.txt', '世界书/变量/变量更新规则.yaml', '世界书/变量/initvar.yaml',
  '世界书/变量/变量输出格式.txt', 'schema.ts',
]);

// 字段名：schema 里所有中文/英文字段键
const names = new Set();
for (const line of schema.split(/\r?\n/)) {
  const m = line.match(/^\s{2,}([^\s:{}]+)\s*:\s*\S/);
  if (!m) continue;
  const n = m[1];
  if (/^(type|check|range|value|\/\/|const|export|import|function|return)$/.test(n)) continue;
  if (/^[A-Za-z_$]+$/.test(n) && /Schema$|^z$|^str$|^num$|^pct$|^bool$|^clamp$/.test(n)) continue;
  names.add(n);
}

const files = [];
const walk = d => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|_backup|_work|\.git/.test(e.name)) walk(p); continue; }
    const rel = path.relative(CARD, p).split(path.sep).join('/');
    if (DECL.has(rel)) continue;
    if (/tavern-cards-state|欲妈群\.json$|schema\.json$|\.md$/.test(rel)) continue;
    if (!/\.(txt|html|yaml|ts|cjs|mjs)$/.test(rel)) continue;
    files.push({ rel, t: fs.readFileSync(p, 'utf8') });
  }
};
walk(CARD);
console.log('字段 ' + names.size + ' 个｜候选读者文件 ' + files.length + ' 个\n');

// 每字段：哪些文件里出现；出现点是不是「读」（getvar / g() / .x / ["x"]）
const rows = [];
for (const n of names) {
  const 读 = new Set(), 提 = new Set();
  for (const f of files) {
    const c = f.t.split(n).length - 1;
    if (!c) continue;
    const 是读 = new RegExp(`getvar\\([^)]*${n}|\\bg\\(\\s*["'][^"']*${n}|[.\\["']${n}["'\\]]`).test(f.t);
    (是读 ? 读 : 提).add(f.rel.split('/').pop());
  }
  rows.push({ n, 读: [...读], 提: [...提] });
}
rows.sort((a, b) => (a.读.length + a.提.length) - (b.读.length + b.提.length));

console.log('【完全没有读点，也没被提及】');
rows.filter(r => !r.读.length && !r.提.length).forEach(r => console.log('   ' + r.n));
console.log();
console.log('【没有读点，只在散文/注释里被提到】（危险：像是死变量）');
rows.filter(r => !r.读.length && r.提.length).forEach(r => console.log('   ' + r.n.padEnd(12) + r.提.slice(0, 4).join(' , ')));
console.log();
console.log('【有读点】（前 60 个，按读点数升序）');
rows.filter(r => r.读.length).slice(0, 60).forEach(r => console.log('   ' + r.n.padEnd(12) + r.读.length + ' 处  ' + r.读.slice(0, 3).join(' , ')));

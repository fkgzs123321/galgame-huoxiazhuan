// 变量读者地图 v2：只在「非声明文件」里找**读点**（getvar / 状态栏 g() / JS 取属性）
import fs from 'fs';
import path from 'path';

const CARD = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';
const schema = fs.readFileSync(path.join(CARD, 'schema.ts'), 'utf8');

// 声明文件：它们天然会提到每个字段，不算读者
const DECL = [
  '世界书/变量/变量列表.txt', '世界书/变量/变量更新规则.yaml', '世界书/变量/initvar.yaml',
  '世界书/变量/变量输出格式.txt', 'schema.ts',
];

// ── 抽字段名
const names = new Set();
for (const m of schema.matchAll(/^\s{2,}([^\s:{}]+)\s*:\s*(?:z\.|str\(|num|pct|bool|pct\.)/gm)) {
  const n = m[1];
  if (!/^(type|check|range|value|const|export|import|function|return|\/\/)/.test(n)) names.add(n);
}
// 顶层与常用嵌套，手工补全（grep 用）
['元数据', '玩家', '郝佳期', '假阳具', '群', '阶段守卫', '设置'].forEach(n => names.add(n));

// ── 收集读者
const files = [];
const walk = d => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|_backup|_work|\.git/.test(e.name)) walk(p); return; }
    const rel = path.relative(CARD, p).replace(/\\/g, '/');
    if (DECL.includes(rel)) continue;
    if (/tavern-cards-state|欲妈群\.json$|schema\.json|\.md$/.test(rel)) continue;
    if (!/\.(txt|html|yaml|ts|cjs|mjs)$/.test(rel)) continue;
    try { files.push({ rel, t: fs.readFileSync(p, 'utf8') }); } catch { }
  }
};
walk(CARD);

// 读点模式：EJS getvar / 状态栏 g() / JS 属性取用
const PAT = {
  ejs: n => new RegExp(`getvar\\(\\s*['"\`]stat_data[^'"\`]*${n}`),
  g: n => new RegExp(`\\bg\\(\\s*['"][^'"]*${n}`),
  prop: n => new RegExp(`[.\\[]\\s*['"\`]?${n}['"\`]?\\s*[\\].)]?`),
};

const rows = [];
for (const n of names) {
  const hit = new Set();
  for (const f of files) {
    if (PAT.ejs(n).test(f.t) || PAT.g(n).test(f.t)) hit.add(f.rel);
    else if (/状态栏|D0|脚本/.test(f.rel) && PAT.prop(n).test(f.t)) hit.add(f.rel);
  }
  rows.push({ n, hit: [...hit] });
}
rows.sort((a, b) => a.hit.length - b.hit.length);

const none = rows.filter(r => !r.hit.length);
console.log('字段 ' + rows.length + ' 个｜零读点 ' + none.length + ' 个\n');
console.log('【零读点】');
none.forEach(r => console.log('   ' + r.n));
console.log();
console.log('【1~2 个读点】');
rows.filter(r => r.hit.length && r.hit.length <= 2).forEach(r => console.log('   ' + r.n.padEnd(12) + r.hit.map(x => x.split('/').pop()).join(' , ')));

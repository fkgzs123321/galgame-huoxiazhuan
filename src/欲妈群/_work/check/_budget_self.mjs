// 本卡自己的常驻口径：
//   ① 文件级 @@if 门控要认出来（引擎模板校验器只认 inline 条目的 gate，会把这些算成满额）
//   ② 同一个变量的多档（郝佳期_阶段1..5）互斥，整组只计最大的那一条
//   ③ 单条硬线 5000 字符
import fs from 'fs';
import path from 'path';

const st = JSON.parse(fs.readFileSync('tavern-cards-state.json', 'utf8'));
const man = st.entryManifest;

const read = p => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const gateOf = t => { if (!t) return ''; const m = t.match(/^@@if[^\n]*/); return m ? m[0] : ''; };

const rows = [];
for (const [cat, obj] of Object.entries(man)) {
  for (const [name, e] of Object.entries(obj)) {
    if (e.enabled === false) continue;
    const p = e.path || '';
    const t = read(p);
    const est = t === null ? 0 : t.length;
    const gate = gateOf(t);
    // 门控变量：取最后一个 getvar 的变量名
    const vars = [...gate.matchAll(/getvar\(\s*['"]stat_data\.([^'"]+)['"]/g)].map(x => x[1]);
    rows.push({
      cat, name, order: e.position?.order ?? 999,
      strategy: e.strategy?.type || '?',
      est, vars: vars.length ? vars[vars.length - 1] : null,
      keywords: e.keywords || [],
    });
  }
}

const cons = rows.filter(r => r.strategy === 'constant');
// ── 同变量多档：整组只计最大一条
const byVar = new Map();
for (const r of cons) if (r.vars) { if (!byVar.has(r.vars)) byVar.set(r.vars, []); byVar.get(r.vars).push(r); }
let absorbedChars = 0; const groups = [];
for (const [v, ms] of byVar) {
  if (ms.length < 2) continue;
  ms.sort((a, b) => b.est - a.est);
  const keep = ms[0];
  const drop = ms.slice(1).reduce((n, x) => n + x.est, 0);
  absorbedChars += drop;
  groups.push(`   ${v}：${ms.length} 档，只渲染 1 条（${keep.name} ${keep.est}），账面虚高 ${drop}`);
}
const gross = cons.reduce((n, r) => n + r.est, 0);
const net = gross - absorbedChars;

console.log('常驻条目 ' + cons.length + ' 条（关键词 ' + rows.filter(r => r.strategy === 'selective').length + ' 条不计）');
console.log('账面合计 ' + gross + '  ／ 真实合计 ' + net + '（扣掉同变量多档虚高 ' + absorbedChars + '）');
if (groups.length) { console.log('互斥组：'); groups.forEach(g => console.log(g)); }

const big = cons.filter(r => r.est > 5000).sort((a, b) => b.est - a.est);
console.log('\n单条 > 5000 的常驻条目 ' + big.length + ' 条：');
big.forEach(r => console.log('   ' + String(r.est).padStart(6) + '  order ' + String(r.order).padStart(5) + '  ' + r.cat + '/' + r.name));

console.log('\n常驻 top15（按真实大小）：');
[...cons].sort((a, b) => b.est - a.est).slice(0, 15)
  .forEach(r => console.log('   ' + String(r.est).padStart(6) + '  ' + r.cat + '/' + r.name + (r.vars ? '  [' + r.vars + ']' : '')));

const badOrder = rows.filter(r => r.order >= 200 && /MVU/.test(r.cat));
if (badOrder.length) console.log('\norder 越界的 MVU 条目 ' + badOrder.length + ' 条：' + badOrder.map(r => r.name + '=' + r.order).join('  '));

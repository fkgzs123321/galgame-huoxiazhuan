// 变量读者地图：schema 里每个字段 → 谁在读它（世界书/正则/脚本）
// 脚本只列线索，判定必须人工
import fs from 'fs';
import path from 'path';

const CARD = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';
const schema = fs.readFileSync(path.join(CARD, 'schema.ts'), 'utf8');

// ── 1. 抽字段（含嵌套层级）
const fields = [];   // {path, name}
const objStack = [];
{
  const lines = schema.split(/\r?\n/);
  let cur = null;
  for (const raw of lines) {
    const m = raw.match(/^(\s*)(?:const\s+)?(\w+)\s*=\s*z\.object\(\{/);
    if (m) { objStack.push({ indent: raw.length - raw.trimStart().length, name: m[2] }); continue; }
    const f = raw.match(/^(\s*)([^\s:{}]+)\s*:\s*(.+?),?\s*$/);
    if (f) {
      const indent = f[1].length;
      const name = f[2];
      if (/^(type|check|range|value)$/.test(name)) continue;
      // 只取在 z.object 内的（缩进 > 最近的 const 行）
      const top = objStack.filter(o => o.indent < indent).pop();
      if (!top) continue;
      const chain = objStack.filter(o => o.indent < indent).map(o => o.name);
      fields.push({ name, chain: chain.join('.'), indent });
    }
    if (/^\}/.test(raw) && objStack.length && (raw.length - raw.trimStart().length) < objStack[objStack.length - 1].indent) objStack.pop();
  }
}

// ── 2. 收集读者文本
const readers = [];
const walk = d => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|_backup|_work|\.git/.test(e.name)) walk(p); }
    else if (/\.(txt|html|yaml|ts|cjs|mjs|json|md)$/.test(e.name) && e.name !== 'schema.ts' && !/tavern-cards-state|欲妈群\.json/.test(e.name)) {
      try { readers.push({ p: p.replace(CARD + '\\', '').replace(CARD + '/', ''), t: fs.readFileSync(p, 'utf8') }); } catch { }
    }
  }
};
walk(CARD);

// ── 3. 逐字段统计
const uniq = new Map();
for (const f of fields) if (!uniq.has(f.name)) uniq.set(f.name, f);

const rows = [];
for (const [name, f] of uniq) {
  const hits = [];
  for (const r of readers) {
    const n = r.t.split(name).length - 1;
    if (n) hits.push(r.p + (n > 1 ? '×' + n : ''));
  }
  rows.push({ name, chain: f.chain, hits });
}
rows.sort((a, b) => a.hits.length - b.hits.length);

console.log('schema 字段 ' + uniq.size + ' 个；读者文件 ' + readers.length + ' 个\n');
const none = rows.filter(r => !r.hits.length);
console.log('【零读者（没人读）】' + none.length + ' 个');
none.forEach(r => console.log('   ' + r.name));
console.log();
const few = rows.filter(r => r.hits.length && r.hits.length <= 2);
console.log('【1~2 个读者】' + few.length + ' 个');
few.forEach(r => console.log('   ' + r.name.padEnd(14) + r.hits.join(' , ')));
console.log();
const many = rows.filter(r => r.hits.length > 2);
console.log('【3+ 个读者】' + many.length + ' 个（略列前 12）');
many.slice(0, 12).forEach(r => console.log('   ' + r.name.padEnd(14) + r.hits.length + ' 处'));
console.log('\n（正文里可能有同名中文词误命中，判定时需人工确认）');

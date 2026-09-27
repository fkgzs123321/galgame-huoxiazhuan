// 跨条目重复审计：拿常驻条目两两比对 14 字指纹，列出「同一句话在两个条目里各写一遍」
// 脚本只列线索，判定必须人工（有些重复是必要的宪法重申）
import fs from 'fs';

const st = JSON.parse(fs.readFileSync('tavern-cards-state.json', 'utf8'));
const man = st.entryManifest;
const rows = [];
for (const [cat, obj] of Object.entries(man)) {
  for (const [name, e] of Object.entries(obj)) {
    if (e.enabled === false) continue;
    if (e.strategy?.type !== 'constant') continue;   // 只审常驻
    const p = e.path || '';
    let t = ''; try { t = fs.readFileSync(p, 'utf8'); } catch { continue; }
    rows.push({ name, cat, text: t.replace(/\s+/g, '') });
  }
}

// 正文过滤：只留汉字为主、不含 EJS/JSON/表格符号的片段（不加这层，EJS 模板与多档门控行会淹没结果）
const 汉字占比 = s => { const m = s.match(/[一-龥]/g); return m ? m.length / s.length : 0; };
const 是正文 = s => 汉字占比(s) >= 0.85 && !/[<>{}|=`"'()[]｜]/.test(s);

// 噪音过滤：表格线、纯符号、常见字段名
const NOISE = /^[|\-─—\s·。，、：；（）()【】\[\]{}0-9.]+$/;
const COMMON = ['{{user}}', 'stat_data', 'getvar', 'group_msg', 'StatusPlaceHolderImpl'];

const K = 16;
const idx = new Map();  // 指纹 → [{name, at}]
for (const r of rows) {
  for (let i = 0; i + K <= r.text.length; i++) {
    const s = r.text.slice(i, i + K);
    if (NOISE.test(s) || !是正文(s)) continue;
    if (COMMON.some(c => s.includes(c.slice(0, 6)) && c.length > 8)) continue;
    if (!idx.has(s)) idx.set(s, []);
    idx.get(s).push(r.name);
  }
}

// 汇总成「条目对 → 重复片段数」，并保留样例
const pair = new Map();
for (const [s, names] of idx) {
  const uniq = [...new Set(names)];
  if (uniq.length < 2) continue;
  for (let i = 0; i < uniq.length; i++) for (let j = i + 1; j < uniq.length; j++) {
    const k = uniq[i] + ' ‖ ' + uniq[j];
    if (!pair.has(k)) pair.set(k, new Map());
    const m = pair.get(k);
    m.set(s, (m.get(s) || 0) + 1);
  }
}

const out = [...pair.entries()]
  .map(([k, m]) => [k, m.size, [...m.keys()].slice(0, 4)])
  .sort((a, b) => b[1] - a[1]);

console.log('常驻条目 ' + rows.length + ' 条；发现重叠的条目对 ' + out.length + ' 对\n');
for (const [k, n, samples] of out.slice(0, 24)) {
  console.log('【' + k + '】 重叠 ' + n + ' 个片段');
  samples.forEach(s => console.log('     「' + s + '」'));
}

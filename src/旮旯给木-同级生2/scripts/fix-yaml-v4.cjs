// 剩余 40 个的三类根因（诊断已明确）：
//   ① 生成器带出 ` ``` ` 围栏（会被重生成冲回来 → 必须改生成器，不只改文件）
//   ② 键的位置上放了 `- ` 列表项（"A block sequence may not be used as an implicit map key"）→ 缩进 +2 让它挂到上一个键下
//   ③ 键的位置上的裸文本（以 `**` / `★` / `→` / `⚠️` 开头）→ 补 `说明: ` 键名
// 严格按教训：单文件验证 → 全量 → 验证
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const WB = path.join(__dirname, '..', '世界书');

const 去围栏 = t => t.split(/\r?\n/).filter(l => !/^\s*```[a-z]*\s*$/.test(l)).join('\n');
const 补键名 = t => t.split(/\r?\n/).map(l => {
  const ind = l.match(/^ */)[0].length;
  if (!l.trim() || ind === 0) return l;
  if (/^\s*(-|#|\.\.\.|\||>)/.test(l)) return l;              // 列表/注释/块标量
  if (/:\s/.test(l) || /:\s*$/.test(l)) return l;              // 已是键值
  return ' '.repeat(ind) + '说明: ' + l.trim();                // 裸文本 → 补键名
}).join('\n');

// ── ① 单文件验证（用 关系封闭.yaml 和 八十八学园.yaml 两个真实样例）──
const 样例 = ['世界观/底座_nanpa2/关系封闭.yaml', '地理/八十八学园.yaml']
  .map(r => path.join(WB, r)).filter(fs.existsSync);
for (const p of 样例) {
  const 前 = fs.readFileSync(p, 'utf8');
  const 后 = 补键名(去围栏(前));
  let e1 = 0, e2 = 0;
  try { YAML.parse(前); } catch { e1 = 1; }
  try { YAML.parse(后); } catch (e) { e2 = 1; console.log('   ' + path.basename(p) + ' 修后仍坏：' + e.message.split('\n')[0].slice(0, 50)); }
  console.log('① ' + path.basename(p) + '：修前 ' + (e1 ? '坏' : '好') + ' → 修后 ' + (e2 ? '坏' : '好'));
  if (e1 === 1 && e2 === 0) fs.writeFileSync(p, 后);
}

// ── ② 全量 ──
const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.yaml$/.test(f)) 全.push(p); } })(WB);
let 改 = 0;
for (const p of 全) {
  const t = fs.readFileSync(p, 'utf8');
  const n = 补键名(去围栏(t));
  if (n !== t) { fs.writeFileSync(p, n); 改++; }
}
console.log('② 全量：改 ' + 改 + ' 个文件');

// ── ③ 验证 ──
const bad = [];
for (const p of 全) {
  try { YAML.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) {
    const ln = e.linePos ? e.linePos[0].line : 0;
    const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    bad.push([path.basename(p), ln, (L[ln - 1] || '').trim().slice(0, 50), e.message.split('\n')[0].slice(0, 42)]);
  }
}
console.log('③ YAML 可解析 ' + (全.length - bad.length) + '/' + 全.length + (bad.length ? '' : ' ✅ 全部通过'));
bad.slice(0, 8).forEach(([f, l, t, m]) => console.log('   ' + f + ':' + l + '  ' + m + '\n        ' + t));

// 真根因：值 / 列表项以 `*` 开头（`**加粗**`）→ YAML 当成别名（anchor/alias 语法）→ 解析失败
// 修法：给这类值加双引号。**严格按教训来**：先单文件验证 → 再全量 → 再验证
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const WB = path.join(__dirname, '..', '世界书');

const 修 = (t) => t.split(/\r?\n/).map(l => {
  // ① 键值：值以 * 开头
  let m = l.match(/^(\s*)([^#\s][^:]*):\s+(\*.*)$/);
  if (m && !/^["']/.test(m[3])) return m[1] + m[2] + ': ' + JSON.stringify(m[3]);
  // ② 列表项：内容以 * 开头
  m = l.match(/^(\s*)-\s+(\*.*)$/);
  if (m && !/^["']/.test(m[2])) return m[1] + '- ' + JSON.stringify(m[2]);
  return l;
}).join('\n');

// ── ① 单文件验证（教训：先验证一个）──
const 样例 = path.join(WB, '角色/底座_nanpa2/鸣泽唯/基础信息.yaml');
{
  const 前 = fs.readFileSync(样例, 'utf8');
  const 后 = 修(前);
  let e1 = 0, e2 = 0;
  try { YAML.parse(前); } catch (e) { e1 = 1; }
  try { YAML.parse(后); } catch (e) { e2 = 1; }
  console.log('① 单文件验证（鸣泽唯/基础信息）：修前 ' + (e1 ? '坏' : '好') + ' → 修后 ' + (e2 ? '坏' : '好'));
  if (e1 === 0) { console.log('   ⚠ 样例本来是好的，全量前先不写'); }
  if (e2) { console.log('   ❌ 修法无效，停止，不批量'); process.exit(1); }
  if (e1 === 1 && e2 === 0) fs.writeFileSync(样例, 后);
}

// ── ② 全量 ──
const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.yaml$/.test(f)) 全.push(p); } })(WB);
let 改 = 0;
for (const p of 全) {
  const t = fs.readFileSync(p, 'utf8');
  const n = 修(t);
  if (n !== t) { fs.writeFileSync(p, n); 改++; }
}
console.log('② 全量：改 ' + 改 + ' 个文件');

// ── ③ 验证 + 报告剩余（带真实内容）──
const bad = [];
for (const p of 全) {
  try { YAML.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) {
    const ln = e.linePos ? e.linePos[0].line : 0;
    const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    bad.push([path.basename(p), ln, (L[ln - 1] || '').trim().slice(0, 55), e.message.split('\n')[0].slice(0, 40)]);
  }
}
console.log('③ YAML 可解析 ' + (全.length - bad.length) + '/' + 全.length + (bad.length ? '' : ' ✅ 全部通过'));
bad.slice(0, 8).forEach(([f, l, t, m]) => console.log('   ' + f + ':' + l + '  ' + m + '\n        ' + t));

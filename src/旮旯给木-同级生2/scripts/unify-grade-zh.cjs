// 统一等级为中文（rules.md：全文简体中文，含变量名）
//   micro→微 ／ mid→中 ／ strong→强 ／ extreme→极 ／ lock→锁
// ★ 数据层（YAML）全改中文
// ★ HTML 层：**显示文字用中文，CSS 类名保留英文**（类名是样式，改动会破坏现有 CSS）
//   → 加一个「中文 → 英文类名」映射，并保留「英文 → 中文」的兼容（AI 可能写英文）
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const WB = path.join(D, '世界书');

const 映射 = { micro: '微', mid: '中', strong: '强', extreme: '极', lock: '锁' };
const 反 = { 微: 'micro', 中: 'mid', 强: 'strong', 极: 'extreme', 锁: 'lock' };

// ── 数据层 ──
let 文件数 = 0, 处 = 0;
const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(WB);
for (const p of 全) {
  let t = fs.readFileSync(p, 'utf8');
  const o = t;
  for (const [en, zh] of Object.entries(映射)) {
    const re = new RegExp('\\b' + en + '\\b', 'g');
    处 += (t.match(re) || []).length;
    t = t.replace(re, zh);
  }
  if (t !== o) { fs.writeFileSync(p, t); 文件数++; }
}
console.log('① YAML 数据层：' + 处 + ' 处 → 中文（' + 文件数 + ' 个文件）');

// ── HTML 层 ──
{
  const p = path.join(D, '正则/状态栏界面.html');
  let h = fs.readFileSync(p, 'utf8');
  const 前 = h;
  // LV 表的键改中文，值里的 label 已经是中文
  h = h.replace("var LV = {\n    micro:   { label: '微'", "var LV = {\n    微: { label: '微'");
  h = h.replace(/^\s*(micro|mid|strong|extreme|lock):\s*\{\s*label: '([^']+)'/gm, (m, en, zh) => "\n    " + zh + ": { label: '" + zh + "'");
  // 加归一化映射（中文 → 英文类名）＋ 英文兼容
  if (!h.includes('类名映射')) {
    h = h.replace(/(var LV = \{[\s\S]*?\};)/, "$1\n  /* 等级统一为中文；CSS 类名保留英文（改动会破坏样式）；英文写法保留兼容 */\n  var 类名映射 = { 微: 'micro', 中: 'mid', 强: 'strong', 极: 'extreme', 锁: 'lock' };\n  var 中文映射 = { micro: '微', mid: '中', strong: '强', extreme: '极', lock: '锁' };\n  function 归一(v) { v = String(v || ''); return LV[v] ? v : (中文映射[v] || '微'); }");
  }
  // 用归一化的等级取值
  h = h.replace(/var lv = LV\[o\.等级\] \|\| LV\.micro;/g, "var 等 = 归一(o.等级), lv = LV[等];");
  h = h.replace(/var lv = LV\[o\.等级\] \|\| LV\[lv\.micro\];/g, "var 等 = 归一(o.等级), lv = LV[等];");
  // 生成类名时用英文字典
  h = h.replace(/'<span class="lv ' \+ \(o\.等级 \|\| 'micro'\) \+ '">' \+ lv\.label/, "'<span class=\"lv ' + (类名映射[等] || 'micro') + '\">' + lv.label");
  h = h.replace(/'<span class="lv ' \+ \(o\.等级 \|\| 'micro'\) \+ '">' \+ lv\.label/, "'<span class=\"lv ' + (类名映射[等] || 'micro') + '\">' + lv.label");
  // 兜底：任何残留的 'lv ' + o.等级
  h = h.replace(/'lv ' \+ \(o\.等级 \|\| 'micro'\)/g, "'lv ' + (类名映射[等] || 'micro')");
  // 判定结果里的 等级 字段（写变量时）→ 中文
  h = h.replace(/等级: lv\.label/g, "等级: lv.label");
  if (h !== 前) { fs.writeFileSync(p, h); console.log('② 状态栏界面：LV 表键中文 + 类名映射 + 英文兼容'); }
  else console.log('② 状态栏界面：无需改（或替换未命中，需手查）');
}

// ── 开局界面（无等级概念，但检查残留）──
{
  const p = path.join(D, '正则/开局选择界面.html');
  let h = fs.readFileSync(p, 'utf8');
  const 残留 = (h.match(/\b(micro|mid|strong|extreme|lock)\b/g) || []).length;
  if (残留) console.log('③ 开局界面残留英文：' + 残留 + ' 处（是 tag 的 CSS 类名，属样式，保留）');
}

// ── 复核 ──
let 剩 = 0;
for (const p of 全) 剩 += (fs.readFileSync(p, 'utf8').match(/\b(micro|mid|strong|extreme|lock)\b/g) || []).length;
console.log('复核：YAML 层残留英文 ' + 剩 + ' 处' + (剩 ? ' ❌' : ' ✅'));

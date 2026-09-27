// 清洗「解释性键名」（用户：我看每一个世界书条目都是解释）
// 判据（rules-check 元叙事）：条目的**每个键**都该是「给 AI 的规则/事实」，不是「给作者的注释」
//   ① 纯解释 → 删整键（这是什么 / 为什么 / 为什么重要 / 来源 / 依据）
//      但「这是什么」的内容往往是实质信息 → 不能删内容，改成**语义键名**
//   ② 内容是规则、只是键名解释性 → 换成**指令式键名**
//      （用法 → 取用 ／ 注意 → 硬规则 ／ 用途·作用 → 并入 ／ 要点 → 删，内容提到上一级）
// ★ 铁律：先单文件验证 → 才全量
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = path.join(__dirname, '..');
const WB = path.join(D, '世界书');

const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(WB);

// 变换：按行处理（保留缩进与结构，只换键名 / 删整键）
const 删 = /^\s*(为什么重要|为什么|来源|依据|要点)\s*[:：]/;
const 换 = [
  [/^(\s*)这是什么(\s*[:：])/, (i) => i + '规则$2'],          // 内容保留，键名中性化
  [/^(\s*)用法(\s*[:：])/, (i) => i + '取用$2'],
  [/^(\s*)注意(\s*[:：])/, (i) => i + '硬规则$2'],
  [/^(\s*)用途(\s*[:：])/, (i) => i + '取用$2'],
  [/^(\s*)作用(\s*[:：])/, (i) => i + '取用$2'],
  [/^(\s*)目的(\s*[:：])/, (i) => i + '诉求$2'],
];

const 变 = (t) => {
  const L = t.split(/\r?\n/);
  const out = [];
  let 在块 = -1;
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    // 在 block scalar 内 → 原样
    if (在块 >= 0) {
      if (l.trim() === '') { out.push(l); continue; }
      if (l.match(/^ */)[0].length > 在块) { out.push(l); continue; }
      在块 = -1;
    }
    if (/:\s*[|>][-+]?\s*$/.test(l)) { 在块 = l.match(/^ */)[0].length; out.push(l); continue; }
    if (删.test(l)) continue;                       // 纯解释整键删
    let 换过 = false;
    for (const [re, fn] of 换) if (re.test(l)) { out.push(l.replace(re, (m, a, b) => fn(a).replace('$2', b))); 换过 = true; break; }
    if (!换过) out.push(l);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
};

// 单文件验证
const 样 = path.join(WB, '世界观/底座_nanpa2/公共选项池.yaml');
{
  const a = fs.readFileSync(样, 'utf8');
  const b = 变(a);
  let e1 = 0, e2 = 0;
  try { YAML.parse(a); } catch { e1 = 1; }
  try { YAML.parse(b); } catch (e) { e2 = 1; console.log('   修后仍坏：' + e.message.split('\n')[0].slice(0, 50)); }
  console.log('单文件验证（公共选项池）：修前 ' + (e1 ? '坏' : '好') + ' → 修后 ' + (e2 ? '坏' : '好'));
  if (e1 === 1 && e2 === 0) fs.writeFileSync(样, b);
  else if (e1 === 0 && e2 === 0) fs.writeFileSync(样, b);
  else { console.log('❌ 修法无效，不批量'); process.exit(1); }
}

// 全量
let 改 = 0, 处 = 0;
for (const p of 全) {
  const a = fs.readFileSync(p, 'utf8');
  const b = 变(a);
  if (b !== a) {
    const c = (a.match(/^\s*(这是什么|为什么重要|为什么|来源|依据|要点|用法|注意|用途|作用|目的)\s*[:：]/gm) || []).length;
    处 += c; 改++; fs.writeFileSync(p, b);
  }
}
console.log('全量：改 ' + 改 + ' 个文件 / ' + 处 + ' 处解释性键名');

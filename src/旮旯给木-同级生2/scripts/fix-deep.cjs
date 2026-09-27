// 第四轮深查的整改
// ① 我上轮「照 euphoria 补齐」补多了：`主角.身体.*`（忍耐度/实感/累计次数/敏感度/身体痕迹）
//    → **全卡无人引用** = 死变量（审计铁律：无落脚点就删）
//    原则修正：补变量只补「**条目/前端真的引用了的**」，不是「euphoria 有的都补」
// ② `主角.状态` 与 `她.状态` 是**同一件事两个载体**（四态：在线/暂停/离线/冻结）
//    - `阶段指导.yaml` 用 `主角.状态`（条目 = 权威）
//    - 我的 HTML 用 `她.状态`
//    → 按「变量以条目为准」：HTML 改读 `主角.状态`，删 `她.状态`
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = path.join(__dirname, '..');
const WB = path.join(D, '世界书');
const F = path.join(WB, '变量/initvar.yaml');
const 记 = [];

const o = YAML.parse(fs.readFileSync(F, 'utf8'));

// ① 删死变量
if (o.主角 && o.主角.身体) {
  const 子 = Object.keys(o.主角.身体);
  // 先确认真的无人引用
  const 全 = [];
  (function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt|html)$/.test(f)) 全.push(p); } })(WB);
  for (const f of fs.readdirSync(path.join(D, '正则'))) if (/\.html$/.test(f)) 全.push(path.join(D, '正则', f));
  const 文本 = 全.map(p => fs.readFileSync(p, 'utf8')).join('\n');
  const 被用 = 子.filter(k => new RegExp('(身体\\.|身体\\s*\\?\\s*\\.)' + k).test(文本) || 文本.includes('.' + k));
  if (!被用.length) { delete o.主角.身体; 记.push('① 删 `主角.身体.*`（' + 子.join('/') + '）—— 全卡零引用，死变量'); }
  else 记.push('① `主角.身体.*` 中 ' + 被用.join('/') + ' 被引用 → 保留');
}

// ② 统一四态的载体
if (o.她 && '状态' in o.她) { delete o.她.状态; 记.push('② 删 `她.状态`（与 `主角.状态` 同一件事两个载体）'); }
记.push('   四态载体统一为 `主角.状态`（`阶段指导.yaml` 用的是它，条目为权威）');

fs.writeFileSync(F, YAML.stringify(o, { lineWidth: 0 }));

// ③ HTML 改读 主角.状态
{
  const p = path.join(D, '正则/状态栏界面.html');
  let h = fs.readFileSync(p, 'utf8');
  const 前 = h;
  h = h.split("she.状态").join("p.状态");   // p = get('主角')
  if (h !== 前) { fs.writeFileSync(p, h); 记.push('③ HTML 的状态灯改读 `主角.状态`（原 `她.状态`）'); }
  else 记.push('③ HTML 无需改（已读 主角.状态）');
}

console.log(记.join('\n'));

// ④ 复跑全部检查
const { execFileSync } = require('child_process');
for (const s of ['audit-varpaths', 'audit-deep', 'verify-ejs2']) {
  try { console.log('\n' + execFileSync('node', [path.join(D, 'scripts', s + '.cjs')], { encoding: 'utf8' }).trim().split('\n').slice(0, 8).join('\n')); } catch (e) { console.log(String(e.stdout || e.message).slice(0, 300)); }
}

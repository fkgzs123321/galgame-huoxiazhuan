// ════════════════════════════════════════════════════════════
// build-engine.mjs · 从 引擎模板/引擎能力/*.txt 抽取真实引擎代码
//
// ★ 为什么不手抄：手抄就会出现「抄错一行、漏一个 clamp」这类无法验证的偏差。
//   抽取 = 引擎就是规范里那一份，可 diff 可复现。
//   这与 引擎模板/scripts/test-judge.mjs 的做法一致。
//
// 产物: 脚本/引擎.js —— 可直接内联进面板的纯 JS（零内容，只有引擎能力）
// ════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';

const 根 = path.resolve('引擎模板/引擎能力');
const 引擎文件 = [
  ['判定引擎', '判定引擎.txt'],
  ['成长引擎', '成长引擎.txt'],
  ['战斗引擎', '战斗引擎.txt'],
];

const 段 = [];
const 清单 = [];

for (const [名, 文件] of 引擎文件) {
  const p = path.join(根, 文件);
  if (!fs.existsSync(p)) { console.error('[FAIL] 找不到 ' + p); process.exit(2); }
  const raw = fs.readFileSync(p, 'utf8');
  const 块 = [...raw.matchAll(/<%([\s\S]*?)%>/g)].map(m => m[1]);
  if (!块.length) { console.error('[FAIL] ' + 文件 + ' 里没有 <% %> 代码块'); process.exit(2); }
  const code = 块.join('\n');
  段.push(`/* ══════ ${名}（抽自 引擎模板/引擎能力/${文件}，${块.length} 个代码块）══════ */\n` + code);
  清单.push({ 名, 文件, 块数: 块.length, 字符: code.length });
}

// ★ 每个引擎独立 IIFE —— 防跨文件重名（战斗引擎里有 function clone，成长引擎里也有）
//   this 指向同一个 lib，所以方法仍然挂在同一个对象上
//
// ★ getvar 用【参数】传进去，不能在文件顶层写 `var getvar = ...` ——
//   同作用域里 var 声明会提升，`typeof getvar` 当场就是 'undefined'，
//   守门永远走兜底分支，面板里的真 getvar 被遮蔽，骰子种子永远读不到。
const body = 段.map(s => `(function(getvar){\n${s}\n}).call(lib, 外部getvar);`).join('\n\n');

const 头 = `/* 乱马二分之一 · 面板引擎（自动生成，不要手改）
 * 由 _work/build-engine.mjs 从 引擎模板/引擎能力/ 抽取
 * 引擎 = 判定引擎 E3 + 成长引擎 C4/C5/C6 + 战斗引擎
 * 红线: 本文件不出现任何世界观 / 角色 / 地点 / 道具名
 */
var lib = {};
var 外部getvar = (typeof getvar === 'function') ? getvar : function () { return null; };
`;

const 尾 = `
return lib;
`;

fs.mkdirSync('src/乱马二分之一/脚本', { recursive: true });
fs.writeFileSync('src/乱马二分之一/脚本/引擎.js', 头 + body + 尾);

console.log('已生成 脚本/引擎.js');
for (const c of 清单) console.log('  ' + c.名.padEnd(6) + c.文件.padEnd(16) + c.块数 + ' 块  ' + c.字符 + ' 字符');
console.log('  合计 ' + 清单.reduce((s, c) => s + c.字符, 0) + ' 字符（引擎本体，零内容）');

// 冒烟：能不能 load 起来并且方法都在
const src = fs.readFileSync('src/乱马二分之一/脚本/引擎.js', 'utf8');
const fn = new Function(src.replace(/^\/\*[\s\S]*?\*\//, ''));
const L = fn();
const 应有 = ['judge', 'judgeTier', 'judgePower', 'judgeRequire', 'derive', 'overall',
  'rateFromDiff', 'snapshot', 'entrance', 'strike', 'fight', 'multi', 'summarize', 'injectRule', '受伤档'];
const 缺 = 应有.filter(k => typeof L[k] !== 'function');
console.log(缺.length ? '  ✗ 缺方法: ' + 缺.join(', ') : '  ✓ 15 个入口方法全部就位');

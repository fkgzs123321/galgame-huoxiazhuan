// ════════════════════════════════════════════════════════════
// build-engine.mjs · 从 引擎模板/引擎能力/*.txt 抽取真实引擎代码
//
// ★ 为什么不手抄：手抄会出现「抄错一行、漏一个 clamp」这类无法验证的偏差。
//   抽取 = 引擎就是规范里那一份，可 diff 可复现。
//
// 产物: 脚本/引擎.js —— 可直接内联的纯 JS（零内容，只有引擎能力）
// ════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';

const 根 = path.resolve('引擎模板/引擎能力');

/** 本卡用到的引擎。★ NSFW引擎 不接入（见 design-spec-v2.md 第八节） */
const 引擎文件 = [
  ['判定引擎', '判定引擎.txt'],
  ['成长引擎', '成长引擎.txt'],
  ['战斗引擎', '战斗引擎.txt'],
  ['物品引擎', '物品引擎.txt'],
  ['状态引擎', '状态引擎.txt'],
  ['任务引擎', '任务引擎.txt'],
  ['关系引擎', '关系引擎.txt'],
];

const 段 = [];
const 清单 = [];

for (const [名, 文件] of 引擎文件) {
  const p = path.join(根, 文件);
  if (!fs.existsSync(p)) {
    console.error('[FAIL] 找不到 ' + p);
    process.exit(2);
  }
  const raw = fs.readFileSync(p, 'utf8');
  const 块 = [...raw.matchAll(/<%([\s\S]*?)%>/g)].map(m => m[1]);
  if (!块.length) {
    console.error('[FAIL] ' + 文件 + ' 里没有 <% %> 代码块');
    process.exit(2);
  }
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

const 头 = `/* 活侠传 · 面板引擎（自动生成，不要手改）
 * 由 _work/build-engine.mjs 从 引擎模板/引擎能力/ 抽取
 * 引擎 = 判定 E3 + 成长 C1-4 + 战斗 + 物品 E7-8 + 状态 E13 + 任务 E9 + 关系 E15
 *
 * 红线: 本文件不出现任何世界观 / 角色 / 地点 / 道具名。
 * 具体的前置条件、数值、名称全部来自契约层（世界书/剧本）。
 */
var lib = {};
var 外部getvar = (typeof getvar === 'function') ? getvar : function () { return null; };
`;

const 尾 = `
return lib;
`;

const 目标 = 'src/活侠传/脚本/引擎.js';
fs.mkdirSync(path.dirname(目标), { recursive: true });
fs.writeFileSync(目标, 头 + body + 尾);

console.log('已生成 ' + 目标);
for (const c of 清单) {
  console.log('  ' + c.名.padEnd(8) + c.文件.padEnd(16) + c.块数 + ' 块  ' + c.字符 + ' 字符');
}
console.log('  合计 ' + 清单.reduce((s, c) => s + c.字符, 0) + ' 字符（引擎本体，零内容）');

// ── 同时生成 ESM 版，供 TS 模块 import（前端 / 引擎桥 / 脚本都用它）──
//   ★ 为什么两份：引擎.js 是「可内联的裸 JS」（含 var lib 与 return lib），
//     ESM 版才能被 webpack 正常打包进 TS 模块。
//   两份由本脚本一次生成，**不可能不一致**。
const esm路径 = 'src/活侠传/脚本/引擎.esm.ts';
const esm = `/* 活侠传 · 面板引擎（ESM 版，自动生成，不要手改）
 * 由 _work/build-engine.mjs 从 引擎模板/引擎能力/ 抽取
 * 与 引擎.js 同源，一次生成，不可能不一致
 *
 * 红线: 本文件不出现任何世界观 / 角色 / 地点 / 道具名。
 */
/* eslint-disable */
// @ts-nocheck
const lib: Record<string, any> = {};
const 外部getvar = (typeof (globalThis as any).getvar === 'function') ? (globalThis as any).getvar : () => null;

${body.replace(/外部getvar/g, '外部getvar')}

export default lib;
`;
fs.writeFileSync(esm路径, esm);
console.log('已生成 ' + esm路径 + '（ESM 版，供 import）');

// ── 冒烟：能不能 load 起来，方法都在不在 ──
const src = fs.readFileSync(目标, 'utf8');
const fn = new Function(src.replace(/^\/\*[\s\S]*?\*\//, ''));
const L = fn();

const 应有关键方法 = [
  // 判定引擎 E3
  'judge', 'judgeTier', 'judgePower', 'judgeRequire',
  // 成长引擎 C1-4
  'derive', 'overall', 'canLevelUp',
  // 战斗引擎
  'rateFromDiff', 'snapshot', 'fight', 'summarize',
  // 物品引擎 E7-8
  'canAfford', 'meetGates', 'equip', 'consume',
  // 状态引擎 E13
  '挂上', '撤掉', '过一回合',
  // 任务引擎 E9 —— ★ 前置与错过的执行体
  'canTake', 'missPre', '扫期限', '结账',
  // 关系引擎 E15 —— ★ 双向好感
  '对键', '建关系', '查关系', '改关系', '查网',
];

const 缺 = 应有关键方法.filter(k => typeof L[k] !== 'function');
if (缺.length) {
  console.log('\n  ✗ 缺失方法: ' + 缺.join(', '));
  console.log('  （可用的方法: ' + Object.keys(L).filter(k => typeof L[k] === 'function').join(', ') + '）');
  process.exit(1);
}
console.log('\n  ✓ ' + 应有关键方法.length + ' 个关键入口全部就位');
console.log('  ✓ 引擎方法总数: ' + Object.keys(L).filter(k => typeof L[k] === 'function').length);

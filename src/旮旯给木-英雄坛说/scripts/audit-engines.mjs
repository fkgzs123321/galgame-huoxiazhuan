#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// audit-engines.mjs · 三个引擎的闭环审计
//
// 「闭环」= 五个环都得接上，缺一个就是断的：
//   ① 算法      核心计算在（机制/*.txt）
//   ② 契约参数   参数由契约层给，不写死在代码里（底座_yingxiong/*.yaml）
//   ③ 交互入口   玩家在面板上怎么触发它（正则/状态栏界面.html）
//   ④ 变量通路   写回哪些变量、AI 从哪读到（世界书/变量 + 扮演准则）
//   ⑤ 测试      有没有可复跑的断言
//
// ★ 这个脚本只做**存在性检查**，判定必须人工 —— 脚本只能证明「有代码」，
//   证明不了「那个按钮真的跑得起来」。
//
// 用法: node scripts/audit-engines.mjs
// ════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const D = path.resolve(path.join(__dirname, '..'));
const 读 = (p) => { try { return fs.readFileSync(path.join(D, p), 'utf8'); } catch { return ''; } };
const 读根 = (p) => { try { return fs.readFileSync(path.join(D, p), 'utf8'); } catch { return ''; } };
const 有 = (p) => fs.existsSync(path.join(D, p));

const 面板 = 读('正则/状态栏界面.html');
const 变量规则 = 读('世界书/变量/变量更新规则.yaml');
const 变量列表 = 读('世界书/变量/变量列表.yaml');
const 成长表 = 读('底座_yingxiong/成长公式表.yaml');

const 引擎 = [
  {
    名: '判定引擎 E3',
    算法文件: '机制/判定引擎.txt',
    算法标志: ['judgePower', 'judgeRequire', 'judgeTier'],
    契约文件: '世界书/世界观/引擎/反抗与判定.yaml',
    契约标志: ['基础成功率', '熟练度惩罚'],
    交互标志: [/data-fork="reject"/, /data-fork="watch"/, /data-fork="custom"/],
    交互说明: '三个按钮：眼睁睁看着 / 拒绝 / 自定义',
    通路标志: ['局面.判定结果', '局面.玩家拒绝'],
    AI读: ['扮演准则/判定引擎.yaml'], AI读词: ['判定结果', '直接采信'],
    测试: '../旮旯给木-同级生2/scripts/test-judge.mjs',
  },
  {
    名: '成长引擎 C1-C4',
    算法文件: '机制/成长引擎.txt',
    算法标志: ['levelCost', 'applyFeed', 'canAfford', 'derive'],
    契约文件: '底座_yingxiong/成长公式表.yaml',
    契约标志: ['k: 355.06', '反哺'],
    交互标志: [/data-act="(升级|请教|练功)"/, /请教/, /升级/],
    交互说明: '升级 / 请教 / 练功 / 打坐 的按钮',
    通路标志: ['技能', '潜能'],
    AI读: ['变量/变量更新规则.yaml'], AI读词: ['反哺回路'],
    测试: 'scripts/test-growth.mjs',
  },
  {
    名: '战斗引擎',
    算法文件: '机制/战斗引擎.txt',
    算法标志: ['this.fight', 'this.strike', 'summarize'],
    契约文件: '底座_yingxiong/成长公式表.yaml',
    契约标志: ['命中与闪避', '大成功'],
    交互标志: [/data-act="fight"/, /动手/, /开打/],
    交互说明: '发起战斗的按钮',
    通路标志: ['局面.战斗结果', '生命当前'],
    AI读: ['变量/变量更新规则.yaml'], AI读词: ['战斗结果'],
    测试: 'scripts/test-combat.mjs',
  },
];

const 勾 = (b) => (b ? '✅' : '❌');
let 断的 = [];

console.log('='.repeat(76));
console.log('三引擎闭环审计 · 五环：算法 / 契约 / 交互 / 通路 / 测试');
console.log('='.repeat(76));

for (const e of 引擎) {
  const 算法文 = 读(e.算法文件);
  const 契约文 = 读(e.契约文件);
  const 算法 = e.算法标志.every((s) => 算法文.includes(s));
  const 契约 = e.契约标志.every((s) => 契约文.includes(s));
  const 交互 = e.交互标志.some((r) => r.test(面板));
  const 通路 = e.通路标志.every((s) => (面板 + 变量规则 + 变量列表).includes(s));
  const 测试 = fs.existsSync(path.resolve(D, e.测试));
  // AI读 是相对「世界书/」的条目路径；AI读词 是要在里面找到的关键词
  const AI读文 = (e.AI读 || []).map((x) => 读('世界书/' + x)).join('');
  const AI读 = (e.AI读 || []).every((x) => 读('世界书/' + x).length > 0)
    && (e.AI读词 || []).every((s) => (AI读文 + 变量规则).includes(s));

  console.log('\n■ ' + e.名);
  console.log('  ① 算法      ' + 勾(算法) + '  ' + e.算法文件 + '  [' + e.算法标志.join(' / ') + ']');
  console.log('  ② 契约参数  ' + 勾(契约) + '  ' + e.契约文件);
  console.log('  ③ 交互入口  ' + 勾(交互) + '  ' + e.交互说明);
  console.log('  ④ 变量通路  ' + 勾(通路) + '  写回 [' + e.通路标志.join(' / ') + ']');
  console.log('  ⑤ AI 读到   ' + 勾(AI读) + '  ' + e.AI读[0]);
  console.log('  ⑥ 测试      ' + 勾(测试) + '  ' + e.测试);

  const 缺 = [];
  if (!算法) 缺.push('算法');
  if (!契约) 缺.push('契约参数');
  if (!交互) 缺.push('★ 交互入口');
  if (!通路) 缺.push('变量通路');
  if (!AI读) 缺.push('AI 读到');
  if (!测试) 缺.push('测试');
  if (缺.length) 断的.push(e.名 + '：缺 ' + 缺.join('、'));
  console.log('  → ' + (缺.length ? '⚠️ 断在 ' + 缺.join('、') : '★ 闭环'));
}

console.log('\n' + '='.repeat(76));
if (!断的.length) console.log('三个引擎全部闭环 ✅');
else { console.log('未闭环 ' + 断的.length + ' 个：'); 断的.forEach((x) => console.log('  ✗ ' + x)); }
console.log('='.repeat(76));
console.log('★ 脚本只查「有没有」，查不出「那个按钮是否真的跑得起来」—— 后者要进酒馆实测');

#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// audit-engine-isolation.mjs · NSFW 引擎隔离检查
//
// 用户定的：NSFW 是**单独的通用引擎**，跟其他的要分开。
// 这个脚本把那条规则变成可复跑的东西 —— 否则「碰巧对」迟早会变成「悄悄错」。
//
// 五项：
//   ① NSFW 引擎存在且独立成文件
//   ② 其他引擎零 NSFW 词
//   ③ NSFW 引擎自包含（不引用其他引擎的函数名）
//   ④ 变量层有独立的 NSFW 块，且其他块不含 NSFW 字段
//   ⑤ 引擎清单 / 契约清单对得上
//
// ★ 改任何一个引擎之后都要跑一遍（和「改 initvar 要重跑 gen-schema」同一类纪律）
//
// 用法: node scripts/audit-engine-isolation.mjs
// ════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(__dirname, '..', '..', '..'));
const 引擎目录 = path.join(ROOT, '引擎模板', '引擎能力');
const 项目 = path.join(ROOT, 'src', '旮旯给木-英雄坛说');

const NSFW词 = ['怀孕', '罩杯', '三围', '乳房', '乳头', '性爱', '做爱', '插入', '精液', '射精',
  '高潮', '勃起', '湿润度', '敏感度', '后庭', '脱衣', '全裸', '发情', '腿交', '口交', '下体', '情色', '色情'];
// 其他引擎的函数名（NSFW 引擎不该出现它们 —— 自包含）
const 别的引擎函数 = ['judgePower', 'judgeRequire', 'judgeTier', 'levelCost', 'applyFeed', 'canAfford',
  'derive', 'rateFromDiff', '参战', 'strike', 'this.fight', '装备后输入', 'equipBonus', 'canTake', '结账',
  '挂上', '过一回合', '相克', '放得出吗', '可解锁', '拓扑序', '改图'];

let pass = 0, fail = 0;
const ok = (c, n, e = '') => { if (c) { pass++; console.log('  [OK]   ' + n); } else { fail++; console.log('  [FAIL] ' + n + (e ? '  → ' + e : '')); } };
const section = (t) => console.log('\n' + t);

console.log('='.repeat(74));
console.log('NSFW 引擎隔离检查');
console.log('='.repeat(74));

// ── ① 文件存在且独立 ──
section('① 文件隔离');
const 引擎们 = fs.readdirSync(引擎目录).filter((f) => f.endsWith('.txt'));
ok(引擎们.includes('NSFW引擎.txt'), 'NSFW引擎.txt 独立成文件');
ok(引擎们.length >= 7, `引擎共 ${引擎们.length} 份`);

// ── ② 其他引擎零 NSFW 词 ──
section('② 别的引擎不许沾 NSFW 词');
const nsfw文件 = fs.readFileSync(path.join(引擎目录, 'NSFW引擎.txt'), 'utf8');
for (const f of 引擎们) {
  if (f.includes('NSFW')) continue;
  const t = fs.readFileSync(path.join(引擎目录, f), 'utf8');
  const 命 = NSFW词.filter((w) => t.includes(w));
  ok(命.length === 0, f + ' 零污染', 命.join(' / '));
}

// ── ③ NSFW 引擎自包含 ──
section('③ NSFW 引擎要自包含（不依赖别的引擎）');
const 命函数 = 别的引擎函数.filter((x) => nsfw文件.includes(x));
ok(命函数.length === 0, 'NSFW 引擎不引用其他引擎的函数', 命函数.join(' / '));
ok(/this\.从外往里脱/.test(nsfw文件) && /this\.起周期/.test(nsfw文件) && /this\.推兴奋/.test(nsfw文件),
  '它带齐了自己那四件（穿着 / 两层 / 周期 / 反应）');

// ── ④ 变量层隔离 ──
section('④ 变量层要分块');
const initvar = fs.readFileSync(path.join(项目, '世界书', '变量', 'initvar.yaml'), 'utf8');
const 有NSFW块 = /^NSFW:/m.test(initvar);
ok(有NSFW块, '★ initvar 里有独立的 NSFW 块');
if (有NSFW块) {
  for (const 字段 of ['穿着', '身体', '兴奋度', '周期']) {
    ok(new RegExp('^\\s+' + 字段 + ':', 'm').test(initvar), `  NSFW 块里有 ${字段}`);
  }
}
// 别的块里不该出现这些字段
const 块行 = initvar.split(/\r?\n/);
let 当前块 = '', 串味 = [];
for (const l of 块行) {
  const m = l.match(/^([^\s#][^:]*):/);
  if (m) 当前块 = m[1];
  if (!当前块 || 当前块 === 'NSFW') continue;
  for (const 字段 of ['穿着', '兴奋度', '基线', '即时']) {
    if (new RegExp('^\\s+' + 字段 + ':').test(l)) 串味.push(当前块 + '.' + 字段);
  }
}
ok(串味.length === 0, '其他变量块里没有 NSFW 字段', 串味.join(' / '));

// ── ⑤ 清单对得上 ──
section('⑤ 引擎与契约对得上');
const 契约 = fs.readdirSync(path.join(项目, '底座_yingxiong')).filter((f) => f.endsWith('.yaml'));
ok(契约.includes('NSFW契约表.yaml'), 'NSFW契约表.yaml 在契约层');
ok(fs.existsSync(path.join(引擎目录, 'NSFW隔离规则.md')), '隔离规则文档在');

console.log('\n' + '='.repeat(74));
console.log('通过 ' + pass + ' / 失败 ' + fail);
console.log('='.repeat(74));
console.log('★ 摘掉 NSFW引擎.txt + NSFW块 + NSFW契约表，其余六个引擎应照常运行（清水卡模式）');
process.exit(fail === 0 ? 0 : 1);

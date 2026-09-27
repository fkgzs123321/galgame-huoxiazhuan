#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// test-growth.mjs · 成长引擎（C1~C4）测试
//
// 直接从 `机制/成长引擎.txt` 提取真实代码跑断言 —— 测的是真代码，不是复制的参考实现。
//
// 末段用**英雄坛说的真实契约参数**做闭环验证：
//   · 学满一门 = 1114 万 ÷ 悟性（原作原文）→ 反解 k → 再算回总量，必须对得上
//   · 技能每 10 级 → 天赋 +1（原作原文）
//   · 命中锚点：同等级 45%、差 20 级 1%（原作原文）
//
// 用法: node scripts/test-growth.mjs
// ════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ENGINE = path.resolve(path.join(__dirname, '..', '机制', '成长引擎.txt'));

if (!fs.existsSync(ENGINE)) { console.error('[FAIL] 找不到 ' + ENGINE); process.exit(2); }

// ── 从 EJS 条目里剥出真实 JS（与 test-judge.mjs 同法）──
const raw = fs.readFileSync(ENGINE, 'utf8');
const code = [...raw.matchAll(/<%([\s\S]*?)%>/g)].map((m) => m[1]).join('\n');
if (!/levelCost/.test(code)) {
  console.error('[FAIL] 未能从成长引擎里提取到代码，检查 <% %> 包裹');
  process.exit(2);
}

// 成长引擎是纯函数库（不读变量），但保持与判定引擎一致的调用形状
const lib = new Function('getvar', code + '\nreturn this;').call({}, () => null);

// ── 断言工具 ──
let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log('  [OK]   ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra ? '  → ' + extra : '')); }
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const section = (t) => console.log('\n' + t);

console.log('='.repeat(72));
console.log('成长引擎测试 · 机制/成长引擎.txt');
console.log('='.repeat(72));

// ════════════════════════════════════════════════════════════
section('C1 · 等级制状态');

ok(lib.levelBase(0, 'linear') === 1, 'linear 基数：0 级 → 1');
ok(lib.levelBase(9, 'linear') === 10, 'linear 基数：9 级 → 10');
ok(lib.levelBase(0, 'quadratic') === 0.5, 'quadratic 基数：0 级 → 0.5');
ok(lib.levelBase(9, 'quadratic') === 50, 'quadratic 基数：9 级 → 50');

const cfgLin = { k: 100, 效率: 1, 类型: 'linear' };
ok(lib.levelCost(cfgLin, 0) === 100, '成本：k=100 → 第 1 级 100');
ok(lib.levelCost(cfgLin, 9) === 1000, '成本：k=100 → 第 10 级 1000');
ok(lib.levelCost(cfgLin, 9) > lib.levelCost(cfgLin, 0), '★ 成本随等级递增（E2 连续值做不到这点）');

const cfgQuad = { k: 100, 效率: 1, 类型: 'quadratic' };
ok(lib.levelCost(cfgQuad, 9) > lib.levelCost(cfgLin, 9), 'quadratic 比 linear 涨得快');

ok(lib.levelCost({ k: 0.0001, 效率: 1 }, 0) === 1, '成本下限：至少 1');
ok(lib.levelCost({ k: 100, 效率: 4 }, 3) === 100, '效率作分母：k=100/效率4 → 第 4 级 100');

ok(lib.totalCost(cfgLin, 0, 3) === 100 + 200 + 300, '累计消耗 = 逐级相加');

// ── 上限与突破 ──
const cfgCap = { k: 100, 效率: 1, 常规上限: 250, 极限: 255 };
ok(lib.canLevelUp(cfgCap, 249).可 === true, '未到常规上限 → 可升');
ok(lib.canLevelUp(cfgCap, 250).可 === false, '到常规上限 → 需突破');
ok(lib.canLevelUp(cfgCap, 250).原因 === '需要突破', '突破提示文案');
ok(lib.canLevelUp({ ...cfgCap, 已解锁突破: true }, 250).可 === true, '已解锁突破 → 可继续升');
ok(lib.canLevelUp({ ...cfgCap, 已解锁突破: true }, 255).可 === false, '到极限 → 不可升');

// ════════════════════════════════════════════════════════════
section('C2 · 反哺回路');

ok(lib.feedBack(0, 10) === 0, '反哺：0 级 → +0');
ok(lib.feedBack(9, 10) === 0, '反哺：9 级 → +0（差一级也不给）');
ok(lib.feedBack(10, 10) === 1, '反哺：10 级 → +1');
ok(lib.feedBack(25, 10) === 2, '反哺：25 级 → +2');
ok(lib.feedBack(250, 10) === 25, '反哺：250 级 → +25');

ok(lib.nextFeed(0, 10) === 10, '面板：0 级 → 再练 10 级 +1');
ok(lib.nextFeed(9, 10) === 1, '面板：9 级 → 再练 1 级 +1');
ok(lib.nextFeed(10, 10) === 10, '面板：刚好 10 级 → 下一个 +1 还差 10');
ok(lib.nextFeed(0, 1) === 1, '边界：每 1 档时永远是 1');

const feedTable = [
  { 源: 'A', 目标: '甲', 每N档: 10 },
  { 源: 'B', 目标: '乙', 每N档: 10 },
  { 源: 'C', 目标: '甲', 每N档: 10 },
];
const fed = lib.applyFeed(feedTable, { A: 35, B: 100, C: 15 }, { 甲: 20, 乙: 10 });
ok(fed.甲 === 20 + 3 + 1, '汇总：基础 20 + A(35→3) + C(15→1) = 24');
ok(fed.乙 === 10 + 10, '汇总：基础 10 + B(100→10) = 20');
ok(fed.丙 === undefined, '未声明的目标不凭空出现');

// ════════════════════════════════════════════════════════════
section('C3 · 资源门');

const aff = lib.canAfford({ 潜能: 5000, 金钱: 100 }, { 潜能: 6000, 金钱: 50 });
ok(aff.可以 === false, '不够 → 不可以');
ok(aff.缺.length === 1 && aff.缺[0].名 === '金钱' && aff.缺[0].差 === 50, '缺项定位到「金钱 差 50」');

const hold = { 潜能: 6000, 金钱: 500 };
const paid = lib.pay({ 潜能: 5000, 金钱: 100 }, hold);
ok(paid.可以 === true && hold.潜能 === 1000 && hold.金钱 === 400, '扣减正确');

const hold2 = { 潜能: 100 };
lib.pay({ 潜能: 5000 }, hold2);
ok(hold2.潜能 === 100, '★ 不够时一分不扣（不会扣成负数）');

ok(lib.meetGates({ 敏捷: { 至少: 22 } }, { 敏捷: 22 }).满足 === true, '前置门：≥22 达标');
ok(lib.meetGates({ 敏捷: { 至少: 22 } }, { 敏捷: 21 }).满足 === false, '前置门：21 不达标');
ok(lib.meetGates({ 悟性: { 至多: 18 } }, { 悟性: 18 }).满足 === true, '前置门（至多）：≤18 达标');
ok(lib.meetGates({ 悟性: { 至多: 18 } }, { 悟性: 19 }).满足 === false, '前置门（至多）：19 不达标');
ok(lib.meetGates({ 内力: { 至少: 1300 }, 悟性: { 至少: 28 } }, { 内力: 1300, 悟性: 20 }).未达.length === 1, '多条件：只差一项时只报一项');

// ════════════════════════════════════════════════════════════
section('C4 · 派生计算');

const 公式 = [
  { 名: '命中', 项: [{ 字段: '敏捷', 系数: 2 }, { 字段: '基本轻功', 系数: 0.5 }], 上限: 900 },
  { 名: '伤害', 项: [{ 字段: '膂力', 系数: 3 }], 下限: 1, 取整: true },
];
const dv = lib.derive(公式, { 敏捷: 30, 基本轻功: 100, 膂力: 20 });
ok(dv.命中 === 110, 'derive：30×2 + 100×0.5 = 110');
ok(dv.伤害 === 60, 'derive：20×3 = 60（取整）');
ok(lib.derive([{ 名: 'x', 项: [{ 字段: 'v', 系数: 100 }], 上限: 900 }], { v: 99 }).x === 900, 'derive：上限生效');
ok(lib.derive([{ 名: 'x', 项: [{ 字段: 'v', 系数: -1 }], 下限: 0 }], { v: 50 }).x === 0, 'derive：下限生效');
ok(lib.derive([{ 名: 'x', 项: [{ 字段: '缺', 系数: 1 }] }], {}).x === 0, 'derive：缺字段按 0，不报错');

const ov = lib.overall({ 内功: 100, 拳脚: 50, 轻功: 40, 暗器: 999 }, { 内功: 1, 拳脚: 1, 轻功: 1 }, []);
ok(ov === (100 + 50 + 40) / 3, 'overall：只对权重里的字段求平均');
const ov2 = lib.overall({ 内功: 100, 拳脚: 50, 暗器: 999 }, { 内功: 1, 拳脚: 1, 暗器: 1 }, ['暗器']);
ok(ov2 === (100 + 50) / 2, '★ overall：忽略项真的被排除（「暗器和知识不贡献总评」）');
ok(lib.overall({ a: 1 }, {}, []) === 0, 'overall：无权重 → 0，不除零');

// ── 命中曲线（引擎层不写死数字，值由契约给）──
const 命中cfg = { 基准: 45, 斜率: 2.2, 下限: 1, 上限: 95 };
ok(lib.rateFromDiff(0, 命中cfg) === 45, '★ 命中曲线：同等级 → 45%（原作锚点）');
ok(near(lib.rateFromDiff(-20, 命中cfg), 1, 0.001), '★ 命中曲线：差 20 级 → 1%（原作锚点）');
ok(lib.rateFromDiff(-999, 命中cfg) === 1, '命中曲线：下限夹紧');
ok(lib.rateFromDiff(999, 命中cfg) === 95, '命中曲线：上限夹紧');
ok(lib.rateFromDiff(0, {}) === 50, '命中曲线：不给 cfg → 退化成 50%，不炸');

ok(lib.snapshot({ 攻击: 120, 命中: 110 }, { 攻击: 200 }).indexOf('攻击 120/200') === 0, 'snapshot：带上限的格式');
ok(lib.snapshot({ 攻击: 120 }, {}).indexOf('/') === -1, 'snapshot：没上限就不写斜杠');

// ════════════════════════════════════════════════════════════
section('★ 闭环验证 · 用英雄坛说的真实契约参数');

// 原作原文：「每种武功学满需要潜能约 1114 万 / 悟性」
const 悟性 = 30;
const 学满总量 = 11140000 / 悟性;              // ≈ 371,333
const cfg = { 效率: 悟性, 类型: 'linear' };
const k = lib.solveK(cfg, 0, 250, 学满总量);
const 算回 = lib.totalCost({ ...cfg, k }, 0, 250);
ok(near(算回, 学满总量, 学满总量 * 0.01), '★ solveK 往返：反解 k 后算回的总量对上 1114万/悟性',
  '目标 ' + Math.round(学满总量) + ' 实得 ' + 算回);
ok(k > 0 && isFinite(k), '反解出的 k 是正有限数：' + k.toFixed(4));

// 悟性翻倍 → 成本减半（原作「悟性越高消耗越少」）
// 注意：要比的是**同一个 k 下效率翻倍**，不是拿同一个目标总量再去反解一次（那是自我循环）
const 效率30总量 = lib.totalCost({ k, 效率: 30, 类型: 'linear' }, 0, 250);
const 效率60总量 = lib.totalCost({ k, 效率: 60, 类型: 'linear' }, 0, 250);
ok(near(效率60总量 * 2, 效率30总量, 效率30总量 * 0.02), '★ 悟性翻倍 → 总成本减半（原作原文）',
  '效率30: ' + 效率30总量 + ' 效率60: ' + 效率60总量);

// 反哺：基本武功 0 → 250 级，给对应天赋 +25 点
const 反哺表 = [{ 源: '基本拳脚', 目标: '膂力', 每N档: 10 }];
const 天赋 = lib.applyFeed(反哺表, { 基本拳脚: 250 }, { 膂力: 20 });
ok(天赋.膂力 === 45, '★ 反哺闭环：先天膂力 20 + 基本拳脚 250 级 → 45（原作「每 10 级 +1」）');

// 命中：一套 250 级 vs 一套 230 级
const 我 = lib.overall({ 内功: 250, 拳脚: 250, 轻功: 250, 招架: 250 }, { 内功: 1, 拳脚: 1, 轻功: 1, 招架: 1 }, []);
const 敌 = lib.overall({ 内功: 230, 拳脚: 230, 轻功: 230, 招架: 230 }, { 内功: 1, 拳脚: 1, 轻功: 1, 招架: 1 }, []);
ok(我 === 250 && 敌 === 230, '总评：四项均 250 / 230');
ok(near(lib.rateFromDiff(我 - 敌, 命中cfg), 89, 0.001), '命中：高对方 20 级 → 89%（45 + 20×2.2）');

// ════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(72));
console.log('通过 ' + pass + ' / 失败 ' + fail);
console.log('='.repeat(72));
process.exit(fail === 0 ? 0 : 1);

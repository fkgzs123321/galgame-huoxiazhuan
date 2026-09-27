#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// test-items.mjs · 物品引擎（E7 装备与背包 · E8 品质与掉落）测试
//
// 从 `机制/物品引擎.txt` 提取真实代码跑断言。
//
// 用法: node scripts/test-items.mjs
// ════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const F = path.resolve(path.join(__dirname, '..', '机制', '物品引擎.txt'));
if (!fs.existsSync(F)) { console.error('[FAIL] 找不到 ' + F); process.exit(2); }

const code = [...fs.readFileSync(F, 'utf8').matchAll(/<%([\s\S]*?)%>/g)].map((m) => m[1]).join('\n');
if (!/equipBonus/.test(code)) { console.error('[FAIL] 未能提取到代码'); process.exit(2); }
const lib = new Function('getvar', code + '\nreturn this;').call({}, () => null);

let pass = 0, fail = 0;
const ok = (c, n, e = '') => { if (c) { pass++; console.log('  [OK]   ' + n); } else { fail++; console.log('  [FAIL] ' + n + (e ? '  → ' + e : '')); } };
const section = (t) => console.log('\n' + t);

console.log('='.repeat(72));
console.log('物品引擎测试 · 机制/物品引擎.txt');
console.log('='.repeat(72));

section('E7-a · 装备槽');
const 穿 = { 手: '', 身: '', 头: '' };
const r1 = lib.equip(穿, '手', '铁剑');
ok(r1.可以 && 穿.手 === '铁剑', '装上手部');
const r2 = lib.equip(穿, '手', '钢刀');
ok(r2.可以 && r2.换下 === '铁剑' && 穿.手 === '钢刀', '★ 同槽再装 → 自动换下旧的');
ok(lib.equip(穿, '脚', '靴').可以 === false, '没有这个槽位 → 装不上');

section('E7-b · 加成叠加');
const 物表 = {
  铁剑: { 名: '铁剑', 槽: '手', 加成: { 攻击: 10 }, 品质: '凡' },
  钢刀: { 名: '钢刀', 槽: '手', 加成: { 攻击: 18 }, 品质: '凡' },
  宝甲: { 名: '宝甲', 槽: '身', 加成: { 防御: 12, 生命上限: 50 }, 品质: '珍' },
};
const 档 = [{ 名: '凡', 倍率: 1, 权重: 70 }, { 名: '良', 倍率: 1.5, 权重: 25 }, { 名: '珍', 倍率: 2.2, 权重: 5 }];
const 倍率 = { 凡: 1, 良: 1.5, 珍: 2.2 };
const b = lib.equipBonus({ 手: '钢刀', 身: '宝甲' }, 物表, 倍率);
ok(b.攻击 === 18, '单件：钢刀 攻击 +18');
ok(Math.abs(b.防御 - 12 * 2.2) < 0.001, '★ 品质倍率生效：珍品宝甲 防御 12 × 2.2 = ' + (12 * 2.2).toFixed(1));
ok(Math.abs(b.生命上限 - 50 * 2.2) < 0.001, '同一件物的多项加成一起乘倍率');

const 输入 = lib.装备后输入({ 攻击: 5, 防御: 3, 命中: 0 }, { 手: '钢刀', 身: '宝甲' }, 物表, 档);
ok(输入.攻击 === 23, '★ 装备后输入 = 基础 5 + 装备 18 = 23（交给 C4 派生）');
ok(输入.命中 === 0, '没有加成的字段保持原值');

section('E7-c · 消耗品与门槛');
const 资源 = { 食物: 10, 饮水: 20 };
lib.consume(资源, { 效果: { 食物: 30 } , 上限: { 食物: 100 } }, 1);
ok(资源.食物 === 40, '吃一份 +30');
lib.consume(资源, { 效果: { 食物: 90 }, 上限: { 食物: 100 } }, 1);
ok(资源.食物 === 100, '★ 上限夹紧（不会超过 100）');
ok(lib.低于门槛({ 食物: 5, 饮水: 0 }, { 食物: 10, 饮水: 1 }).有没有 === true, '★ 低于门槛就触发（不是「归零才算」）');
ok(lib.低于门槛({ 食物: 50 }, { 食物: 10 }).有没有 === false, '高于门槛不触发');

section('E7-d · 背包');
const 背 = [];
ok(lib.putIn(背, '铁剑', 3).可以 === true, '装得下');
lib.putIn(背, '钢刀', 3); lib.putIn(背, '宝甲', 3);
ok(lib.putIn(背, '多出来的', 3).可以 === false, '★ 满了就拿不进来');
ok(lib.canHold(背, 0).可以 === true, '容量 0 → 不限容量');
ok(lib.hasItem(背, '钢刀') === true && lib.hasItem(背, '不存在') === false, '在身上 / 不在身上');
lib.takeOut(背, '钢刀');
ok(lib.hasItem(背, '钢刀') === false, '拿走之后就不在身上了');

section('E8-a · 品质档');
ok(lib.品质倍率(档, '珍') === 2.2, '取到珍的倍率');
ok(lib.品质倍率(档, '不存在') === 1, '没有的档位 → 退化成 1');
const 实际 = lib.实际加成({ 加成: { 攻击: 10 }, 品质: '良' }, 档);
ok(实际.攻击 === 15, '★ 实际加成 = 基础 10 × 良 1.5 = 15');

section('E8-b · 掉落权重（与 E3 共用 rng）');
let s = 20260916;
const rng = () => { s = (1664525 * s + 1013904223) % 4294967296; return s / 4294967296; };
s = 20260916;
const 掉 = lib.dropTable(档, null, {}, rng);
ok(['凡', '良', '珍'].includes(掉), '掉落落在档位表里：' + 掉);
// 分布检验：低档应远多于高档
s = 999;
const 计 = { 凡: 0, 良: 0, 珍: 0 };
for (let i = 0; i < 20000; i++) 计[lib.dropTable(档, null, {}, rng)]++;
ok(计.凡 > 计.良 && 计.良 > 计.珍, '★ 权重生效：凡 ' + 计.凡 + ' > 良 ' + 计.良 + ' > 珍 ' + 计.珍);
// 修正：状态高 → 高档更多
s = 999;
const 计2 = { 凡: 0, 良: 0, 珍: 0 };
const 修 = { 影响字段: '福缘', 每点权重: 0.02, 上限: 3 };
for (let i = 0; i < 20000; i++) 计2[lib.dropTable(档, 修, { 福缘: 50 }, rng)]++;
ok(计2.珍 > 计.珍, '★ 状态修正生效：福缘 50 时珍品 ' + 计2.珍 + ' > 无修正 ' + 计.珍);
ok(计2.凡 < 计.凡, '★ 修正只抬高高档权重 → 高档变多、低档被稀释（运气好就该少掉垃圾），凡 ' + 计2.凡 + ' < ' + 计.凡);

section('E8-c · 强化');
const 强 = lib.强化({ 加成: { 攻击: 20 } }, 3, { 上限: 10, 每层倍率: 0.1 });
ok(Math.abs(强.加成.攻击 - 26) < 0.001, '★ 强化 3 层：20 × (1 + 0.1×3) = 26');
ok(强.满没满 === false, '三层没满');
ok(lib.强化({ 加成: { 攻击: 20 } }, 99, { 上限: 10 }).满没满 === true, '★ 超过上限 → 夹到 10 层');
ok(lib.强化材料(3, { 每层材料: { 铁: 2 } }).铁 === 8, '材料按层数递增：第 4 次要 8 份');

section('E8-d · 合成');
const 材料 = { 碎片: 5, 灵石: 1 };
ok(lib.合成(材料, { 需要: { 碎片: 3, 灵石: 1 }, 产出: '合成品' }).可以 === true, '够料 → 合成');
ok(材料.碎片 === 2 && 材料.灵石 === 0, '★ 合成后材料真的扣了');
ok(lib.合成({ 碎片: 1 }, { 需要: { 碎片: 3 } }).可以 === false, '不够料 → 不合成');

console.log('\n' + '='.repeat(72));
console.log('通过 ' + pass + ' / 失败 ' + fail);
console.log('='.repeat(72));
process.exit(fail === 0 ? 0 : 1);

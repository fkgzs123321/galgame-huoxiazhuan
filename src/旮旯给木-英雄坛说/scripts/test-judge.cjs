// ════════════════════════════════════════════════════════════
// 判定引擎 v2 测试
//   从 机制/判定引擎.txt 里抽出真实代码跑（不是重写一份）
//   覆盖：rel / judgePowerRel / judge / judgeContest / judgeAction / judgeProc
//        + 自然极值 / 优势劣势 / 好感门槛
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const 源 = fs.readFileSync('src/旮旯给木-英雄坛说/机制/判定引擎.txt', 'utf8');

// 抽出 <% ... %> 之间的真代码
const m = 源.match(/<%(?!\/\*)([\s\S]*?)%>/);
if (!m) { console.error('抽不出代码段'); process.exit(1); }
let 码 = m[1];

// 去掉这一段里的注释块（避免注释里的 /* */ 干扰）
码 = 码.replace(/\/\*[\s\S]*?\*\//g, '');

// 造一个沙箱：提供 getvar / this
const 沙箱 = { getvar: () => undefined };
const 工厂 = new Function('getvar', 'var 自 = this;\n' + 码 + '\nreturn 自;');
const J = 工厂.call({}, 沙箱.getvar);

let 过 = 0, 败 = 0;
function 测(名, 条件, 看) {
  if (条件) { 过++; console.log('  ✅ ' + 名); }
  else { 败++; console.log('  ❌ ' + 名 + (看 !== undefined ? '   → ' + JSON.stringify(看) : '')); }
}

console.log('═════ 判定引擎 v2 测试 ═════\n');

// ── ① rel：相对修正 ──
console.log('【一、相对修正 rel()】出处：zhushen-space');
测('值 = 均值 → 修正 0', J.rel(50, 50, 30, -15, 20) === 0, J.rel(50, 50, 30, -15, 20));
测('值 = 均值 ×2 → 触及上限', J.rel(100, 50, 30, -15, 20) === 20, J.rel(100, 50, 30, -15, 20));
测('值 = 均值 ×0.5 → 触及下限', J.rel(25, 50, 30, -15, 20) === -15, J.rel(25, 50, 30, -15, 20));
测('★ 量纲无关：×10 后结果不变', J.rel(500, 500) === J.rel(50, 50), [J.rel(500, 500), J.rel(50, 50)]);
测('★ 开放数值：1000 vs 均值 800 仍是小修正', Math.abs(J.rel(1000, 800, 30, -15, 20)) <= 8, J.rel(1000, 800, 30, -15, 20));

// ── ② judgePowerRel：相对能力 ──
console.log('\n【二、相对能力 judgePowerRel()】');
const 平 = { 说话: 60, 做事: 60, 懂东西: 60 };
测('全相等 → 修正 0', J.judgePowerRel(平, { 说话: 1 }) === 0, J.judgePowerRel(平, { 说话: 1 }));
const 偏 = { 说话: 120, 做事: 40, 懂东西: 40 };
测('偏科 → 正修正（说话被加权）', J.judgePowerRel(偏, { 说话: 2, 做事: 1 }) > 0, J.judgePowerRel(偏, { 说话: 2, 做事: 1 }));

// ── ③ 普通检定 judge() ──
console.log('\n【三、普通检定 judge()】');
const r1 = J.judge({ action: 't', values: { a: 80, b: 60 }, weights: { a: 1, b: 1 }, base: 50 });
测('返回完整结构', r1 && r1.tier && r1.success_rate >= 5 && r1.success_rate <= 95, r1.success_rate);
测('成功率被夹在 5~95', r1.success_rate >= 5 && r1.success_rate <= 95, r1.success_rate);

// 极高能力 → 应该容易被夹到 95
const 高 = J.judge({ values: { a: 100 }, weights: { a: 1 }, base: 500 });
测('★ 要求值被夹在 0~100（base 500 → 100）', 高.requirement === 100, 高.requirement);
测('★ 能力 100 vs 要求 100 → 成功率 50', 高.success_rate === 50, 高.success_rate);

// ── ④ 自然极值（出处：zhushen-space）──
console.log('\n【四、自然极值 / 优势劣势】出处：zhushen-space');
let 自20 = 0, 自1 = 0;
for (let i = 0; i < 4000; i++) {
  const r = J.judge({ values: { a: 50 }, weights: { a: 1 }, base: 50, nat: true });
  if (r.natural === 'crit') 自20++;
  if (r.natural === 'fumble') 自1++;
}
测('★ 自然极值会出现（约 1/20 各）', 自20 > 80 && 自1 > 80, { 自20, 自1 });
测('自然极值占比合理（3%~12%）', 自20 / 4000 > 0.03 && 自20 / 4000 < 0.12, (自20 / 4000).toFixed(3));

// 优势：成功率应显著高于劣势
let 优成 = 0, 劣成 = 0;
for (let i = 0; i < 3000; i++) {
  if (J.judge({ values: { a: 50 }, weights: { a: 1 }, base: 50, adv: 1 }).success) 优成++;
  if (J.judge({ values: { a: 50 }, weights: { a: 1 }, base: 50, adv: -1 }).success) 劣成++;
}
测('★ 优势成功率 > 劣势', 优成 > 劣成 * 1.4, { 优: 优成, 劣: 劣成 });

// ── ⑤ 好感门槛（出处：zhushen-space）──
console.log('\n【五、社交/求爱好感门槛】出处：zhushen-space');
const 低好 = J.judge({ values: { 魅力: 60 }, weights: { 魅力: 1 }, base: 50, tpl: 'romance', favor: 10, favorGate: 20 });
测('★ 好感 < 门槛 → 直接必败', 低好.success === false && 低好.gated === true, 低好);
const 高好 = J.judge({ values: { 魅力: 60 }, weights: { 魅力: 1 }, base: 50, tpl: 'romance', favor: 80 });
测('好感高 → 有加成（total_mod > 0）', 高好.total_mod > 0, 高好.total_mod);

// ── ⑥ 对战 judgeContest（出处：zhushen-space 最关键的一条）──
console.log('\n【六、对战：绝对强度差 + 相对修正差】出处：zhushen-space');
const 强 = { values: { a: 100 }, weights: { a: 1 }, strength: 90 };
const 弱 = { values: { a: 20 }, weights: { a: 1 }, strength: 0 };
const 战 = J.judgeContest({ action: 't', mine: 强, foe: 弱 });
测('★ 强 vs 弱 → 强度差为正', 战.strength_gap > 0, 战.strength_gap);
测('★ 强方成功率明显 > 50', 战.success_rate > 60, 战.success_rate);

// ★ 核心验证：双方都是「均值」（相对修正都≈0），胜负仍由强度差决定
const 平A = { values: { a: 10 }, weights: { a: 1 }, strength: 90 };
const 平B = { values: { a: 10 }, weights: { a: 1 }, strength: 0 };
const 战2 = J.judgeContest({ mine: 平A, foe: 平B });
测('★ 相对修正相同（都是均等）时，仍靠强度差分胜负', 战2.success_rate > 70, 战2.success_rate);
const 战3 = J.judgeContest({ mine: 平B, foe: 平A });
测('★ 反过来 → 成功率 < 30', 战3.success_rate < 30, 战3.success_rate);
测('强度差封顶 ±40', Math.abs(战3.strength_gap) <= 40, 战3.strength_gap);

// ── ⑦ 日常行动 judgeAction（出处：姬侠传）──
console.log('\n【七、日常行动判定】出处：char_card_1《姬侠传》');
const 行 = J.judgeAction({ action: '练武', talent: 60, stamina: 90, diff: '普通' });
测('返回完整结构', 行.band && 行.value >= 0, 行);
测('★ 体力高 → 值高', 行.value > J.judgeAction({ talent: 60, stamina: 10, diff: '普通' }).value, null);
测('★ 体力消耗：大成功 0 / 失败 15 / 大失败 20', 行.stamina_cost >= 0 && 行.stamina_cost <= 20, 行.stamina_cost);
测('难度加成：简单 > 普通 > 困难',
  J.judgeAction({ talent: 50, stamina: 80, diff: '简单' }).diff_c === 20 &&
  J.judgeAction({ talent: 50, stamina: 80, diff: '普通' }).diff_c === 10 &&
  J.judgeAction({ talent: 50, stamina: 80, diff: '困难' }).diff_c === 0, null);

// 体力低 → 更容易失败
let 高体好 = 0, 低体好 = 0;
for (let i = 0; i < 3000; i++) {
  const a = J.judgeAction({ talent: 60, stamina: 95, diff: '普通' });
  const b = J.judgeAction({ talent: 60, stamina: 15, diff: '普通' });
  if (a.band === 'great' || a.band === 'success') 高体好++;
  if (b.band === 'great' || b.band === 'success') 低体好++;
}
测('★ 体力 95 的成功次数 >> 体力 15', 高体好 > 低体好 * 2, { 高体: 高体好, 低体: 低体好 });

// ── ⑧ 概率触发 judgeProc（出处：姬侠传 心性/魅力）──
console.log('\n【八、概率型属性效果】出处：char_card_1《姬侠传》');
const p1 = J.judgeProc({ attr: 100, label: '免费行动' });
测('概率 = 属性值/2（100 → 50%）', p1.chance === 50, p1.chance);
const p2 = J.judgeProc({ attr: 20 });
测('属性 20 → 10%', p2.chance === 10, p2.chance);
let 触 = 0;
for (let i = 0; i < 4000; i++) if (J.judgeProc({ attr: 100 }).proc) 触++;
测('★ 实际触发率 ≈ 50%', 触 / 4000 > 0.44 && 触 / 4000 < 0.56, (触 / 4000).toFixed(3));

// ── ⑨ 档位（修掉的两个 bug 不能复发）──
console.log('\n【九、档位联合判定】');
测('大成功 → effect_mult 2.0', J.judgeTier(35, true).effect_mult === 2.0);
测('★ bug① 不复发：diff=30 但失败 → 不是大成功', J.judgeTier(30, false).key !== 'critical_success', J.judgeTier(30, false).key);
测('★ bug① 不复发：diff=-30 但成功 → 不是大失败', J.judgeTier(-30, true).key !== 'critical_failure', J.judgeTier(-30, true).key);
测('失败 → effect_mult 0', J.judgeTier(0, false).effect_mult === 0, J.judgeTier(0, false).effect_mult);

console.log('\n═════════════════════════════');
console.log('通过 ' + 过 + ' ｜ 失败 ' + 败);
process.exit(败 ? 1 : 0);

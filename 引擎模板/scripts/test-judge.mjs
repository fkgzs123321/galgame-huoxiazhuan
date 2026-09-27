#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// test-judge.mjs · 判定引擎测试
//
// 直接从 `机制/判定引擎.txt` 提取真实代码跑断言 —— 测的是真代码，不是复制的参考实现。
// 重点验证两个 bug 已修：
//   bug① 分档与成败不同源（原实现会同时给出「大成功」和「失败」）
//   bug② 关系阶段修正恒为 0（核心状态不参与判定）
//
// 用法: node scripts/test-judge.mjs
// ════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// ★ 判定引擎从 `机制/` 搬到了 `引擎能力/`，这里两个位置都试 ——
//   免得下次再挪一次目录又要修测试
const 候选 = [
  path.resolve(path.join(__dirname, '..', '引擎能力', '判定引擎.txt')),
  path.resolve(path.join(__dirname, '..', '机制', '判定引擎.txt')),
];
const ENGINE = 候选.find((p) => fs.existsSync(p));

if (!ENGINE) { console.error('[FAIL] 找不到判定引擎，试过:\n  ' + 候选.join('\n  ')); process.exit(2); }

// ── 从 EJS 条目里剥出真实 JS ──
// 只提取 <% ... %> 块。EJS 注释块 <%/* ... */%> 提取出来正好是合法的 JS 注释，
// 装饰器行（@@generate_before）和尾注（[...]）自然被排除在外。
const raw = fs.readFileSync(ENGINE, 'utf8');
const code = [...raw.matchAll(/<%([\s\S]*?)%>/g)].map((m) => m[1]).join('\n');
if (!/judgePower/.test(code)) {
  console.error('[FAIL] 未能从判定引擎里提取到代码，检查 <% %> 包裹');
  process.exit(2);
}

// ── 环境 mock ──
let seed = 20260915;
const getvar = (p) => (p === 'stat_data.主角.$骰子种子' ? seed : null);

// 把代码跑在一个对象上，方法会挂到该对象
const lib = new Function('getvar', code + '\nreturn this;').call({}, getvar);

// ── 断言工具 ──
let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log('  [OK]   ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra ? '  → ' + extra : '')); }
};
const section = (t) => console.log('\n' + t);

console.log('='.repeat(72));
console.log('判定引擎测试 · 机制/判定引擎.txt');
console.log('='.repeat(72));

// ════════════════════════════════════════════════════════════
section('一、bug① 修复：档位与成败同源');
// ════════════════════════════════════════════════════════════
// 原实现：diff=30 且骰子没过 → 会同时给出 critical_success 与 success=false
const t1 = lib.judgeTier(30, true);
const t2 = lib.judgeTier(30, false);
const t3 = lib.judgeTier(-40, false);
const t4 = lib.judgeTier(0, true);
const t5 = lib.judgeTier(5, true);
const t6 = lib.judgeTier(15, true);

ok(t1.key === 'critical_success', 'diff=30 + 成功 → 大成功', t1.key);
ok(t2.key !== 'critical_success', 'diff=30 + 失败 → 不是大成功（原实现会误判）', t2.key);
ok(t2.key === 'failure', 'diff=30 + 失败 → 失败', t2.key);
ok(t3.key === 'critical_failure', 'diff=-40 + 失败 → 大失败', t3.key);
ok(t4.key === 'barely_success', 'diff=0 + 成功 → 勉强成功', t4.key);
ok(t5.key === 'barely_success', 'diff=5 + 成功 → 勉强成功（升档阈值是 D≥10）', t5.key);
ok(t6.key === 'success', 'diff=15 + 成功 → 成功', t6.key);

// 穷举验证：不可能出现「critical_* 与成败矛盾」
let contradiction = 0;
for (let d = -60; d <= 60; d += 1) {
  for (const s of [true, false]) {
    const t = lib.judgeTier(d, s);
    if (!s && String(t.key).startsWith('critical_success')) contradiction++;
    if (s && String(t.key).startsWith('critical_failure')) contradiction++;
    if (!s && ['success', 'barely_success'].includes(t.key)) contradiction++;
    if (s && t.key === 'failure') contradiction++;
  }
}
ok(contradiction === 0, '穷举 121×2 组合：无「档位与成败矛盾」（原实现会命中）', '矛盾 ' + contradiction + ' 例');

// ════════════════════════════════════════════════════════════
section('二、bug② 修复：阶段修正真实生效');
// ════════════════════════════════════════════════════════════
const rBase = lib.judgeRequire(60, 1.0, 0, 0);
const rGood = lib.judgeRequire(60, 1.0, 0, -20);   // 关系亲密 → 要求值降低
const rBad = lib.judgeRequire(60, 1.0, 0, +20);    // 关系敌对 → 要求值升高

ok(rGood < rBase, 'stageMod=-20 → 要求值降低（更易成功）', rGood + ' < ' + rBase);
ok(rBad > rBase, 'stageMod=+20 → 要求值升高（更难）', rBad + ' > ' + rBase);
ok(rBase === 60, 'stageMod=0 时要求值 = base × 难度乘数', String(rBase));

// 原实现是 _req += 0 恒不变 —— 这里验证参数真的进入了计算
ok(lib.judgeRequire(60, 1.0, 0, -20) !== lib.judgeRequire(60, 1.0, 0, 0),
  '阶段修正不是占位参数（原实现恒为 0）');

// ════════════════════════════════════════════════════════════
section('三、难度用乘法（保留的好设计）');
// ════════════════════════════════════════════════════════════
const easy = lib.judgeRequire(100, 0.8, 0, 0);
const normal = lib.judgeRequire(100, 1.0, 0, 0);
const hell = lib.judgeRequire(100, 2.0, 0, 0);
ok(easy === 80 && normal === 100 && hell === 100,
  '基准 100：轻松×0.8=80 / 普通×1.0=100 / 地狱×2.0→夹紧到 100',
  easy + '/' + normal + '/' + hell);
ok(lib.judgeRequire(30, 0.8, 0, 0) === 24, '基准 30 轻松 → 24（乘法对低基准同样成立）');
ok(lib.judgeRequire(60, 2.0, 0, 0) === 100, '结果被夹紧在 0~100');

// ════════════════════════════════════════════════════════════
section('四、能力值：权重归一化');
// ════════════════════════════════════════════════════════════
const vals = { 说话: 60, 做事: 40, 懂东西: 80 };
const w1 = { 说话: 1.5, 做事: 1.0, 懂东西: 1.0 };
const w2 = { 说话: 15, 做事: 10, 懂东西: 10 };   // 权重整体 ×10
const p1 = lib.judgePower(vals, w1);
const p2 = lib.judgePower(vals, w2);
ok(Math.abs(p1 - p2) < 1e-9, '权重整体放大 10 倍，能力值不变（归一化生效）', p1 + ' vs ' + p2);
ok(Math.abs(p1 - 60) < 1e-9, '加权结果正确：(60×1.5+40×1+80×1)/3.5 = 60', String(p1));
ok(lib.judgePower(vals, {}) === 0, '权重全空 → 返回 0（调用方兜底）');
ok(lib.judgePower(vals, { 说话: 2 }) === 60, '只给一个权重 → 只算那一项');

// ════════════════════════════════════════════════════════════
section('五、LCG 确定性（保留的好设计）');
// ════════════════════════════════════════════════════════════
lib._lcgState = 20260915;
const a1 = lib._roll(), a2 = lib._roll();
lib._lcgState = 20260915;
const b1 = lib._roll(), b2 = lib._roll();
ok(a1 === b1 && a2 === b2, '同种子 → 同序列（可复现）', a1 + ',' + a2 + ' vs ' + b1 + ',' + b2);
ok(a1 >= 0 && a1 < 100, '_roll() 落在 0~99.99', String(a1));
lib._lcgState = 20260915;
const seq = [lib._r(), lib._r(), lib._r()];
ok(seq.every((x) => x >= 0 && x < 1), '_r() 落在 0~1');
ok(new Set(seq).size === 3, '连续取值不重复（未退化）');

// ════════════════════════════════════════════════════════════
section('六、统一入口 judge()');
// ════════════════════════════════════════════════════════════
const res = lib.judge({
  action: 'confess',
  values: vals,
  weights: w1,
  base: 60,
  diffMult: 1.0,
  targetMod: 0,
  stageMod: 0,
  envMod: 0,
});
ok(typeof res.success === 'boolean', 'judge() 返回 success 布尔');
ok(res.power === 60 && res.requirement === 60 && res.diff === 0,
  'power=60 / requirement=60 / diff=0', res.power + '/' + res.requirement + '/' + res.diff);
ok(res.success_rate === 50, '差值 0 → 成功率 50%', String(res.success_rate));
ok(['critical_success', 'success', 'barely_success', 'failure', 'critical_failure'].includes(res.tier),
  'tier 落在 5 档内', res.tier);
ok(res.roll >= 0 && res.roll < 100, 'roll 在合法范围', String(res.roll));
ok(res.success === (res.roll < res.success_rate), 'success 与 roll/rate 一致（同源）',
  'roll=' + res.roll + ' rate=' + res.success_rate + ' success=' + res.success);

// 成功率封顶
const easyRes = lib.judge({ values: { 说话: 100 }, weights: { 说话: 1 }, base: 10, diffMult: 1, targetMod: 0, stageMod: 0, envMod: 0 });
ok(easyRes.success_rate >= 5 && easyRes.success_rate <= 95, '成功率被夹在 5%~95%', String(easyRes.success_rate));

// ════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(72));
console.log('通过 ' + pass + ' / 失败 ' + fail);
console.log('='.repeat(72));
process.exit(fail ? 1 : 0);

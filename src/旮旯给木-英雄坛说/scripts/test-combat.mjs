#!/usr/bin/env node
// ════════════════════════════════════════════════════════════
// test-combat.mjs · 战斗准确性验证
//
// 回答的问题：「战斗结果怎么保证准确？」
//
// 把「准确」拆成四个可测指标，逐个验证：
//   ① 确定性      同种子同配置 → 结果逐字节相同
//   ② 随机无偏    LCG 均匀性（卡方）+ 命中率收敛到设定值（10 万次）
//   ③ 内部真演算  回合循环真的在跑：碾压/苦战/僵持/同归 分得开，且不越界
//   ④ 叙事一致    摘要里**不出现任何数值**，且带写法约束
//
// 三个引擎一起加载（判定 → 成长 → 战斗），测的是真代码的联合行为。
//
// 用法: node scripts/test-combat.mjs
// ════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const 根 = path.resolve(path.join(__dirname, '..'));

const 取代码 = (rel) => {
  const p = path.join(根, rel);
  if (!fs.existsSync(p)) { console.error('[FAIL] 找不到 ' + p); process.exit(2); }
  return [...fs.readFileSync(p, 'utf8').matchAll(/<%([\s\S]*?)%>/g)].map((m) => m[1]).join('\n');
};

const 判定 = 取代码('机制/判定引擎.txt');
const 成长 = 取代码('机制/成长引擎.txt');
const 战斗 = 取代码('机制/战斗引擎.txt');
const code = 判定 + '\n' + 成长 + '\n' + 战斗;

for (const need of ['_r', 'rateFromDiff', 'fight', 'summarize']) {
  if (!new RegExp(need).test(code)) { console.error('[FAIL] 未能提取到 ' + need); process.exit(2); }
}

// ── mock：判定引擎的 LCG 要读种子变量 ──
const getvar = (p, o) => (o && o.defaults !== undefined ? o.defaults : null);
const lib = new Function('getvar', code + '\nreturn this;').call({}, getvar);

// ── 断言工具 ──
let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log('  [OK]   ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra ? '  → ' + extra : '')); }
};
const section = (t) => console.log('\n' + t);

const 命中cfg = { 基准: 45, 斜率: 2.2, 下限: 1, 上限: 95 };
const rng = lib._r.bind(lib);
const 重置种子 = (s) => { lib._lcgState = s; };

console.log('='.repeat(72));
console.log('战斗准确性验证 · 判定 + 成长 + 战斗 三引擎联合');
console.log('='.repeat(72));

// ════════════════════════════════════════════════════════════
section('② 随机无偏 · LCG 均匀性（卡方检验）');

重置种子(20260916);
const N = 100000, 桶 = 10;
const 计数 = new Array(桶).fill(0);
for (let i = 0; i < N; i++) 计数[Math.min(桶 - 1, Math.floor(rng() * 桶))]++;
const 期望 = N / 桶;
const 卡方 = 计数.reduce((s, o) => s + (o - 期望) ** 2 / 期望, 0);
// 自由度 9，p=0.001 临界值 ≈ 27.88
ok(卡方 < 27.88, '★ 10 万次采样通过卡方检验（χ²=' + 卡方.toFixed(2) + ' < 27.88）', '分布: ' + 计数.join(','));

// 周期：不同种子应给出不同序列；同种子必须复现
重置种子(1); const s1 = [rng(), rng(), rng()];
重置种子(1); const s2 = [rng(), rng(), rng()];
重置种子(2); const s3 = [rng(), rng(), rng()];
ok(JSON.stringify(s1) === JSON.stringify(s2), '★ 同种子 → 同序列（可复现）');
ok(JSON.stringify(s1) !== JSON.stringify(s3), '不同种子 → 不同序列');

section('② 随机无偏 · 命中率收敛（10 万次/点）');

const 攻 = { 攻击: 100, 防御: 0, 命中: 命中cfg, 生命: 100000, 上限: 100000 };
const 守 = { 攻击: 0, 防御: 0, 命中: 命中cfg, 生命: 100000, 上限: 100000 };

const 测命中 = (diff) => {
  重置种子(777);
  let 命中数 = 0;
  const 次 = 100000;
  for (let i = 0; i < 次; i++) if (lib.strike(攻, 守, diff, rng, lib.rateFromDiff).命中) 命中数++;
  return 命中数 / 次 * 100;
};

for (const [diff, 理论] of [[0, 45], [20, 89], [-20, 1]]) {
  const 实测 = 测命中(diff);
  ok(Math.abs(实测 - 理论) < 0.6, `★ 差值 ${diff >= 0 ? '+' : ''}${diff}：理论 ${理论}% / 实测 ${实测.toFixed(2)}%`);
}

// ════════════════════════════════════════════════════════════
section('① 确定性 · 同种子同配置 → 结果相同');

const 造 = (我血, 我攻, 我评, 敌血, 敌攻, 敌评) => ({
  我方: { 生命: 我血, 上限: 我血, 攻击: 我攻, 防御: 0, 总评: 我评, 出手值: 我评, 有效值: 100, 命中: 命中cfg, 闪避: 命中cfg },
  对方: { 生命: 敌血, 上限: 敌血, 攻击: 敌攻, 防御: 0, 总评: 敌评, 出手值: 敌评, 有效值: 100, 命中: 命中cfg, 闪避: 命中cfg },
  上限回合: 50, 计有效值: true,
});

重置种子(2026); const A = lib.fight(造(500, 40, 250, 200, 15, 100), rng, lib.rateFromDiff);
重置种子(2026); const B = lib.fight(造(500, 40, 250, 200, 15, 100), rng, lib.rateFromDiff);
ok(JSON.stringify(A) === JSON.stringify(B), '★ 同一局面重跑 → 结果逐字节相同（可复现）');

重置种子(2027); const C = lib.fight(造(500, 40, 250, 200, 15, 100), rng, lib.rateFromDiff);
ok(JSON.stringify(A) !== JSON.stringify(C), '换种子 → 过程不同（但胜负档位应稳定）');

// ════════════════════════════════════════════════════════════
section('③ 内部真演算 · 回合循环在真跑');

重置种子(11); const 碾压 = lib.fight(造(900, 120, 250, 150, 5, 60), rng, lib.rateFromDiff);
ok(碾压.胜者 === '我方', '碾压局：我方胜');
ok(碾压.回合数 <= 5, '碾压局：很快结束（' + 碾压.回合数 + ' 回合）');
ok(碾压.摘要.结果 === '我方·碾压', '碾压局：摘要识别为「碾压」');

重置种子(12); const 必败 = lib.fight(造(60, 5, 60, 900, 120, 250), rng, lib.rateFromDiff);
ok(必败.胜者 === '对方', '必败局：对方胜');
ok(必败.我方剩余 === 0, '必败局：我方生命归零');

重置种子(13); const 苦战 = lib.fight(造(400, 22, 250, 400, 22, 245), rng, lib.rateFromDiff);
ok(苦战.回合数 > 5, '势均力敌：回合数拉长（' + 苦战.回合数 + ' 回合）');
ok(['我方·苦战', '对方·苦战', '同归', '未决'].includes(苦战.摘要.结果), '势均力敌：摘要落在苦战/同归/未决，不会写成碾压', 苦战.摘要.结果);

// 打不动的两个对手 → 必须靠上限回合收场，不许死循环
重置种子(14); const 僵持 = lib.fight(造(99999, 1, 250, 99999, 1, 250), rng, lib.rateFromDiff);
ok(僵持.回合数 === 50, '★ 打不动 → 到上限回合收场，不死循环');
ok(僵持.胜者 === '未决' && 僵持.摘要.结果.indexOf('僵持') === 0, '★ 未分胜负 → 摘要明说「僵持」，不许 AI 自己编个赢家');

// 死亡后立即停手
重置种子(15); const 秒杀 = lib.fight(造(900, 999, 250, 100, 1, 50), rng, lib.rateFromDiff);
const 末回合 = 秒杀.日志[秒杀.日志.length - 1];
ok(秒杀.回合数 === 1 && 末回合.动作.length === 1, '★ 一击致死 → 当回合立刻停手，不再多打一次');
ok(秒杀.对方剩余 === 0, '被秒方生命为 0（不会变负）');

// 呆若木鸡
const 被控 = 造(500, 40, 250, 200, 15, 100);
被控.对方.呆若木鸡 = 2;
重置种子(16); const 控 = lib.fight(被控, rng, lib.rateFromDiff);
ok(控.日志[0].动作.some((a) => a.跳过 && a.原因 === '受控'), '★ 呆若木鸡：当回合跳过行动');
ok(控.日志[0].动作.filter((a) => a.跳过).length === 1, '呆若木鸡：只跳过该方一次');

// 不可逆项（生命有效值）—— 必须用势均力敌的局面，碾压局对方根本打不中我方
重置种子(17); const 带伤 = lib.fight(造(500, 25, 200, 500, 25, 195), rng, lib.rateFromDiff);
ok(带伤.我方有效值 < 100, '★ 生命有效值会掉（不可逆项真的产生了）', '有效值 ' + 带伤.我方有效值);
ok(带伤.摘要.不可逆.length > 0, '摘要里列出了不可逆项', JSON.stringify(带伤.摘要.不可逆));

// ════════════════════════════════════════════════════════════
section('④ 叙事一致 · 摘要不许泄漏数值');

const 摘要串 = JSON.stringify(碾压.摘要) + JSON.stringify(苦战.摘要) + JSON.stringify(僵持.摘要);
for (const 禁 of ['掷值', '命中率', '百分', '公式', '_lcg', '种子']) {
  ok(摘要串.indexOf(禁) === -1, '摘要不含「' + 禁 + '」');
}
ok(/(剩 \d+\/\d+)/.test(碾压.摘要.我方状态), '摘要只给「状态词汇 + 剩余/上限」，不给中间量');

ok(碾压.摘要.写法约束.length > 0, '★ 摘要带写法约束（碾压 → 短）');
ok(苦战.摘要.写法约束.some((s) => s.indexOf('耗与险') >= 0), '★ 苦战 → 约束要求写出拉锯');
ok(僵持.摘要.写法约束.some((s) => s.indexOf('未分胜负') >= 0), '★ 僵持 → 约束要求不许收场');
ok(lib.injectRule().indexOf('不要自己重算') > 0, '★ 注入纪律明确要求 AI 不得重算');
ok(lib.injectRule().indexOf('不出现数值') > 0, '★ 注入纪律禁止正文里出现数值');

// ════════════════════════════════════════════════════════════
section('③ 补充 · 副作用检查（引擎不许改外部对象）');

const 原始 = 造(500, 40, 250, 200, 15, 100);
const 快照 = JSON.stringify(原始);
重置种子(18); lib.fight(原始, rng, lib.rateFromDiff);
ok(JSON.stringify(原始) === 快照, '★ fight() 不修改传入的 cfg（内部 clone，可重复调用）');

// ════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(72));

console.log('通过 ' + pass + ' / 失败 ' + fail);
console.log('='.repeat(72));
process.exit(fail === 0 ? 0 : 1);

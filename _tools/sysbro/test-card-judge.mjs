// 卡侧判定链校验：从面板脚本里抽出引擎代码，验 E3 的三条关键性质
//   ★ 不是重新实现一遍，而是抽出面板里真正在跑的那段代码来测
import fs from 'node:fs';

const P = 'E:/Games/写卡/tavern_helper_template/_ui_repo/xitongge/src/脚本.js';
const src = fs.readFileSync(P, 'utf8');

// 抽出引擎块：从 _LCG_A 到 judgeE3 的收尾
const i = src.indexOf('var _LCG_A');
const j = src.indexOf('/* 动作表 ·');
if (i < 0 || j < 0 || j < i) throw new Error('抽不到引擎块，脚本结构变了要同步改这个测试');
const 引擎块 = src.slice(i, j);

// 动作表也抽出来（测它在不在、字段齐不齐）
const k = src.indexOf('var 招式表 = [');
const m = src.indexOf('];', k);
const 招式块 = src.slice(k, m + 2);

const sandbox = {};
new Function('exports', 引擎块 + '\n' + 招式块 + '\nObject.assign(exports,{judgeE3,judgePowerE3,judgeRequireE3,judgeTierE3,_lcgRoll,招式表});')(sandbox);

let 通过 = 0, 失败 = 0;
const t = (名, ok, extra) => {
  if (ok) { 通过++; console.log('  [OK]   ' + 名 + (extra ? '  ' + extra : '')); }
  else { 失败++; console.log('  [FAIL] ' + 名 + (extra ? '  ' + extra : '')); }
};

console.log('═══ 一、分档与成败必须同源（引擎规范 §E3.2）═══');
{
  let 坏 = 0, n = 0;
  for (let seed = 1; seed <= 4000; seed++) {
    for (const base of [30, 50, 60, 70, 90]) {
      const r = sandbox.judgeE3({ values: { 气势: 60, 情报: 70 }, weights: { 气势: 1, 情报: 1 }, base, diffMult: 1, targetMod: 0, stageMod: 0, envMod: 0, seed });
      n++;
      const 成功档 = ['大成功', '成功', '勉强成功'].includes(r.label);
      if (成功档 !== r.success) 坏++;
    }
  }
  t('两千次抽样里「档位是成功系」与「success」完全一致', 坏 === 0, `抽样 ${n} 次，不一致 ${坏} 次`);
}

console.log('═══ 二、成功率钳位与派生（§E3.1）═══');
{
  const 低 = sandbox.judgeE3({ values: { a: 0 }, weights: { a: 1 }, base: 100, diffMult: 2, targetMod: 0, stageMod: 0, envMod: 0, seed: 7 });
  const 高 = sandbox.judgeE3({ values: { a: 100 }, weights: { a: 1 }, base: 10, diffMult: 1, targetMod: 0, stageMod: 0, envMod: 0, seed: 7 });
  t('成功率下限钳在 5', 低.S === 5, `S=${低.S}`);
  t('成功率上限钳在 95', 高.S === 95, `S=${高.S}`);
  const 中 = sandbox.judgeE3({ values: { a: 60 }, weights: { a: 1 }, base: 60, diffMult: 1, targetMod: 0, stageMod: 0, envMod: 0, seed: 7 });
  t('差值 0 → 成功率 50', Math.abs(中.S - 50) < 0.01, `S=${中.S}`);
  t('难度用乘法：base 60 × 2.0 时要求值 = 120 被钳到 100', 低.R <= 100, `R=${低.R}`);
}

console.log('═══ 三、LCG 确定性（禁 Math.random）═══');
{
  const 一 = sandbox.judgeE3({ values: { a: 50 }, weights: { a: 1 }, base: 60, diffMult: 1, targetMod: 0, stageMod: 0, envMod: 0, seed: 12345 });
  const 二 = sandbox.judgeE3({ values: { a: 50 }, weights: { a: 1 }, base: 60, diffMult: 1, targetMod: 0, stageMod: 0, envMod: 0, seed: 12345 });
  t('同种子两次调用结果完全一致', 一.V === 二.V && 一.label === 二.label, `V=${一.V}`);
  const 三 = sandbox.judgeE3({ values: { a: 50 }, weights: { a: 1 }, base: 60, diffMult: 1, targetMod: 0, stageMod: 0, envMod: 0, seed: 12346 });
  t('换种子结果会变', 一.V !== 三.V, `${一.V} vs ${三.V}`);
  t('全脚本没有 Math.random', !src.includes('Math.random'));
  t('掷值落在 0~100', 一.V >= 0 && 一.V < 100, `V=${一.V}`);
}

console.log('═══ 四、档位阈值（§E3.1 五档）═══');
{
  const 大成功 = sandbox.judgeTierE3(30, true), 成功 = sandbox.judgeTierE3(10, true), 勉强 = sandbox.judgeTierE3(9, true);
  const 大失败 = sandbox.judgeTierE3(-30, false), 失败 = sandbox.judgeTierE3(-29, false);
  t('D≥30 且成功 → 大成功 ×1.5', 大成功.label === '大成功' && 大成功.mult === 1.5);
  t('D≥10 且成功 → 成功 ×1.0', 成功.label === '成功' && 成功.mult === 1.0);
  t('其余成功 → 勉强成功 ×0.6', 勉强.label === '勉强成功' && 勉强.mult === 0.6);
  t('D≤-30 且失败 → 大失败 ×2.0', 大失败.label === '大失败' && 大失败.mult === 2.0);
  t('其余失败 → 失败 ×1.0', 失败.label === '失败' && 失败.mult === 1.0);
}

console.log('═══ 五、动作表与规范一致性 ═══');
{
  const 表 = sandbox.招式表;
  t('动作表 8 招', 表.length === 8, `实际 ${表.length}`);
  t('每招都有 名/权重/基准值', 表.every((a) => a.n && a.w && typeof a.base === 'number'));
  t('权重用的都是四维里的名字', 表.every((a) => Object.keys(a.w).every((k) => ['气势', '口才', '情报', '地位'].includes(k))));
  t('情绪化基准最高（最难）', Math.max(...表.map((a) => a.base)) === 表.find((a) => a.n === '情绪化').base);
  const 规范 = fs.readFileSync('E:/Games/写卡/tavern_helper_template/src/系统哥的末日/世界书/阶段指导/交涉体系.txt', 'utf8');
  const 全在 = 表.every((a) => 规范.includes(a.n) && 规范.includes(String(a.base)));
  t('8 招的名字与基准值都能在 交涉体系.txt 里对上', 全在);

  // ★ 三处同源：面板脚本 / 交涉体系.txt / 创作规划.yaml 的契约表
  const 规划 = fs.readFileSync('E:/Games/写卡/tavern_helper_template/src/系统哥的末日/创作规划.yaml', 'utf8');
  const 规划命中 = 表.filter((a) => 规划.includes('名: ' + a.n) && 规划.includes('基准值: ' + a.base)).length;
  t('8 招在 创作规划.yaml 的契约表里也对得上', 规划命中 === 8, `${规划命中}/8`);
  const 林天招 = ['反咬', '引开', '施压', '抬格', '收买', '冷处理', '掀桌'];
  t('林天七招也在契约表里', 林天招.every((n) => 规划.includes('名: ' + n)), 林天招.length + ' 招');
  t('契约表里的判定链与面板实现同源', /D: P - R \+ E/.test(规划) && /LCG\(seed\) × 100/.test(规划));
}

console.log('\n' + '='.repeat(56));
console.log('通过 ' + 通过 + ' / 失败 ' + 失败);
process.exit(失败 ? 1 : 0);

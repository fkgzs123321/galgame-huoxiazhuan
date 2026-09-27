/**
 * 原作事件目录自测
 * 运行：node --import tsx src/活侠传/_work/test-catalog.ts
 */
import { 事件目录, 该旬目录, 该旬路线, 所有路线, 该年目录, 有这事, 有分支, 该旬路线名 } from '../脚本/事件目录';
import { 时序 } from '../脚本/前置运行时';
import { 原作事件表 } from '../脚本/原作事件';

let 通过 = 0;
let 失败 = 0;
function 断言(名: string, 条件: boolean, 附?: unknown) {
  if (条件) { 通过++; console.log(`  ✓ ${名}`); }
  else { 失败++; console.log(`  ✗ ${名}`); if (附 !== undefined) console.log('      ' + JSON.stringify(附).slice(0, 320)); }
}

console.log('══ ① 规模 ══');
console.log(`  ${事件目录.length} 条`);
断言('≥ 170 条', 事件目录.length >= 170, 事件目录.length);
断言('每条有名', 事件目录.every(x => !!x.名));
断言('每条有详情页', 事件目录.every(x => !!x.页));

console.log('\n══ ② 覆盖到第 3 年（远超先前只做第一年）══');
{
  const 年 = new Map<number, number>();
  for (const x of 事件目录) 年.set(x.年, (年.get(x.年) || 0) + 1);
  for (const [k, n] of [...年].sort()) console.log(`    第 ${k} 年：${n} 条`);
  断言('★ 有第二年', (年.get(2) || 0) > 50, 年.get(2));
  断言('★ 有第三年', (年.get(3) || 0) > 40, 年.get(3));
  断言('三年都有', [1, 2, 3].every(y => (年.get(y) || 0) > 0));
}

console.log('\n══ ③ ★ 时序算法与引擎一致 ══');
{
  let 坏 = 0;
  for (const x of 事件目录) {
    const 手算 = (x.年 - 1) * 36 + (x.月 - 1) * 3 + (x.旬 - 1);
    if (x.时 !== 手算) 坏++;
    const 引擎 = 时序(x.年, x.月, ['上旬', '中旬', '下旬'][x.旬 - 1]);
    if (引擎 !== x.时) 坏++;
  }
  断言('★ 三条算法全部一致（手算/存储/引擎）', 坏 === 0, 坏);
  // 开局
  const 开局 = 事件目录.find(x => x.年 === 1 && x.月 === 4 && x.旬 === 1);
  断言('开局时序 = 9', 开局?.时 === 9, 开局?.时);
}

console.log('\n══ ④ 月/旬 值合法 ══');
{
  const 坏月 = 事件目录.filter(x => x.月 < 1 || x.月 > 12);
  const 坏旬 = 事件目录.filter(x => x.旬 < 1 || x.旬 > 3);
  断言('月份都在 1~12', 坏月.length === 0, 坏月.slice(0, 3).map(x => ({ 名: x.名, 月: x.月 })));
  断言('旬都在 1~3', 坏旬.length === 0, 坏旬.slice(0, 3).map(x => ({ 名: x.名, 旬: x.旬 })));
  // 早先的 bug：rowspan 导致月列被当成旬，出现「第二年 / 下 / …」
  const 假 = 事件目录.filter(x => typeof x.月 !== 'number' || Number.isNaN(x.月));
  断言('★ 没有假月份（rowspan 已处理）', 假.length === 0, 假.length);
}

console.log('\n══ ⑤ ★ 路线分支（原作的重要机制）══');
{
  const 路线 = 所有路线();
  console.log(`  ${路线.length} 种路线：${路线.join(' / ')}`);
  断言('★ 识别出路线', 路线.length >= 5, 路线.length);
  for (const 期望 of ['崆峒留学', '青城留学']) {
    断言(`含「${期望}」`, 路线.includes(期望), 路线);
  }
  const 共用 = 事件目录.filter(x => !x.路线).length;
  console.log(`  各线共用 ${共用} 条 / 带路线 ${事件目录.length - 共用} 条`);
  断言('有各线共用的条目', 共用 > 30, 共用);
}

console.log('\n══ ⑥ 按旬取 ══');
{
  const 开局 = 该旬目录(1, 4, 1);
  console.log(`  1年4月上旬 ${开局.length} 条：${开局.map(x => x.名).join('、')}`);
  断言('★ 开局有多条', 开局.length >= 6, 开局.length);
  断言('★ 含「游戏开局」', 开局.some(x => x.名.includes('游戏开局')), 开局.map(x => x.名));
  断言('★ 含「龙湘霸王餐」', 开局.some(x => x.名.includes('龙湘')), 开局.map(x => x.名));
  const 空 = 该旬目录(9, 9, 9);
  断言('不存在的旬返回空', 空.length === 0, 空.length);
}

console.log('\n══ ⑦ ★ 按路线筛 ══');
{
  // ★「各线共用」是**字面量**，不是空字符串（提取时 colspan 跨了所有路线列）。
  //   早先断言写成 `!x.路线`，于是把「各线共用」误判为路线，
  //   报「共用条目没被保留」—— 是**断言过时**，不是引擎错。
  const 共用 = '各线共用';

  // 找一旬真有路线分支的
  let 样本: { 年: number; 月: number; 旬: number; 全: number; 崆峒: number } | null = null;
  for (const x of 事件目录) {
    if (!x.路线 || x.路线 === 共用) continue;
    const 全 = 该旬目录(x.年, x.月, x.旬).length;
    const 崆峒 = 该旬路线(x.年, x.月, x.旬, '崆峒留学').length;
    if (全 > 崆峒 && 崆峒 > 0) {
      样本 = { 年: x.年, 月: x.月, 旬: x.旬, 全, 崆峒 };
      break;
    }
  }
  if (样本) {
    console.log(`  ${样本.年}年${样本.月}月${样本.旬}旬：全部 ${样本.全} 条，崆峒线 ${样本.崆峒} 条`);
    断言('★ 路线筛选确实减少条目', 样本.崆峒 < 样本.全, 样本);
    const 该旬 = 该旬路线(样本.年, 样本.月, 样本.旬, '崆峒留学');
    断言('★ 共用条目被保留',
      该旬.every(x => !x.路线 || x.路线 === 共用 || x.路线 === '崆峒留学'),
      该旬.map(x => x.路线));
    断言('★ 共用条目确实在里面', 该旬.some(x => x.路线 === 共用 || !x.路线),
      该旬.map(x => x.路线));
  } else {
    console.log('  （没找到多路线样本）');
  }

  // 不指定路线（空）→ 只出共用
  const 无路线 = 该旬路线(2, 3, 1, '');
  console.log(`  2年3月上旬 不指定路线 ${无路线.length} 条`);
  断言('★ 不指定路线时只出共用',
    无路线.every(x => !x.路线 || x.路线 === 共用),
    无路线.map(x => x.路线));
}

console.log('\n══ ⑦b ★ 有分支 / 路线名 ══');
{
  const 共用 = '各线共用';
  // 2年8月中旬有时=58 的三路线
  const 有 = 有分支(2, 8, 2);
  console.log(`  2年8月中旬 有分支: ${有}`);
  断言('★ 识别出有分支的一旬', 有 === true);
  const 无 = 有分支(1, 4, 1);
  console.log(`  1年4月上旬 有分支: ${无}`);
  断言('开局没分支', 无 === false);

  const 线s = 该旬路线名(2, 8, 2);
  console.log(`  2年8月中旬 涉及路线: ${线s.join(' / ')}`);
  断言('★ 报出多条路线', 线s.length >= 2, 线s);
  void 共用;
}

console.log('\n══ ⑧ 按年取 / 模糊查 ══');
{
  for (const y of [1, 2, 3]) {
    const n = 该年目录(y).length;
    断言(`第 ${y} 年取得到`, n > 0, n);
    console.log(`    第 ${y} 年 ${n} 条`);
  }
  断言('★ 有「游戏开局」', 有这事('游戏开局'));
  断言('★ 有「叶氏兄妹」', 有这事('叶氏兄妹'));
  断言('没有的事返回 false', !有这事('这件事不存在'));
}

console.log('\n══ ⑨ ★ 与 原作事件.ts 互补（不是重复）══');
{
  const 目录名 = new Set(事件目录.map(x => x.名));
  const 事件名 = new Set(原作事件表.map(x => x.名));
  const 交集 = [...目录名].filter(n => 事件名.has(n));
  console.log(`  目录 ${事件目录.length} 条（全四年，只有名字）`);
  console.log(`  事件表 ${原作事件表.length} 条（第一年，带选项数值）`);
  console.log(`  完全同名的 ${交集.length} 条`);
  // 事件表里有选项，目录里没有 —— 这是分工，不是重复
  const 有选项 = 原作事件表.filter(x => x.选项?.length).length;
  console.log(`  事件表里带选项的 ${有选项} 条（目录没有这个信息）`);
  断言('事件表有目录没有的信息（选项）', 有选项 > 5, 有选项);
  断言('目录覆盖更广', 事件目录.length > 原作事件表.length, {
    目录: 事件目录.length, 事件表: 原作事件表.length,
  });
}

console.log('\n' + '═'.repeat(50));
console.log(`通过 ${通过} / 失败 ${失败}`);
if (失败) { console.log('★ 有失败项'); process.exit(1); }
console.log('全部通过');

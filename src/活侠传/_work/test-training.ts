/**
 * 原作养成指令表自测
 * 运行：node --import tsx src/活侠传/_work/test-training.ts
 */
import { 养成表, 心相档, 地点指令, 抽一条 } from '../脚本/养成';

let 通过 = 0;
let 失败 = 0;
function 断言(名: string, 条件: boolean, 附?: unknown) {
  if (条件) { 通过++; console.log(`  ✓ ${名}`); }
  else { 失败++; console.log(`  ✗ ${名}`); if (附 !== undefined) console.log('      ' + JSON.stringify(附).slice(0, 300)); }
}

console.log('══ ① 规模 ══');
console.log(`  共 ${养成表.length} 条`);
断言('≥ 300 条', 养成表.length >= 300, 养成表.length);
断言('每条有地点与动作', 养成表.every(x => x.地点 && x.动作));

console.log('\n══ ② ★ 心相分档（手写时没想到的机制）══');
{
  const 有档 = 养成表.filter(x => Object.keys(x.效果.高昂).length || Object.keys(x.效果.低落).length);
  console.log(`  ${有档.length} 条效果随档位变化（${(有档.length / 养成表.length * 100).toFixed(0)}%）`);
  断言('有分档数据', 有档.length > 50, 有档.length);

  // 找「课外书籍」这条验证三档不同
  const 书 = 养成表.find(x => x.事件.includes('课外书籍'));
  if (书) {
    console.log(`  【${书.地点}】${书.动作} / ${书.事件}`);
    for (const 档 of ['低落', '平常', '高昂'] as const) {
      console.log(`    ${档}: ${JSON.stringify(书.效果[档])}`);
    }
    断言('★ 三档效果确实不同',
      JSON.stringify(书.效果.低落) !== JSON.stringify(书.效果.高昂),
      { 低: 书.效果.低落, 高: 书.效果.高昂 });
    断言('平常档有基础效果', Object.keys(书.效果.平常).length > 0, 书.效果.平常);
  } else {
    console.log('  （没找到「课外书籍」，跳过）');
  }
}

console.log('\n══ ③ ★ 心相档位的分界（对得上原作 32/64）══');
{
  for (const [v, 期] of [[0, '低落'], [32, '低落'], [33, '平常'], [64, '平常'], [65, '高昂'], [100, '高昂']] as [number, string][]) {
    const 得 = 心相档(v);
    断言(`心相 ${v} → ${期}`, 得 === 期, 得);
  }
}

console.log('\n══ ④ 属性键都对得上 schema ══');
{
  const 合法 = new Set(['刀剑', '暗器', '拳掌', '腿法', '奇门', '软兵器', '枪棍', '内功',
    '轻功', '魅力', '学问', '嘴力', '道德', '性情', '处世', '修养', '心相', '阴阳',
    '体力', '内力', '武学点', '抗毒', '抗麻', '形意拳', '医术', '战术', '毒药', '麻痹',
    '锻造', '炼丹', '变心', '命运', '银两', '向心', '名声', '贡献度']);
  const 键 = new Set<string>();
  for (const x of 养成表) for (const 档 of Object.values(x.效果)) for (const k of Object.keys(档)) 键.add(k);
  const 非法 = [...键].filter(k => !合法.has(k));
  console.log(`  出现 ${键.size} 个属性键`);
  断言('★ 没有 schema 外的键', 非法.length === 0, 非法);
  if (非法.length) console.log('    ' + 非法.join('、'));
}

console.log('\n══ ⑤ 角色好感（键是角色名，动态）══');
{
  const 名 = new Set<string>();
  for (const x of 养成表) for (const 档 of Object.values(x.好感)) for (const k of Object.keys(档)) 名.add(k);
  console.log(`  ${名.size} 个角色被好感引用`);
  console.log('  ' + [...名].slice(0, 14).join('、'));
  断言('有角色好感数据', 名.size > 8, 名.size);
  // 关键角色应在内
  for (const 谁 of ['唐中翎', '唐布衣', '唐铮', '唐升', '唐惟元', '唐默铃']) {
    断言(`含 ${谁}`, 名.has(谁));
  }
}

console.log('\n══ ⑥ 旗标（原作 EventFlags）══');
{
  const 旗 = new Map<string, number>();
  for (const x of 养成表) for (const f of x.旗标) 旗.set(f.名, (旗.get(f.名) || 0) + 1);
  console.log(`  ${旗.size} 个不同旗标，${养成表.filter(x => x.旗标.length).length} 条指令引用`);
  const 前 = [...旗].sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [k, n] of 前) console.log(`    ${k.padEnd(12)} ${n}`);
  断言('有旗标引用', 旗.size > 5, 旗.size);
  断言('★ 高频道具「青城功勋」在', 旗.has('青城功勋'), [...旗.keys()]);
}

console.log('\n══ ⑦ 权重与消耗 ══');
{
  const 有权 = 养成表.filter(x => x.权重 > 0);
  console.log(`  ${有权.length} 条有权重（范围 ${Math.min(...有权.map(x => x.权重))}~${Math.max(...有权.map(x => x.权重))}）`);
  断言('有权重数据', 有权.length > 200, 有权.length);
  const 有贡献 = 养成表.filter(x => x.贡献 !== 0);
  console.log(`  ${有贡献.length} 条耗贡献`);
  断言('有贡献消耗', 有贡献.length > 50, 有贡献.length);
  const 有耗 = 养成表.filter(x => x.心相耗 !== 0);
  console.log(`  ${有耗.length} 条动心相（如 ${有耗[0]?.心相耗}）`);
  断言('有心相消耗', 有耗.length > 50, 有耗.length);
}

console.log('\n══ ⑧ 按地点取 ══');
{
  for (const 地 of ['唐家大院', '大门', '崆峒', '青城']) {
    const n = 地点指令(地).length;
    断言(`${地} 有指令`, n > 0, n);
    console.log(`    ${地.padEnd(8)} ${n} 条`);
  }
}

console.log('\n══ ⑨ ★ 按权重抽（确定性，不用 Math.random）══');
{
  const 首批 = Array.from({ length: 8 }, (_, i) => 抽一条('唐家大院', i / 8)?.事件);
  console.log('  8 次抽样的结果：');
  console.log('    ' + 首批.join(' / '));
  断言('抽得出结果', 首批.every(x => !!x), 首批);
  断言('同输入同结果', 抽一条('唐家大院', 0.5)?.事件 === 抽一条('唐家大院', 0.5)?.事件);
  // 不同位置应能抽出不同条目（权重分布生效）
  断言('★ 不同位置抽出不同条目', new Set(首批).size > 1, [...new Set(首批)].length);
  断言('不存在的地点返回 null', 抽一条('不存在的地方', 0.5) === null);
}

console.log('\n══ ⑩ 与手写行动表的对比（说明为什么换掉）══');
{
  console.log(`  手写行动表:  15 条`);
  console.log(`  原作养成表: ${养成表.length} 条（${(养成表.length / 15).toFixed(0)} 倍）`);
  const 带分档 = 养成表.filter(x => Object.keys(x.效果.高昂).length).length;
  const 带旗标 = 养成表.filter(x => x.旗标.length).length;
  const 带条件 = 养成表.filter(x => x.条件).length;
  console.log(`  其中：分档 ${带分档} 条 / 旗标 ${带旗标} 条 / 前提 ${带条件} 条`);
  断言('★ 原作表的机制维度多于手写表', 带分档 > 0 && 带旗标 > 0 && 带条件 > 0);
}

console.log('\n' + '═'.repeat(50));
console.log(`通过 ${通过} / 失败 ${失败}`);
if (失败) { console.log('★ 有失败项'); process.exit(1); }
console.log('全部通过');

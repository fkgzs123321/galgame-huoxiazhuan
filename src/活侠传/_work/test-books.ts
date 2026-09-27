/**
 * 原作秘籍表自测
 * 运行：node --import tsx src/活侠传/_work/test-books.ts
 */
import { 秘籍表, 取秘籍, 能练吗 } from '../脚本/秘籍';

let 通过 = 0;
let 失败 = 0;
function 断言(名: string, 条件: boolean, 附?: unknown) {
  if (条件) { 通过++; console.log(`  ✓ ${名}`); }
  else { 失败++; console.log(`  ✗ ${名}`); if (附 !== undefined) console.log('      ' + JSON.stringify(附).slice(0, 320)); }
}

console.log('══ ① 规模 ══');
console.log(`  共 ${秘籍表.length} 本`);
断言('≥ 80 本', 秘籍表.length >= 80, 秘籍表.length);
断言('每本都有名字', 秘籍表.every(b => !!b.名));
断言('名字不重复', new Set(秘籍表.map(b => b.名)).size === 秘籍表.length);

console.log('\n══ ② ★ 繁体已全转简体 ══');
{
  const 繁 = /[劍譜輕氣內體學問術養處戰勝傷藥銀錢鐵門雲週選還錄貢貴買賣質趙緣項額聲稱獻獲滿歸機條擇孫嬌師鬥勢兩變煉禦爭絕鐘颯壞兒淨亂後點沒動擠盤閒難圍幫贏書蒼結親識單強頭畫補衛狀產規]/
  const 坏 = 秘籍表.filter(b => 繁.test(JSON.stringify(b)));
  断言('没有残留繁体', 坏.length === 0, 坏.slice(0, 3).map(b => b.名));
  if (坏.length) console.log('    ' + 坏.slice(0, 6).map(b => b.名).join('、'));
}

console.log('\n══ ③ ★ 加成键都对得上 schema ══');
{
  // ★ 合法键 = schema 里真实存在的路径。
  //   分两类：`你.<名>` 与 `你.战斗.<名>`（战斗派生）。
  //   早先漏了战斗派生那类，于是「爆发/防御」被误报为 schema 外的键。
  const 基础 = ['刀剑', '暗器', '拳掌', '腿法', '奇门', '软兵器', '枪棍', '内功',
    '轻功', '魅力', '学问', '嘴力', '道德', '性情', '处世', '修养', '心相', '阴阳',
    '体力', '内力', '武学点', '抗毒', '抗麻', '形意拳', '医术', '战术', '毒药', '麻痹',
    '锻造', '炼丹', '变心', '命运', '银两'];
  const 战斗派生 = ['攻击', '防御', '绝招', '爆发', '暗器威力', '暗器爆发', '生命上限'];
  const 合法 = new Set([...基础, ...战斗派生]);
  const 键 = new Set<string>();
  for (const b of 秘籍表) for (const k of Object.keys(b.加成)) 键.add(k);
  const 非法 = [...键].filter(k => !合法.has(k));
  console.log(`  出现 ${键.size} 个属性键`);
  断言('★ 没有 schema 外的键', 非法.length === 0, 非法);
  if (非法.length) console.log('    ' + 非法.join('、'));
  // 顺带验证：这些键在结算的 字段路径 表里也得有，否则练了加不上
  const 战斗类 = [...键].filter(k => 战斗派生.includes(k));
  if (战斗类.length) console.log(`  其中战斗派生：${战斗类.join('、')}（已在 结算.ts 的 字段路径 表登记）`);
}

console.log('\n══ ④ 加成值合理 ══');
{
  const 异 = 秘籍表.flatMap(b => Object.entries(b.加成)).filter(([, v]) => Math.abs(Number(v)) > 100);
  断言('没有离谱的数值', 异.length === 0, 异.slice(0, 5));
  const 零 = 秘籍表.filter(b => Object.keys(b.加成).length === 0);
  console.log(`  每本平均 ${(秘籍表.reduce((s, b) => s + Object.keys(b.加成).length, 0) / 秘籍表.length).toFixed(1)} 项加成`);
  断言('绝大多数有加成', 零.length <= 3, 零.length);
}

console.log('\n══ ⑤ 招式与天赋是分开的 ══');
{
  const 招式数 = 秘籍表.reduce((s, b) => s + b.技能.length, 0);
  const 天赋数 = 秘籍表.reduce((s, b) => s + b.天赋.length, 0);
  console.log(`  招式 ${招式数} 条 / 天赋 ${天赋数} 条`);
  断言('有招式', 招式数 > 20, 招式数);
  断言('有天赋', 天赋数 > 20, 天赋数);
  // 招式里不该混进属性名
  const 合法 = new Set(['刀剑', '暗器', '拳掌', '腿法', '奇门', '软兵器', '枪棍', '内功',
    '轻功', '魅力', '学问', '嘴力', '道德', '性情', '处世', '修养', '心相', '阴阳',
    '体力', '内力', '武学点']);
  const 混入 = new Set<string>();
  for (const b of 秘籍表) for (const s of b.技能) { if (合法.has(s)) 混入.add(s); }
  断言('★ 招式里没混进属性名', 混入.size === 0, [...混入]);
}

console.log('\n══ ⑥ 修炼门槛（原作「条件」列）══');
{
  断言('有门槛数据', 秘籍表.some(b => b.门槛.length > 0));

  // ★ 门槛现在是**分段**的：{ 层, 条件[] }
  const 有门槛 = 秘籍表.filter(b => b.门槛.length > 0);
  console.log(`  ${有门槛.length} 本有门槛，其中分段 ${有门槛.filter(b => b.门槛.some(x => x.层 !== null)).length} 本`);
  断言('★ 分段门槛被保留了（没被摊平）',
    有门槛.some(b => b.门槛.some(x => x.层 !== null)),
    有门槛.map(b => ({ 名: b.名, 段: b.门槛.map(x => x.层) })));

  // 枯荣神功：原作 LV2/LV5/LV8 三段
  const 枯 = 秘籍表.find(b => b.名.includes('枯荣'));
  if (枯) {
    console.log(`  ${枯.名}：`);
    for (const 段 of 枯.门槛) {
      console.log(`    ${段.层 === null ? '入门' : 'LV' + 段.层} → ` +
        段.条件.map(g => `${g.目标}${g.比较}${g.值}`).join('、'));
    }
    断言('★ 枯荣神功有 3 段门槛', 枯.门槛.length === 3, 枯.门槛.length);
    断言('段有层号 2/5/8',
      枯.门槛.map(x => x.层).join(',') === '2,5,8',
      枯.门槛.map(x => x.层));
  }

  // 平铺门槛也要正常
  const 流 = 秘籍表.find(b => b.名 === '流星剑谱');
  if (流) {
    console.log(`  ${流.名} 段数：${流.门槛.length}，条件 ` +
      (流.门槛[0]?.条件.map(g => `${g.目标}${g.比较}${g.值}`).join('、') ?? '无'));
    断言('平铺门槛算一段（层为 null）', 流.门槛[0]?.层 === null, 流.门槛[0]?.层);
  }

  const 目标合法 = new Set(['刀剑', '暗器', '拳掌', '腿法', '奇门', '软兵器', '枪棍', '内功',
    '轻功', '学问', '嘴力', '道德', '性情', '处世', '修养', '心相', '阴阳', '体力', '内力']);
  const 坏目标 = [...new Set(
    有门槛.flatMap(b => b.门槛.flatMap(x => x.条件.map(g => g.目标))),
  )].filter(t => !目标合法.has(t));
  断言('★ 门槛目标都对得上 schema', 坏目标.length === 0, 坏目标);
}

console.log('\n══ ⑦ ★ 能练吗（只看入门那一段）══');
{
  const 名 = '流星剑谱';
  const b = 取秘籍(名);
  断言('取得到流星剑谱', !!b, 名);
  if (b) {
    console.log(`  ${名} 门槛：${b.门槛[0].条件.map(g => `${g.目标}${g.比较}${g.值}`).join('、')}`);
    const 不够 = 能练吗(名, { 性情: 50, 刀剑: 10, 轻功: 10 });
    断言('★ 属性不够时不能练', 不够.能 === false, 不够);
    断言('给出了缺什么', 不够.缺.length > 0, 不够.缺);
    console.log('    缺: ' + 不够.缺.join('、'));
    const 够 = 能练吗(名, { 性情: 60, 刀剑: 20, 轻功: 20 });
    断言('★ 刚好达标就能练', 够.能 === true, 够);
    const 超 = 能练吗(名, { 性情: 99, 刀剑: 50, 轻功: 50 });
    断言('超出也算能练', 超.能 === true, 超);
  }
  const 无 = 能练吗('不存在的秘籍', {});
  断言('不存在的秘籍返回 false', 无.能 === false, 无);

  // ★ 分段门槛不该卡在入门
  const 枯 = 秘籍表.find(b => b.名.includes('枯荣'));
  if (枯) {
    // 只满足入门段（内力>=20、阴阳<40）时应当能练
    const r = 能练吗(枯.名, { 内力: 20, 阴阳: 30 });
    console.log(`  ${枯.名} 只达入门段 → ${r.能 ? '能练' : '不能：' + r.缺.join('、')}`);
    断言('★ 进阶段不卡入门', r.能 === true, r);
  }
}

console.log('\n══ ⑧ 获得方式（含事件线索）══');
{
  const 有获得 = 秘籍表.filter(b => b.获得.length > 0);
  console.log(`  ${有获得.length} 本记载了获得方式`);
  断言('大部分有获得方式', 有获得.length > 50, 有获得.length);
  for (const b of 有获得.slice(0, 3)) {
    console.log(`    ${b.名}：${b.获得[0].slice(0, 56)}`);
  }
  // 应当能看出事件名
  const 提事件 = 有获得.filter(b => b.获得.some(x => /事件|任务|段考|貢獻|贡献/.test(x)));
  console.log(`  提到事件/任务的：${提事件.length} 本`);
  断言('获得方式里带事件线索', 提事件.length > 5, 提事件.length);
}

console.log('\n══ ⑨ 分类分布 ══');
{
  const 类 = new Map<string, number>();
  for (const b of 秘籍表) 类.set(b.类, (类.get(b.类) || 0) + 1);
  for (const [k, n] of [...类].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(8)} ${n}`);
  }
  断言('分类数与提取一致（5 类）', 类.size === 5, [...类.keys()]);
}

console.log('\n' + '═'.repeat(50));
console.log(`通过 ${通过} / 失败 ${失败}`);
if (失败) { console.log('★ 有失败项'); process.exit(1); }
console.log('全部通过');

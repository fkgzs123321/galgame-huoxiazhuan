/**
 * 繁简转换自测
 * 运行：node --import tsx src/活侠传/_work/test-fanjian.ts
 */
import { 转简体, 转简体深, 找漏字 } from '../脚本/繁简';

let 通过 = 0;
let 失败 = 0;
function 断言(名: string, 条件: boolean, 附?: unknown) {
  if (条件) { 通过++; console.log(`  ✓ ${名}`); }
  else { 失败++; console.log(`  ✗ ${名}`); if (附 !== undefined) console.log('      ' + JSON.stringify(附).slice(0, 300)); }
}

console.log('══ ① 属性名（最要紧，必须对上 schema）══');
for (const [繁, 简] of [
  ['內力', '内力'], ['體力', '体力'], ['輕功', '轻功'], ['學問', '学问'],
  ['處世', '处世'], ['修養', '修养'], ['道德', '道德'], ['心相', '心相'],
  ['性情', '性情'], ['陰陽', '阴阳'], ['刀劍', '刀剑'], ['拳掌', '拳掌'],
  ['醫術', '医术'], ['戰術', '战术'], ['武學點', '武学点'],
] as [string, string][]) {
  const 得 = 转简体(繁);
  断言(`${繁} → ${简}`, 得 === 简, { 得 });
}

console.log('\n══ ② 条件表达式 ══');
{
  const 得 = 转简体('性情>=60<br>刀劍>=20<br>輕功>=20');
  console.log('  ' + 得);
  断言('>= 保留', 得.includes('>='));
  断言('属性名已转简', 得.includes('性情') && 得.includes('刀剑') && 得.includes('轻功'));
  断言('分隔符已转', 得.includes('|') || 得.includes('<br>'));
}

console.log('\n══ ③ 长词优先（不被单字规则拆坏）══');
{
  断言('師兄 → 师兄', 转简体('師兄') === '师兄', 转简体('師兄'));
  断言('葉雲舟 → 叶云舟', 转简体('葉雲舟') === '叶云舟', 转简体('葉雲舟'));
  断言('唐陞 → 唐升', 转简体('唐陞') === '唐升', 转简体('唐陞'));
  断言('唐錚 → 唐铮', 转简体('唐錚') === '唐铮', 转简体('唐錚'));
  断言('飛石幫 → 飞石帮', 转简体('飛石幫') === '飞石帮', 转简体('飛石幫'));
  断言('雲霄雷霆霹靂刀', 转简体('雲霄雷霆霹靂刀') === '云霄雷霆霹雳刀', 转简体('雲霄雷霆霹靂刀'));
}

console.log('\n══ ④ 递归转换 ══');
{
  const 入 = { 名: '流星劍譜', 条件: ['性情>=60', '刀劍>=20'], 嵌套: { 类: '刀劍' } };
  const 出 = 转简体深(入);
  console.log('  ' + JSON.stringify(出));
  断言('键转了', '条件' in 出, Object.keys(出));
  断言('值转了', (出 as any).名 === '流星剑谱', (出 as any).名);
  断言('数组转了', (出 as any).条件[0] === '性情>=60');
  断言('嵌套转了', (出 as any).嵌套.类 === '刀剑');
}

console.log('\n══ ⑤ 幂等（转两次结果一样）══');
{
  const a = 转简体('流星劍譜');
  const b = 转简体(a);
  断言('二次转换不变', a === b, { a, b });
}

console.log('\n══ ⑥ 用真实数据跑一遍 ══');
{
  const fs = require('node:fs');
  const 书 = JSON.parse(fs.readFileSync('src/活侠传/_work/_books.json', 'utf8'));
  const 简 = 转简体深(书) as any[];
  console.log(`  ${简.length} 本秘籍`);
  // 抽查
  for (const m of 简.slice(0, 3)) {
    console.log(`    【${m.类}】${m.名}  条件: ${(m.条件 || []).join(' / ') || '无'}`);
  }
  const 还含繁 = 简.filter(m => /[劍譜輕氣內體學問術養處戰勝傷藥銀錢鐵門雲週選還]/.test(JSON.stringify(m)));
  console.log(`  转换后仍含常见繁体的: ${还含繁.length} 本`);
  断言('★ 转完后基本没有繁体', 还含繁.length === 0, 还含繁.slice(0, 3).map(m => m.名));

  // 属性名是否对得上 schema
  const 合法 = new Set(['刀剑', '暗器', '拳掌', '腿法', '奇门', '软兵器', '枪棍', '内功',
    '轻功', '魅力', '学问', '嘴力', '道德', '性情', '处世', '修养', '心相', '阴阳',
    '体力', '内力', '武学点', '抗毒', '抗麻', '形意拳', '医术', '战术', '毒药', '麻痹']);
  const 全效果 = 简.flatMap(m => m.效果 || []);
  const 属性们 = new Set<string>();
  for (const e of 全效果) {
    const mm = /^([\u4e00-\u9fa5]{2,4})/.exec(e);
    if (mm) 属性们.add(mm[1]);
  }
  属性们.delete(''); 
  const 不在表 = [...属性们].filter(a => !合法.has(a) && !a.includes('刀') && !a.includes('拳'));
  console.log(`  效果里出现的属性名 ${属性们.size} 个，未在白名单的 ${不在表.length} 个`);
  if (不在表.length) console.log('    ' + 不在表.join(' '));
}

console.log('\n' + '═'.repeat(50));
console.log(`通过 ${通过} / 失败 ${失败}`);
if (失败) { console.log('★ 有失败项'); process.exit(1); }
console.log('全部通过');

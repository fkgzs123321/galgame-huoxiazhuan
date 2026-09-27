/** 临时诊断：查第二年的路线数据 */
import { 事件目录, 该旬目录, 该旬路线 } from '../脚本/事件目录';

console.log('══ 2年3月全部条目 ══');
const 全 = 事件目录.filter(x => x.年 === 2 && x.月 === 3);
for (const x of 全) {
  console.log(`  旬${x.旬}  路线=${JSON.stringify(x.路线)}  ${x.名}`);
}
console.log(`  共 ${全.length} 条`);

console.log('\n══ 该旬函数 ══');
console.log(`  该旬目录(2,3,1) = ${该旬目录(2, 3, 1).length}`);
console.log(`  该旬路线(2,3,1,崆峒留学) = ${该旬路线(2, 3, 1, '崆峒留学').length}`);
console.log(`  该旬路线(2,3,1,青城留学) = ${该旬路线(2, 3, 1, '青城留学').length}`);
console.log(`  该旬路线(2,3,1,'') = ${该旬路线(2, 3, 1, '').length}`);

console.log('\n══ 找一旬确实有多路线的 ══');
const 时s = [...new Set(事件目录.filter(x => x.路线).map(x => x.时))];
let 找到 = 0;
for (const 时 of 时s.sort((a, b) => a - b)) {
  const 条 = 事件目录.filter(x => x.时 === 时);
  const 线s = [...new Set(条.map(x => x.路线).filter(Boolean))];
  if (线s.length >= 2) {
    console.log(`  时=${时}  路线 ${线s.length} 种: ${线s.join(' / ')}`);
    for (const x of 条) console.log(`      [${x.路线 || '共用'}] ${x.名}`);
    找到++;
    if (找到 >= 3) break;
  }
}
if (!找到) console.log('  （没有任何一旬有 2 种以上路线）');

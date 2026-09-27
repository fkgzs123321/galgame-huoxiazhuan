// 校准版扫描：分型 + 蓝灯体积 + ❤️ 写法
import fs from 'fs';
import path from 'path';

const WB = '世界书';
const SKIP = /(_基础信息|_调色盘|_阶段\d)\.txt$/;
// 词表/清单型条目：顿号排比与主语判据豁免（它们本来就是词表，不是行文）
const LISTY = /词料速查|角色速览|文风|控制中心|玩家档案|随机欲妈生成|规则\]/;

const CHECKS = [
  ['破折号', /——/g],
  ['元叙事·写作指引', /AI\s*写作要点|写作要点|施工规范|用途说明|戏剧用途|写作指引/g],
  ['元叙事·唯一真源', /唯一真源|不在这里重复|这里不重复|此处不重复|不在本列/g],
  ['跨条目引用', /详见|对应「|配套说明|见各成员|见各自的|见各人/g],
  ['假性主体', /一股[^，。]{0,8}(涌上|蔓延|升起)|一个念头[^，。]{0,6}成形|被一种[^，。]{0,8}包裹|戳中了/g],
  ['模糊词', /似乎|几乎|仿佛|如同|宛如/g],
  ['八股微表情', /嘴角微微上扬|眼中闪过一丝|嘴角勾起/g],
  ['语气声线', /带着[^，。]{0,6}的口吻|用[^，。]{0,6}的语气/g],
  ['否定转折', /不是[^，。]{0,10}，只是/g],
  ['空洞数字', /停留.{0,2}\d+(\.\d+)?\s*秒/g],
];

const rows = [];
for (const f of fs.readdirSync(WB).filter(x => x.endsWith('.txt') && !SKIP.test(x)).sort()) {
  const s = fs.readFileSync(path.join(WB, f), 'utf8');
  const hits = [];
  for (const [name, re] of CHECKS) {
    const m = s.match(re);
    if (m && m.length) hits.push(`${name}×${m.length}:[${[...new Set(m)].slice(0, 3).join('|')}]`);
  }
  // 顿号排比：仅非词表条目
  if (!LISTY.test(f)) {
    const m = s.match(/、[^，。；：！？\n]{1,8}、[^，。；：！？\n]{1,8}、/g);
    if (m && m.length) hits.push(`行文顿号排比×${m.length}:[${m.slice(0, 2).join(' / ')}]`);
  }
  // ❤ 变体
  const bare = (s.match(/❤(?!️)/g) || []).length;
  const full = (s.match(/❤️/g) || []).length;
  if (bare) hits.push(`❤非实心×${bare}(实心${full})`);
  rows.push({ f: f.replace('.txt', ''), len: s.length, hits: hits.join(' ｜ ') });
}
let bad = 0;
console.log('条目'.padEnd(32) + '字符\t问题');
for (const r of rows) {
  if (r.hits) bad++;
  console.log((r.hits ? '★' : ' ') + r.f.padEnd(31) + String(r.len).padStart(5) + '\t' + r.hits);
}
console.log(`\n共 ${rows.length} 条，命中 ${bad} 条`);

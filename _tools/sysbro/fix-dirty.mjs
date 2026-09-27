// 器官指称脏字化：把中性/体面指称改成「词料根 ＋ 脏字」
//   ★ 跳过 词料速查（词表本身）与 淫视两篇（照搬 skills 规范原文，一字不改）
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/世界书/';
const 跳过 = new Set(['文风/词料速查.txt', '文风/淫视叙事总纲.txt', '文风/淫视肉体落笔.txt']);

// 顺序重要：先长词，后短词
const 表 = [
  ['那两团假体', '那两团假奶子'],
  ['两团假体', '两团假奶子'],
  ['那块假体', '那坨假奶子'],
  ['的奶肉', '的骚奶子'],
  ['奶肉', '骚奶肉'],
  ['浅粉乳尖', '浅粉骚奶头'],
  ['乳尖', '骚奶头'],
  ['乳房', '骚奶子'],
  ['乳丘', '骚乳丘'],
  ['乳晕', '骚乳晕'],
  ['肥厚阴唇', '肥厚的骚屄唇'],
  ['阴唇', '骚屄唇'],
  ['屄瓣', '骚屄瓣'],
  ['屄唇', '骚屄唇'],
  ['肥尻', '骚肥尻'],
  ['臀肉', '骚臀肉'],
  ['腚肉', '骚腚肉'],
  ['腿根嫩肉', '骚腿根嫩肉'],
];

const walk = (d) => {
  const out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith('变量')) continue;
      out.push(...walk(p));
    } else if (e.name.endsWith('.txt')) out.push(p);
  }
  return out;
};

let files = 0;
const 统计 = {};
for (const p of walk(ROOT)) {
  const rel = path.relative(ROOT, p).split(path.sep).join('/');
  if (跳过.has(rel)) continue;
  let s = fs.readFileSync(p, 'utf8');
  let hit = 0;
  for (const [a, b] of 表) {
    const n = s.split(a).length - 1;
    if (n) {
      s = s.split(a).join(b);
      hit += n;
      统计[a] = (统计[a] || 0) + n;
    }
  }
  if (hit) {
    fs.writeFileSync(p, s);
    files++;
  }
}
console.log('改到文件数:', files);
console.log('各类替换次数:');
for (const k of Object.keys(统计)) console.log('  ', k, '→', 统计[k]);

import fs from 'fs';
const 换 = [
  ['两团小而圆、色浅', '那两团小奶子圆而小、色浅'],
  ['两团小、圆，两片', '那两团小奶子圆而小，两片'],
  ['两团极小，两件衣服叠着穿', '那两团小奶极小，两件衣服叠着穿'],
  ['两团极小，两片臭', '那两团小奶极小，两片臭'],
  ['两团极小，两片屄唇', '那两团小奶极小，两片屄唇'],
  ['两团不大，内衣脱了就往下坠', '那两团奶子不大，内衣脱了就往下坠'],
  ['两团不大，内衣一脱', '那两团奶子不大，内衣一脱'],
  ['两团被内衣托着', '那两团奶子被内衣托着'],
  ['两团练得不大但扎实', '两团奶肉练得不大但扎实'],
  ['两团兜住，兜得不深', '两团奶肉兜住，兜得不深'],
  ['两团不大但扎实', '两团奶肉不大但扎实'],
  ['两团小而不大、翘着', '那两团小奶子翘着'],
  ['两团不大、沉', '那两团沉奶不大、沉'],
  ['两团不大、扎实', '那两团奶肉不大、扎实'],
];
const FILES = ['_work/data/_basic_data.mjs', '_work/data/_basic_data_2.mjs', '_work/data/_basic_data_3.mjs',
  '_work/data/_smell.mjs', '_work/tmp/_patch_priv.json', '_work/tmp/_patch_orgasm.json',
  '世界书/郝佳期_基础信息.txt'];
for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8'); const b = s;
  for (const [a, c] of 换) if (s.includes(a)) s = s.split(a).join(c);
  if (s !== b) { fs.writeFileSync(f, s, 'utf8'); console.log('✓ ' + f); }
}

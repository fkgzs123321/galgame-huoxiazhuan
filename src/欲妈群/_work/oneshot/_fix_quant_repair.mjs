// 修复上一轮链式替换造成的叠字：那两片肉 → 那两片骚屄唇 → 又被「那两片」命中
import fs from 'fs';
const DIR = '_work/data';
const RULES = [
  [/(那?)两片骚屄唇(?=(骚屄唇|厚屄唇|薄屄唇|屄唇|薄肉|黑到发紫))/g, '$1两片'],
  [/腰窝那个屄/g, '腰窝'],
  [/那两片骚屄唇骚屄唇/g, '那两片骚屄唇'],
];
let total = 0;
for (const f of fs.readdirSync(DIR).filter(x => /^(_data_.*|_subj(_\d+)?)\.mjs$/.test(x))) {
  const fp = DIR + '/' + f;
  let s = fs.readFileSync(fp, 'utf8');
  let n = 0;
  for (const [re, to] of RULES) n += (s.match(re) || []).length;
  for (const [re, to] of RULES) s = s.replace(re, to);
  if (n) { fs.writeFileSync(fp, s, 'utf8'); console.log(f + '  修复 ' + n); }
  total += n;
}
console.log('共修复 ' + total + ' 处');

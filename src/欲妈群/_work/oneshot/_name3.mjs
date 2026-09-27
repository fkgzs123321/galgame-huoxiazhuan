import fs from 'fs';
const 换 = [
  ['两团练出来的肉被', '两团练出来的奶肉被'],
  ['两团不大，被内衣压了一整天', '那两团奶子不大，被内衣压了一整天'],
  ['两团不大，一解开内衣', '那两团奶子不大，一解开内衣'],
  ['两团不大、被内衣', '那两团奶子不大、被内衣'],
  ['两团不大，被内衣', '那两团奶子不大，被内衣'],
];
const FILES = ['_work/data/_basic_data_2.mjs', '_work/data/_basic_data_3.mjs',
  '_work/tmp/_patch_priv.json', '_work/tmp/_patch_orgasm.json'];
for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8'); const b = s;
  for (const [a, c] of 换) if (s.includes(a)) s = s.split(a).join(c);
  if (s !== b) { fs.writeFileSync(f, s, 'utf8'); console.log('✓ ' + f); }
}

import fs from 'fs';
const FILES = ['_work/data/_basic_data.mjs', '_work/data/_basic_data_2.mjs', '_work/data/_basic_data_3.mjs', '_work/tmp/_patch_priv.json'];
const 换 = [
  ['骚逼是成熟女人混出来的烂熟黑屄，两片厚臭屄唇', '那个骚逼是成熟女人混出来的，烂熟、发黑，两片厚臭屄唇'],
  ['骚逼是生过孩子的烂熟黑屄，两片厚臭屄唇', '那个骚逼是生过孩子的，烂熟、发黑，两片厚臭屄唇'],
  ['骚逼是被练出来的烂熟骚逼，两片厚臭屄唇', '那个骚逼是被一天一天练出来的，烂熟发黑，两片厚臭屄唇'],
  ['骚逼是没生过的紧窄骚逼，两片厚臭屄唇', '那个骚逼是没生过的，紧窄，两片厚臭屄唇'],
  ['骚逼两片臭屄唇', '那个骚逼两片臭屄唇'],
  ['那处两片臭屄唇', '那两片臭屄唇'],
  ['骚逼那片剃得只剩一层青茬', '下面那片剃得只剩一层青茬'],
  ['她自己抠完不擦，走到茶几边上', '她自己抠完不擦，走到茶几边上'],
];
let n = 0;
for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8'); const b = s;
  for (const [a, c] of 换) s = s.split(a).join(c);
  if (s !== b) { fs.writeFileSync(f, s, 'utf8'); n++; console.log('✓ ' + f); }
}
console.log('修 ' + n + ' 个文件');

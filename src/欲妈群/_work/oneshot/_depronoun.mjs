import fs from 'fs';
const FILES = ['_work/data/_basic_data.mjs', '_work/data/_basic_data_2.mjs', '_work/data/_basic_data_3.mjs',
  '_work/data/_smell.mjs', '_work/tmp/_patch_priv.json', '_work/tmp/_patch_orgasm.json',
  '世界书/郝佳期_基础信息.txt'];
// 裸指代 → 点名器官 ＋ 脏/臭/腥定语（用户：什么叫两瓣？骚臭逼的两个黑瓣）
const 规则 = [
  // 先处理带前缀的特例，免得被通用规则吃掉
  [/后头那处/g, '屁眼那处'],
  [/那处那圈褶皱/g, '屁眼那圈褶皱'],
  // 乳房／奶头
  [/那两点(?=就顶出|顶出)/g, '那两个骚奶头'],
  [/那两团(?![肥沉骚的奶肉妇])/g, '那两团肥奶子'],
  [/那两点/g, '那两个骚奶头'],
  // 乳沟
  [/那道沟(?![烫乳])/g, '那道焐出油的带奶腥味臭乳沟'],
  [/那道沟/g, '那道焐出油的臭乳沟'],
  // 屄肉／阴唇
  [/那两片(?![薄的臭屄肉唇])/g, '那两片骚臭屄肉'],
  [/那两瓣(?![骚臭黑肉])/g, '那两片骚臭逼的黑瓣'],
  [/那两瓣/g, '那两片骚臭逼的黑瓣'],
  // 指代「那处」→ 按上下文给具体器官
  [/后头那处/g, '那个屁眼'],
  [/那处是生过/g, '那个骚逼是生过'],
  [/那处常年/g, '那个骚逼常年'],
  [/那处近乎/g, '那个骚逼近乎'],
  [/那处剃得/g, '下面那片剃得'],
  [/那处的/g, '那个骚逼的'],
  [/那处两片/g, '那个骚逼两片'],
  [/那处(?=[，。；、）]|$)/g, '那个骚逼'],
  [/那处/g, '那个骚逼'],
  // 泛指「那里」
  [/往那里头/g, '往那个骚逼里头'],
  [/那里(?=[，。；、）]|$)/g, '那个骚逼'],
  [/那里/g, '那个骚逼'],
];
let tot = 0;
for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8'); const b = s;
  let n = 0;
  for (const [re, c] of 规则) { const m = s.match(re); if (m) { s = s.replace(re, c); n += m.length; } }
  if (s !== b) { fs.writeFileSync(f, s, 'utf8'); tot += n; console.log('✓ ' + f + '（' + n + ' 处）'); }
}
console.log('合计改 ' + tot + ' 处');

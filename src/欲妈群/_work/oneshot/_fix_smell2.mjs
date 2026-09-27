import fs from 'fs';
// ① 柚子那几条：去掉「粉底／香氛／高光」这些非体味来源
const f1 = '_work/data/_smell.mjs';
let s = fs.readFileSync(f1, 'utf8');
const 换 = [
  ['带妆出汗，粉底下那股酸先出来，比汗味重', '一整天闷在衣服底下，那股酸先出来，比平时的汗味重'],
  ['发情时底下那股骚被香氛压着一半，压不住的那半更冲', '发情时底下那股骚压不住，越往外顶越冲'],
  ['裆间咸甜，她自己拿香氛盖，盖不住底下那点原味', '裆间咸甜里带一点闷出来的酸，一整天下来布上留着'],
  ['锁骨上打高光那一块积着汗，摸上去滑', '锁骨那一块积着汗，摸上去滑'],
];
let n = 0;
for (const [a, b] of 换) if (s.includes(a)) { s = s.replace(a, b); n++; }
fs.writeFileSync(f1, s, 'utf8');
console.log('柚子气味改 ' + n + ' 条');

// ② 小夜_基础信息 影像里那句环境味（旧格式文件，先就地改掉）
const f2 = '世界书/小夜_基础信息.txt';
let t = fs.readFileSync(f2, 'utf8');
const a2 = '身上是消毒水、防腐药水和花店冷柜混出来的气味。';
if (t.includes(a2)) { t = t.replace(a2, '身上那股味淡而冷，凑近了才有一层薄薄的苦。'); fs.writeFileSync(f2, t, 'utf8'); console.log('小夜 影像里那句环境味已改'); }
else console.log('小夜 那句未命中');

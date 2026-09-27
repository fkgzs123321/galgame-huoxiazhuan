import fs from 'fs';
const FILES = ['_work/data/_basic_data.mjs', '_work/data/_basic_data_2.mjs', '_work/data/_basic_data_3.mjs',
  '_work/data/_smell.mjs', '_work/tmp/_patch_priv.json', '_work/tmp/_patch_orgasm.json',
  '世界书/郝佳期_基础信息.txt'];
const 换 = [
  ['常年披着遮耳——遮的是耳后那一片', '常年披着遮耳，遮的是耳后那一片'],
  ['要把衬衫理三遍——那三遍里有她自己的讲究', '要把衬衫理三遍，那三遍里有她自己的讲究'],
  ['看人的时候不眨——她看的是身上那条线', '看人的时候不眨，她看的是身上那条线'],
  ['画到别处——画在一张谁也不会看见的纸上', '画到别处，画在一张谁也不会看见的纸上'],
  ['那是别人的编号——她自己的那一栏划掉了', '那是别人的编号，她自己的那一栏划掉了'],
  ['只看——看的时候她把一只手放在扶手上', '只看，看的时候她把一只手放在扶手上'],
  ['吃这么少那处也几乎不出水', '吃这么少那处也不怎么出水'],
  ['顺着骚骚屁股淌到床单上', '顺着屁股淌到床单上'],
  ['顺着骚骚屁股沟涌出来', '顺着屁股沟涌出来'],
  ['顺着骚骚屁股沟流到皮椅面上', '顺着屁股沟流到皮椅面上'],
  ['从臭屄口涌出', '从那个骚逼口涌出'],
];
let n = 0;
for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8'); const b = s;
  for (const [a, c] of 换) if (s.includes(a)) { const k = s.split(a).length - 1; s = s.split(a).join(c); n += k; }
  if (s !== b) { fs.writeFileSync(f, s, 'utf8'); console.log('✓ ' + f); }
}
console.log('修 ' + n + ' 处');

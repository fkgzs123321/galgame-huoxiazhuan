import fs from 'node:fs';
const R = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/世界书/';
const 表 = [
  ['禁止把站姿的乳臀状态直接搬进俯卧', '禁止把站姿的骚奶子与骚尻状态直接搬进俯卧'],
  ['那个合不拢的屄洞', '那个合不拢的骚屄洞'],
  ['箍住屌身', '箍住那根粗屌'],
  ['量词后面必须跟器官名。两片骚屄唇、两团练出来的奶肉、两团 G 杯的肥奶子，三种形态都算合格。',
   '量词后面必须跟器官名，且必须是「器官名」不是材质词。合格形态三种: 两片骚屄唇（量词＋器官）｜两团 G 杯的肥奶子（量词＋形容词＋器官）｜那两团 M 杯的骚奶子（量词＋数量词＋器官）。不合格: 两团练出来的奶肉（材质词顶替器官名）｜两团是填出来的圆（没有器官名）。'],
];
const walk = (d) => { const o=[]; for (const e of fs.readdirSync(d,{withFileTypes:true})) { const p=d+e.name; if(e.isDirectory()) o.push(...walk(p+'/')); else if(e.name.endsWith('.txt')) o.push(p);} return o; };
let n=0;
for (const p of walk(R)) {
  let s = fs.readFileSync(p,'utf8'); let hit=0;
  for (const [a,b] of 表) { const c=s.split(a).length-1; if(c){ s=s.split(a).join(b); hit+=c; } }
  if (hit) { fs.writeFileSync(p,s); n+=hit; }
}
console.log('修', n, '处');

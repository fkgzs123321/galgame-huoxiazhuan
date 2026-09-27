import fs from 'node:fs';
const R = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/世界书/';
const 表 = [
  ['骚骚尻肉','骚尻肉'], ['骚骚臀肉','骚臀肉'], ['骚骚腚肉','骚腚肉'],
  ['骚骚奶子','骚奶子'], ['骚骚奶肉','骚奶子'], ['骚骚屄唇','骚屄唇'],
  ['骚骚肥尻','骚肥尻'], ['骚骚腿根','骚腿根'], ['臭臭','臭'],
  ['烂熟的屄洞','烂熟的骚屄洞'],
  ['若肥桃的大熟臀','若肥桃的大骚臀'],
  ['泛起肉浪的乳臀','泛起肉浪的骚乳臀'],
  ['视觉: 透光、奶头凸点、逼毛阴影、油丝光泽','视觉: 透光、骚奶头凸点、骚逼毛阴影、油丝光泽'],
  ['屁股写成倒心状若肥桃','骚屁股写成倒心状若肥桃'],
  ['胯部撞上骚臀肉的闷响','胯部撞上骚臀肉的闷响'],
  ['两瓣厚实安产的肥圆骚屁股蛋子','两瓣厚实安产的肥圆骚尻蛋子'],
];
const walk = (d) => { const o=[]; for (const e of fs.readdirSync(d,{withFileTypes:true})) { const p=d+e.name; if(e.isDirectory()) o.push(...walk(p+'/')); else if(e.name.endsWith('.txt')) o.push(p);} return o; };
let n=0;
for (const p of walk(R)) {
  let s = fs.readFileSync(p,'utf8'); let hit=0;
  for (const [a,b] of 表) { const c=s.split(a).length-1; if(c){ s=s.split(a).join(b); hit+=c; } }
  if (hit) { fs.writeFileSync(p,s); n+=hit; }
}
console.log('修', n, '处');

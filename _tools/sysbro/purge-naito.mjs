import fs from 'node:fs';
import path from 'node:path';
const R = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/世界书/';
const 表 = [
  // ① 奶肉族：材质词一律不许当器官指称 → 全部换成器官名
  ['两片骚奶肉', '两团骚奶子'],
  ['肥软骚奶肉', '肥软的骚奶子'],
  ['骚奶肉', '骚奶子'],
  ['两团奶肉', '两团骚奶子'],
  ['那团奶肉', '那团骚奶子'],
  ['奶肉臀肉挨一巴掌', '骚奶子骚尻肉挨一巴掌'],
  ['整片视野被那两团肥硕奶肉占满', '整片视野被那两团肥硕骚奶子占满'],
  ['从指缝里挤出好几坨温热嫩滑的奶肉', '从指缝里挤出好几坨温热嫩滑的骚奶子'],
  ['奶肉从领口溢出去', '骚奶子从领口溢出去'],
  ['臀肉把裙摆从底下鼓开', '骚尻肉把裙摆从底下鼓开'],
  ['小腿窝', '小腿窝'],
  ['奶肉', '骚奶子'],
  // ② 其余「器官＋肉」材质词加脏字
  ['领口勒进乳肉陷出的那道压痕', '领口勒进骚奶子陷出的那道压痕'],
  ['乳肉', '骚奶子'],
  ['屄肉', '骚屄肉'],
  ['腔肉', '骚腔肉'],
  ['尻肉', '骚尻肉'],
  ['臀肉', '骚臀肉'],
  ['腚肉', '骚腚肉'],
];
const walk = (d) => { const o=[]; for (const e of fs.readdirSync(d,{withFileTypes:true})) { const p=d+e.name; if(e.isDirectory()) o.push(...walk(p+'/')); else if(e.name.endsWith('.txt')) o.push(p);} return o; };
let n=0, files=0;
for (const p of walk(R)) {
  let s = fs.readFileSync(p,'utf8'); let hit=0;
  for (const [a,b] of 表) { const c=s.split(a).length-1; if(c){ s=s.split(a).join(b); hit+=c; } }
  if (hit) { fs.writeFileSync(p,s); n+=hit; files++; }
}
console.log('清掉', n, '处，涉及', files, '个文件');

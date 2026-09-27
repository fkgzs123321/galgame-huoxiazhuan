// 把 skills 里还带着旧分类的传播源修掉
//   ① by-style 六套 × 三份：旧词料表行 → craft-05 的新三栏版
//   ② 其余 prose 里的材质词 → 器官主体词
//   规则：含「形态」「主体」「修饰」「永不得单独指器官」的行 = 词表行，不替换
import fs from 'node:fs';
import path from 'node:path';

const ROOT =
  'E:/Games/写卡/tavern_helper_template/.skills/tavern-cards/references/contents-creation/';

// ── ① 旧词料表行 → 新三栏版 ──
const 旧乳 =
  '    乳: 形态:双乳/一对奶子/浑圆乳丘/沉坠奶肉/吊钟骚奶/水滴形骚奶/紧致翘挺小奶/小巧胸弧/微隆乳丘｜质感:腻软奶肉/肥软奶肉/汗浸出油光的乳丘/稚嫩奶包/青涩薄乳/被碾成肥腻乳饼｜乳尖乳晕:粗挺乳粒/浅粉乳尖/涨硬凸起的奶头/宽大乳晕/整圈隆起的乳晕嫩肉/被嗦得发亮的乳粒/还没被吸开的乳尖｜畜化:种母奶袋/发情母畜的奶包/淫乳/奶袋子';
const 新乳 = [
  '    乳:',
  '      主体: 骚奶子/臭奶子/大肥奶子/肥奶子/小骚奶子/吊钟骚奶/水滴形骚奶/紧致翘挺的骚小奶/淫乳/奶袋子/种母奶袋',
  '      修饰: 奶肉/乳肉/乳丘/奶包/稚嫩奶包/青涩薄乳/被碾成肥腻乳饼/腻软/肥软/浑圆/沉坠',
  '      乳尖乳晕: 骚奶头/涨硬骚奶头/粗挺乳粒/浅粉骚奶头/骚乳晕/宽大骚乳晕/整圈隆起的骚乳晕嫩肉/被嗦得发亮的乳粒',
  '      坐标: 乳根/乳沟/锁骨窝',
  '      禁: 乳房/胸部/前胸/上身（体面词顶替）',
].join('\n');

// ── ② prose 材质词 → 器官主体词（只作用于非词表行）──
const prose表 = [
  ['肥硕奶肉占满', '肥硕骚奶子占满'],
  ['沉坠奶肉一并往', '沉坠的骚奶子一并往'],
  ['晃荡奶肉往后拽', '晃荡的骚奶子往后拽'],
  ['一团奶肉的下缘', '一团骚奶子的下缘'],
  ['奶肉臀肉挨一巴掌', '骚奶子骚尻肉挨一巴掌'],
  ['两团奶肉把湿布', '两团骚奶子把湿布'],
  ['温热嫩滑的奶肉', '温热嫩滑的骚奶子'],
  ['没兜住的奶肉被这一拢', '没兜住的骚奶子被这一拢'],
  ['隔着奶肉呼吸', '隔着骚奶子呼吸'],
  ['奶肉从领口溢出去', '骚奶子从领口溢出去'],
  ['那团奶肉甩出去', '那团骚奶子甩出去'],
  ['唇肉', '骚屄唇'],
  ['领口勒进乳肉陷出的', '领口勒进骚奶子陷出的'],
  ['肥软乳肉里捏住', '肥软的骚奶子里捏住'],
  ['托住乳肉反复掂量', '托住骚奶子反复掂量'],
  ['乳房弹跳而出，乳肉晃动', '骚奶子弹跳而出，奶肉晃动'],
  ['深陷乳肉形成', '深陷骚奶子形成'],
  ['乳肉将布料撑出', '骚奶子将布料撑出'],
  ['晃动时乳肉波浪形', '晃动时骚奶子波浪形'],
  ['蕾丝图案深陷乳肉', '蕾丝图案深陷骚奶子'],
  ['细带或链条深陷乳肉', '细带或链条深陷骚奶子'],
  ['乳肉从细带间隙挤出', '骚奶子从细带间隙挤出'],
  ['等屄肉一层层绞紧', '等骚屄一层层绞紧'],
  ['缝里那圈嫩红屄肉', '缝里那圈嫩红的骚屄肉'],
  ['奶肉溢出领口堆在锁骨底下', '骚奶子溢出领口堆在锁骨底下'],
  ['臀肉把裙摆撑出横褶', '骚尻肉把裙摆撑出横褶'],
  ['臀肉把裙摆从底下鼓开', '骚尻肉把裙摆从底下鼓开'],
  ['两片腿根嫩肉在并拢时', '两片骚腿根嫩肉在并拢时'],
];

const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.md')) files.push(p);
  }
};
walk(ROOT);

let 词表改 = 0,
  prose改 = 0;
const 词表文件 = [];
for (const p of files) {
  const rel = path.relative(ROOT, p).split(path.sep).join('/');
  if (rel.includes('presentation-craft-05')) continue; // 源头已重分类
  let s = fs.readFileSync(p, 'utf8');
  let touched = false;

  if (s.includes(旧乳)) {
    s = s.replace(旧乳, 新乳);
    词表改++;
    词表文件.push(rel);
    touched = true;
  }

  const lines = s.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/形态|主体|修饰|永不得单独指器官|禁用|坐标/.test(l)) continue;
    let nl = l;
    for (const [a, b] of prose表) {
      if (nl.includes(a)) {
        nl = nl.split(a).join(b);
        prose改++;
      }
    }
    lines[i] = nl;
  }
  const out = lines.join('\n');
  if (touched || out !== s) fs.writeFileSync(p, out);
}

console.log('① 词料表行替换:', 词表改, '个文件');
词表文件.forEach((f) => console.log('   ' + f));
console.log('② prose 材质词替换:', prose改, '处');

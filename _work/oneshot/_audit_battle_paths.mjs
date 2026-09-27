import fs from 'fs';
const html = fs.readFileSync('src/欲望都市/正则/战斗面板界面.html', 'utf8');
const paths = new Set();
// obj(d.玩家).xxx / obj(c.xxx).yyy / obj(pb.xxx).zzz 等
const re1 = /obj\(([a-z]\.?[^)]*?)\)\.([\u4e00-\u9fffA-Za-z]+)/g;
let m;
while ((m = re1.exec(html)) !== null) {
  const inner = m[1].trim();
  if (/^(d|c|p|pb|pc|pPhysio|physio)\./.test(inner)) {
    paths.add(`${inner}.${m[2]}`);
  }
}
// d.玩家.xxx 直接读取
const re2 = /d\.(?:玩家|排班)[\u4e00-\u9fffA-Za-z\[\]'"\.]*/g;
while ((m = re2.exec(html)) !== null) paths.add(m[0]);
// num(c.xxx) / num(pb.xxx) 等
const re3 = /num\((c|pb|p|pc)\.([^,)]+)/g;
while ((m = re3.exec(html)) !== null) paths.add(`${m[1]}.${m[2]}`);
console.log('===== 战斗面板变量读取路径 =====');
for (const p of [...paths].sort()) console.log(' ', p);

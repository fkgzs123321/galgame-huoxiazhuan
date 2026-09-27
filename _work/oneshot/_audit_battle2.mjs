import fs from 'fs';

const html = fs.readFileSync('src/欲望都市/正则/战斗面板界面.html', 'utf8');
const schema = fs.readFileSync('src/欲望都市/schema.ts', 'utf8');

// ===== 1. 提取面板所有字段读取 =====
const reads = new Set();
// obj(c.xxx).yyy / obj(d.玩家).zzz / obj(pb.xxx).yyy / obj(pc.xxx).yyy / obj(p.xxx).yyy
const re1 = /obj\((c|pb|pc|p|d\.玩家)\.([^)]+?)\)\.([A-Za-z\u4e00-\u9fff]+)/g;
let m;
while ((m = re1.exec(html)) !== null) reads.add(`${m[1]}.${m[2]}.${m[3]}`);
// num(c.xxx) / num(pb.xxx) / num(p.xxx) / num(pc.xxx)
const re2 = /num\((c|pb|pc|p|d\.玩家)\.([^,)]+)/g;
while ((m = re2.exec(html)) !== null) reads.add(`${m[1]}.${m[2]}`);
// d.排班.xxx
const re3 = /d\.排班\.([A-Za-z\u4e00-\u9fff]+)/g;
while ((m = re3.exec(html)) !== null) reads.add(`排班.${m[1]}`);
// d.女性角色[tgt].xxx
const re4 = /d\.女性角色[^\n]*?\]\.([A-Za-z\u4e00-\u9fff]+)/g;
while ((m = re4.exec(html)) !== null) reads.add(`c.${m[1]}`);
// obj(d.玩家).生理.xxx / c.生理周期.xxx 等深层
const re5 = /obj\((c|d\.玩家)\.(生理周期|生理|心理状态|身体状态|技能|能力值)\)\.([A-Za-z\u4e00-\u9fff]+)/g;
while ((m = re5.exec(html)) !== null) reads.add(`${m[1]}.${m[2]}.${m[3]}`);

console.log('===== 面板读取的全部字段 =====');
for (const r of [...reads].sort()) console.log(' ', r);
console.log('\n共', reads.size, '个读取');

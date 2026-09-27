// 器官指称脏字占比 · 收紧口径 v2
//   统计范围 = 本卡自撰内容（角色/世界观/扮演准则/地理/时间线/阶段指导 + 文风的门控两层）
//              ★ 不含 词料速查（它本身就是词表，定义上就列裸词）
//              ★ 不含 淫视叙事总纲 / 淫视肉体落笔（照搬 skills 规范原文，一字不改）
//   头部词白名单 → 命中即计数；黑名单复合词 → 命中不计
//   合格 = 头部词前 6 字内出现脏字，或该词本身含脏字
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/世界书/';
const 统计范围 = ['角色', '世界观', '扮演准则', '地理', '时间线', '阶段指导'];
const 额外文件 = ['文风/骚妈层.txt', '文风/母猪层.txt'];

const 头部词 = [
  '奶子', '奶头', '奶肉', '奶袋', '奶包', '奶',
  '乳丘', '乳尖', '乳晕', '乳粒', '乳房', '乳沟', '乳肉',
  '屄', '逼', '屄唇', '屄瓣', '腔肉', '阴唇', '阴蒂',
  '尻', '臀肉', '屁股', '腚肉', '腿根嫩肉',
];
const 黑名单 = ['乳交','乳罩','乳腺','逼成','逼迫','逼近','乳白','穴道','多穴','奶奶','汉堡'];
// 乳汁族与假阳性：这些是「动作 + 物」或成语，不是器官指称
const 语境排除 = /(喂|挤|吸|吃|喝|出|完|瓶|的|还)\s*奶|奶\s*(水|瓶|粉|油|酥|昔|酪|声|汪|茶)|酸奶|以死相逼|死相逼|产道|小奶那一档|娇小加小奶|落点档/;
const 动作物排除 = /(喂|挤|吸|吃|含|嗦|断|出|着|的)奶/;
const 脏字 = '脏臭腥黑骚烂淫臊馊秽贱雌畜母';

const walk = (d) => {
  const out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === '变量') continue;
      out.push(...walk(p));
    } else if (e.name.endsWith('.txt')) out.push(p);
  }
  return out;
};

const files = [];
for (const d of 统计范围) files.push(...walk(ROOT + d));
for (const f of 额外文件) files.push(ROOT + f);

let 合格 = 0, 不合格 = 0;
const 明细 = [];
const 按文件 = {};

for (const p of files) {
  const rel = path.relative(ROOT, p).split(path.sep).join('/');
  if (rel === '文风/词料速查.txt' || rel.startsWith('文风/淫视')) continue;
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const w of 头部词) {
      let idx = -1;
      while ((idx = line.indexOf(w, idx + 1)) !== -1) {
        const span = line.slice(Math.max(0, idx - 3), idx + w.length + 3);
        if (黑名单.some((b) => span.includes(b))) continue;
        if (语境排除.test(span)) continue;
        const before = line.slice(Math.max(0, idx - 6), idx);
        if (new RegExp('[' + 脏字 + ']').test(before)) 合格++;
        else {
          不合格++;
          明细.push(`${rel}:${i + 1}  …${line.slice(Math.max(0, idx - 14), idx + w.length + 8)}…`);
          按文件[rel] = (按文件[rel] || 0) + 1;
        }
      }
    }
  }
}

const 总 = 合格 + 不合格;
console.log('统计范围: ' + 统计范围.join('/') + ' + 文风/骚妈层·母猪层\n');
console.log('器官指称总数', 总, '｜带脏字', 合格, '｜裸词', 不合格);
console.log('脏字占比 ' + ((合格 / 总) * 100).toFixed(1) + '%   （门槛 ≥80%）\n');
console.log('裸词最多的文件:');
Object.entries(按文件).sort((a, b) => b[1] - a[1]).forEach(([f, n]) => console.log('  ' + n + '\t' + f));
console.log('\n裸词明细:');
明细.forEach((s) => console.log('  ' + s));

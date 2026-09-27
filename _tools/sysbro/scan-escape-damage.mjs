// 全库扫「bash 转义伤」：字面 /n、被拆开的块标量头、字面 \n
import fs from 'node:fs';
import path from 'node:path';
const CARD = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/';
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(txt|yaml|html|json)$/.test(e.name)) files.push(p);
  }
};
walk(CARD);

const 模式 = [
  [/:\/n/g, '冒号后跟字面 /n'],
  [/\|\s+-\s*$/gm, '块标量头 | 被拆开'],
  [/\\n[\u4e00-\u9fa5A-Za-z]/g, '字面 \\n'],
  [/\\\//g, '字面 \\/'],
];
let n = 0;
for (const p of files) {
  const t = fs.readFileSync(p, 'utf8');
  for (const [re, 名] of 模式) {
    const m = t.match(re);
    if (m && m.length) {
      n++;
      console.log('  ' + path.relative(CARD, p).split(path.sep).join('/') + ' → ' + 名 + ' ×' + m.length + '  ' + JSON.stringify(m[0].slice(0, 28)));
    }
  }
}
console.log(n ? '共 ' + n + ' 处需要看' : '✅ 没有转义伤');

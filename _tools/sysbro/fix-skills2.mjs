import fs from 'node:fs';
import path from 'node:path';
const ROOT = 'E:/Games/写卡/tavern_helper_template/.skills/tavern-cards/references/contents-creation/';
const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d,{withFileTypes:true})) { const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(e.name.endsWith('.md')) files.push(p); } };
walk(ROOT);
// 词表行 / 禁令说明行的判别式（这些行里出现材质词是合法的）
const 是词表行 = /形态[:：]|修饰[:：]|主体[:：]|永不得单独指器官|不得单独当主语|禁用部位|坐标[:：]|禁令二|不合格：|搜 `/;
let 改=0, 文件数=0;
for (const p of files) {
  const s = fs.readFileSync(p,'utf8');
  const lines = s.split('\n'); let hit=0;
  for (let i=0;i<lines.length;i++) {
    if (是词表行.test(lines[i])) continue;
    let l = lines[i];
    if (l.includes('乳肉')) { l = l.split('乳肉').join('骚奶子'); hit++; }
    if (l.includes('奶肉')) { l = l.split('奶肉').join('骚奶子'); hit++; }
    if (l.includes('屄肉')) { l = l.split('屄肉').join('骚屄'); hit++; }
    lines[i]=l;
  }
  if (hit) { fs.writeFileSync(p, lines.join('\n')); 改+=hit; 文件数++; }
}
console.log('prose 再修', 改, '处，涉及', 文件数, '个文件');

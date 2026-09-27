import fs from 'fs';
import path from 'path';
let n = 0;
for (const repo of ['.skills/tavern-cards', '_tc_repo/tavern-cards']) {
  const dir = path.join(repo, 'references/contents-creation/character/by-style');
  for (const 套 of fs.readdirSync(dir)) {
    const f = path.join(dir, 套, '基础信息.md');
    if (!fs.existsSync(f)) continue;
    let s = fs.readFileSync(f, 'utf8'); const b = s;
    s = s.replace(/站直了胸前那两团正悬在对视者眼前的高度/g, '站直了胸前那两团肥奶子正悬在对视者眼前的高度');
    s = s.replace(/仰起脸说话时整片视野被那两团奶肉占满/g, '仰起脸说话时整片视野被那两团肥硕奶肉占满');
    s = s.replace(/两瓣尻肉在身后撅出的宽度比肩还阔/g, '两瓣肥尻肉在身后撅出的宽度比肩还阔');
    if (s !== b) { fs.writeFileSync(f, s, 'utf8'); n++; }
  }
}
console.log('改 ' + n + ' 个 by-style 文件');

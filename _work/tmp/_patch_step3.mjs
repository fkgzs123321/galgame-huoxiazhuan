import fs from 'fs';
const 文件 = ['.skills/tavern-cards/SKILL.md', '_tc_repo/tavern-cards/SKILL.md'];
const 块 = fs.readFileSync('_work/tmp/_step3.md', 'utf8').replace(/\s+$/, '');
for (const f of 文件) {
  const raw = fs.readFileSync(f, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let lines = raw.split(/\r?\n/);
  if (raw.includes('强制层四份')) { console.log('已有，跳过 ' + f); continue; }
  const i = lines.findIndex(l => l.includes('前置必读：`references/rules.md`'));
  if (i < 0) { console.log('MISS ' + f); continue; }
  // 删掉原来的「★★ 所有条目…」那一段（从 i+1 到下一个缩进 3 个空格的步骤行之前）
  let j = i + 1;
  while (j < lines.length && !/^4\. /.test(lines[j])) j++;
  lines.splice(i, j - i, ...块.split('\n'));
  fs.writeFileSync(f, lines.join(eol), 'utf8');
  console.log('✓ 改写第 3 步必读清单：' + f);
}
const a = fs.readFileSync('.skills/tavern-cards/SKILL.md'), b = fs.readFileSync('_tc_repo/tavern-cards/SKILL.md');
console.log(Buffer.compare(a, b) === 0 ? '✅ 两套件一致' : '★ 不一致');

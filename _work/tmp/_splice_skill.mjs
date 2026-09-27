import fs from 'fs';
const 目标 = [
  ['.skills/tavern-cards/references/contents-creation/character/basic-info.md', '## 自查清单'],
  ['_tc_repo/tavern-cards/references/contents-creation/character/basic-info.md', '## 自查清单'],
];
const 块 = fs.readFileSync('_work/tmp/_guide_basic.md', 'utf8').replace(/\s+$/, '');
for (const [f, 锚] of 目标) {
  if (!fs.existsSync(f)) { console.log('缺 ' + f); continue; }
  const raw = fs.readFileSync(f, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let lines = raw.split(/\r?\n/);
  const i = lines.findIndex(l => l.startsWith(锚));
  if (i < 0) { console.log('MISS 锚点 ' + f); continue; }
  if (raw.includes('所有模块都要写「行为 + 画面」')) { console.log('已有，跳过 ' + f); continue; }
  lines.splice(i, 0, ...块.split('\n'), '');
  fs.writeFileSync(f, lines.join(eol), 'utf8');
  console.log('✓ 写入 ' + f);
}
// 校验两边一致
const a = fs.readFileSync('.skills/tavern-cards/references/contents-creation/character/basic-info.md'),
      b = fs.readFileSync('_tc_repo/tavern-cards/references/contents-creation/character/basic-info.md');
console.log(a.length === b.length && Buffer.compare(a, b) === 0 ? '✅ 两套件一致' : '★ 两边不一致');

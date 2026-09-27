import fs from 'fs';
const 块 = fs.readFileSync('_work/tmp/_new_table.md', 'utf8').replace(/\s+$/, '');
const 目标 = ['.skills/tavern-cards/references/contents-creation/character/basic-info.md',
              '_tc_repo/tavern-cards/references/contents-creation/character/basic-info.md'];
for (const f of 目标) {
  const raw = fs.readFileSync(f, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let lines = raw.split(/\r?\n/);
  const a = lines.findIndex(l => l.startsWith('## ⚠️⚠️ 先看这条'));
  const b = lines.findIndex((l, i) => i > a && l.startsWith('---'));
  if (a < 0 || b < 0) { console.log('MISS ' + f); continue; }
  lines.splice(a, b - a, ...块.split('\n'), '');
  fs.writeFileSync(f, lines.join(eol), 'utf8');
  console.log('✓ 改写主语判据表 ' + f);
}
const x = fs.readFileSync(目标[0]), y = fs.readFileSync(目标[1]);
console.log(Buffer.compare(x, y) === 0 ? '✅ 两套件一致' : '★ 不一致');

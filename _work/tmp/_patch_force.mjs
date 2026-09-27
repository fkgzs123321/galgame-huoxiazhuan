import fs from 'fs';
const 块 = fs.readFileSync('_work/tmp/_force_block.md', 'utf8').replace(/\s+$/, '');
const 组 = [
  ['.skills/tavern-cards/references/rules-check.md', '_tc_repo/tavern-cards/references/rules-check.md', null],
  ['.skills/tavern-cards/references/contents-creation/presentation-styles.md', '_tc_repo/tavern-cards/references/contents-creation/presentation-styles.md', '两条铁律：'],
];
for (const [a, b] of 组) {
  for (const f of [a, b]) {
    if (!fs.existsSync(f)) { console.log('缺 ' + f); continue; }
    const raw = fs.readFileSync(f, 'utf8');
    if (raw.includes('强制层：下列四份必须打开')) { console.log('已有，跳过 ' + f); continue; }
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    let lines = raw.split(/\r?\n/);
    // rules-check：插到「全局硬禁」块之后（文件靠前处）；styles：插到「〇、三条不可越过的前提」之前
    let i = lines.findIndex(l => l.startsWith('## 〇、★★ 三条不可越过的前提'));
    if (i < 0) i = lines.findIndex(l => l.startsWith('本文档是写作质量检查'));
    if (i < 0) i = lines.findIndex(l => l.startsWith('## '));
    if (i < 0) { console.log('MISS 锚点 ' + f); continue; }
    lines.splice(i, 0, ...块.split('\n'), '');
    fs.writeFileSync(f, lines.join(eol), 'utf8');
    console.log('✓ 写入 ' + f);
  }
}
for (const [a, b] of 组) {
  const x = fs.readFileSync(a), y = fs.readFileSync(b);
  console.log(Buffer.compare(x, y) === 0 ? ('✅ 一致 ' + a.split('/').pop()) : ('★ 不一致 ' + a.split('/').pop()));
}

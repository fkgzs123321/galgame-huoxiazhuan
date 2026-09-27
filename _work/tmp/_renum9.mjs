import fs from 'fs';
const 文件 = ['.skills/tavern-cards/references/contents-creation/presentation-styles.md', '_tc_repo/tavern-cards/references/contents-creation/presentation-styles.md'];
for (const f of 文件) {
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/(\n- 各段互斥，\*\*不要同时进上下文\*\*)\n(## ★★ 写完必过：逐角色终检表)/, '$1\n\n## 九、★★ 写完必过：逐角色终检表（强制，写一位跑一位）');
  fs.writeFileSync(f, s, 'utf8');
  console.log('✓ ' + f);
}
const a = fs.readFileSync(文件[0]), b = fs.readFileSync(文件[1]);
console.log(Buffer.compare(a, b) === 0 ? '✅ 两套件一致' : '★ 不一致');

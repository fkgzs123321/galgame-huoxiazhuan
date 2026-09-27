import fs from 'fs';
const 块 = [
'   - ★★★ **每写完一位角色（或一条角色条目），立刻跑一遍 `references/contents-creation/character/逐角色终检表.md`**，',
'     逐项打勾，**不过就地重写，不许留到全书写完**。这张表里第一条就是「**回到强制层再对照一次**」：',
'     逐句对 `presentation-common-01-用词.md` 的脏话麻花五法则、数 `presentation-craft-05` 的词料命中、',
'     验 `presentation-craft-02` 的三层落笔、对 `by-style/<套>/` 三份，并说出「这一段对应 `素材索引.md` 的哪一节」。',
'     ★ **写完不对照通用词 ＝ 这一位没写完。**',
].join('\n');
const 文件 = ['.skills/tavern-cards/SKILL.md', '_tc_repo/tavern-cards/SKILL.md'];
for (const f of 文件) {
  const raw = fs.readFileSync(f, 'utf8');
  if (raw.includes('逐角色终检表')) { console.log('已有，跳过 ' + f); continue; }
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let lines = raw.split(/\r?\n/);
  // 插在「自校不过就地重写」那行之后
  const i = lines.findIndex(l => l.includes('自校不过就地重写'));
  if (i < 0) { console.log('MISS ' + f); continue; }
  lines.splice(i + 1, 0, ...块.split('\n'));
  fs.writeFileSync(f, lines.join(eol), 'utf8');
  console.log('✓ 挂入终检表：' + f);
}
const a = fs.readFileSync('.skills/tavern-cards/SKILL.md'), b = fs.readFileSync('_tc_repo/tavern-cards/SKILL.md');
console.log(Buffer.compare(a, b) === 0 ? '✅ 两套件一致' : '★ 不一致');

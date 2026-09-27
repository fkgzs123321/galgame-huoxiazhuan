import fs from 'fs';
const 块 = [
'',
'## ★★ 写完必过：逐角色终检表（强制，写一位跑一位）',
'',
'**每写完一位角色，立刻打开 `character/逐角色终检表.md` 逐项打勾**，不要等全书写完。',
'那张表第一条就是「**回到强制层再对照一次通用词**」：逐句对 `../presentation-common-01-用词.md` 的脏话麻花五法则、',
'数 `../presentation-craft-05-词汇规范.md` 的词料命中、验 `../presentation-craft-02-肉体描写.md` 的三层落笔、',
'对 `character/by-style/<套>/` 三份，并说出「这一段对应 `素材索引.md` 的哪一节」。',
'',
'★ **写完不对照通用词 ＝ 这一位没写完。**',
].join('\n');
const 文件 = ['.skills/tavern-cards/references/contents-creation/presentation-styles.md', '_tc_repo/tavern-cards/references/contents-creation/presentation-styles.md'];
for (const f of 文件) {
  const raw = fs.readFileSync(f, 'utf8');
  if (raw.includes('逐角色终检表')) { console.log('已有，跳过 ' + f); continue; }
  fs.writeFileSync(f, raw.replace(/\s+$/, '') + 块 + '\n', 'utf8');
  console.log('✓ 追加到 ' + f);
}
const a = fs.readFileSync('.skills/tavern-cards/references/contents-creation/presentation-styles.md'),
      b = fs.readFileSync('_tc_repo/tavern-cards/references/contents-creation/presentation-styles.md');
console.log(Buffer.compare(a, b) === 0 ? '✅ 两套件一致' : '★ 不一致');

import fs from 'fs';
const 块 = fs.readFileSync('_work/tmp/_add_common01.md', 'utf8').replace(/\s+$/, '');
const 追加 = {
  'references/contents-creation/presentation-common-01-用词.md': 块,
  'references/contents-creation/presentation-craft-05-词汇规范.md': [
    '',
    '## ⛔ 模糊指代禁令（与 craft-02 同源，写卡时逐句过）',
    '',
    '**「那两团／那两瓣／那道沟／那两点／那处／那里／那东西」这类指代一律禁止。**',
    '**换了主语却用模糊指代 ＝ 本质还是白描，只是把主语换了个壳。**',
    '每一处器官初次出现，**必须点名器官名，并带上脏／臭／腥／黑这类定语**；',
    '后面要换说法可以，但换出来的说法本身也得让人一眼看出是什么器官、什么状态。',
    '',
    '对照（用户给的尺子）：什么叫两瓣？→「**骚臭逼的两个黑瓣**」；什么沟？→「**肥硕黑马头中间的油腻带奶腥味臭沟**」。',
    '',
    '### 可数判据（写完必须过）',
    '- 私密段落：**模糊指代 0 处**',
    '- 私密段落：**部位带脏字的比例 ≥ 80%**（不许「乳房／蜜穴／私处／那处」这类体面词顶替）',
    '- 私密段落：**一句里脏词 ≥ 2 个**的句子占比 ≥ 30%',
    '- 私密段落：**带状态（合不拢／闭不上／拔不出来／一抽一缩）的句子 ≥ 3 句**',
  ].join('\n'),
  'references/contents-creation/presentation-craft-02-肉体描写.md': [
    '',
    '## ⛔ 器官必须点名（一句话判据）',
    '',
    '写任何一处器官之前先问：**这一句里，那个器官的名字说出来了吗？**',
    '只写「那两团坠着」「那两瓣翻着」「那道沟敞着」——**等于没说是什么**，判不合格。',
    '',
    '写法：**器官名 ＋ 脏／臭／腥／黑定语 ＋ 受力或状态**。',
    '例：`两片骚臭逼的黑瓣往外翻着，边缘比别处深上好几度，缝里黏着一层没干的白浆`；',
    '`两团肥奶中间那道焐出油的带奶腥味臭乳沟`；`两团沉坠的肥奶子…那两个骚奶头就顶出两个硬凸点`。',
    '',
    '★ 词从 `presentation-craft-05-词汇规范.md` 的词料全表取，**不要自己临时编体面词**。',
  ].join('\n'),
};
let n = 0;
for (const repo of ['.skills/tavern-cards', '_tc_repo/tavern-cards']) {
  for (const [rel, text] of Object.entries(追加)) {
    const f = repo + '/' + rel;
    let s = fs.readFileSync(f, 'utf8');
    if (s.includes('_S_T_A_M_P_')) continue;
    if (text.includes('模糊指代禁令') && s.includes('模糊指代禁令')) { console.log('已有 ' + f); continue; }
    if (text.includes('五条法则必须落到整句上') && s.includes('五条法则必须落到整句上')) { console.log('已有 ' + f); continue; }
    if (text.includes('器官必须点名') && s.includes('器官必须点名')) { console.log('已有 ' + f); continue; }
    fs.writeFileSync(f, s.replace(/\s+$/, '') + '\n' + text + '\n', 'utf8');
    console.log('✓ 追加到 ' + f);
    n++;
  }
}
console.log('共 ' + n + ' 处');

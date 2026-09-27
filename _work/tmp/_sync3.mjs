import fs from 'fs';
const 块 = fs.readFileSync('_work/tmp/_add_common01.md', 'utf8').replace(/\s+$/, '');
const 任务 = [
  // ① common-01：五法则后面接「落到整句上」
  ['references/contents-creation/presentation-common-01-用词.md', '## 脏话麻花 · 整句示范', 追加在节后],
];

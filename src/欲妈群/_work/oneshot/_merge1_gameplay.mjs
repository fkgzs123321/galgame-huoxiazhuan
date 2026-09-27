import fs from 'fs';
const WB = '世界书';
const job = [];

const edit = (file, fn) => {
  const p = WB + '/' + file;
  const raw = fs.readFileSync(p, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let lines = raw.split(/\r?\n/);
  const before = lines.length;
  lines = fn(lines);
  fs.writeFileSync(p, lines.join(eol), 'utf8');
  job.push(file + '：' + before + ' → ' + lines.length + ' 行');
};
// 删「以 A 开头的行」到「下一个同级标题之前」
const 删节 = (标题, 保留空行 = false) => (lines) => {
  const i = lines.findIndex(l => l.startsWith(标题));
  if (i < 0) { console.log('  MISS ' + 标题); return lines; }
  let j = i + 1;
  while (j < lines.length && !/^## /.test(lines[j])) j++;
  const out = lines.slice(0, i).concat(保留空行 ? [''] : [], lines.slice(j));
  return out;
};

// ① 阶段骨架：删「阶段1-5」五段（与 阶段晋升系统 的详细规则重复）
edit('[mvu_plot]阶段骨架.txt', (lines) => {
  const a = lines.findIndex(l => l.startsWith('## 阶段1'));
  const b = lines.findIndex(l => l.startsWith('## 越界的通用后果'));
  if (a < 0 || b < 0) { console.log('  MISS 阶段骨架'); return lines; }
  return lines.slice(0, a).concat(lines.slice(b));
});

// ② 玩家指令约束：删「一、预判定表」（D20 五表更全）与「四、预判定」（重复一）
edit('[mvu_plot]玩家指令约束.txt', (lines) => {
  let out = 删节('## 一、玩家行为预判定')(lines);
  out = 删节('## 四、{{user}}行为预判定')(out);
  return out;
});

// ③ 高考倒计时系统：删「三、高考日终局判定」（D0 里的代码是唯一真源）
edit('[mvu_plot]高考倒计时系统.txt', 删节('## 三、高考日终局判定'));

console.log(job.join('\n'));

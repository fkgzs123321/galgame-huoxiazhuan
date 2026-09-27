import fs from 'fs';
const F = '世界书/[世界观]欲妈群机制.txt';
const raw = fs.readFileSync(F, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let lines = raw.split(/\r?\n/);
const 记 = [];

// ① 删「七、群积分与等级联动」整节（与 [mvu_plot]欲妈群规则 二节重复；等级以那边为准）
const i7 = lines.findIndex(l => l.startsWith('## 七、群积分与等级联动'));
if (i7 >= 0) {
  let j = i7 + 1; while (j < lines.length && !/^## /.test(lines[j])) j++;
  const n = j - i7;
  lines.splice(i7, n);
  // 后面的章节号往前挪
  for (let k = i7; k < lines.length; k++) {
    if (lines[k].startsWith('## 八、')) lines[k] = lines[k].replace('## 八、', '## 七、');
    else if (lines[k].startsWith('## 九、')) lines[k] = lines[k].replace('## 九、', '## 八、');
  }
  记.push('删「七、群积分与等级联动」（' + n + ' 行）+ 章节重排');
} else console.log('MISS 七节');

// ② 删标题里的跨条目引用
const 修 = [
  ['## 一、群聊渊源（概述；制度/等级/竞赛细则见[mvu_plot]欲妈群规则）', '## 一、群聊渊源'],
  ['## 三、活跃度淘汰制（概述；打卡细则见[mvu_plot]欲妈群规则·五）', '## 三、活跃度淘汰制'],
  ['## 九、AI扮演约束（与[mvu_plot]欲妈群规则·九互补，这里仅列差异化约束）', '## 八、AI扮演约束'],
  ['## 八、AI扮演约束（与[mvu_plot]欲妈群规则·九互补，这里仅列差异化约束）', '## 八、AI扮演约束'],
];
for (const [a, b] of 修) {
  const idx = lines.findIndex(l => l === a);
  if (idx >= 0) { lines[idx] = b; 记.push('去引用：' + a.slice(0, 12)); }
}
// ③ 删空 bullet
const before = lines.length;
lines = lines.filter(l => l.trim() !== '-');
if (lines.length !== before) 记.push('删空 bullet ' + (before - lines.length) + ' 行');

fs.writeFileSync(F, lines.join(eol), 'utf8');
console.log(记.join('\n'));

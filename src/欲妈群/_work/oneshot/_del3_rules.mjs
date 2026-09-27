import fs from 'fs';
const F = '世界书/变量/变量更新规则.yaml';
const raw = fs.readFileSync(F, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let lines = raw.split(/\r?\n/);

const 死子项 = [
  /^\s*阳具长度\|阳具周长\|阳具弯曲\|包皮:/,   // 玩家.身体 唯一子项
  /^\s*性伴侣数:/, /^\s*女友:/, /^\s*上次高潮时:.*射精时更新/,
  /^\s*乳头状态:/, /^\s*阴蒂状态:/, /^\s*阴道湿润:/, /^\s*上次高潮时:.*高潮时更新/,
];
const 死表头 = /^\s*(身体|性经历):\s*$/;
const 缩进 = (s) => s.match(/^(\s*)/)[1].length;

// ① 删死子项
const keep = [];
let 删子 = 0, 删头 = 0;
for (let i = 0; i < lines.length; i++) {
  if (死子项.some(r => r.test(lines[i]))) { 删子++; continue; }
  // ② 表头：若其后所有更深缩进的行都被删掉了，则表头也删
  if (死表头.test(lines[i])) {
    const ind = 缩进(lines[i]);
    let j = i + 1, 有存活子项 = false;
    for (; j < lines.length; j++) {
      const s = lines[j];
      if (s.trim() === '') continue;
      if (缩进(s) <= ind) break;
      if (!死子项.some(r => r.test(s))) { 有存活子项 = true; break; }
    }
    if (!有存活子项) { 删头++; continue; }
  }
  keep.push(lines[i]);
}
// ③ 收掉连续空行
const out = [];
for (const l of keep) {
  if (l.trim() === '' && out.length && out[out.length - 1].trim() === '') continue;
  out.push(l);
}
// ④ 删「上次活跃时」单行（成员详情里）
let 删单 = 0;
const out2 = out.filter(l => {
  if (/^\s*上次活跃时:/.test(l)) { 删单++; return false; }
  return true;
});
fs.writeFileSync(F, out2.join(eol), 'utf8');
console.log('变量更新规则.yaml ' + raw.length + ' → ' + out2.join(eol).length);
console.log('  删子项 ' + 删子 + ' 行｜删空表头 ' + 删头 + ' 行｜删单行 ' + 删单 + ' 行');

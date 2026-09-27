import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
const WB = '世界书';
const P = (await import(pathToFileURL(path.join(import.meta.dirname, '..', 'data', '_palette_data.mjs')).href)).default;

// 气味：只写一处，放 X_基础信息 的私密档案段；按 craft-02「媚香要由体温、洗浴用品、雌汗、
// 衣物焖出的气味和裆间骚气叠成」，五层不同源，每位都不一样
const SMELL = (await import(pathToFileURL(path.join(import.meta.dirname, '..', 'data', '_smell.mjs')).href)).default;

// ── ① 生成 12 份 调色盘（底色/主色调/点缀/衍生 ＋ 开口腔调/淫声/锚点）
for (const [name, d] of Object.entries(P)) {
  const out = ['# ' + name + ' · 性格调色盘', ''];
  out.push('底色：' + d.底色);
  out.push('主色调：' + d.主色调.join('、'));
  if (d.点缀 && d.点缀.length) out.push('性格点缀：' + d.点缀.join('、'));
  out.push('');
  for (const [color, items] of Object.entries(d.衍生)) {
    items.forEach((t, i) => out.push(color + '衍生' + '一二三四五'[i] + '：' + t));
    out.push('');
  }
  out.push('## 她开口时');
  out.push('- 一望即知：' + d.开口.map(x => x.split('：')[0]).join('、'));
  d.开口.forEach(x => out.push('- ' + x));
  out.push('');
  out.push('## 淫声');
  out.push(d.淫声);
  out.push('');
  out.push('## 锚点（任何强度下都不掉）');
  out.push('- ' + d.锚点);
  out.push('');
  fs.writeFileSync(path.join(WB, name + '_调色盘.txt'), out.join('\n'), 'utf8');
}
console.log('① 生成 12 份性格调色盘');

// ── ② 基础信息：删掉重复的「体味特征／身体气味」行，把气味按 craft 层次写进私密档案段
let n = 0;
for (const [name, layers] of Object.entries(SMELL)) {
  const f = path.join(WB, name + '_基础信息.txt');
  let s = fs.readFileSync(f, 'utf8');
  const eol = s.includes('\r\n') ? '\r\n' : '\n';
  const before = s.length;
  s = s.split('\n').filter(l => !/^-\s*(体味特征|身体气味)[:：]/.test(l)).join('\n');
  // ★ 替换式写入（不是「没有才插」）：气味数据改了要能覆盖上去
  {
    const block = '### 气味' + eol + layers.map(x => '- ' + x).join(eol) + eol;
    if (/^### 气味$/m.test(s)) {
      s = s.replace(/^### 气味$[\s\S]*?(?=^### |^## )/m, block + eol);
    } else if (s.includes('### 禁忌')) {
      s = s.replace('### 禁忌', block + eol + '### 禁忌');
    } else {
      s = s.replace(/\s+$/, '') + eol + eol + block;
    }
  }  fs.writeFileSync(f, s.replace(/\n{3,}/g, '\n\n'), 'utf8');
  console.log('   ' + name + ' 基础信息 ' + before + ' -> ' + s.length);
  n++;
}
console.log('② 气味写入 ' + n + ' 份基础信息（每份只此一处）');

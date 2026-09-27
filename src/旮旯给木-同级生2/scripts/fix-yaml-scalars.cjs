// rules.md「使用 YAML 中文格式」的整改：把「值 + 续行」的裸多行标量转成 block scalar（`|`）
// —— 同一类问题早先在 状态表/目的清单 修过，但角色/NPC/地理条目里到处都是（61 个文件 YAML 不可解析）
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const WB = path.join(__dirname, '..', '世界书');

const 全文件 = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(yaml|txt)$/.test(f)) 全文件.push(p);
  }
})(WB);

let 修 = 0, 文件数 = 0;
for (const p of 全文件) {
  const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  const out = [];
  let n = 0, i = 0;
  const 续 = (s, ind) => s !== undefined && s.trim() !== '' && !/^\s*#/.test(s) && s.match(/^ */)[0].length > ind;
  while (i < L.length) {
    const m = L[i].match(/^(\s*)([^#\s][^:]*):(\s+)(\S.*)$/);
    if (m && 续(L[i + 1], m[1].length)) {
      const ind = m[1].length, inner = ind + 2;
      out.push(m[1] + m[2] + ': |');
      out.push(' '.repeat(inner) + m[4]);
      let j = i + 1;
      while (j < L.length && (L[j].trim() === '' || L[j].match(/^ */)[0].length > ind)) {
        out.push(L[j].trim() === '' ? '' : ' '.repeat(inner) + L[j].trim());
        j++;
      }
      n++; i = j; continue;
    }
    out.push(L[i]); i++;
  }
  if (n) { fs.writeFileSync(p, out.join('\n')); 修 += n; 文件数++; }
}
console.log('① 值带续行 → block scalar：修 ' + 修 + ' 处（' + 文件数 + ' 个文件）');

let ok = 0; const bad = [];
for (const p of 全文件) {
  try { YAML.parse(fs.readFileSync(p, 'utf8')); ok++; }
  catch (e) { bad.push(path.basename(p) + ': ' + e.message.split('\n')[0].slice(0, 40)); }
}
console.log('② YAML 可解析 ' + ok + ' 个' + (bad.length ? (' ｜ ❌ ' + bad.length + ' 个') : ' ✓'));
bad.slice(0, 6).forEach(x => console.log('   ' + x));

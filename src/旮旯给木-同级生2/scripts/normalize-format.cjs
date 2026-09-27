// 格式规范整改（按 rules.md「数据库格式优先，用列表和键值对，不用段落」）
// 做法：把所有「缩进位置、无冒号、不以 - / # / | / > 开头」的裸文本行 → 改成列表项 `- ...`
// ★ 必须跳过 block scalar（`key: |` / `key: >`）内部的行，否则会把块内容变成列表、破坏语义
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const WB = path.join(__dirname, '..', '世界书');

const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.yaml$/.test(f)) 全.push(p); } })(WB);

let 改 = 0, 文件数 = 0;
for (const p of 全) {
  const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  let 块缩进 = -1;                    // 当前 block scalar 的键缩进；-1 = 不在块内
  let n = 0;
  const out = L.map(l => {
    // 进入/退出 block scalar
    const 块头 = l.match(/^(\s*)[^#\s][^:]*:\s*[|>][-+]?\s*$/);
    if (块头) { 块缩进 = 块头[1].length; return l; }
    if (块缩进 >= 0) {
      if (l.trim() === '') return l;                       // 空行留在块内
      const ind = l.match(/^ */)[0].length;
      if (ind > 块缩进) return l;                          // 块内容，原样保留
      块缩进 = -1;                                          // 缩进退回 → 出块
    }
    const ind = l.match(/^ */)[0].length;
    if (!l.trim() || ind === 0) return l;                   // 顶层行不动
    if (/^\s*(-|#|\.\.\.)/.test(l)) return l;               // 已是列表/注释
    if (/:\s/.test(l) || /:\s*$/.test(l)) return l;         // 已是键值
    if (/^\s*[|>]/.test(l)) return l;
    // 裸文本行 → 列表项
    n++;
    return ' '.repeat(ind) + '- ' + l.trim();
  });
  if (n) { fs.writeFileSync(p, out.join('\n')); 改 += n; 文件数++; }
}
console.log('① 裸文本行 → 列表项：改 ' + 改 + ' 行（' + 文件数 + ' 个文件）');

let ok = 0; const bad = [];
for (const p of 全) { try { YAML.parse(fs.readFileSync(p, 'utf8')); ok++; } catch (e) { bad.push([path.basename(p), (e.linePos && e.linePos[0] ? e.linePos[0].line : 0)]); } }
console.log('② YAML 可解析 ' + ok + '/' + 全.length + (bad.length ? (' ｜ 剩 ' + bad.length + ' 个') : ' ✅ 全部通过'));
for (const [f, ln] of bad.slice(0, 8)) {
  const L = fs.readFileSync(path.join(WB, '**', f).replace('**' + path.sep, ''), 'utf8');
  console.log('   ' + f + ':' + ln);
}

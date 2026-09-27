// 最后一轮：扫「从 euphoria 带来、但本卡可能不需要」的东西 + 格式规范终检
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const WB = path.join(D, '世界书');
const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));

const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(WB);

console.log('═══ ① 所有 @@ 装饰器（逐个核用途）═══');
const 装 = {};
for (const p of 全) {
  const t = fs.readFileSync(p, 'utf8');
  for (const m of t.match(/^\s*@@\w+.*$/gm) || []) {
    const 名 = m.trim().split(/\s/)[0];
    (装[名] = 装[名] || []).push(path.basename(p));
  }
}
Object.entries(装).forEach(([k, v]) => console.log('   ' + k + '  ×' + v.length + '  → ' + v.slice(0, 4).join(', ') + (v.length > 4 ? ' …' : '')));

console.log('\n═══ ② 注册全局 / 输出块（euphoria 的痕迹）═══');
for (const p of 全) {
  const t = fs.readFileSync(p, 'utf8');
  const 有 = [];
  if (/this\.[A-Za-z_$]+\s*=\s*[{(]/.test(t)) 有.push('this.X = {...} 注册全局');
  if (/<%=/.test(t)) 有.push('输出块 <%= %>');
  if (/\bfunction\s+\w+/.test(t)) 有.push('定义函数');
  if (有.length) console.log('   ' + path.relative(WB, p).replace(/\\/g, '/') + '  → ' + 有.join('／'));
}

console.log('\n═══ ③ 格式规范终检（rules.md）═══');
let tab = 0, odd = 0, 围栏 = 0, 破折号 = 0;
for (const p of 全) {
  const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  L.forEach(l => {
    if (/^\t/.test(l)) tab++;
    else if (l.trim() && l.match(/^ */)[0].length % 2 === 1 && !/^\s*\|/.test(l)) odd++;
    if (/^\s*```/.test(l)) 围栏++;
    if (l.includes('——')) 破折号++;
  });
}
console.log('   TAB 缩进 ' + tab + ' ｜ 奇数缩进（非表格）' + odd + ' ｜ markdown 围栏 ' + 围栏 + ' ｜ 破折号 ' + 破折号);

console.log('\n═══ ④ 条目数与类型分布（核有无多余条目）═══');
for (const [cat, es] of Object.entries(S.entryManifest)) console.log('   ' + cat + ': ' + Object.keys(es).length);

console.log('\n═══ ⑤ 卡内 content 长度 Top 8（看有没有该裁的）═══');
const 卡 = JSON.parse(fs.readFileSync(path.join(D, '旮旯给木-同级生2.json'), 'utf8'));
const d = 卡.data || 卡;
((d.character_book || {}).entries || [])
  .map(e => [e.comment || '', String(e.content || '').length])
  .sort((a, b) => b[1] - a[1]).slice(0, 8)
  .forEach(([n, l]) => console.log('   ' + String(l).padStart(6) + '  ' + n));

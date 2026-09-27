// 用解析器的报错行号定位 → 只改那一处（值转 block scalar），迭代到全部可解析
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const WB = path.join(__dirname, '..', '世界书');
const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(WB);

const 取错 = p => { try { YAML.parse(fs.readFileSync(p, 'utf8')); return null; } catch (e) { return e.linePos && e.linePos[0] ? e.linePos[0].line : null; } };
let 起始 = 全.filter(p => 取错(p)).length;
console.log('起始不可解析：' + 起始 + ' 个');

for (let 轮 = 0; 轮 < 8; 轮++) {
  let 改 = 0;
  for (const p of 全) {
    const 行 = 取错(p);
    if (!行) continue;
    const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    // 从报错行往上找最近的「键: 值」，往下收集缩进更深的行
    let k = Math.min(行 - 1, L.length - 1);
    while (k > 0 && !/^\s*[A-Za-z\u4e00-\u9fa5][^:]*:\s\S/.test(L[k])) k--;
    const m = L[k] && L[k].match(/^(\s*)([A-Za-z\u4e00-\u9fa5][^:]*):\s(\S.*)$/);
    if (!m) continue;
    const ind = m[1].length, inner = ind + 2;
    const out = [];
    for (let j = 0; j < k; j++) out.push(L[j]);
    out.push(m[1] + m[2] + ': |');
    out.push(' '.repeat(inner) + m[3]);
    let j = k + 1;
    while (j < L.length) {
      const s = L[j];
      if (s.trim() === '') { out.push(''); j++; continue; }
      if (s.match(/^ */)[0].length <= ind) break;
      out.push(' '.repeat(inner) + s.trim()); j++;
    }
    for (; j < L.length; j++) out.push(L[j]);
    fs.writeFileSync(p, out.join('\n'));
    改++;
  }
  const 剩 = 全.filter(p => 取错(p)).length;
  console.log('第 ' + (轮 + 1) + ' 轮：改 ' + 改 + ' 处 → 剩 ' + 剩 + ' 个');
  if (!剩 || !改) break;
}
const 剩 = 全.filter(p => 取错(p));
console.log(剩.length ? ('⚠ 仍不可解析 ' + 剩.length + '：' + 剩.slice(0, 6).map(x => path.basename(x)).join(', ')) : '✅ 全部可解析');

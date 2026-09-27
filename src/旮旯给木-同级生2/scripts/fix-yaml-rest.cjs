// 把剩余不可解析的 YAML 修完（诊断 → 定向修）
// 根因：值跨行（续行里含 `:` 或本身是裸标量），YAML 把续行当成新的映射项
// 修法：把「键: 值」+ 其后的续行整体转成 block scalar（`|`），续行重新缩进
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const WB = path.join(__dirname, '..', '世界书');

const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) 全.push(p); } })(WB);

const 坏 = () => 全.filter(p => { try { YAML.parse(fs.readFileSync(p, 'utf8')); return false; } catch (e) { return true; } });

console.log('起始不可解析：' + 坏().length + ' 个');

for (let 轮 = 0; 轮 < 3; 轮++) {
  const 目标 = 坏();
  if (!目标.length) break;
  for (const p of 目标) {
    const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    const out = [];
    let i = 0;
    while (i < L.length) {
      const l = L[i];
      const m = l.match(/^(\s*)([A-Za-z\u4e00-\u9fa5][^:]*):\s(\S.*)$/);
      const nxt = L[i + 1];
      const 是键 = m && !/^\s*[-*|>#]/.test(l);
      const 下是续行 = nxt !== undefined && nxt.trim() !== '' && !/^\s*#/.test(nxt) &&
        nxt.match(/^ */)[0].length > m[1].length && !/^\s*[A-Za-z\u4e00-\u9fa5][^:]*:\s/.test(nxt) === false ? true : false;
      // 续行判定：缩进更深，且**不是**同一层的另一个键
      const 同层键 = nxt !== undefined && nxt.match(/^ */)[0].length === m[1].length && /^\s*[^:]+:\s/.test(nxt);
      const 续 = nxt !== undefined && nxt.trim() !== '' && !/^\s*#/.test(nxt) &&
        nxt.match(/^ */)[0].length > m[1].length && !同层键;
      if (是键 && 续) {
        const ind = m[1].length, inner = ind + 2;
        out.push(m[1] + m[2] + ': |');
        out.push(' '.repeat(inner) + m[3]);
        let j = i + 1;
        while (j < L.length) {
          const s = L[j];
          if (s.trim() === '') { out.push(''); j++; continue; }
          const sind = s.match(/^ */)[0].length;
          if (sind <= ind) break;
          out.push(' '.repeat(inner) + s.trim());
          j++;
        }
        i = j; continue;
      }
      out.push(l); i++;
    }
    fs.writeFileSync(p, out.join('\n'));
  }
  console.log('第 ' + (轮 + 1) + ' 轮后：不可解析 ' + 坏().length + ' 个');
}
const 剩 = 坏();
console.log(剩.length ? ('⚠ 仍不可解析 ' + 剩.length + ' 个：' + 剩.slice(0, 8).map(x => path.basename(x)).join(', ')) : '✅ 全部可解析');

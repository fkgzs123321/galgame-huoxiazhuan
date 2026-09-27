// YAML 修完（简化正确版）：报错行本身就是「缩进位置上的裸文本行」→ 前面加 `- ` 变列表项
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const WB = path.join(__dirname, '..', '世界书');
const 全 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.yaml$/.test(f)) 全.push(p); } })(WB);

const 坏数 = () => 全.filter(p => { try { YAML.parse(fs.readFileSync(p, 'utf8')); return false; } catch (e) { return true; } }).length;
console.log('起始不可解析：' + 坏数() + ' / ' + 全.length);

let 总改 = 0;
for (let 轮 = 0; 轮 < 40; 轮++) {
  let 本 = 0;
  for (const p of 全) {
    let err = null; try { YAML.parse(fs.readFileSync(p, 'utf8')); } catch (e) { err = e; }
    if (!err) continue;
    const ln = (err.linePos && err.linePos[0] && err.linePos[0].line) || 0;
    if (!ln) continue;
    const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    const idx = ln - 1;
    const s = L[idx];
    if (s === undefined || !s.trim()) continue;
    const ind = s.match(/^ */)[0].length;
    const 是裸文本 = ind > 0 && !/^\s*-/.test(s) && !/^\s*#/.test(s) && !/:\s/.test(s) && !/:\s*$/.test(s) && !/^\s*\.\.\./.test(s);
    if (是裸文本) {
      L[idx] = ' '.repeat(ind) + '- ' + s.trim();
    } else if (ind > 0 && /:\s/.test(s) && !/^\s*-/.test(s)) {
      // 值里含 `: ` → 加引号
      const m = s.match(/^(\s*)([^:]+):\s(.*)$/);
      if (m && !/^["'|>]/.test(m[3])) L[idx] = m[1] + m[2] + ': ' + JSON.stringify(m[3]);
      else continue;
    } else if (ind === 0 && /^\s*\|/.test(s)) {
      continue;
    } else {
      continue;
    }
    fs.writeFileSync(p, L.join('\n'));
    本++; 总改++;
  }
  if (!本) { console.log('第 ' + (轮 + 1) + ' 轮：无改动，停'); break; }
}
console.log('共改 ' + 总改 + ' 行 → 不可解析 ' + 坏数() + ' 个');
const 剩 = 全.filter(p => { try { YAML.parse(fs.readFileSync(p, 'utf8')); return false; } catch (e) { return true; } });
if (剩.length) {
  for (const p of 剩.slice(0, 5)) {
    let e = null; try { YAML.parse(fs.readFileSync(p, 'utf8')); } catch (x) { e = x; }
    const ln = e.linePos && e.linePos[0] ? e.linePos[0].line : 0;
    const L = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    console.log('   ' + path.basename(p) + ':' + ln + ' → ' + (L[ln - 1] || '').slice(0, 70));
  }
} else console.log('✅ 全部可解析');

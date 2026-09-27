// 逐条完全整改 YAML 格式 —— 逐文件独立事务，每步验证，改坏就回滚该文件
// 已知三类根因（逐文件按报错行判断）：
//   ① markdown 围栏 ```
//   ② 键的位置上放了列表项 / 裸文本行（"block sequence may not be used as an implicit map key" /
//      "Implicit keys need to be on a single line"）
//   ③ markdown 表格行 | a | b |
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = path.join(__dirname, '..');
const WB = path.join(D, '世界书');
const BAK = path.join(D, '世界书.bak4');

// ── 备份 ──
if (!fs.existsSync(BAK)) { fs.cpSync(WB, BAK, { recursive: true }); console.log('⓪ 已备份 → 世界书.bak4'); }
else console.log('⓪ 备份已存在');

const 列 = () => {
  const a = [];
  (function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.yaml$/.test(f)) a.push(p); } })(WB);
  return a;
};
const 解析 = (t) => { try { YAML.parse(t); return null; } catch (e) { return e; } };

let 全 = 列();
const 起始 = 全.filter(p => 解析(fs.readFileSync(p, 'utf8'))).length;
console.log('起始不可解析：' + 起始 + ' / ' + 全.length);

const 日志 = [];

for (const p of 全) {
  const 相对 = path.relative(WB, p).replace(/\\/g, '/');
  if (!解析(fs.readFileSync(p, 'utf8'))) continue;

  const 原始 = fs.readFileSync(p, 'utf8');
  let t = 原始;
  let 改 = [];

  for (let 轮 = 0; 轮 < 25; 轮++) {
    const e = 解析(t);
    if (!e) break;
    const ln = (e.linePos && e.linePos[0] && e.linePos[0].line) || 0;
    const col = (e.linePos && e.linePos[0] && e.linePos[0].col) || 0;
    const L = t.split(/\r?\n/);
    const idx = ln - 1;
    const s = L[idx];
    if (s === undefined) break;
    const ind = s.match(/^ */)[0].length;
    const msg = e.message;

    let 已改 = false;

    // ① 围栏
    if (/^\s*```/.test(s)) { L[idx] = ''; 已改 = true; 改.push('删围栏'); }

    // ③ 表格行：连续以 | 开头 → 转成键值列表
    else if (/^\s*\|/.test(s)) {
      let j = idx; const 表 = [];
      while (j < L.length && /^\s*\|/.test(L[j])) { 表.push(L[j]); j++; }
      const 拆 = r => r.split('|').slice(1, -1).map(c => c.trim());
      const 头 = 拆(表[0]);
      const 体 = 表.slice(1).filter(r => !/^\s*\|[\s:|-]+\|\s*$/.test(r));
      const 缩 = ' '.repeat(ind);
      const 新 = [];
      for (const r of 体) {
        const c = 拆(r);
        新.push(缩 + '- ' + (c[0] || '项'));
        for (let k = 1; k < c.length; k++) 新.push(缩 + '  ' + (头[k] || '列' + k) + ': ' + (c[k] || ''));
      }
      if (!体.length) 新.push(缩 + '- （空）');
      L.splice(idx, 表.length, ...新);
      已改 = true; 改.push('表格→键值列表(' + 体.length + '行)');
    }

    // ②-a 键的位置上放了列表项：缩进 +2（挂到上一个键下）
    else if (/^\s*-/.test(s) && /block sequence|implicit map key|Implicit keys/.test(msg)) {
      // 若上一行是同缩进的「键:」→ 把这些列表项缩进 +2
      const 上 = L.slice(0, idx).reverse().find(x => x.trim() !== '');
      if (上 && /^(\s*)[^#\s][^:]*:\s*$/.test(上) && 上.match(/^ */)[0].length === ind) {
        let j = idx;
        while (j < L.length && /^\s*-/.test(L[j]) && L[j].match(/^ */)[0].length === ind) { L[j] = '  ' + L[j]; j++; }
        while (j < L.length && (L[j].trim() === '' || L[j].match(/^ */)[0].length > ind)) { if (L[j].trim()) L[j] = '  ' + L[j]; j++; }
        已改 = true; 改.push('列表项缩进+2');
      }
    }

    // ②-b 值里含「: 」→ 加引号
    if (!已改 && ind > 0 && /:\s/.test(s) && !/^\s*-/.test(s)) {
      const m = s.match(/^(\s*)([^:]+):\s(.*)$/);
      if (m && !/^["'|>]/.test(m[3]) && /:\s/.test(m[3])) { L[idx] = m[1] + m[2] + ': ' + JSON.stringify(m[3]); 已改 = true; 改.push('值加引号'); }
    }

    // ②-c 裸文本行（无冒号、不在块标量内）→ 加 `- `
    if (!已改 && ind > 0 && !/^\s*-/.test(s) && !/:\s/.test(s) && !/:\s*$/.test(s) && !/^\s*[|>]/.test(s)) {
      L[idx] = ' '.repeat(ind) + '- ' + s.trim();
      已改 = true; 改.push('裸文本→列表项');
    }

    // ②-d 缩进不在 2 的倍数
    if (!已改 && ind % 2 === 1) { L[idx] = ' '.repeat(ind - 1) + s.slice(ind); 已改 = true; 改.push('奇数缩进-1'); }

    if (!已改) break;   // 无法判断 → 停，交给下一轮/记录
    const 新t = L.join('\n');
    // **文件级事务：改完必须不更坏**（能解析 或 至少不引入新错误行）
    if (!解析(新t) || (解析(新t).linePos && 解析(新t).linePos[0].line >= ln)) { t = 新t; }
    else break;
  }

  const e2 = 解析(t);
  if (!e2) { fs.writeFileSync(p, t); 日志.push('✅ ' + 相对 + '  ← ' + [...new Set(改)].join('、')); }
  else { 日志.push('⚠ ' + 相对 + '（剩 ' + (e2.linePos ? e2.linePos[0].line : '?') + ' 行：' + e2.message.split('\n')[0].slice(0, 40) + '）'); }
}

console.log('\n' + 日志.join('\n'));
全 = 列();
const 终 = 全.filter(p => 解析(fs.readFileSync(p, 'utf8'))).length;
console.log('\n════ 结果：不可解析 ' + 起始 + ' → ' + 终 + '（共 ' + 全.length + '）════');

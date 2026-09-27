// 修单个文件的 YAML 格式（每个文件独立进程 → 崩溃只影响它自己）
// 用法: node fix-one.cjs <文件路径>
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');

const p = process.argv[2];
if (!p || !fs.existsSync(p)) { console.log('SKIP 缺文件'); process.exit(0); }

const 解析 = (t) => { try { YAML.parse(t); return null; } catch (e) { return e; } };
const 原始 = fs.readFileSync(p, 'utf8');
if (!解析(原始)) { console.log('OK 本来就好的'); process.exit(0); }

let t = 原始;
const 改 = [];

for (let 轮 = 0; 轮 < 30; 轮++) {
  const e = 解析(t);
  if (!e) break;
  const ln = (e.linePos && e.linePos[0] && e.linePos[0].line) || 0;
  const L = t.split(/\r?\n/);
  const idx = ln - 1;
  const s = L[idx];
  if (s === undefined || !s.trim()) {
    // 报错行是空行/越界 → 从上一非空行找
    let k = idx - 1; while (k >= 0 && !L[k].trim()) k--;
    if (k < 0) break;
  }
  const ind = s.match(/^ */)[0].length;
  const msg = e.message;
  let 已改 = false;

  // 0) 行首全角冒号 → 半角（YAML 只认半角）—— 本轮定位到的真根因
  {
    const m全 = L[idx].match(/^(\s*)([\u4e00-\u9fa5A-Za-z0-9_\/]+)：(.*)$/);
    if (m全) { L[idx] = m全[1] + m全[2] + ': ' + m全[3].trimStart(); 已改 = true; 改.push('全角冒号→半角'); }
  }

  if (!已改 && /^\s*```/.test(s)) { L[idx] = ''; 已改 = true; 改.push('删围栏'); }

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
    if (!新.length) break;
    L.splice(idx, 表.length, ...新);
    已改 = true; 改.push('表格→键值(' + 体.length + '行)');
  }

  else if (/^\s*-/.test(s) && /block sequence|implicit map|Implicit keys|Nested mappings/.test(msg)) {
    const 上 = L.slice(0, idx).reverse().find(x => x.trim() !== '');
    if (上 && /^(\s*)[^#\s][^:]*:\s*$/.test(上) && 上.match(/^ */)[0].length === ind) {
      let j = idx;
      while (j < L.length && /^\s*-/.test(L[j]) && L[j].match(/^ */)[0].length === ind) { L[j] = '  ' + L[j]; j++; }
      while (j < L.length && (L[j].trim() === '' || L[j].match(/^ */)[0].length > ind)) { if (L[j].trim()) L[j] = '  ' + L[j]; j++; }
      已改 = true; 改.push('列表项缩进+2');
    }
  }

  if (!已改 && ind > 0 && /:\s/.test(s)) {
    const m = s.match(/^(\s*)([^:]+):\s(.*)$/);
    if (m && !/^["'|>]/.test(m[3])) { L[idx] = m[1] + m[2] + ': ' + JSON.stringify(m[3]); 已改 = true; 改.push('值加引号'); }
  }

  if (!已改 && ind > 0 && !/^\s*-/.test(s) && !/:\s/.test(s) && !/:\s*$/.test(s) && !/^\s*[|>]/.test(s)) {
    L[idx] = ' '.repeat(ind) + '- ' + s.trim();
    已改 = true; 改.push('裸文本→列表项');
  }

  if (!已改) break;

  const 新t = L.join('\n');
  const e2 = 解析(新t);
  if (!e2 || ((e2.linePos && e2.linePos[0] && e2.linePos[0].line) || 0) >= ln) t = 新t;
  else break;
}

if (!解析(t)) { fs.writeFileSync(p, t); console.log('FIX  ' + [...new Set(改)].join('、')); }
else { const e = 解析(t); console.log('TODO 剩第 ' + ((e.linePos && e.linePos[0] && e.linePos[0].line) || '?') + ' 行: ' + e.message.split('\n')[0].slice(0, 50)); }

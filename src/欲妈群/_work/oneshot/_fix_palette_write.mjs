import fs from 'fs';
const F = '_work/gen/_gen_palette.mjs';
const raw = fs.readFileSync(F, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let lines = raw.split(/\r?\n/);
const i = lines.findIndex(l => /if \(!s\.includes\('### 气味'\)\) \{/.test(l));
if (i < 0) { console.log('MISS'); process.exit(1); }
let j = i; while (j < lines.length && !/^\s\}$/.test(lines[j])) j++;
const 新 = [
  "  // ★ 替换式写入（不是「没有才插」）：气味数据改了要能覆盖上去",
  "  {",
  "    const block = '### 气味' + eol + layers.map(x => '- ' + x).join(eol) + eol;",
  "    if (/^### 气味$/m.test(s)) {",
  "      s = s.replace(/^### 气味$[\\s\\S]*?(?=^### |^## )/m, block + eol);",
  "    } else if (s.includes('### 禁忌')) {",
  "      s = s.replace('### 禁忌', block + eol + '### 禁忌');",
  "    } else {",
  "      s = s.replace(/\\s+$/, '') + eol + eol + block;",
  "    }",
  "  }",
];
lines.splice(i, j - i + 1, ...新);
fs.writeFileSync(F, lines.join(eol), 'utf8');
console.log('✓ 气味改为替换式写入');

import fs from 'fs';
const F = '_work/gen/_gen_palette.mjs';
let s = fs.readFileSync(F, 'utf8');
const a = "  let s = fs.readFileSync(f, 'utf8');\n  const before = s.length;";
const b = "  let s = fs.readFileSync(f, 'utf8');\n  const eol = s.includes('\\r\\n') ? '\\r\\n' : '\\n';\n  const before = s.length;";
if (s.includes(a)) { fs.writeFileSync(F, s.replace(a, b), 'utf8'); console.log('✓ 补 eol 定义'); }
else console.log('MISS');

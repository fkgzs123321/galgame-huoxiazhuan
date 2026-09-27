import fs from 'fs';
const F = '正则/状态栏.html';
const raw = fs.readFileSync(F, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let lines = raw.split(/\r?\n/);
const i = lines.findIndex(l => /var ex=d\.专属\|\|\{\}, ek=Object\.keys\(ex\)/.test(l));
if (i < 0) { console.log('MISS 专属行'); process.exit(1); }
const n = lines[i + 1].includes('专属') ? 2 : 1;
const 新 = fs.readFileSync('_work/tmp/_line.txt', 'utf8').split(/\r?\n/).filter(Boolean);
lines.splice(i, n, ...新);
fs.writeFileSync(F, lines.join(eol), 'utf8');
console.log('✓ 专属 改具名（删 ' + n + ' 行，加 ' + 新.length + ' 行）');

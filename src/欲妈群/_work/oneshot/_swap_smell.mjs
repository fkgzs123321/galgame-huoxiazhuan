import fs from 'fs';
const F = '_work/gen/_gen_palette.mjs';
const raw = fs.readFileSync(F, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);
const i = lines.findIndex(l => l.startsWith('const SMELL'));
if (i < 0) { console.log('MISS SMELL'); process.exit(1); }
let j = i;
while (j < lines.length && !/^\};$/.test(lines[j])) j++;
const 新 = [
  "const SMELL = (await import(pathToFileURL(path.join(import.meta.dirname, '..', 'data', '_smell.mjs')).href)).default;",
];
lines.splice(i, j - i + 1, ...新);
fs.writeFileSync(F, lines.join(eol), 'utf8');
console.log('✓ 气味改为从 _work/data/_smell.mjs 读（原内联块 ' + (j - i + 1) + ' 行已替）');

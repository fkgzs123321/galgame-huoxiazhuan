import fs from 'fs';
const eolOf = t => (t.includes('\r\n') ? '\r\n' : '\n');
let n = 0;

// ① 状态栏：删 renderDice 里被删残的 5 行
{
  const F = '正则/状态栏.html';
  const raw = fs.readFileSync(F, 'utf8'); const eol = eolOf(raw);
  const L = raw.split(/\r?\n/);
  const bad = [];
  L.forEach((l, i) => {
    if (/^\s*if\(hist\.length\)\{$/.test(l)) bad.push(i);
    else if (/^\s*s\+='<div class="h">Day'\+num\(h\.日\)/.test(l)) bad.push(i);
    else if (/^\s*\}\);$/.test(l)) bad.push(i);
    else if (/^\s*\}else\{$/.test(l)) bad.push(i);
    else if (/^\s*\}$/.test(l) && L[i - 1] && /^\s*\}else\{$/.test(L[i - 1])) bad.push(i);
  });
  for (let i = bad.length - 1; i >= 0; i--) L.splice(bad[i], 1);
  fs.writeFileSync(F, L.join(eol), 'utf8');
  n += bad.length;
  console.log('✓ 状态栏 删残行 ' + bad.length + ' 行（L' + bad.map(x => x + 1).join(',') + '）');
}

// ② 5 份 initvar：删 2 空格的 D20历史 与 假阳具块内的 备注
for (const F of ['世界书/变量/initvar.yaml', '开场白/initvar/1.yaml', '开场白/initvar/2.yaml', '开场白/initvar/3.yaml', '开场白/initvar/4.yaml']) {
  const raw = fs.readFileSync(F, 'utf8'); const eol = eolOf(raw);
  const L = raw.split(/\r?\n/);
  const 假阳具 = L.findIndex(l => /^假阳具:$/.test(l));
  const 尾 = L.findIndex((l, i) => i > 假阳具 && /^(群|阶段守卫|设置):$/.test(l));
  let c = 0;
  for (let i = L.length - 1; i >= 0; i--) {
    if (/^  D20历史: ""$/.test(L[i])) { L.splice(i, 1); c++; continue; }
    if (假阳具 >= 0 && i > 假阳具 && i < (尾 < 0 ? L.length : 尾) && /^  备注: /.test(L[i])) { L.splice(i, 1); c++; }
  }
  if (c) { fs.writeFileSync(F, L.join(eol), 'utf8'); n += c; }
  console.log((c ? '✓' : '·') + ' ' + F.split('/').pop().padEnd(14) + c + ' 行');
}
console.log('\n共 ' + n + ' 处');

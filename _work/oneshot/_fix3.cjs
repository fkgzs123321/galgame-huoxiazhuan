const fs = require('fs'), path = require('path');
const pnpm = path.resolve('node_modules/.pnpm');

// 1) 建立 包名 -> 真实包路径 索引
const real = new Map();
function pkgName(d) {
  const i = d.startsWith('@') ? d.indexOf('@', 1) : d.indexOf('@');
  return i > 0 ? d.slice(0, i) : null;
}
for (const d of fs.readdirSync(pnpm)) {
  if (d.startsWith('.')) continue;
  const n = pkgName(d);
  if (!n) continue;
  const p = path.join(pnpm, d, 'node_modules', n);
  if (fs.existsSync(path.join(p, 'package.json'))) real.set(n, p);
}

// 2) 递归扫描所有 .pnpm/<x>/node_modules/ 下的坏条目并修复
let fixed = 0, ok = 0, noSrc = 0;
function scan(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    let st;
    try { st = fs.lstatSync(full); } catch (err) { continue; }
    if (st.isSymbolicLink()) { ok++; continue; }
    if (st.isDirectory()) {
      let inner;
      try { inner = fs.readdirSync(full); } catch (err) { continue; }
      // 空目录 = 坏链接
      if (inner.length === 0) {
        const src = real.get(e.name);
        if (src) {
          try { fs.rmdirSync(full); fs.symlinkSync(src, full, 'junction'); fixed++; }
          catch (err) { noSrc++; }
        } else noSrc++;
      } else if (e.name === 'node_modules' || full.includes('.pnpm')) {
        // 继续深入（只深入 .pnpm 结构）
        if (e.name === 'node_modules') scan(full);
        else if (dir.endsWith('node_modules')) scan(full);
      }
    }
  }
}
for (const d of fs.readdirSync(pnpm)) {
  if (d.startsWith('.')) continue;
  const nm = path.join(pnpm, d, 'node_modules');
  if (fs.existsSync(nm)) scan(nm);
}
console.log('修复 %d / 已正常 %d / 找不到源 %d', fixed, ok, noSrc);
console.log('tsx 内 esbuild: %s', fs.existsSync('node_modules/.pnpm/tsx@4.23.6/node_modules/esbuild/package.json'));

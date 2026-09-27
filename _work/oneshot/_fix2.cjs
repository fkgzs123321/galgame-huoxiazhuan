const fs = require('fs');
const path = require('path');
const pnpmDir = path.resolve('node_modules/.pnpm');
const dstRoot = path.resolve('node_modules');

function pkgName(dirname) {
  const i = dirname.startsWith('@') ? dirname.indexOf('@', 1) : dirname.indexOf('@');
  return i > 0 ? dirname.slice(0, i) : null;
}

let fixed = 0, existed = 0, nonEmpty = 0, failed = 0;
for (const d of fs.readdirSync(pnpmDir)) {
  if (d.startsWith('.')) continue;
  const name = pkgName(d);
  if (!name) continue;
  const src = path.join(pnpmDir, d, 'node_modules', name);
  if (!fs.existsSync(path.join(src, 'package.json'))) continue;
  const dst = path.join(dstRoot, name);
  if (fs.existsSync(dst)) {
    const st = fs.lstatSync(dst);
    if (st.isSymbolicLink()) { existed++; continue; }
    if (fs.readdirSync(dst).length > 0) { nonEmpty++; continue; }
    try { fs.rmdirSync(dst); } catch (e) { failed++; continue; }
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  try { fs.symlinkSync(src, dst, 'junction'); fixed++; }
  catch (e) { failed++; }
}
console.log('重建 %d / 已链接 %d / 非空保留 %d / 失败 %d', fixed, existed, nonEmpty, failed);
console.log('tsx cli 可读: %s', fs.existsSync('node_modules/tsx/dist/cli.mjs'));
console.log('esbuild main 可读: %s', fs.existsSync('node_modules/esbuild/lib/main.js'));
console.log('webpack-cli cli 可读: %s', fs.existsSync('node_modules/webpack-cli/bin/cli.js'));

const fs = require('fs');
const path = require('path');
const pnpmFlat = path.resolve('node_modules/.pnpm/node_modules');
const dstRoot = path.resolve('node_modules');
let fixed = 0, failed = 0, kept = 0;
function link(src, dst) {
  if (fs.existsSync(dst)) {
    // 空目录且非链接 -> 删掉重建
    let st = fs.lstatSync(dst);
    if (!st.isSymbolicLink()) {
      const empty = fs.readdirSync(dst).length === 0;
      if (!empty) { kept++; return; }
      fs.rmdirSync(dst);
    } else { kept++; return; }
  }
  try {
    fs.symlinkSync(src, dst, 'junction');
    fixed++;
  } catch (e) { failed++; }
}
for (const entry of fs.readdirSync(pnpmFlat)) {
  const s = path.join(pnpmFlat, entry);
  if (entry.startsWith('@')) {
    for (const sub of fs.readdirSync(s)) link(path.join(s, sub), path.join(dstRoot, entry, sub));
  } else {
    link(s, path.join(dstRoot, entry));
  }
}
console.log('JUNCTION 建立 %d 个，跳过(已有内容) %d 个，失败 %d 个', fixed, kept, failed);
console.log('tsx 可读: %s', fs.existsSync('node_modules/tsx/dist/cli.mjs'));

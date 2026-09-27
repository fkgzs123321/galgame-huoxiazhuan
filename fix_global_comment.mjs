import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/欲妈群/正则/状态栏.html';
const html = readFileSync(filePath, 'utf8');
const lines = html.split('\n');
const line190 = lines[189];

// 第190行只有1对 /* */：
//   /* 在 pos=11907: "/* ====== 全局状态 ====== var State=..."
//   */ 在 pos=43412: "})(); */</script>"
// 这个块注释把所有核心代码（var State、init()、render()、refresh()）全部注释掉了
// 修复：删除这个错误的块注释 /* 和 */，让代码恢复执行

// 找到 /* ====== 全局状态 ====== 的位置
const commentStartMarker = '/* ====== 全局状态 ====== ';
const startIdx = line190.indexOf(commentStartMarker);
if (startIdx === -1) {
  console.error('未找到 /* ====== 全局状态 ====== 标记');
  process.exit(1);
}
console.log('找到 /* 位置:', startIdx);
console.log('上下文:', line190.substring(startIdx - 20, startIdx + 80));

// 找到末尾的 */ 位置
const endIdx = line190.lastIndexOf('*/');
if (endIdx === -1) {
  console.error('未找到末尾的 */');
  process.exit(1);
}
console.log('\n找到 */ 位置:', endIdx);
console.log('上下文:', line190.substring(endIdx - 40, endIdx + 20));

// 修复：删除 /* ====== 全局状态 ====== （包括注释文字），只保留后面的代码
// 把 "  /* ====== 全局状态 ====== var State=..." 改成 "  var State=..."
const newLine190 = line190.substring(0, startIdx) + '  ' + line190.substring(startIdx + commentStartMarker.length);

// 验证：确保末尾的 */ 现在是独立的（不再是注释的一部分）
// 末尾应该是 "})(); */</script>" → 删除 "*/" 后变成 "})(); </script>"
// 但 */ 在 newLine190 中的位置会变化（因为前面删了字符）
// 用 replace 更安全：只删末尾的 " */"
const finalLine = newLine190.replace(/\*\/<\/script>$/, '</script>');
if (finalLine === newLine190) {
  console.error('未能删除末尾的 */');
  process.exit(1);
}

// 验证修复后没有残留的 /* 或 */ 在这行
const remainingBlockStarts = [];
const remainingBlockEnds = [];
for (let i = 0; i < finalLine.length - 1; i++) {
  if (finalLine[i] === '/' && finalLine[i+1] === '*') remainingBlockStarts.push(i);
  if (finalLine[i] === '*' && finalLine[i+1] === '/') remainingBlockEnds.push(i);
}
console.log('\n修复后第190行长度:', finalLine.length);
console.log('剩余 /* 数量:', remainingBlockStarts.length);
console.log('剩余 */ 数量:', remainingBlockEnds.length);
if (remainingBlockStarts.length > 0) {
  console.log('剩余 /* 位置:', remainingBlockStarts);
  remainingBlockStarts.forEach(pos => {
    console.log('  上下文:', finalLine.substring(Math.max(0,pos-30), pos+60));
  });
}
if (remainingBlockEnds.length > 0) {
  console.log('剩余 */ 位置:', remainingBlockEnds);
  remainingBlockEnds.forEach(pos => {
    console.log('  上下文:', finalLine.substring(Math.max(0,pos-40), pos+10));
  });
}

// 写回
lines[189] = finalLine;
writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('\n修复完成，已写回文件');

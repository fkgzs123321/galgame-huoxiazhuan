import { readFileSync } from 'fs';

const html = readFileSync('src/欲妈群/正则/状态栏.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const jsCode = scriptMatch[1];

// 找到所有 // 单行注释
const lineComments = [];
let inString = false, stringChar = null, inBlockComment = false;

for (let i = 0; i < jsCode.length - 1; i++) {
  const c = jsCode[i];
  const next = jsCode[i + 1];

  if (inBlockComment) {
    if (c === '*' && next === '/') { inBlockComment = false; i++; }
    continue;
  }
  if (inString) {
    if (c === '\\') { i++; continue; }
    if (c === stringChar) inString = false;
    continue;
  }
  if (c === '"' || c === "'" || c === '`') { inString = true; stringChar = c; continue; }
  if (c === '/' && next === '*') { inBlockComment = true; i++; continue; }

  if (c === '/' && next === '/') {
    // 找到注释开始，确定注释结束位置
    // 注释文字通常以 ====== 结束，或者以代码关键字开始结束
    let commentEnd = i + 2;

    // 向后扫描，找到注释文字结束的位置
    // 模式1: // ====== xxx ====== 后面跟代码
    // 模式2: // xxx 后面可能跟代码或另一个 //
    while (commentEnd < jsCode.length) {
      // 检查是否到了下一个 //
      if (jsCode[commentEnd] === '/' && jsCode[commentEnd + 1] === '/') break;
      // 检查是否遇到了代码关键字（前面有空格，后面是 function/var/if/for/while/return/async/try/catch/}）
      const rest = jsCode.substring(commentEnd);
      const codeStart = rest.match(/^(?:function|var |if\(|for\(|while\(|return |async |try\{|catch|}\s|}\)|\)\s|;|,)/);
      if (codeStart && commentEnd > i + 4) { // 至少跳过 "// " 和一些注释文字
        break;
      }
      commentEnd++;
    }

    const commentText = jsCode.substring(i, commentEnd);
    lineComments.push({ start: i, end: commentEnd, text: commentText });
  }
}

console.log('共找到', lineComments.length, '处 // 注释\n');
lineComments.forEach((c, idx) => {
  console.log(`[${idx}] pos=${c.start}-${c.end} len=${c.end - c.start}`);
  console.log(`  内容: ${c.text.substring(0, 100)}${c.text.length > 100 ? '...' : ''}`);
  console.log(`  后续: ${jsCode.substring(c.end, c.end + 50)}`);
  console.log();
});

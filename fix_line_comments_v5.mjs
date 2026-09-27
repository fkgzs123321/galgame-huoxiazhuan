import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/欲妈群/正则/状态栏.html';
const html = readFileSync(filePath, 'utf8');

// 提取 <script> 内容
const scriptMatch = html.match(/(<script>)([\s\S]*?)(<\/script>)/);
if (!scriptMatch) {
  console.error('未找到 <script> 标签');
  process.exit(1);
}

let jsCode = scriptMatch[2];

// 代码关键字列表 — 只匹配明确的多字符代码模式
// 不匹配单个字符（} ) ; ( ,）以避免误匹配 {{user}} 等内容
const codeKeywords = [
  'requestStatFromBridge',
  'setTimeout',
  '(function',
  'function ',
  'var ',
  'if(',
  'for(',
  'while(',
  'return ',
  'async ',
  'try{',
  'catch',
  's+=',      // 字符串拼接
  "s='",      // 字符串赋值
  's="',
  'render(',  // render 函数调用
  'render;',
  'render}',
  'render,',
  'render ',  // render 后跟空格（可能误匹配，但注释通常是中文）
  '});',
  '})',
  '}else',
  '}function',
  '}var',
  '}if',
  '}for',
  '}while',
  '}return',
  '}async',
  '}try',
  '}catch',
  '},',
  '};',
];

// 找到所有 // 单行注释（不在字符串/块注释内）
function findLineComments(code) {
  const comments = [];
  let inString = false, stringChar = null, inBlockComment = false;

  for (let i = 0; i < code.length - 1; i++) {
    const c = code[i];
    const next = code[i + 1];

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
      // 找到 // 注释开始，确定注释结束位置
      let commentEnd = findCommentTextEnd(code, i + 2);
      comments.push({ start: i, end: commentEnd });
      i = commentEnd - 1;
    }
  }
  return comments;
}

// 确定 // 注释文字的结束位置
function findCommentTextEnd(code, startPos) {
  let pos = startPos;

  while (pos < code.length) {
    // 检查是否到了下一个 //
    if (code[pos] === '/' && code[pos + 1] === '/') {
      return pos;
    }

    // 检查是否到了代码关键字
    const rest = code.substring(pos);
    for (const kw of codeKeywords) {
      if (rest.startsWith(kw)) {
        // 找到代码关键字，注释到此结束
        // 回退到注释文字的最后一个非空格字符之后
        let end = pos;
        while (end > startPos && code[end - 1] === ' ') end--;
        return end;
      }
    }

    pos++;
  }

  return code.length;
}

const comments = findLineComments(jsCode);
console.log('找到', comments.length, '处 // 注释');

// 显示每个注释的处理结果
comments.forEach((c, idx) => {
  const before = jsCode.substring(c.start, c.end);
  const after = jsCode.substring(c.end, c.end + 40);
  console.log(`[${idx}] 注释: ${before.substring(0, 60)}${before.length > 60 ? '...' : ''}`);
  console.log(`     后续: ${after.substring(0, 40)}...`);
});

// 从后往前替换：把 // 注释文字 替换为 /* 注释文字 */
let result = jsCode;
for (let i = comments.length - 1; i >= 0; i--) {
  const c = comments[i];
  const commentText = jsCode.substring(c.start, c.end);
  // commentText 以 // 开头
  const replacement = '/*' + commentText.substring(2) + '*/';
  result = result.substring(0, c.start) + replacement + result.substring(c.end);
}

// 验证：检查替换后还有没有 //
let remainingLineComments = 0;
{
  let inStr = false, strCh = null, inBlk = false;
  for (let i = 0; i < result.length - 1; i++) {
    const c = result[i], n = result[i + 1];
    if (inBlk) { if (c === '*' && n === '/') { inBlk = false; i++; } continue; }
    if (inStr) { if (c === '\\') { i++; continue; } if (c === strCh) inStr = false; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; strCh = c; continue; }
    if (c === '/' && n === '*') { inBlk = true; i++; continue; }
    if (c === '/' && n === '/') remainingLineComments++;
  }
}
console.log('\n替换后剩余 // 数量:', remainingLineComments);

// 括号配对检查
let parens = 0, braces = 0, brackets = 0;
let inStr = false, strCh = null, inBlk = false, inLn = false;
for (let i = 0; i < result.length; i++) {
  const c = result[i], n = result[i + 1];
  if (inLn) { if (c === '\n') inLn = false; continue; }
  if (inBlk) { if (c === '*' && n === '/') { inBlk = false; i++; } continue; }
  if (inStr) { if (c === '\\') { i++; continue; } if (c === strCh) inStr = false; continue; }
  if (c === '"' || c === "'" || c === '`') { inStr = true; strCh = c; continue; }
  if (c === '/' && n === '/') { inLn = true; i++; continue; }
  if (c === '/' && n === '*') { inBlk = true; i++; continue; }
  if (c === '(') parens++;
  if (c === ')') parens--;
  if (c === '{') braces++;
  if (c === '}') braces--;
  if (c === '[') brackets++;
  if (c === ']') brackets--;
}
console.log('\n括号配对检查:');
console.log('  () :', parens, parens === 0 ? '✓' : '✗');
console.log('  {} :', braces, braces === 0 ? '✓' : '✗');
console.log('  [] :', brackets, brackets === 0 ? '✓' : '✗');

// 写回文件
const newHtml = html.replace(
  /(<script>)([\s\S]*?)(<\/script>)/,
  (match, p1, p2, p3) => p1 + result + p3
);
writeFileSync(filePath, newHtml, 'utf8');
console.log('\n修复完成，已写回文件');

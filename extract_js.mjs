import { readFileSync, writeFileSync } from 'fs';

const html = readFileSync('src/欲妈群/正则/状态栏.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('未找到 <script> 标签');
  process.exit(1);
}

const jsCode = scriptMatch[1];
writeFileSync('extracted_statusbar.js', jsCode, 'utf8');
console.log('已提取 JS 代码到 extracted_statusbar.js');
console.log('代码长度:', jsCode.length);
console.log('行数:', jsCode.split('\n').length);

// 手动检查：找到所有可能的语法问题
// 1. 检查括号配对
let parens = 0, braces = 0, brackets = 0;
let inString = false, stringChar = null, inBlockComment = false, inLineComment = false;

for (let i = 0; i < jsCode.length; i++) {
  const c = jsCode[i];
  const next = jsCode[i + 1];

  if (inLineComment) {
    if (c === '\n') inLineComment = false;
    continue;
  }
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
  if (c === '/' && next === '/') { inLineComment = true; i++; continue; }
  if (c === '/' && next === '*') { inBlockComment = true; i++; continue; }

  if (c === '(') parens++;
  if (c === ')') parens--;
  if (c === '{') braces++;
  if (c === '}') braces--;
  if (c === '[') brackets++;
  if (c === ']') brackets--;
}

console.log('\n括号配对检查:');
console.log('  () :', parens, parens === 0 ? '✓' : '✗ 不匹配');
console.log('  {} :', braces, braces === 0 ? '✓' : '✗ 不匹配');
console.log('  [] :', brackets, brackets === 0 ? '✓' : '✗ 不匹配');

// 2. 找到所有 // 单行注释
const lineComments = [];
inString = false; stringChar = null; inBlockComment = false;
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
    lineComments.push(i);
  }
}
console.log('\n// 单行注释数量:', lineComments.length);
if (lineComments.length > 0) {
  lineComments.slice(0, 10).forEach((pos, idx) => {
    const before = jsCode.substring(Math.max(0, pos - 30), pos);
    const after = jsCode.substring(pos, Math.min(jsCode.length, pos + 50));
    console.log(`  [${idx}] pos=${pos}: ...${before}<<${after}...`);
  });
}

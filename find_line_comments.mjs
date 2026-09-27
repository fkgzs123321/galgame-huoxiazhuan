import { readFileSync } from 'fs';

const html = readFileSync('src/欲妈群/正则/状态栏.html', 'utf8');
const lines = html.split('\n');

// 检查所有行中的 // 单行注释（在 <script> 标签内）
let inScript = false;
let issues = [];

for (let lineNum = 0; lineNum < lines.length; lineNum++) {
  const line = lines[lineNum];

  if (line.includes('<script>')) inScript = true;
  if (line.includes('</script>')) inScript = false;

  if (!inScript) continue;

  // 在 script 内，找 // 单行注释
  // 需要排除字符串内的 //
  // 简单方法：找 // 但不在引号内
  let inString = false;
  let stringChar = null;
  let inBlockComment = false;

  for (let i = 0; i < line.length - 1; i++) {
    const c = line[i];
    const next = line[i + 1];

    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      if (c === '\\') {
        i++; // 跳过转义字符
        continue;
      }
      if (c === stringChar) {
        inString = false;
      }
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      inString = true;
      stringChar = c;
      continue;
    }

    if (c === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    if (c === '/' && next === '/') {
      // 找到单行注释！
      const ctx = line.substring(Math.max(0, i - 30), Math.min(line.length, i + 50));
      issues.push({ line: lineNum + 1, col: i, ctx });
      break; // 一行只报一次
    }
  }
}

console.log('找到 ' + issues.length + ' 处 // 单行注释:');
issues.forEach((issue, idx) => {
  console.log(`\n[${idx + 1}] 行 ${issue.line} 列 ${issue.col}:`);
  console.log(`  上下文: ...${issue.ctx}...`);
});

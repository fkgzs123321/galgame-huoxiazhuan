// 严格语法检查 - 找到确切的错误行
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', '正则', '界面', '状态栏.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// 去除 markdown 包裹
let content = html;
if (content.startsWith('```html\r\n')) content = content.substring(8);
if (content.startsWith('```html\n')) content = content.substring(8);
content = content.replace(/\r\n/g, '\n');  // 统一换行符
if (content.endsWith('\n```')) content = content.substring(0, content.length - 4);
if (content.endsWith('\n```\n')) content = content.substring(0, content.length - 5);

// 提取所有 script 块
const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g;
let match;
let scriptIdx = 0;
while ((match = scriptRegex.exec(content)) !== null) {
  scriptIdx++;
  const fullMatch = match[0];
  const scriptContent = match[1];
  const scriptType = fullMatch.match(/type=["']([^"']+)["']/);
  const typeStr = scriptType ? scriptType[1] : 'text/javascript (默认)';
  
  console.log(`\n=== Script 块 ${scriptIdx} (type: ${typeStr}) ===`);
  console.log(`  位置: ${match.index} - ${match.index + fullMatch.length}`);
  console.log(`  代码长度: ${scriptContent.length}`);
  
  if (typeStr.includes('json')) {
    console.log('  跳过 JSON script 块');
    continue;
  }
  
  // 尝试编译
  try {
    new vm.Script(scriptContent, { filename: `script-${scriptIdx}.js` });
    console.log('  vm.Script 编译: OK');
  } catch (e) {
    console.log('  vm.Script 编译错误:', e.message);
    if (e.stack) {
      console.log('  堆栈:', e.stack.split('\n').slice(0, 5).join('\n'));
    }
    // 找到错误行
    const lines = scriptContent.split('\n');
    if (e.lineNumber) {
      console.log(`  错误行 ${e.lineNumber}: ${lines[e.lineNumber - 1] || '(空)'}`);
      if (e.columnNumber) {
        console.log(`  错误列 ${e.columnNumber}`);
      }
    }
  }
  
  // 也用 new Function 检查
  try {
    new Function(scriptContent);
    console.log('  new Function 编译: OK');
  } catch (e) {
    console.log('  new Function 编译错误:', e.message);
  }
}

// 检查是否有 <script 在字符串中
console.log('\n=== 检查 <script 在字符串中 ===');
const scriptInString = content.match(/['"`]<\/?script[^>]*>['"`]/g);
if (scriptInString) {
  console.log('  发现 script 标签在字符串中:', scriptInString);
} else {
  console.log('  无 script 标签在字符串中');
}

// 检查中文标点
console.log('\n=== 检查中文标点 ===');
const chinesePunct = /[\u3000\uff0c\uff08\uff09\uff1b\uff1a\u201c\u201d\u2018\u2019]/g;
let pm;
let count = 0;
const lines = content.split('\n');
for (let i = 0; i < lines.length && count < 10; i++) {
  // 只检查 script 块内的行
  if (lines[i].match(/<script(?:\s+[^>]*)?>/)) {
    // script 开始，跳过
  }
  if (lines[i].match(/<\/script>/)) continue;
  
  // 检查是否在 script 块内（简化检查）
  if (i > 227 && i < 1062) {
    while ((pm = chinesePunct.exec(lines[i])) !== null && count < 10) {
      const char = pm[0];
      const col = pm.index;
      // 排除注释和字符串中的中文标点
      const before = lines[i].substring(0, col);
      const inComment = before.match(/\/\//) || before.match(/\/\*/);
      const inString = before.match(/['"`]/g);
      const stringCount = inString ? inString.length : 0;
      if (!inComment && stringCount % 2 === 0) {
        // 不在注释中，不在字符串中
        console.log(`  行 ${i + 1} 列 ${col + 1}: 中文标点 '${char}' (U+${char.charCodeAt(0).toString(16)})`);
        count++;
      }
    }
  }
}
if (count === 0) console.log('  无中文标点问题');

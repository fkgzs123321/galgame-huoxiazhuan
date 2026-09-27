// 检查状态栏 HTML 的脚本语法
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', '正则', '界面', '状态栏.html');
const html = fs.readFileSync(htmlPath, 'utf8');

let m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.log('no script'); process.exit(1); }
let code = m[1];

// 1. 严格语法检查
try {
  new Function(code);
  console.log('[1] 严格语法检查: OK');
} catch (e) {
  console.log('[1] 语法错误:', e.message);
}

// 2. 找所有含 ${...} 的行（模板字符串）
let lines = code.split('\n');
let templateLines = [];
for (let i = 0; i < lines.length; i++) {
  let l = lines[i];
  if (l.includes('${')) {
    templateLines.push({ line: i + 1, content: l.trim() });
  }
}
console.log('[2] 含 ${} 的行数:', templateLines.length);

// 3. 检查是否有未闭合的反引号
let backtickCount = (code.match(/`/g) || []).length;
console.log('[3] 反引号总数:', backtickCount, backtickCount % 2 === 0 ? '(偶数,OK)' : '(奇数,可能未闭合)');

// 4. 模拟 SillyTavern regex 替换后的场景
// regex 将 <StatusPlaceHolderImpl/> 替换为 HTML 内容
// 检查 HTML 中是否有会被 SillyTavern 二次处理的字符
let dangerousPatterns = ['{{', '}}', '<%', '%>', '<?', '?>'];
for (let p of dangerousPatterns) {
  let idx = code.indexOf(p);
  if (idx >= 0) {
    let lineNum = code.substring(0, idx).split('\n').length;
    console.log('[4] 危险模式', JSON.stringify(p), '在行', lineNum);
  }
}

// 5. 输出前 5 个模板字符串行
console.log('[5] 前5个模板字符串行:');
for (let i = 0; i < Math.min(5, templateLines.length); i++) {
  console.log('  行', templateLines[i].line, ':', templateLines[i].content.slice(0, 100));
}

// 6. 检查是否有 emoji 或特殊 unicode 字符可能导致问题
let emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]/u;
if (emojiRegex.test(code)) {
  console.log('[6] 发现 emoji 字符');
  let idx = code.search(emojiRegex);
  let lineNum = code.substring(0, idx).split('\n').length;
  console.log('  首个 emoji 在行', lineNum, ':', lines[lineNum-1].trim().slice(0, 80));
} else {
  console.log('[6] 无 emoji 字符');
}

// 7. 检查 DEFAULT_STAT 中是否有特殊字符
let defaultStatMatch = code.match(/DEFAULT_STAT\s*=\s*\{([\s\S]*?)\n\s*\};/);
if (defaultStatMatch) {
  let ds = defaultStatMatch[1];
  // 检查是否有未转义的特殊字符
  if (ds.includes('\\')) {
    console.log('[7] DEFAULT_STAT 含反斜杠');
  }
  // 检查引号匹配
  let singleQuotes = (ds.match(/'/g) || []).length;
  let doubleQuotes = (ds.match(/"/g) || []).length;
  console.log('[7] DEFAULT_STAT 单引号:', singleQuotes, '双引号:', doubleQuotes);
}

console.log('\n[完成] HTML 脚本总行数:', lines.length);

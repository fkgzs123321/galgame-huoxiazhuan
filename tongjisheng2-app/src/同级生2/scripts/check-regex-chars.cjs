// 检查 replaceString 中可能被 regex 引擎误解析的特殊字符
const fs = require('fs');
const path = require('path');

const regexPath = path.join(__dirname, '..', '正则', '界面', 'regex-[界面]状态栏.json');
const j = JSON.parse(fs.readFileSync(regexPath, 'utf8'));
let s = j.replaceString;

// 去除 markdown 包裹
if (s.startsWith('```html\n')) {
  s = s.replace(/^```html\n/, '').replace(/\n```$/, '');
}

// 检查 regex 替换中的特殊字符
// $1, $2, $3... 是 backreference
// $& 是整个匹配
// $` 是匹配前的字符串
// $' 是匹配后的字符串
// $$ 是字面 $
console.log('=== 检查 regex 替换特殊字符 ===');

// 找所有 $ 后跟数字或特殊字符的位置
const special = /[\$][0-9&`']/g;
let match;
let count = 0;
while ((match = special.exec(s)) !== null && count < 20) {
  const idx = match.index;
  const lineNum = s.substring(0, idx).split('\n').length;
  const context = s.substring(Math.max(0, idx - 20), Math.min(s.length, idx + 20));
  // 替换换行符
  const cleanContext = context.replace(/\n/g, '\\n');
  console.log(`  行 ${lineNum}: ...${cleanContext}...`);
  count++;
}
console.log('共找到', count, '处');

// 检查是否有 ${} 模板字符串（与 $1 不同，这个是安全的）
const templateLiterals = (s.match(/\$\{/g) || []).length;
console.log('\n模板字符串 ${} 数量:', templateLiterals, '(这些是安全的)');

// 检查 markdown 包裹
console.log('\n=== replaceString 格式 ===');
console.log('前 30 字符:', JSON.stringify(s.substring(0, 30)));
console.log('后 30 字符:', JSON.stringify(s.substring(s.length - 30)));
console.log('总长度:', s.length);

// 检查 markdownOnly 和 disabled 字段
console.log('\n=== regex JSON 配置 ===');
console.log('disabled:', j.disabled);
console.log('markdownOnly:', j.markdownOnly);
console.log('promptOnly:', j.promptOnly);
console.log('runOnEdit:', j.runOnEdit);
console.log('substituteRegex:', j.substituteRegex);
console.log('minDepth:', j.minDepth);
console.log('maxDepth:', j.maxDepth);

// 关键：检查 substituteRegex 是否会导致宏替换
if (j.substituteRegex !== undefined) {
  console.log('\n⚠️ substituteRegex:', j.substituteRegex, '(如果为 true, 会对 replaceString 做宏替换)');
}

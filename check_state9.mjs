// 检查 9状态栏界面 的实际 replaceString
import fs from 'fs';

const state = JSON.parse(fs.readFileSync('src/欲妈群/tavern-cards-state.json', 'utf-8'));
const regexes = state.extensions?.regex_scripts || [];

// 找到 9状态栏界面
const statbar = regexes.find(r => r.scriptName === '9状态栏界面');
if (!statbar) {
  console.log('❌ 未找到 9状态栏界面 正则');
  process.exit(1);
}

console.log('=== 9状态栏界面 详情 ===');
console.log('id:', statbar.id);
console.log('scriptName:', statbar.scriptName);
console.log('findRegex:', statbar.findRegex);
console.log('replaceString 长度:', statbar.replaceString.length);
console.log('replaceString 前300字符:');
console.log(statbar.replaceString.slice(0, 300));
console.log('\nreplaceString 后300字符:');
console.log(statbar.replaceString.slice(-300));
console.log('\ntrimStrings:', JSON.stringify(statbar.trimStrings));
console.log('placement:', JSON.stringify(statbar.placement));
console.log('disabled:', statbar.disabled);
console.log('markdownOnly:', statbar.markdownOnly);
console.log('promptOnly:', statbar.promptOnly);
console.log('runOnEdit:', statbar.runOnEdit);
console.log('substituteRegex:', statbar.substituteRegex);
console.log('minDepth:', statbar.minDepth);
console.log('maxDepth:', statbar.maxDepth);

// 验证 replaceString 的代码块包裹
const rs = statbar.replaceString;
if (rs.startsWith('```html\n')) {
  console.log('\n✓ replaceString 以 ```html\\n 开头');
} else {
  console.log('\n✗ replaceString 不以 ```html\\n 开头');
  console.log('  实际开头:', JSON.stringify(rs.slice(0, 30)));
}
if (rs.trim().endsWith('```')) {
  console.log('✓ replaceString 以 ``` 结尾');
} else {
  console.log('✗ replaceString 不以 ``` 结尾');
  console.log('  实际结尾:', JSON.stringify(rs.slice(-30)));
}

// 检查 replaceString 中是否包含完整的 HTML 结构
const hasDoctype = rs.includes('<!DOCTYPE html>');
const hasHtmlOpen = rs.includes('<html');
const hasHtmlClose = rs.includes('</html>');
const hasBodyOpen = rs.includes('<body>');
const hasBodyClose = rs.includes('</body>');
const hasScriptOpen = rs.includes('<script>');
const hasScriptClose = rs.includes('</script>');
console.log('\n=== HTML 结构检查 ===');
console.log('包含 <!DOCTYPE html>:', hasDoctype);
console.log('包含 <html:', hasHtmlOpen);
console.log('包含 </html>:', hasHtmlClose);
console.log('包含 <body>:', hasBodyOpen);
console.log('包含 </body>:', hasBodyClose);
console.log('包含 <script>:', hasScriptOpen);
console.log('包含 </script>:', hasScriptClose);

// 检查是否有字符串内的换行符（之前修复的问题）
const scriptMatch = rs.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  const scriptContent = scriptMatch[1];
  console.log('\n=== Script 块检查 ===');
  console.log('Script 长度:', scriptContent.length);

  // 检查字符串字面量中是否有未转义的换行符
  // 简单检测：查找 var xxx="..." 中是否有真实换行符
  const stringLiterals = scriptContent.match(/"[^"]*"/g) || [];
  let badLiterals = 0;
  for (const lit of stringLiterals) {
    if (lit.includes('\n') || lit.includes('\r')) {
      badLiterals++;
      if (badLiterals <= 3) {
        console.log(`  ✗ 字符串字面量包含换行符: ${lit.slice(0, 80)}...`);
      }
    }
  }
  if (badLiterals === 0) {
    console.log('✓ 字符串字面量中没有未转义的换行符');
  } else {
    console.log(`✗ 共 ${badLiterals} 个字符串字面量包含换行符`);
  }
}

// 同时也检查角色卡 JSON 中的正则
console.log('\n=== 检查角色卡 JSON ===');
const card = JSON.parse(fs.readFileSync('src/欲妈群/欲妈群.json', 'utf-8'));
const cardRegexes = card.data?.extensions?.regex_scripts || [];
console.log('角色卡 JSON 正则总数:', cardRegexes.length);
const cardStatbar = cardRegexes.find(r => r.scriptName === '9状态栏界面');
if (cardStatbar) {
  console.log('角色卡中 9状态栏界面 replaceString 长度:', cardStatbar.replaceString.length);
  console.log('角色卡中 9状态栏界面 前100字符:', cardStatbar.replaceString.slice(0, 100));
} else {
  console.log('❌ 角色卡中未找到 9状态栏界面');
}

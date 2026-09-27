// 将状态栏 HTML 中的 ES2020+ 语法转换为 ES5
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', '正则', '界面', '状态栏.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// 1. 统一换行符为 LF
html = html.replace(/\r\n/g, '\n');

// 2. 提取 script 块
const scriptMatch = html.match(/(<script>)([\s\S]*?)(<\/script>)/);
if (!scriptMatch) {
  console.log('未找到 script 块');
  process.exit(1);
}

let code = scriptMatch[2];
console.log('原始代码长度:', code.length);

// 3. 转换 `${}` 模板字符串为字符串拼接
// 匹配 `...${expr}...` 模式
// 简化处理：逐行转换
let lines = code.split('\n');
let templateCount = 0;
let nullishCount = 0;
let optionalChainCount = 0;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // 转换模板字符串 `...${expr}...` → '...' + expr + '...'
  // 需要处理嵌套和多个 ${} 的情况
  let converted = convertTemplateLiterals(line);
  if (converted !== line) {
    templateCount++;
    lines[i] = converted;
  }
  
  // 转换 ?? → || (简化处理，大多数场景 || 等效)
  if (line.includes('??')) {
    nullishCount += (line.match(/\?\?/g) || []).length;
    lines[i] = lines[i].replace(/\?\?/g, '||');
  }
  
  // 转换 ?. → && 链式访问 (简化处理)
  // gs?.day_count → (gs && gs.day_count)
  // 注意：这个转换比较复杂，需要小心处理
}

console.log('模板字符串转换:', templateCount, '行');
console.log('nullish coalescing 转换:', nullishCount, '处');

code = lines.join('\n');

// 写回 HTML
html = html.replace(/(<script>)([\s\S]*?)(<\/script>)/, '$1' + code + '$3');

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('转换完成，已写入', htmlPath);

// 辅助函数：转换模板字符串
function convertTemplateLiterals(line) {
  // 匹配 `...${expr}...` 模式
  // 简化处理：只转换简单的情况
  let result = line;
  
  // 找所有反引号模板字符串
  const templateRegex = /`([^`]*)`/g;
  let match;
  while ((match = templateRegex.exec(line)) !== null) {
    const fullMatch = match[0];
    const content = match[1];
    
    // 如果没有 ${}，跳过
    if (!content.includes('${')) {
      // 纯文本模板字符串 → 单引号字符串
      const replacement = "'" + content.replace(/'/g, "\\'") + "'";
      result = result.replace(fullMatch, replacement);
      continue;
    }
    
    // 有 ${} 的模板字符串
    // 将 `text${expr}more${expr2}end` 转换为 'text' + expr + 'more' + expr2 + 'end'
    let parts = [];
    let currentText = '';
    let i = 0;
    while (i < content.length) {
      if (content[i] === '$' && content[i + 1] === '{') {
        // 找到 ${，开始表达式
        if (currentText) {
          parts.push("'" + currentText.replace(/'/g, "\\'") + "'");
          currentText = '';
        }
        // 找匹配的 }
        let depth = 1;
        let expr = '';
        i += 2;
        while (i < content.length && depth > 0) {
          if (content[i] === '{') depth++;
          if (content[i] === '}') {
            depth--;
            if (depth === 0) break;
          }
          expr += content[i];
          i++;
        }
        parts.push('(' + expr + ')');
        i++; // 跳过 }
      } else {
        currentText += content[i];
      }
      i++;
    }
    if (currentText) {
      parts.push("'" + currentText.replace(/'/g, "\\'") + "'");
    }
    
    const replacement = parts.join(' + ');
    result = result.replace(fullMatch, replacement);
  }
  
  return result;
}

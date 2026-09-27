// 精确检查 regex JSON 中所有 {{...}} 的位置和上下文
const fs = require('fs');
const path = require('path');

const regexPath = path.join(__dirname, '..', '正则', '界面', 'regex-[界面]状态栏.json');
const j = JSON.parse(fs.readFileSync(regexPath, 'utf8'));
let s = j.replaceString;

// 去除 markdown 包裹
if (s.startsWith('```html\n')) {
  s = s.replace(/^```html\n/, '').replace(/\n```$/, '');
}

// 找所有 {{...}} 出现位置
const lines = s.split('\n');
console.log('=== 所有 {{...}} 出现位置 ===');
let inScript = false;
let scriptType = '';
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.match(/<script[^>]*>/)) {
    inScript = true;
    const m = l.match(/<script[^>]*type=["']([^"']+)["']/);
    scriptType = m ? m[1] : 'text/javascript (默认)';
  }
  if (l.match(/<\/script>/)) {
    inScript = false;
    scriptType = '';
  }
  if (l.includes('{{') || l.includes('}}')) {
    console.log(`行 ${i + 1} [${inScript ? '在script内, type=' + scriptType : '在script外'}]:`, l.trim().slice(0, 120));
  }
}

// 检查 script 块数量
const scriptOpen = (s.match(/<script/g) || []).length;
const scriptClose = (s.match(/<\/script>/g) || []).length;
console.log('\n=== script 标签统计 ===');
console.log('开标签:', scriptOpen, '闭标签:', scriptClose);

// 模拟 SillyTavern 宏替换后的效果
// {{format_message_variable::stat_data}} 会被替换为 JSON
console.log('\n=== 模拟宏替换影响 ===');
const macroCount = (s.match(/\{\{[^}]+\}\}/g) || []).length;
console.log('宏数量:', macroCount);
const macros = s.match(/\{\{[^}]+\}\}/g) || [];
macros.forEach((m, i) => {
  const idx = s.indexOf(m);
  const lineNum = s.substring(0, idx).split('\n').length;
  // 检查该行是否在 <script> (非 application/json) 内
  const beforeMacro = s.substring(0, idx);
  const lastScriptOpen = beforeMacro.lastIndexOf('<script');
  const lastScriptClose = beforeMacro.lastIndexOf('</script>');
  const lastJsonScript = beforeMacro.lastIndexOf('application/json');
  const inJsScript = lastScriptOpen > lastScriptClose && lastScriptOpen > lastJsonScript;
  console.log(`宏${i + 1}: ${m} 在行 ${lineNum}, ${inJsScript ? '⚠️在JS script内' : '在JSON script或script外'}`);
});

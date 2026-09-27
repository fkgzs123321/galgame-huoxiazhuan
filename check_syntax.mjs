// 提取 HTML 中的 <script> 内容并校验 JS 语法
import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync('src/欲妈群/正则/状态栏.html', 'utf-8');

// 匹配所有 <script>...</script> 块
const scriptRegex = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let match;
let idx = 0;
let hasError = false;

while ((match = scriptRegex.exec(html)) !== null) {
  idx++;
  const code = match[1];
  console.log(`\n=== Script Block #${idx} (len=${code.length}) ===`);
  try {
    // 用 vm 解析语法，不执行
    new vm.Script(code, { filename: `script_${idx}.js` });
    console.log(`✓ Script #${idx} 语法正确`);
  } catch (e) {
    hasError = true;
    console.error(`✗ Script #${idx} 语法错误: ${e.message}`);
    if (e.stack) {
      // 提取错误位置的几行代码
      const lines = code.split('\n');
      const lineMatch = e.stack.match(/:(\d+):\d+/);
      if (lineMatch) {
        const errLine = parseInt(lineMatch[1]);
        const start = Math.max(0, errLine - 3);
        const end = Math.min(lines.length, errLine + 3);
        console.error('  上下文:');
        for (let i = start; i < end; i++) {
          const mark = (i + 1 === errLine) ? ' >>> ' : '     ';
          console.error(`${mark}${i + 1}: ${lines[i].slice(0, 200)}`);
        }
      }
    }
  }
}

if (hasError) {
  console.log('\n❌ 存在语法错误');
  process.exit(1);
} else {
  console.log('\n✅ 所有 script 块语法正确');
}

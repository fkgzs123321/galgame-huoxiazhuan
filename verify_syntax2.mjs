import { readFileSync } from 'fs';
import vm from 'vm';

const html = readFileSync('src/欲妈群/正则/状态栏.html', 'utf8');

// 提取 <script> 标签内容
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('未找到 <script> 标签');
  process.exit(1);
}

const jsCode = scriptMatch[1];
console.log('JS 代码长度:', jsCode.length);
console.log('JS 代码行数:', jsCode.split('\n').length);

// 用 vm.Script 验证语法，获取精确错误位置
try {
  new vm.Script(jsCode, { filename: '状态栏.html' });
  console.log('✓ JS 语法验证通过');
} catch (e) {
  console.error('✗ JS 语法错误:');
  console.error('  message:', e.message);
  if (e.stack) {
    // 提取错误位置
    const stackLines = e.stack.split('\n');
    stackLines.slice(0, 10).forEach(line => console.error('  ', line));
  }

  // 尝试用 acorn 来获取更精确的错误位置
  console.log('\n尝试用 acorn 解析获取精确位置...');
  try {
    const acorn = await import('acorn');
    const ast = acorn.parse(jsCode, {
      ecmaVersion: 2022,
      sourceType: 'script',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
    });
    console.log('acorn 解析成功');
  } catch (err) {
    console.error('acorn 错误:', err.message);
    if (err.pos !== undefined) {
      const pos = err.pos;
      const before = jsCode.substring(Math.max(0, pos - 100), pos);
      const after = jsCode.substring(pos, pos + 100);
      console.error('错误位置:', pos);
      console.error('前面内容:', before);
      console.error('错误处:', after);
      // 找到行号
      const lines = jsCode.substring(0, pos).split('\n');
      console.error('行号:', lines.length, '列号:', lines[lines.length - 1].length);
    }
  }
  process.exit(1);
}

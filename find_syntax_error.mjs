import { readFileSync } from 'fs';
import * as acorn from 'acorn';

const html = readFileSync('src/欲妈群/正则/状态栏.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const jsCode = scriptMatch[1];

console.log('JS 代码长度:', jsCode.length);

try {
  acorn.parse(jsCode, {
    ecmaVersion: 2022,
    sourceType: 'script',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
  });
  console.log('✓ acorn 解析成功');
} catch (err) {
  console.error('✗ acorn 解析错误:');
  console.error('  message:', err.message);
  console.error('  pos:', err.pos);
  if (err.loc) {
    console.error('  line:', err.loc.line, 'column:', err.loc.column);
  }

  // 显示错误位置上下文
  const pos = err.pos;
  const before = jsCode.substring(Math.max(0, pos - 100), pos);
  const after = jsCode.substring(pos, pos + 100);
  console.error('\n  错误前100字符:', before);
  console.error('  错误处:', after);
  console.error('  错误字符:', jsCode[pos], '(charCode:', jsCode.charCodeAt(pos), ')');

  // 找到错误所在的行
  const lines = jsCode.substring(0, pos).split('\n');
  console.error('  所在行号:', lines.length);
  console.error('  行内容:', lines[lines.length - 1].substring(0, 200));
}

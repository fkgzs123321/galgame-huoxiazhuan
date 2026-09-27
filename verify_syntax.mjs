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

// 用 vm 验证语法（不执行）
try {
  new vm.Script(jsCode);
  console.log('✓ JS 语法验证通过');
} catch (e) {
  console.error('✗ JS 语法错误:', e.message);
  if (e.stack) console.error(e.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
}

// 验证关键函数是否存在
const sandbox = {
  window: {},
  console: console,
  document: {
    getElementById: () => ({ innerHTML: '', setAttribute: () => {} }),
    documentElement: { setAttribute: () => {} },
    addEventListener: () => {},
  },
  localStorage: { getItem: () => null, setItem: () => {} },
  setTimeout: () => {},
  JSON,
  Array,
  Object,
  Math,
  parseInt,
  parseFloat,
  isNaN,
  String,
  Number,
  Error,
};

try {
  vm.createContext(sandbox);
  vm.runInContext(jsCode, sandbox);
  console.log('✓ JS 执行成功（在沙箱中）');

  // 检查关键全局变量
  console.log('  - typeof DEFAULT_STAT:', typeof sandbox.DEFAULT_STAT);
  console.log('  - typeof State:', typeof sandbox.State);
  console.log('  - typeof render:', typeof sandbox.render);
  console.log('  - typeof init:', typeof sandbox.init);
  console.log('  - typeof refresh:', typeof sandbox.refresh);

  // 验证 State.stat 是否有数据
  if (sandbox.State && sandbox.State.stat) {
    console.log('  - State.stat.player.name:', sandbox.State.stat.player.name);
    console.log('  - State.stat.hao_jiaqi.name:', sandbox.State.stat.hao_jiaqi.name);
    console.log('  - State.stat.group.member_count:', sandbox.State.stat.group.member_count);
    console.log('  - State.stat.group.members.length:', sandbox.State.stat.group.members.length);
  }
} catch (e) {
  console.error('✗ JS 执行错误:', e.message);
  if (e.stack) console.error(e.stack.split('\n').slice(0, 10).join('\n'));
  process.exit(1);
}

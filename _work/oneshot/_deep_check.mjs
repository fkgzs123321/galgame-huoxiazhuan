import fs from 'fs';
import vm from 'vm';

const fp = 'src/欲妈群/正则/状态栏.html';
const html = fs.readFileSync(fp, 'utf8');

// 提取所有 <script> 标签内容
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
let match;
let scripts = [];
while ((match = scriptRegex.exec(html)) !== null) {
  scripts.push({
    fullTag: match[0],
    content: match[1],
    isJSON: match[0].includes('type="application/json"')
  });
}

console.log('找到 ' + scripts.length + ' 个 script 标签');
scripts.forEach((s, i) => {
  console.log(`  [${i}] ${s.isJSON ? 'JSON' : 'JS'} · ${s.content.length} 字符`);
});

// 检查JS代码（非JSON的那个）
const jsScript = scripts.find(s => !s.isJSON);
if (!jsScript) {
  console.log('未找到JS代码');
  process.exit(1);
}

const jsCode = jsScript.content;
console.log('\nJS代码长度: ' + jsCode.length + ' 字符');

// 方法1: node --check
fs.writeFileSync('_check_js.js', jsCode);
try {
  require('child_process').execSync('node --check _check_js.js', { stdio: 'pipe' });
  console.log('node --check: 通过');
} catch (e) {
  console.log('node --check: 失败');
  const stderr = e.stderr ? e.stderr.toString() : '';
  const m = stderr.match(/_check_js\.js:(\d+)/);
  if (m) {
    const lineNum = parseInt(m[1]);
    const lines = jsCode.split('\n');
    console.log('  错误行: ' + lineNum);
    console.log('  内容: ' + lines[lineNum - 1]?.substring(0, 300));
  } else {
    console.log('  ' + stderr.substring(0, 500));
  }
}

// 方法2: vm.runInContext（更严格，能检测到 node --check 遗漏的问题）
console.log('\nvm.runInContext 测试:');
const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    documentElement: { setAttribute: () => {} }
  },
  console: console,
  localStorage: { getItem: () => null, setItem: () => {} },
  setTimeout: () => {},
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  JSON: JSON,
  Object: Object,
  Array: Array,
  Date: Date,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Math: Math,
};

try {
  const context = vm.createContext(sandbox);
  vm.runInContext(jsCode, context);
  console.log('  执行成功');
} catch (e) {
  console.log('  错误: ' + e.message);
  if (e.stack) {
    const stackLines = e.stack.split('\n').slice(0, 5);
    stackLines.forEach(l => console.log('  ' + l));
  }
}

fs.unlinkSync('_check_js.js');

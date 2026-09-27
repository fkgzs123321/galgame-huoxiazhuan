// 用 jsdom 模拟真实环境测试控制中心脚本
const fs = require('fs');

// 检查是否有 jsdom
let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch (e) {
  console.log('jsdom 未安装，尝试用最小模拟环境');
}

const code = fs.readFileSync('./src/不要玩弄我的鸡吧-forge/脚本/控制中心.js', 'utf-8');

// 检查脚本结构
console.log('=== 脚本结构检查 ===');
console.log('总长度:', code.length);

// 检查 IIFE 包裹
const iifeMatch = code.match(/^\(\(\)\s*=>\s*\{/m);
console.log('IIFE 开头:', iifeMatch ? '找到' : '未找到');

// 检查 IIFE 结尾
const endMatch = code.match(/\}\)\s*;\s*$/);
console.log('IIFE 结尾:', endMatch ? '找到' : '未找到');

// 检查 init() 调用
const initCallMatch = code.match(/init\(\)\.catch/);
console.log('init().catch 调用:', initCallMatch ? '找到' : '未找到');

// 检查内嵌的 base64 是否有破坏语法的内容
const b64Count = (code.match(/EMBEDDED_[A-Z_]+_B64\s*=\s*'[^']+'/g) || []);
console.log('base64 常量数:', b64Count.length);
b64Count.forEach((m, i) => {
  const len = m.length;
  console.log(`  [${i}] 长度${len}`);

  // 检查 base64 是否合法
  const b64 = m.match(/'([^']+)'/)[1];
  const isValidB64 = /^[A-Za-z0-9+/]+={0,2}$/.test(b64);
  console.log(`  合法base64: ${isValidB64}`);
  if (!isValidB64) {
    // 找到第一个非法字符
    for (let j = 0; j < b64.length; j++) {
      if (!/[A-Za-z0-9+/=]/.test(b64[j])) {
        console.log(`  首个非法字符位置${j}: '${b64[j]}' (charCode ${b64.charCodeAt(j)})`);
        console.log(`  上下文: ...${b64.slice(Math.max(0, j - 20), j + 20)}...`);
        break;
      }
    }
  }
});

// 检查是否有未转义的单引号在base64中
const sbMatch = code.match(/EMBEDDED_STATUS_BAR_B64\s*=\s*'([^']+)'/);
if (sbMatch) {
  const b64 = sbMatch[1];
  console.log('\nstatus-bar base64长度:', b64.length);
  // 尝试解码
  try {
    const decoded = Buffer.from(b64, 'base64').toString('utf-8');
    console.log('解码成功，长度:', decoded.length);
    console.log('前100字:', decoded.slice(0, 100));
  } catch (e) {
    console.log('解码失败:', e.message);
  }
}

const opMatch = code.match(/EMBEDDED_OPENING_PAGE_B64\s*=\s*'([^']+)'/);
if (opMatch) {
  const b64 = opMatch[1];
  console.log('\nopening-page base64长度:', b64.length);
  try {
    const decoded = Buffer.from(b64, 'base64').toString('utf-8');
    console.log('解码成功，长度:', decoded.length);
    console.log('前100字:', decoded.slice(0, 100));
  } catch (e) {
    console.log('解码失败:', e.message);
  }
}

// 检查嵌入代码后的上下文
const embedIdx = code.indexOf('EMBEDDED_STATUS_BAR_B64');
console.log('\n嵌入代码上下文:');
console.log(code.slice(Math.max(0, embedIdx - 100), embedIdx + 200));

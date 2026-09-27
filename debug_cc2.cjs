const fs = require('fs');
const code = fs.readFileSync('./src/不要玩弄我的鸡吧-forge/脚本/控制中心.js', 'utf-8');

// 检查 base64 字符串中是否有单引号
const sbMatch = code.match(/EMBEDDED_STATUS_BAR_B64\s*=\s*'([^']*)'/);
if (sbMatch) {
  console.log('STATUS_BAR base64 提取成功，长度:', sbMatch[1].length);
} else {
  console.log('STATUS_BAR base64 提取失败！可能字符串中有单引号');

  // 找到开始位置，逐字符扫描
  const startIdx = code.indexOf("EMBEDDED_STATUS_BAR_B64 = '") + "EMBEDDED_STATUS_BAR_B64 = '".length;
  console.log('开始位置:', startIdx);

  let endIdx = -1;
  let escape = false;
  for (let i = startIdx; i < code.length; i++) {
    if (escape) { escape = false; continue; }
    if (code[i] === '\\') { escape = true; continue; }
    if (code[i] === "'") { endIdx = i; break; }
  }

  if (endIdx > 0) {
    const b64 = code.slice(startIdx, endIdx);
    console.log('找到结束引号，位置:', endIdx);
    console.log('base64长度:', b64.length);
    console.log('结束引号前10字符:', JSON.stringify(b64.slice(-10)));
    console.log('结束引号后20字符:', JSON.stringify(code.slice(endIdx, endIdx + 20)));

    // 检查base64是否合法
    const valid = /^[A-Za-z0-9+/]+={0,2}$/.test(b64);
    console.log('base64合法:', valid);
    if (!valid) {
      for (let j = 0; j < b64.length; j++) {
        if (!/[A-Za-z0-9+/=]/.test(b64[j])) {
          console.log('首个非法字符位置', j, ':', JSON.stringify(b64[j]), 'charCode:', b64.charCodeAt(j));
          break;
        }
      }
    }
  } else {
    console.log('未找到结束引号！');
  }
}

// 检查 opening page
console.log('\n--- OPENING_PAGE ---');
const opMatch = code.match(/EMBEDDED_OPENING_PAGE_B64\s*=\s*'([^']*)'/);
if (opMatch) {
  console.log('OPENING_PAGE base64 提取成功，长度:', opMatch[1].length);
} else {
  console.log('OPENING_PAGE base64 提取失败！');
}

// 检查 atob 函数
console.log('\n--- decodeEmbeddedB64 函数 ---');
const decodeMatch = code.match(/function decodeEmbeddedB64[\s\S]*?\n  \}/);
if (decodeMatch) {
  console.log('找到 decodeEmbeddedB64 函数');
  console.log('内容:', decodeMatch[0]);
} else {
  console.log('decodeEmbeddedB64 函数未找到！');
}

// 检查 stripMarkdownFence 函数
console.log('\n--- stripMarkdownFence 函数 ---');
const stripMatch = code.match(/function stripMarkdownFence[\s\S]*?\n  \}/);
if (stripMatch) {
  console.log('找到 stripMarkdownFence 函数');
  console.log('内容:', stripMatch[0]);
} else {
  console.log('stripMarkdownFence 函数未找到！');
}

// 尝试用 eval 执行整个脚本的前 N 个字符（检查是否有运行时错误）
console.log('\n--- 执行测试 ---');
try {
  // 用 Function 构造器测试
  const fn = new Function(code);
  console.log('脚本编译成功');
} catch (e) {
  console.log('脚本编译失败:', e.message);
  console.log('错误位置:', e.stack?.split('\n')[1] || '');
}

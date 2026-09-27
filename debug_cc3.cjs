const fs = require('fs');
const j = JSON.parse(fs.readFileSync('./dist/不要玩弄我的鸡吧-forge.json', 'utf-8'));
const cc = j.data.extensions.tavern_helper.scripts.find(s => s.name === '控制中心');

console.log('=== 打包后控制中心脚本检查 ===');
console.log('content长度:', cc.content.length);
console.log('前100字:', cc.content.slice(0, 100));
console.log('后100字:', cc.content.slice(-100));

// 检查 base64 常量
const sbMatch = cc.content.match(/EMBEDDED_STATUS_BAR_B64\s*=\s*'([^']*)'/);
console.log('\nSTATUS_BAR base64:', sbMatch ? '存在，长度' + sbMatch[1].length : '缺失');

const opMatch = cc.content.match(/EMBEDDED_OPENING_PAGE_B64\s*=\s*'([^']*)'/);
console.log('OPENING_PAGE base64:', opMatch ? '存在，长度' + opMatch[1].length : '缺失');

// 尝试编译
try {
  new Function(cc.content);
  console.log('\n编译: 成功');
} catch (e) {
  console.log('\n编译失败:', e.message);
}

// 检查 IIFE 结构
console.log('\n=== IIFE 结构 ===');
console.log('开头 (() => {:', cc.content.startsWith('(()') || cc.content.includes('(() =>'));
console.log('结尾 })();:', cc.content.trim().endsWith('})();'));

// 检查关键函数
const fns = ['init', 'ensureBall', 'getSwitches', 'DEFAULT_SWITCHES', 'applyThemeToStatusBars',
             'injectStatusBars', 'injectOpeningPages', 'getFallbackStatusBarHTML',
             'consumeOpeningEmbeddedFallback', 'fetchFromCDN', 'fetchOpeningPageWithIntegrity'];
fns.forEach(fn => {
  console.log(`  ${fn}: ${cc.content.includes(fn) ? '✓' : '✗'}`);
});

// 对比源文件
const srcCode = fs.readFileSync('./src/不要玩弄我的鸡吧-forge/脚本/控制中心.js', 'utf-8');
console.log('\n=== 源文件 vs 打包后 ===');
console.log('源文件长度:', srcCode.length);
console.log('打包后长度:', cc.content.length);
console.log('长度一致:', srcCode.length === cc.content.length);

// 如果长度不一致，找差异
if (srcCode.length !== cc.content.length) {
  const minLen = Math.min(srcCode.length, cc.content.length);
  let diffIdx = -1;
  for (let i = 0; i < minLen; i++) {
    if (srcCode[i] !== cc.content[i]) { diffIdx = i; break; }
  }
  if (diffIdx >= 0) {
    console.log('首个差异位置:', diffIdx);
    console.log('源文件:', JSON.stringify(srcCode.slice(diffIdx - 20, diffIdx + 20)));
    console.log('打包后:', JSON.stringify(cc.content.slice(diffIdx - 20, diffIdx + 20)));
  } else {
    console.log('前', minLen, '字符一致，长度差异在尾部');
    const longer = srcCode.length > cc.content.length ? srcCode : cc.content;
    console.log('多出的部分:', JSON.stringify(longer.slice(minLen, minLen + 100)));
  }
}

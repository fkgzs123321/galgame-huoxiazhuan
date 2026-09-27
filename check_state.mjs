// 检查打包后的 state.json 中状态栏正则的配置
import fs from 'fs';

const state = JSON.parse(fs.readFileSync('src/欲妈群/tavern-cards-state.json', 'utf-8'));
const regexes = state.extensions?.regex_scripts || [];

console.log(`正则总数: ${regexes.length}`);
console.log('\n=== 所有正则列表 ===');
regexes.forEach((r, i) => {
  console.log(`[${i}] ${r.scriptName} | disabled=${r.disabled} | placement=${JSON.stringify(r.placement)} | markdownOnly=${r.markdownOnly} | findRegex=${r.findRegex}`);
});

// 找到状态栏正则
const statbar = regexes.find(r => r.scriptName && r.scriptName.includes('状态栏'));
if (!statbar) {
  console.log('\n❌ 未找到状态栏正则');
  process.exit(1);
}

console.log('\n=== 状态栏正则详情 ===');
console.log('id:', statbar.id);
console.log('scriptName:', statbar.scriptName);
console.log('findRegex:', statbar.findRegex);
console.log('replaceString (前200字符):', statbar.replaceString.slice(0, 200));
console.log('replaceString (后200字符):', statbar.replaceString.slice(-200));
console.log('replaceString 长度:', statbar.replaceString.length);
console.log('trimStrings:', JSON.stringify(statbar.trimStrings));
console.log('placement:', JSON.stringify(statbar.placement));
console.log('disabled:', statbar.disabled);
console.log('markdownOnly:', statbar.markdownOnly);
console.log('promptOnly:', statbar.promptOnly);
console.log('runOnEdit:', statbar.runOnEdit);
console.log('substituteRegex:', statbar.substituteRegex);
console.log('minDepth:', statbar.minDepth);
console.log('maxDepth:', statbar.maxDepth);

// 验证 replaceString 是否以 ```html 开头
if (statbar.replaceString.startsWith('```html')) {
  console.log('\n✓ replaceString 以 ```html 开头');
} else {
  console.log('\n✗ replaceString 不以 ```html 开头');
}

// 验证 replaceString 是否以 ``` 结尾
if (statbar.replaceString.trim().endsWith('```')) {
  console.log('✓ replaceString 以 ``` 结尾');
} else {
  console.log('✗ replaceString 不以 ``` 结尾');
}

// 验证 findRegex 是否能匹配开场白中的占位符
const firstMes = fs.readFileSync('src/欲妈群/开场白/0.txt', 'utf-8');
console.log('\n=== 开场白匹配测试 ===');
console.log('开场白包含 <StatusPlaceHolderImpl/>:', firstMes.includes('<StatusPlaceHolderImpl/>'));

// 测试 findRegex 是否能匹配
try {
  // SillyTavern 的 findRegex 字符串如果是 /pattern/flags 格式会被识别为正则字面量
  const fr = statbar.findRegex;
  let re;
  if (fr.startsWith('/') && fr.lastIndexOf('/') > 0) {
    const lastSlash = fr.lastIndexOf('/');
    const pattern = fr.slice(1, lastSlash);
    const flags = fr.slice(lastSlash + 1);
    re = new RegExp(pattern, flags);
    console.log(`findRegex 解析为正则字面量: /${pattern}/${flags}`);
  } else {
    re = new RegExp(fr, 'gi');
    console.log(`findRegex 作为普通正则: ${fr}`);
  }
  console.log('能匹配 <StatusPlaceHolderImpl/>:', re.test('<StatusPlaceHolderImpl/>'));
  console.log('能匹配 <StatusPlaceHolderImpl />:', re.test('<StatusPlaceHolderImpl />'));
} catch (e) {
  console.log('✗ findRegex 解析失败:', e.message);
}

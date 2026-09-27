// 上色改用 inline style —— 正文消息无法引用状态栏里的 <style>（不在同一作用域）
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');

const 文件 = [
  ['正则/上色_屏幕外的人.html', '<span style="color:#e8b84b;font-weight:600">〔$1〕</span>'],
  ['正则/上色_游戏角色.html', '<span style="color:#9fdcb4">「$1」</span>'],
  ['正则/上色_user.html', '<span style="color:#8b93a5;font-style:italic">（$1）</span>'],
];
for (const [f, 内容] of 文件) {
  fs.writeFileSync(path.join(D, f), 内容 + '\n');
  console.log('✅ ' + f);
  console.log('   ' + 内容);
}
console.log('\n为什么改 inline：正文消息的 span 不在状态栏 <style> 的作用域内，class 拿不到样式。');

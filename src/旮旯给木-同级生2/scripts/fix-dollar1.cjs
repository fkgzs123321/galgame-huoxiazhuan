// 修：三个上色替换文件丢了 $1（被 shell 展开成空）
// 用文件方式写，避免 shell 对 $ 的展开
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');

const 文件 = [
  ['正则/上色_屏幕外的人.html', '<span class="gg-her">〔$1〕</span>'],
  ['正则/上色_游戏角色.html', '<span class="gg-role">「$1」</span>'],
  ['正则/上色_user.html', '<span class="gg-you">（$1）</span>'],
];
for (const [f, 内容] of 文件) {
  fs.writeFileSync(path.join(D, f), 内容 + '\n');
  console.log('✅ ' + f + '  →  ' + 内容);
}

// 复核卡内（pack 后 replaceString 是内联的）
console.log('\n复核（这些必须含 $1）:');
for (const f of 文件.map(x => x[0])) {
  const t = fs.readFileSync(path.join(D, f), 'utf8');
  const dollar1 = t.includes('$1');
  console.log('  ' + (dollar1 ? '✅' : '❌') + ' ' + f);
}

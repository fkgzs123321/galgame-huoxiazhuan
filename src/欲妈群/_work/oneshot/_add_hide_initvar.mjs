import fs from 'fs';
const D = 'E:/Games/写卡/tavern_helper_template/src/欲妈群/正则/';

// ★ 新正则：隐藏开场白末尾嵌入的 <UpdateVariable><initvar> 整块
//   为什么：15 个开局各带一份 initvar（546 个字段），它会在开局页上摊成一大坨；
//   它只该给 MVU 用，不该给玩家看。
//   命名 16-1 让它排在 16-2（折叠）之前 —— 否则先被折成 <details> 就匹配不到了。
const j = {
  id: null,
  scriptName: '1隐藏初始变量块（开局那坨）',
  findRegex: '/<UpdateVariable>\\s*<initvar>[\\s\\S]*?<\\/initvar>\\s*<\\/UpdateVariable>/gi',
  trimStrings: [],
  placement: [1, 2],
  disabled: false,
  markdownOnly: true,
  promptOnly: false,
  runOnEdit: true,
  substituteRegex: 0,
  minDepth: null,
  maxDepth: null,
  replaceString: '',
  source: null,
};

fs.writeFileSync(D + '16-1隐藏初始变量块.json', JSON.stringify(j, null, 2) + '\n', 'utf8');
console.log('✓ 已建 16-1隐藏初始变量块.json');
console.log('  findRegex: ' + j.findRegex);
console.log('  替换为空（隐藏）　markdownOnly=' + j.markdownOnly + '　placement=' + JSON.stringify(j.placement));
console.log('');
console.log('排序检查（文件名排序 = 执行顺序）：');
fs.readdirSync(D).filter(f => /^1[3-8]/.test(f)).sort().forEach(f => console.log('  ' + f));

// 禁则扫描：破折号 / 星号 / 模糊指代 / 四禁句式 / 叠字 / 量词空悬 / 环境味
// 用法：node _work/check/_scan_bans.mjs [文件名关键词...]  默认扫 世界书/*.txt
import fs from 'fs';
import path from 'path';

const WB = '世界书';
const filter = process.argv.slice(2);
const files = fs.readdirSync(WB).filter(f => f.endsWith('.txt'))
  .filter(f => !filter.length || filter.some(k => f.includes(k)));

const RULES = [
  ['破折号', /——/g],
  ['星号', /\*/g],
  ['模糊指代', /那两团|那两坨|那两片|那两瓣|那两点|那道沟|那处|那里|那东西|那两处/g],
  ['四禁句式', /她觉得|她不知道|她经常|她喜欢/g],
  ['几乎', /几乎/g],
  ['叠字可疑', /骚骚|臭臭|逼逼|奶奶肉|屄屄|屌屌/g],
  ['量词空悬', /(两团|两坨|两片|两瓣|那道|那截)(?=[，。；、）】\s]|$)/gm],
  ['环境味', /松节油|亚麻籽油|消毒水|碘伏|福尔马林|旧书页|纸墨|墨水|香水|粉底|身体乳|咖啡|烘焙|黄油|香草|皂香|沐浴露|焚香|檀香|雪松|白茶|茶香|颜料味|画布味/g],
];
// 量词合格形态：量词 + (形容词/名词) + 器官名 → 只要量词后面紧跟的 6 个字里有器官名就放过
const ORGAN = /奶|乳|屄|逼|臀|尻|屁股|股|沟|肉|唇|头|腰|腿|肚|腹|颈|肩|背/;

let bad = 0;
for (const f of files) {
  const lines = fs.readFileSync(path.join(WB, f), 'utf8').split('\n');
  lines.forEach((l, i) => {
    for (const [name, re] of RULES) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(l))) {
        if (name === '量词空悬') {
          const tail = l.slice(m.index, m.index + 10);
          if (ORGAN.test(tail)) continue;
        }
        console.log(f + ':' + (i + 1) + '  [' + name + ']  ' + m[0] + '   << ' + l.trim().slice(0, 60));
        bad++;
      }
    }
  });
}
console.log(bad === 0 ? '✅ 全部 ' + files.length + ' 个文件无禁则命中' : '❌ 共 ' + bad + ' 处');

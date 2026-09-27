// 批量渲染 EJS 条目，验证各档位都能正确命中
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire('file:///C:/Users/64806/.workbuddy/binaries/node/workspace/');
const EJS = require('ejs');

const ROOT = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/';

const render = (file, stat) => {
  let src = fs.readFileSync(ROOT + file, 'utf8');
  src = src
    .split('\n')
    .filter((l) => !/^@@/.test(l))
    .join('\n');
  const 变量 = { stat_data: stat };
  const getvar = (k, o) => {
    const d = o && 'defaults' in o ? o.defaults : undefined;
    const v = k.split('.').reduce((a, p) => (a == null ? a : a[p]), 变量);
    return v === undefined ? d : v;
  };
  // @@private 会包一层块作用域，这里手动补上
  return EJS.render('<% { %>' + src + '\n<% } %>', { getvar });
};

const 档位名 = (out) => {
  const m = out.match(/档位[一二三四五六七][^\n]*|阶段[一二三四五六七][^\n]*|第[一二三四]档[^\n]*/);
  return m ? m[0].trim() : '(未命中任何档位)';
};

const cases = [
  ['世界书/阶段指导/评价值档位主持.txt', { 反派状态: { 评价值: 100 } }],
  ['世界书/阶段指导/评价值档位主持.txt', { 反派状态: { 评价值: 80 } }],
  ['世界书/阶段指导/评价值档位主持.txt', { 反派状态: { 评价值: 60 } }],
  ['世界书/阶段指导/评价值档位主持.txt', { 反派状态: { 评价值: 40 } }],
  ['世界书/阶段指导/评价值档位主持.txt', { 反派状态: { 评价值: 20 } }],
  ['世界书/阶段指导/评价值档位主持.txt', { 反派状态: { 评价值: 5 } }],
  ['世界书/阶段指导/评价值档位主持.txt', { 反派状态: { 评价值: 0 } }],
  ['世界书/角色/林天/多阶段.txt', { 反派状态: { 评价值: 100 } }],
  ['世界书/角色/林天/多阶段.txt', { 反派状态: { 评价值: 0 } }],
  ['世界书/角色/林天/性格调色盘.txt', { 反派状态: { 评价值: 85 } }],
  ['世界书/角色/苏婉/多阶段.txt', { 绑定花名册: { 苏婉: { 时期: '当前目标' } } }],
  ['世界书/角色/苏婉/多阶段.txt', { 绑定花名册: { 苏婉: { 时期: '绑定深化' } } }],
  ['世界书/角色/苏婉/多阶段.txt', { 绑定花名册: { 苏婉: { 时期: '已解绑' } } }],
  ['世界书/角色/苏婉/性格调色盘.txt', { 绑定花名册: { 苏婉: { 时期: '濒临解绑' } } }],
  ['世界书/扮演准则/玩家心理阶段.txt', { 玩家: { 觉醒度: 10 } }],
  ['世界书/扮演准则/玩家心理阶段.txt', { 玩家: { 觉醒度: 45 } }],
  ['世界书/扮演准则/玩家心理阶段.txt', { 玩家: { 觉醒度: 95 } }],
];

let bad = 0;
for (const [file, stat] of cases) {
  try {
    const out = render(file, stat);
    const probe = JSON.stringify(stat);
    console.log(`OK  ${file}  ${probe}`);
    console.log(`    → ${档位名(out)}   (输出 ${out.length} 字符)`);
    if (档位名(out) === '(未命中任何档位)') bad++;
  } catch (e) {
    bad++;
    console.log(`ERR ${file}  ${JSON.stringify(stat)}`);
    console.log(`    ${e.message}`);
  }
}
console.log('\n异常/未命中:', bad);

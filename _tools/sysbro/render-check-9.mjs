// 把 10 位女性的「多阶段」× 7 个时期全渲染一遍，验证档位命中且无异常
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire('file:///C:/Users/64806/.workbuddy/binaries/node/workspace/');
const EJS = require('ejs');

const ROOT = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/世界书/角色/';
const 名单 = ['苏婉', '陈雪华', '林雅芝', '王秀兰', '赵敏', '孙莉', '周慧敏', '吴琼', '郑秀', '沈梦瑶'];
const 时期 = ['当前目标', '刚被控制', '绑定瞬间', '绑定深化', '完全绑定', '濒临解绑', '已解绑'];

const render = (file, key, value) => {
  let src = fs.readFileSync(ROOT + file, 'utf8');
  src = src
    .split('\n')
    .filter((l) => !/^@@/.test(l))
    .join('\n');
  const stat = { 绑定花名册: { [key]: { 时期: value } } };
  const 变量 = { stat_data: stat };
  const getvar = (k, o) => {
    const d = o && 'defaults' in o ? o.defaults : undefined;
    const v = k.split('.').reduce((a, p) => (a == null ? a : a[p]), 变量);
    return v === undefined ? d : v;
  };
  return EJS.render('<% { %>' + src + '\n<% } %>', { getvar });
};

let bad = 0,
  total = 0;
for (const w of 名单) {
  const line = [];
  for (const p of 时期) {
    total++;
    try {
      const out = render(`${w}/多阶段.txt`, w, p);
      const m = out.match(/阶段[一二三四五六七][^\n]*/);
      if (!m) {
        bad++;
        line.push(`${p}:✗未命中`);
      } else line.push(`${p.slice(0, 2)}→${m[0].trim().split(' · ')[1] || m[0].trim()}`);
    } catch (e) {
      bad++;
      line.push(`${p}:ERR ${e.message.slice(0, 40)}`);
    }
  }
  console.log(w.padEnd(4), line.join('  '));
}
console.log('\n共 ' + total + ' 个场景，异常 ' + bad);

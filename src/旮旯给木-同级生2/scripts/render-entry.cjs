// 条目渲染器：用**真 ejs**（不是自己猜语义）把条目渲染一遍，看 AI 实际会收到什么
//   用法: node scripts/render-entry.cjs <条目文件> '<变量JSON>'
//   踩过的坑: <%_ _%> 只吃「空格与制表符」，不吃换行 → 不会把行挤在一起
//             （自己写迷你渲染器时按 \s 吃，误判过一整轮，所以这里直接用真库）
const fs = require('fs');
const path = require('path');

// ejs 装在隔离工作区里，避免污染项目依赖
const EJS = require('C:/Users/64806/.workbuddy/binaries/node/workspace/node_modules/ejs');

const 文件 = process.argv[2];
const 变量 = JSON.parse(process.argv[3] || '{}');

let 源 = fs.readFileSync(文件, 'utf8');
// 去掉 @@private / @@if 这类装饰器行（由打包器消费，不进内容）
源 = 源.split('\n').filter(l => !/^@@/.test(l)).join('\n');

const getvar = (k, o) => {
  const d = (o && 'defaults' in o) ? o.defaults : undefined;
  const v = k.split('.').reduce((a, p) => (a == null ? a : a[p]), 变量);
  return v === undefined ? d : v;
};

const 出 = EJS.render(源, { getvar });
console.log('═══ 渲染结果（' + 出.length + ' 字符）═══');
console.log(出);

// 把新加的三组「.边界」并进「.什么时候变」，并精简变量列表里重复的 .意义
//   ★ 目标：MVU 8690 → ≤8000。信息一条不丢，只压格式。
const fs = require('fs');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');

const 根 = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-英雄坛说';
const p = 根 + '/世界书/变量/变量更新规则.yaml';
const o = YAML.parse(fs.readFileSync(p, 'utf8'));
const r = o.规则;

// ── ① 三组边界并进「什么时候变」──
const 并 = [
  ['主角.状态', '时/边界'],
  ['她.情绪', ''],
  ['她.熟练度', ''],
];
for (const [前缀] of 并) {
  const 变 = 前缀 + '.什么时候变', 边 = 前缀 + '.边界';
  if (r[变] !== undefined && r[边] !== undefined) {
    r[变] = String(r[变]).replace(/\s*$/, '') + '\n' + String(r[边]);
    delete r[边];
  }
}
// 熟练度的字段名对不上（它是 .什么时候变 / .边界）
if (r['她.熟练度.边界'] !== undefined && r['她.熟练度.什么时候变'] !== undefined) {
  r['她.熟练度.什么时候变'] = String(r['她.熟练度.什么时候变']).replace(/\s*$/, '') + '\n' + String(r['她.熟练度.边界']);
  delete r['她.熟练度.边界'];
}
fs.writeFileSync(p, YAML.stringify(o));
console.log('✅ 三组边界已并进「什么时候变」');

// ── ② 变量列表：把重复的句式压掉 ──
const q = 根 + '/世界书/变量/变量列表.yaml';
const o2 = YAML.parse(fs.readFileSync(q, 'utf8'));
const v = o2.变量 || {};
let 改 = 0;
for (const k of Object.keys(v)) {
  if (!k.endsWith('.意义')) continue;
  let s = String(v[k]);
  const 原 = s;
  s = s.replace(/^这是/, '').replace(/^它是/, '')
       .replace(/。它不掉，只涨$/, '，不掉只涨')
       .replace(/★ /g, '★')
       .replace(/^★/, '★');
  if (s !== 原) { v[k] = s; 改++; }
}
fs.writeFileSync(q, YAML.stringify(o2));
console.log('✅ 变量列表 .意义 压了 ' + 改 + ' 行');
console.log('   变量列表现在 ' + Object.keys(v).length + ' 行');

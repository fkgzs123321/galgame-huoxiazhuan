// 定位并修 initvar 里的 null（validate-mvu 报 expected string, received null）
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = path.join(__dirname, '..');
const F = path.join(D, '世界书/变量/initvar.yaml');
const o = YAML.parse(fs.readFileSync(F, 'utf8'));

const 空 = [];
(function walk(x, pre) {
  if (x === null) { 空.push(pre); return; }
  if (typeof x !== 'object' || Array.isArray(x)) return;
  for (const [k, v] of Object.entries(x)) walk(v, pre ? pre + '.' + k : k);
})(o, '');

console.log('initvar 里的 null：' + 空.length + ' 处');
空.forEach(x => console.log('   ' + x));

// 修：null → ''（schema 侧生成的是 z.string()，与 '' 匹配；用 null 会校验失败）
let n = 0;
(function fix(x) {
  for (const k of Object.keys(x)) {
    if (x[k] === null) { x[k] = ''; n++; }
    else if (x[k] && typeof x[k] === 'object' && !Array.isArray(x[k])) fix(x[k]);
  }
})(o);

if (n) {
  fs.writeFileSync(F, YAML.stringify(o, { lineWidth: 0 }));
  console.log('✅ 已把 ' + n + ' 处 null 改成空串');
} else console.log('无需修改');

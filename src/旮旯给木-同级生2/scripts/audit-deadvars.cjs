// 严格死变量检查（上一版太宽松：把「文本里提过这个词」也算落脚点）
// 一个变量算「有落脚点」，必须出现在下列之一：
//   A. EJS 的 getvar / setvar / incvar / decvar（含 stat_data. 前缀）
//   B. 前端 HTML 的 get('x.y') / set('x.y')
//   C. 变量列表.yaml（给 AI 的清单）
//   D. 变量更新规则.yaml（AI 的写点规则）
// 否则 = 死变量（审计铁律：有初值但无落脚点 → 删，或接线）
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = path.join(__dirname, '..');
const WB = path.join(D, '世界书');

const o = YAML.parse(fs.readFileSync(path.join(WB, '变量/initvar.yaml'), 'utf8'));
const 路径 = [];
(function walk(x, pre) { if (x === null || typeof x !== 'object' || Array.isArray(x)) return; for (const [k, v] of Object.entries(x)) { const p = pre ? pre + '.' + k : k; 路径.push(p); walk(v, p); } })(o, '');

// A. EJS
const ejs文本 = [];
(function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) w(p); else if (/\.(yaml|txt)$/.test(f)) ejs文本.push(fs.readFileSync(p, 'utf8')); } })(WB);
const A = ejs文本.join('\n');
// B. HTML
const B = fs.readdirSync(path.join(D, '正则')).filter(f => /\.html$/.test(f)).map(f => fs.readFileSync(path.join(D, '正则', f), 'utf8')).join('\n');
// C/D
const C = fs.readFileSync(path.join(WB, '变量/变量列表.yaml'), 'utf8');
const Dd = fs.readFileSync(path.join(WB, '变量/变量更新规则.yaml'), 'utf8');

const 有落脚 = (p) => {
  const 段 = p.split('.');
  const 末 = 段[段.length - 1];
  // 动态键（女角.<名>.* / 世界.关系封闭.*）不判
  if (/^(女角|世界\.关系封闭|局面\.当前选项)/.test(p)) return true;
  const 全 = A + '\n' + B + '\n' + C + '\n' + Dd;
  // 精确路径出现
  if (全.includes(p)) return true;
  // 末段 + 父段同时出现（如 getvar('stat_data.她.情绪') 里 情绪 单独出现也算）
  if (new RegExp('[\\.\u4e00-\u9fa5]' + 末 + '[\\.\\)\'"]').test(全)) return true;
  if (new RegExp('[\'"]' + 末 + '[\'"]').test(全)) return true;
  return false;
};

const 死 = 路径.filter(p => !有落脚(p) && p.split('.').length <= 3);
console.log('initvar 路径 ' + 路径.length + ' 条 → **严格死变量 ' + 死.length + ' 条**');
死.forEach(x => console.log('   ❌ ' + x));
if (!死.length) console.log('   ✅ 无死变量');

// 修正：开局选项要写进 开场白/initvar/N.yaml（不是开场白正文的 <UpdateVariable> 块）
//   ① 从 2.txt~9.txt 里剥掉我加的 <UpdateVariable> 块
//   ② 把这些变量写进 开场白/initvar/N.yaml
//   ③ state.first_messages 补上 开场白/9.txt
//   ④ state.initvar_overrides 补上 开场白/9.txt → 开场白/initvar/9.yaml
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';
const 开场 = path.join(D, '开场白');

let 处理 = 0;
for (const n of ['2', '3', '4', '5', '6', '7', '8', '9']) {
  const p = path.join(开场, n + '.txt');
  if (!fs.existsSync(p)) continue;
  let t = fs.readFileSync(p, 'utf8');
  const m = t.match(/\n*<UpdateVariable>[\s\S]*?<\/UpdateVariable>\s*$/);
  if (!m) { console.log('  （无变量块）' + n + '.txt'); continue; }

  /* ① 剥掉变量块 → 正文干净 */
  t = t.slice(0, m.index).replace(/\s*$/, '\n');
  fs.writeFileSync(p, t);

  /* ② 解析出变量，写进 initvar/N.yaml */
  const 块 = m[0];
  const 内 = (块.match(/<initvar>([\s\S]*?)<\/initvar>/) || [, ''])[1];
  const 新变量 = YAML.parse(内.trim() || '{}') || {};
  const ip = path.join(开场, 'initvar', n + '.yaml');
  const 旧变量 = fs.existsSync(ip) ? (YAML.parse(fs.readFileSync(ip, 'utf8')) || {}) : {};
  const 合 = { ...旧变量, ...新变量 };
  fs.writeFileSync(ip, YAML.stringify(合, { lineWidth: 0 }));
  处理++;
  console.log('  ✅ ' + n + '.txt 正文剥净（' + fs.statSync(p).size + ' 字节）｜ initvar/' + n + '.yaml 已合并局面.当前选项');
}

/* ③④ state 补 9.txt */
const sp = path.join(D, 'tavern-cards-state.json');
const S = JSON.parse(fs.readFileSync(sp, 'utf8'));
S.first_messages = S.first_messages || [];
if (!S.first_messages.includes('开场白/9.txt')) {
  S.first_messages.push('开场白/9.txt');
  console.log('  ✅ first_messages 补上 开场白/9.txt（现在 ' + S.first_messages.length + ' 条）');
}
S.initvar_overrides = S.initvar_overrides || {};
if (!S.initvar_overrides['开场白/9.txt']) {
  S.initvar_overrides['开场白/9.txt'] = '开场白/initvar/9.yaml';
  console.log('  ✅ initvar_overrides 补上 开场白/9.txt');
}
fs.writeFileSync(sp, JSON.stringify(S, null, 2));

console.log('\n共处理 ' + 处理 + ' 个开场白');
console.log('first_messages: ' + JSON.stringify(S.first_messages));
/* 抽查 */
const 查 = YAML.parse(fs.readFileSync(path.join(开场, 'initvar', '2.yaml'), 'utf8'));
console.log('initvar/2.yaml 里的 局面.当前选项 条数: ' + Object.keys((查.局面 || {}).当前选项 || {}).length);

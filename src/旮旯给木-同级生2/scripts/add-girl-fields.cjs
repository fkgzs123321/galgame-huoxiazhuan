// 给「女角」加 NSFW 字段 —— 结构照 src/旮旯给木-euphoria 的 世界.女角（同项目既有设计）
// euphoria 的结构：关系 / 开发度 / 身体记忆 / 胸{开发度,现状} / 阴部{开发度,现状,破瓜} / 后穴{开发度,现状}
// 本卡已有：好感度 / 关系阶段 / 状态 → 在其后追加 NSFW 那几项
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = path.join(__dirname, '..');

const p = path.join(D, '世界书/变量/initvar.yaml');
const 文 = fs.readFileSync(p, 'utf8');
const iv = YAML.parse(文);
const 女角 = iv.女角 || {};
const 名 = Object.keys(女角);
console.log('女角 ' + 名.length + ' 位：' + 名.join(' '));

let 改 = 0;
for (const n of 名) {
  const g = 女角[n] || {};
  if (g.开发度 === undefined) { g.开发度 = 0; 改++; }
  if (g.身体记忆 === undefined) g.身体记忆 = '';
  if (g.胸 === undefined) g.胸 = { 开发度: 0, 现状: '' };
  if (g.阴部 === undefined) g.阴部 = { 开发度: 0, 现状: '', 破瓜: false };
  if (g.后穴 === undefined) g.后穴 = { 开发度: 0, 现状: '' };
  if (g.已封死 === undefined) g.已封死 = '';
  女角[n] = g;
}
iv.女角 = 女角;
fs.writeFileSync(p, YAML.stringify(iv, { lineWidth: 0 }));
console.log('✅ initvar.yaml：给 ' + 名.length + ' 位女角加了 开发度/身体记忆/胸/阴部/后穴/已封死');
console.log('   （其中 ' + 改 + ' 位原本没有 开发度）');

// 复核
const iv2 = YAML.parse(fs.readFileSync(p, 'utf8'));
const n0 = Object.keys(iv2.女角)[0];
console.log('\n复核 ' + n0 + '：');
console.log(JSON.stringify(iv2.女角[n0], null, 1));

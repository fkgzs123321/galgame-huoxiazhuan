// test-schema-tolerance.cjs · 验证「变量写坏时只丢那个字段，不丢整块」
//   ★ 用户报的 bug 的回归测试。跑法: node scripts/test-schema-tolerance.cjs
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const z = require('zod').z || require('zod');
const _ = require('lodash');
const jiti = require('jiti')(__filename, { interopDefault: true });

const D = path.resolve(__dirname, '..');

// schema.ts 里 z 与 _ 由 forge 通过 jiti 全局注入 —— 这里手动补上
globalThis.z = z;
globalThis._ = _;

const { Schema } = jiti(path.join(D, 'schema.ts'));
const initvar = YAML.parse(fs.readFileSync(path.join(D, '世界书/变量/initvar.yaml'), 'utf8'));

let 错 = 0;
function 查(名, 输入, 断言) {
  let r;
  try { r = Schema.safeParse(输入); } catch (e) {
    console.log('  ✗ ' + 名 + '\n     抛异常: ' + e.message.slice(0, 100)); 错++; return;
  }
  const ok = r.success && 断言(r.data);
  console.log('  ' + (ok ? '✅' : '✗ ') + ' ' + 名);
  if (!ok) {
    错++;
    if (!r.success) console.log('     解析失败: ' + JSON.stringify(r.error.issues.slice(0, 3)));
    else console.log('     结果: ' + JSON.stringify(r.data.她) + ' 主角=' + JSON.stringify(r.data.主角));
  }
}

console.log('══ 回归：AI 把变量写坏了会怎样 ══');
console.log('（就是用户报的那 10 条 Zod 报错的场景）\n');

console.log('【1】原文那个报错：熟练度 写成数字');
查('熟练度: 3 → 落回「新手」，且同块的反抗值不被牵连',
  Object.assign({}, initvar, { 她: Object.assign({}, initvar.她, { 熟练度: 3, 反抗值: 77 }) }),
  (o) => o.她.熟练度 === '新手' && o.她.反抗值 === 77);

console.log('\n【2】情绪 写成数字（这个字段以前根本不在 schema 里）');
查('情绪: 1 → 落回「好奇」',
  Object.assign({}, initvar, { 她: Object.assign({}, initvar.她, { 情绪: 1 }) }),
  (o) => o.她.情绪 === '好奇');

console.log('\n【3】主角.状态 写坏');
查('主角.状态: 9 → 落回「在线」',
  Object.assign({}, initvar, { 主角: Object.assign({}, initvar.主角, { 状态: 9 }) }),
  (o) => o.主角.状态 === '在线');

console.log('\n【4】她.人设 写坏 + 同块别的字段正常');
查('人设: 123 → 落回空串，目的进度 56 照常保留',
  Object.assign({}, initvar, { 她: Object.assign({}, initvar.她, { 人设: 123, 目的进度: 56 }) }),
  (o) => o.她.人设 === '' && o.她.目的进度 === 56);

console.log('\n【5】数值越界（对照：数值本来就该夹紧）');
查('反抗值: 999 → 夹到 100',
  Object.assign({}, initvar, { 她: Object.assign({}, initvar.她, { 反抗值: 999 }) }),
  (o) => o.她.反抗值 === 100);

console.log('\n【6】原样的 initvar 必须干净通过（不能为了容错把正常数据也改了）');
查('未改动的 initvar → 全过',
  initvar,
  (o) => o.她.熟练度 === '新手' && o.她.情绪 === '好奇' && o.主角.状态 === '在线');

console.log('\n' + '─'.repeat(56));
console.log(错 ? '★ ' + 错 + ' 项没过' : '✅ 6/6 全过 —— 写坏一个字段不再丢整块，也不再整块失败');
process.exit(错 ? 1 : 0);

// test-schema-tolerance.mts · 验证「变量写坏时只丢那个字段，不丢整块」
//   ★ 这是用户报的那个 bug 的回归测试：
//     报错原文「期望 string，实际接收 数字 → at ["她"]["熟练度"]」
//   跑法: node_modules/.bin/tsx scripts/test-schema-tolerance.mts
import fs from 'node:fs';
import YAML from 'E:/Games/写卡/tavern_helper_template/node_modules/yaml';
// @ts-ignore  schema.ts 里 z 与 _ 由 forge 全局注入，这里手动喂
import { z } from 'zod';
import _ from 'lodash';
(globalThis as any).z = z;
(globalThis as any)._ = _;

const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-英雄坛说';
const { Schema } = await import(D + '/schema.ts');

const initvar = YAML.parse(fs.readFileSync(D + '/世界书/变量/initvar.yaml', 'utf8'));
let 错 = 0;
const 查 = (名: string, 输入: any, 断言: (out: any) => boolean) => {
  const r = Schema.safeParse(输入);
  const ok = r.success && 断言(r.data);
  console.log('  ' + (ok ? '✅' : '✗ ') + ' ' + 名);
  if (!ok) {
    错++;
    if (!r.success) console.log('     解析失败: ' + JSON.stringify(r.error.issues.slice(0, 3)));
    else console.log('     结果: ' + JSON.stringify(r.data.她));
  }
};

console.log('══ 回归：AI 把变量写坏了会怎样 ══\n');

console.log('【1】原文那个报错：熟练度 被写成数字');
查('熟练度: 3 → 落回「新手」，且「反抗值」不被牵连',
  { ...initvar, 她: { ...initvar.她, 熟练度: 3, 反抗值: 77 } },
  (o) => o.她.熟练度 === '新手' && o.她.反抗值 === 77);

console.log('\n【2】情绪 被写成数字（这个字段以前根本不在 schema 里）');
查('情绪: 1 → 落回「好奇」',
  { ...initvar, 她: { ...initvar.情绪 ? initvar.她 : initvar.她, 情绪: 1 } },
  (o) => o.她.情绪 === '好奇');

console.log('\n【3】主角.状态 被写坏');
查('主角.状态: 9 → 落回「在线」',
  { ...initvar, 主角: { ...initvar.主角, 状态: 9 } },
  (o) => o.主角.状态 === '在线');

console.log('\n【4】她.人设 被写坏 + 别的字段正常');
查('人设: 123 → 落回空串，目的进度照常保留',
  { ...initvar, 她: { ...initvar.她, 人设: 123, 目的进度: 56 } },
  (o) => o.她.人设 === '' && o.她.目的进度 === 56);

console.log('\n【5】数值越界（对照：数值本来就该夹紧）');
查('反抗值: 999 → 夹到 100',
  { ...initvar, 她: { ...initvar.她, 反抗值: 999 } },
  (o) => o.她.反抗值 === 100);

console.log('\n【6】原样的 initvar 必须干净通过');
查('未改动的 initvar → 全部通过',
  initvar,
  (o) => o.她.熟练度 === '新手' && o.她.情绪 === '好奇' && o.主角.状态 === '在线');

console.log('\n' + '─'.repeat(52));
console.log(错 ? '★ ' + 错 + ' 项没过' : '✅ 6/6 全过 —— 写坏一个字段不再丢整块，也不再整块失败');
process.exit(错 ? 1 : 0);

// 模拟: MagVarUpdate 原生格式 stat_data(值可能为 [值, 条件]) vs schema parse
import { z } from 'zod';
import _ from 'lodash';

// 复刻 schema.ts 的玩家字段写法
const 玩家 = z.object({
  学业总分: z.coerce.number().transform(v => _.clamp(v, 0, 750)).prefault(520),
  体力: z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(80),
  性欲: z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(30),
  勃起度: z.coerce.number().transform(v => _.clamp(v, 0, 100)).prefault(10),
});

const schema = z.object({ 玩家 });

console.log('=== 场景1: 纯值格式(MagVarUpdate 写入后) ===');
const r1 = schema.safeParse({ 玩家: { 体力: 80, 性欲: 30, 勃起度: 10, 学业总分: 520 } }, { reportInput: true });
console.log('success:', r1.success, r1.success ? JSON.stringify(r1.data.玩家) : z.prettifyError(r1.error));

console.log('\n=== 场景2: [值, 条件] 数组格式(MagVarUpdate 原生) ===');
const r2 = schema.safeParse({ 玩家: { 体力: [80, "体力0~100"], 性欲: [30, "性欲"], 勃起度: [10, "勃起"], 学业总分: [520, "学业"] } }, { reportInput: true });
console.log('success:', r2.success);
if (!r2.success) console.log('error:', z.prettifyError(r2.error).slice(0, 400));
else console.log('data:', JSON.stringify(r2.data.玩家));

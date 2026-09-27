// 验证 schema.ts 编译 + 副API配置字段
import { z } from 'zod';
import _ from 'lodash';
(globalThis as any).z = z;
(globalThis as any)._ = _;
const { Schema } = await import('./src/欲望都市/schema.ts');
const r = Schema.safeParse({ 玩家: { 副API配置: { mode: 'custom', url: 'http://x' } } }, { reportInput: true });
console.log('副API配置 looseObject 解析:', r.success ? '✓' : z.prettifyError(r.error as any));
// 数组兼容复查
const r2 = Schema.safeParse({ 玩家: { 体力: [66, '条件'], 性欲: [33, '条件'] } }, { reportInput: true });
console.log('数组兼容:', r2.success ? '✓' : '✗');
if (r2.success) console.log('  体力:', (r2.data as any).玩家.体力, '性欲:', (r2.data as any).玩家.性欲);

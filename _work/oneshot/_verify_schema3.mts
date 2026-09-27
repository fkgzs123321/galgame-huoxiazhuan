import { z } from 'zod';
import _ from 'lodash';
(globalThis as any).z = z; (globalThis as any)._ = _;
const { Schema } = await import('./src/欲望都市/schema.ts');
const r = Schema.safeParse({}, { reportInput: true });
console.log('空对象(全prefault):', r.success ? '✓' : z.prettifyError((r as any).error));
if (r.success) {
  const d: any = r.data;
  console.log('  玩家.学业总分:', d.玩家.学业总分, '| 副API配置字段存在:', '副API配置' in d.玩家);
  const r2 = Schema.safeParse({ 玩家: { 副API配置: { mode: 'custom', url: 'x', key: 'k' } } });
  console.log('  带副API配置:', r2.success ? '✓ 保留 ' + JSON.stringify((r2.data as any).玩家.副API配置) : '✗');
  const r3 = Schema.safeParse({ 玩家: { 体力: [66, '条件'] } });
  console.log('  体力数组[66]:', r3.success ? '✓ ' + (r3.data as any).玩家.体力 : '✗');
}

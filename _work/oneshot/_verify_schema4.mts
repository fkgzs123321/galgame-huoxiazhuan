import { z } from 'zod';
import _ from 'lodash';
import YAML from 'yaml';
import fs from 'fs';
(globalThis as any).z = z; (globalThis as any)._ = _;
const { Schema } = await import('./src/欲望都市/schema.ts');
// 加载 initvar 完整数据
const raw = YAML.parse(fs.readFileSync('src/欲望都市/世界书/变量/initvar.yaml', 'utf8'));
raw.玩家.副API配置 = { mode: 'custom', url: 'http://x', key: 'k', on: true };
const r = Schema.safeParse(raw, { reportInput: true });
console.log('initvar+副API配置 解析:', r.success ? '✓' : '✗ ' + z.prettifyError((r as any).error).slice(0, 200));
if (r.success) {
  const d: any = r.data;
  console.log('  学业总分:', d.玩家.学业总分);
  console.log('  副API配置保留:', JSON.stringify(d.玩家.副API配置));
  console.log('  女性角色数:', Object.keys(d.女性角色).length);
  console.log('  丽莎.名器防御:', d.女性角色['丽莎·伊万诺娃']?.名器防御);
  // 数组兼容(模拟 MagVarUpdate)
  const r2 = Schema.safeParse({ ...raw, 玩家: { ...raw.玩家, 体力: [55, '条件'] } });
  console.log('  体力数组[55]:', r2.success ? '✓ ' + (r2.data as any).玩家.体力 : '✗');
}

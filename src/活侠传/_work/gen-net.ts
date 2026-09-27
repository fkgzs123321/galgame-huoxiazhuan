/**
 * 用引擎生成 initvar 的 关系网 段。
 *
 * ★ 为什么不手写：键必须按字典序拼成「甲|乙」，
 *   手写只要有一对写反，同一段关系就会存成两条（一条查得到一条查不到）。
 *   让引擎自己建，键就不可能错。
 *
 * 运行：node --import tsx src/活侠传/_work/gen-net.ts
 */
import { 开局关系网, } from '../脚本/关系';
import lib from '../脚本/引擎.esm';

const L = lib as any;

// 用引擎建一遍，取它给出的键
const 网: Record<string, any> = {};
for (const [a, b, 类型, 强度, 双向] of 开局关系网) {
  const r = L.建关系(网, a, b, 类型, 强度, 双向);
  if (!r?.可以) console.error('建失败:', a, b, r);
}

// 体检
const 检 = L.查网(网);
if (检.有没有错) {
  console.error('★ 网有问题:', JSON.stringify(检.错, null, 2));
  process.exit(1);
}
console.log(`引擎建了 ${检.共几对} 对，自检通过`);

// 输出缩进好的 YAML 片段（6 空格缩进，作为 关系网: 的子项）
const 行: string[] = ['关系网:'];
for (const k of Object.keys(网)) {
  const 条 = 网[k];
  行.push(`  ${JSON.stringify(k)}:`);
  行.push(`    甲: ${条.甲}`);
  行.push(`    乙: ${条.乙}`);
  行.push(`    类型: ${条.类型}`);
  行.push(`    强度: ${条.强度}`);
  行.push(`    双向: ${条.双向 ? 'true' : 'false'}`);
  行.push(`    曾经: ''`);
}

const 文本 = 行.join('\n');
console.log('\n' + '─'.repeat(50));
console.log(文本);

// 写盘供下一步拼接
import fs from 'node:fs';
fs.writeFileSync('src/活侠传/_work/_net.yaml', 文本 + '\n');
console.log('\n已写入 _work/_net.yaml');

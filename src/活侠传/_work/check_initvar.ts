/**
 * 校验 initvar.yaml —— 用项目自带的 yaml 包（Python 没装 PyYAML）。
 *
 * 检查项：
 *   ① YAML 能解析
 *   ② 关系网的键都按字典序排列（写反 → 同一对存两份）
 *   ③ 关键段还在（关系 / 前置 / 战斗 / 世界.随机种子）
 */
import fs from 'node:fs';
import YAML from 'yaml';

const P = 'src/活侠传/世界书/变量/initvar.yaml';
const 文本 = fs.readFileSync(P, 'utf8');

let d;
try {
  d = YAML.parse(文本);
} catch (e) {
  console.error('✗ YAML 解析失败:', e.message);
  process.exit(1);
}
console.log('✓ YAML 解析通过');

// ② 键排序
const 网 = d.关系网 ?? {};
const 坏 = [];
for (const [k, v] of Object.entries(网)) {
  const want = [v.甲, v.乙].sort().join('|');
  if (k !== want) 坏.push({ 键: k, 应为: want });
}
console.log(`  关系网: ${Object.keys(网).length} 对`);
console.log(`  键排序: ${坏.length ? '✗ ' + JSON.stringify(坏) : '✓ 全部正确'}`);

// ③ 关键段
const 检查 = [
  ['世界.随机种子', d.世界?.随机种子],
  ['关系（玩家↔NPC）', d.关系 ? Object.keys(d.关系).length + ' 人' : null],
  ['关系网（NPC↔NPC）', d.关系网 ? Object.keys(d.关系网).length + ' 对' : null],
  ['前置', d.前置 ? '有' : null],
  ['任务', d.任务 ? '有' : null],
  ['战斗', d.战斗 ? '有' : null],
  ['你', d.你 ? '有' : null],
  ['天赋', d.天赋 ? '有' : null],
  ['秘籍', d.秘籍 ? '有' : null],
  ['物品', d.物品 ? '有' : null],
  ['装备', d.装备 ? '有' : null],
];
console.log('\n  关键段：');
let 缺 = 0;
for (const [名, 值] of 检查) {
  const ok = 值 !== null && 值 !== undefined && 值 !== '';
  if (!ok) 缺++;
  console.log(`    ${ok ? '✓' : '✗'} ${名.padEnd(20)} ${值 ?? '(缺)'}`);
}

if (坏.length || 缺) process.exit(1);
console.log('\n全部通过');

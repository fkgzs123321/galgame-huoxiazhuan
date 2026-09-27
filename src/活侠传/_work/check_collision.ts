/**
 * 关键词碰撞检查 —— 必做。
 *
 * ★ 风险：511 条用关键词触发，如果「唐中翎」同时是几十条事件的 key，
 *   那剧情里一提掌门，就会一次注入几十条条目 → 上下文被撑爆。
 *
 * ★ 检查什么：
 *   ① 每个关键词命中多少条 → 高频词是危险信号
 *   ② 模拟「提到某角色」时会注入的总字符数
 */
import fs from 'node:fs';

const 索引 = JSON.parse(
  fs.readFileSync('src/活侠传/_work/_wb_generated/_index.json', 'utf8'),
);

// 收集「关键词 → 条目列表」
const 词到条 = new Map<string, { 类: string; 名: string; 长度: number }[]>();
let 总条 = 0;
let 总字符 = 0;

for (const [类, 条目s] of Object.entries(索引) as [string, any][]) {
  for (const [名, v] of Object.entries(条目s) as [string, any][]) {
    总条++;
    总字符 += v.content.length;
    for (const k of v.keywords) {
      if (!词到条.has(k)) 词到条.set(k, []);
      词到条.get(k)!.push({ 类, 名, 长度: v.content.length });
    }
  }
}

console.log('══ 规模 ══');
console.log(`  ${总条} 条，共 ${(总字符 / 10000).toFixed(1)} 万字符`);
console.log(`  平均每条 ${Math.round(总字符 / 总条)} 字符`);
console.log(`  不同关键词 ${词到条.size} 个`);

console.log('\n══ ★ 高频关键词（危险：一提就注入一堆）══');
const 排序 = [...词到条].sort((a, b) => b[1].length - a[1].length);
for (const [词, 条s] of 排序.slice(0, 20)) {
  const 字 = 条s.reduce((s, x) => s + x.长度, 0);
  console.log(`  ${词.padEnd(8)} ${String(条s.length).padStart(3)} 条  ${String(字).padStart(6)} 字符` +
    `  ${条s.length > 15 ? '★ 危险' : ''}`);
}

console.log('\n══ ★ 模拟：提到某个名字时会注入多少 ══');
const 测试词 = ['唐中翎', '唐布衣', '唐铮', '唐升', '唐惟元', '唐默铃', '叶云裳', '叶云舟', '偷懒怪', '崆峒', '青城'];
for (const 词 of 测试词) {
  const 条s = 词到条.get(词) ?? [];
  const 字 = 条s.reduce((s, x) => s + x.长度, 0);
  const 警 = 字 > 8000 ? ' ★ 太大' : 字 > 4000 ? ' ⚠ 偏大' : '';
  console.log(`  ${词.padEnd(8)} ${String(条s.length).padStart(3)} 条  ${String(字).padStart(6)} 字符${警}`);
}

console.log('\n══ 安全线 ══');
console.log('  单次注入 4000 字符以内 = 舒适');
console.log('  单次注入 8000 字符以上 = 会明显挤占上下文');

// 建议
const 危险 = 排序.filter(([, s]) => s.length > 15);
if (危险.length) {
  console.log(`\n★ ${危险.length} 个关键词命中超过 15 条，建议从「关键词」里去掉：`);
  console.log('  ' + 危险.slice(0, 14).map(([w, s]) => `${w}(${s.length})`).join('、'));
}

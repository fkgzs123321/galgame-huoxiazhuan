/**
 * 探查：为什么 30 个种子里对手都没出绝招？
 * 以及 LCG 前几个输出的分布。
 */
import { 造随机 } from '../脚本/战斗结算';

console.log();
console.log('══ ★ 相邻种子是否还近似（这是修过的 bug）══');
const 首值: number[] = [];
for (let i = 0; i < 30; i++) {
  const r = 造随机(1000 + i);
  首值.push(r.next());
}
console.log('  ' + 首值.map(v => v.toFixed(3)).join(' '));
const 跨度 = Math.max(...首值) - Math.min(...首值);
console.log(`  跨度 ${跨度.toFixed(3)}  < 0.5 的有 ${首值.filter(v => v < 0.5).length}/30`);
console.log('  判定:', 跨度 > 0.3 ? '✓ 已散开' : '✗ 仍然聚集');

console.log();
console.log('══ 不同种子的首值 ══');
for (const s of [1, 2, 3, 100, 1000, 5000, 777, 20260927]) {
  const r = 造随机(s);
  console.log(`  seed ${String(s).padStart(9)} → ${r.next().toFixed(4)}`);
}

console.log();
console.log('══ LCG 参数 ══');
// 复现造随机的公式
function lcg(seed: number, n: number) {
  let s = (Math.floor(seed) || 1) >>> 0;
  const A = 1664525;
  const C = 1013904223;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    s = (Math.imul(A, s) + C) >>> 0;
    out.push(s / 4294967296);
  }
  return out;
}
const 序 = lcg(1000, 8);
console.log('  seed 1000 前 8 个:', 序.map(v => v.toFixed(4)).join(' '));
const 序2 = lcg(20260927, 8);
console.log('  seed 默认 前 8 个:', 序2.map(v => v.toFixed(4)).join(' '));

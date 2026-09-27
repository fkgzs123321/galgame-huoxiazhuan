// 按 E3 形式搜参数，把三档拉到目标曲线
const lcg = s => { let x = (Math.imul(s, 1664525) + 1013904223) % 4294967296; if (x < 0) x += 4294967296; return x; };
const rollAt = (b) => (lcg(b) % 100000) / 1000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const 三轮权 = { 识破: [3, 1, 1], 拦住: [1, 3, 1], 扛住: [1, 1, 3], 全场: [1, 1, 1] };
const 她项 = { 识破: '勇气', 拦住: '痴迷', 扛住: '兴奋', 全场: null };
const 阶段修正 = { 1: 0, 2: 4, 3: 9, 4: 15, 5: 24 };
const 期点 = {
  开局: { 他: { 观察: 10, 技能: 10, 意志: 15, 理智: 90, 警觉: 0, 后门: 0 }, 她: { 勇气: 50, 痴迷: 0, 兴奋: 0, 阶段: 1 } },
  中期: { 他: { 观察: 40, 技能: 40, 意志: 40, 理智: 70, 警觉: 30, 后门: 60 }, 她: { 勇气: 70, 痴迷: 50, 兴奋: 40, 阶段: 3 } },
  后期: { 他: { 观察: 80, 技能: 80, 意志: 80, 理智: 50, 警觉: 60, 后门: 100 }, 她: { 勇气: 100, 痴迷: 90, 兴奋: 70, 阶段: 5 } },
};
const 基 = []; for (let d = 1; d <= 17; d++) for (let h = 0; h < 12; h++) 基.push(d * 1000000 + h * 10000 + 10);

function 算S(x, 等, 主, 难, 乘表, 基表, 权) {
  const w = 三轮权[主];
  const P1 = (x.他.观察 * 3 + x.他.理智 * 1 + x.他.警觉 * 1) / 5;
  const P2 = x.他.技能;
  const P3 = (x.他.意志 * 3 + x.他.后门 * 1) / 4;
  const P = (P1 * w[0] + P2 * w[1] + P3 * w[2]) / (w[0] + w[1] + w[2]);
  const 强度 = 她项[主] ? x.她[她项[主]] : (x.她.勇气 + x.她.痴迷 + x.她.兴奋) / 3;
  const R = clamp(基表[等] * 乘表[难] * (1 + 强度 / 100 * 权) + 阶段修正[x.她.阶段], 0, 100);
  return clamp(50 + P - R, 5, 95);
}
function 率(x, 等, 主, 难, 乘表, 基表, 权) {
  const S = 算S(x, 等, 主, 难, 乘表, 基表, 权);
  let ok = 0; for (const b of 基) if (rollAt(b) < S) ok++;
  return ok / 基.length * 100;
}

const 目标 = { 普通: [60, 75, 90], 困难: [35, 52, 73], 地狱: [15, 15, 25] };
let best = null;
for (let lo = 15; lo <= 45; lo += 3)
  for (let hi = 55; hi <= 95; hi += 5)
    for (let 权 = 0.15; 权 <= 0.60; 权 += 0.05)
      for (let m0 = 0.55; m0 <= 0.95; m0 += 0.05)
        for (let m2 = 1.05; m2 <= 1.45; m2 += 0.05) {
          const 基表 = { 微: lo, 中: Math.round((lo + hi) / 2), 强: Math.round(hi * 0.82), 极: hi };
          const 乘表 = { 普通: m0, 困难: (m0 + m2) / 2, 地狱: m2 };
          let err = 0; const 结果 = {};
          for (const [难, tg] of Object.entries(目标)) {
            const a = 率(期点.开局, '中', '拦住', 难, 乘表, 基表, 权);
            const b2 = 率(期点.中期, '中', '拦住', 难, 乘表, 基表, 权);
            const c = 率(期点.后期, '中', '拦住', 难, 乘表, 基表, 权);
            结果[难] = [a, b2, c];
            err += Math.abs(a - tg[0]) + Math.abs(b2 - tg[1]) + Math.abs(c - tg[2]);
            if (b2 < a - 4 || b2 > 95 || a > 95) err += 30;
          }
          if (!best || err < best.err) best = { lo, hi, 权: +权.toFixed(2), 乘表, 基表, 结果, err };
        }

console.log('══ 最优参数 ══');
console.log('  基础要求 = ' + JSON.stringify(best.基表));
console.log('  难度乘   = ' + JSON.stringify(Object.fromEntries(Object.entries(best.乘表).map(([k, v]) => [k, +v.toFixed(2)]))));
console.log('  她强度权重 = ' + best.权 + '　　误差 = ' + best.err.toFixed(1));
console.log('');
console.log('难度    开局(目标)        中期(目标)        后期(目标)');
for (const [难, r] of Object.entries(best.结果)) {
  const tg = 目标[难];
  console.log('  ' + 难.padEnd(4) + r[0].toFixed(1).padStart(5) + '%(' + String(tg[0]).padStart(2) + ')      ' + r[1].toFixed(1).padStart(5) + '%(' + String(tg[1]).padStart(2) + ')      ' + r[2].toFixed(1).padStart(5) + '%(' + String(tg[2]).padStart(2) + ')');
}

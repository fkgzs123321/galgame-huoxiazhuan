// 按"三档各自缩放 基础/阶修/她强"的结构搜参数
const lcg = s => { let x = (Math.imul(s, 1664525) + 1013904223) % 4294967296; if (x < 0) x += 4294967296; return x; };
const rollAt = b => (lcg(b) % 100000) / 1000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const 三轮权 = { 识破: [3, 1, 1], 拦住: [1, 3, 1], 扛住: [1, 1, 3], 全场: [1, 1, 1] };
const 她项 = { 识破: '勇气', 拦住: '痴迷', 扛住: '兴奋', 全场: null };
const 阶底 = { 1: 0, 2: 4, 3: 9, 4: 15, 5: 24 };
const 期 = {
  开局: { 他: { 观察: 10, 技能: 10, 意志: 15, 理智: 90, 警觉: 0, 后门: 0 }, 她: { 勇气: 50, 痴迷: 0, 兴奋: 0, 阶段: 1 } },
  中期: { 他: { 观察: 40, 技能: 40, 意志: 40, 理智: 70, 警觉: 30, 后门: 60 }, 她: { 勇气: 70, 痴迷: 50, 兴奋: 40, 阶段: 3 } },
  后期: { 他: { 观察: 80, 技能: 80, 意志: 80, 理智: 50, 警觉: 60, 后门: 100 }, 她: { 勇气: 100, 痴迷: 90, 兴奋: 70, 阶段: 5 } },
};
const 基 = []; for (let d = 1; d <= 17; d++) for (let h = 0; h < 12; h++) 基.push(d * 1000000 + h * 10000 + 10);

function 算S(x, 等, 主, P档, 基础要求) {
  const w = 三轮权[主];
  const P1 = (x.他.观察 * 3 + x.他.理智 * 1 + x.他.警觉 * 1) / 5;
  const P2 = x.他.技能;
  const P3 = (x.他.意志 * 3 + x.他.后门 * 1) / 4;
  const P = (P1 * w[0] + P2 * w[1] + P3 * w[2]) / (w[0] + w[1] + w[2]);
  const k = 她项[主];
  const 强度 = k ? x.她[k] : (x.她.勇气 + x.她.痴迷 + x.她.兴奋) / 3;
  const R = clamp(基础要求[等] * P档.基 * (1 + 强度 / 100 * P档.强) + 阶底[x.她.阶段] * P档.阶, 0, 100);
  return clamp(50 + P - R, 5, 95);
}
function 率(x, 等, 主, P档, 基础要求) {
  const S = 算S(x, 等, 主, P档, 基础要求);
  let ok = 0; for (const b of 基) if (rollAt(b) < S) ok++;
  return ok / 基.length * 100;
}
const 目标 = { 普通: [60, 75, 90], 困难: [35, 52, 73], 地狱: [15, 15, 25] };

// 搜：基础要求（微/极）+ 三档的 {基,阶,强}
let best = null;
for (let 微 = 10; 微 <= 40; 微 += 3)
  for (let 极 = 50; 极 <= 100; 极 += 5) {
    const 基础要求 = { 微: 微, 中: Math.round((微 + 极) / 2), 强: Math.round(极 * 0.82), 极: 极 };
    // 三档独立搜会更慢 → 用"档位插值"：普通在低端、地狱在高端
    for (let b0 = 0.40; b0 <= 0.90; b0 += 0.05) for (let b2 = 1.10; b2 <= 1.70; b2 += 0.05)
      for (let j0 = 0.20; j0 <= 0.70; j0 += 0.05) for (let j2 = 1.60; j2 <= 3.00; j2 += 0.10)
        for (let q0 = 0.30; q0 <= 0.80; q0 += 0.05) for (let q2 = 1.20; q2 <= 2.00; q2 += 0.10) {
          const P档 = {
            普通: { 基: b0, 阶: j0, 强: q0 },
            困难: { 基: (b0 + b2) / 2, 阶: (j0 + j2) / 2, 强: (q0 + q2) / 2 },
            地狱: { 基: b2, 阶: j2, 强: q2 },
          };
          let err = 0; const 结果 = {};
          for (const [难, tg] of Object.entries(目标)) {
            const a = 率(期.开局, '中', '拦住', P档[难], 基础要求);
            const m = 率(期.中期, '中', '拦住', P档[难], 基础要求);
            const c = 率(期.后期, '中', '拦住', P档[难], 基础要求);
            结果[难] = [a, m, c];
            err += Math.abs(a - tg[0]) + Math.abs(m - tg[1]) + Math.abs(c - tg[2]);
            if (m < a - 5) err += 25;          // 中期不该低于开局
          }
          if (!best || err < best.err) best = { 基础要求, P档, 结果, err };
        }
  }

console.log('══ 最优参数 ══');
console.log('  基础要求 = ' + JSON.stringify(best.基础要求));
console.log('  三档系数（基=难度乘 ／ 阶=阶段修正缩放 ／ 强=她的强度缩放）：');
for (const [k, v] of Object.entries(best.P档)) console.log('    ' + k + '：基 ' + v.基.toFixed(2) + '　阶 ' + v.阶.toFixed(2) + '　强 ' + v.强.toFixed(2));
console.log('  误差 = ' + best.err.toFixed(1));
console.log('');
console.log('难度    开局(目标)        中期(目标)        后期(目标)');
for (const [难, r] of Object.entries(best.结果)) {
  const tg = 目标[难];
  console.log('  ' + 难.padEnd(4) + r[0].toFixed(1).padStart(5) + '%(' + String(tg[0]).padStart(2) + ')      ' + r[1].toFixed(1).padStart(5) + '%(' + String(tg[1]).padStart(2) + ')      ' + r[2].toFixed(1).padStart(5) + '%(' + String(tg[2]).padStart(2) + ')');
}

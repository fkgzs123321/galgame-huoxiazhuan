// 按 引擎模板 判定引擎 E3 重写欲妈群的判定，并算三档曲线验证
// D = P − R；S = clamp(50+D, 5, 95)；V = LCG×100，V<S 成功；档位 = judgeTier(D, 成败)
const lcg = s => { let x = (Math.imul(s, 1664525) + 1013904223) % 4294967296; if (x < 0) x += 4294967296; return x; };
const rollAt = (b, k) => (lcg(b + k * 7919) % 100000) / 1000;   // 0~99.999
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function judgeTier(D, ok) {
  if (ok) { if (D >= 30) return '大成功'; if (D >= 10) return '成功'; return '勉强成功'; }
  if (D <= -30) return '大失败';
  return '失败';
}
const 成功侧 = t => t === '大成功' || t === '成功' || t === '勉强成功';

// ── 契参数（全部可调，不写死在逻辑里）
const 难度乘 = { 普通: 0.85, 困难: 1.00, 地狱: 1.15 };
const 基础要求 = { 微: 30, 中: 45, 强: 60, 极: 75 };
const 她的强度权重 = 0.45;          // R = 基础要求 × 难度乘 × (1 + 她强度/100 × 0.45)
const 阶段修正 = { 1: 0, 2: 4, 3: 9, 4: 15, 5: 24 };
// 主对 → 三轮权重（他这一下主要看哪一轮）
const 三轮权 = { 识破: [3, 1, 1], 拦住: [1, 3, 1], 扛住: [1, 1, 3], 全场: [1, 1, 1] };
// 主对 → 取她的哪一项当对手
const 她项 = { 识破: '勇气', 拦住: '痴迷', 扛住: '兴奋', 全场: null };

function 算(他, 她, 等, 主, 难度, seed) {
  const w = 三轮权[主];
  const P1 = (他.观察 * 3 + 他.理智 * 1 + 他.警觉 * 1) / 5;
  const P2 = 他.技能;
  const P3 = (他.意志 * 3 + 他.后门 * 1) / 4;
  const P = (P1 * w[0] + P2 * w[1] + P3 * w[2]) / (w[0] + w[1] + w[2]);
  const 强度 = 她项[主] ? 她[她项[主]] : (她.勇气 + 她.痴迷 + 她.兴奋) / 3;
  const R = clamp(基础要求[等] * 难度乘[难度] * (1 + 强度 / 100 * 她的强度权重) + 阶段修正[她.阶段], 0, 100);
  const D = P - R;
  const S = clamp(50 + D, 5, 95);
  const V = rollAt(seed, 1);
  const ok = V < S;
  return { P, R, D, S, V, tier: judgeTier(D, ok), ok };
}

// ── 三期（按真实成长轨迹取的三个时点）
const 期 = {
  开局: { 他: { 观察: 10, 技能: 10, 意志: 15, 理智: 90, 警觉: 0, 后门: 0 }, 她: { 勇气: 50, 痴迷: 0, 兴奋: 0, 阶段: 1 } },
  中期: { 他: { 观察: 40, 技能: 40, 意志: 40, 理智: 70, 警觉: 30, 后门: 60 }, 她: { 勇气: 70, 痴迷: 50, 兴奋: 40, 阶段: 3 } },
  后期: { 他: { 观察: 80, 技能: 80, 意志: 80, 理智: 50, 警觉: 60, 后门: 100 }, 她: { 勇气: 100, 痴迷: 90, 兴奋: 70, 阶段: 5 } },
};
const 基 = []; for (let d = 1; d <= 17; d++) for (let h = 0; h < 12; h++) 基.push(d * 1000000 + h * 10000 + 10);

console.log('══ E3 形式下的三档曲线（中等选项 · 主对=拦住）══\n');
for (const 难 of ['普通', '困难', '地狱']) {
  const out = [];
  for (const [名, x] of Object.entries(期)) {
    let ok = 0; const c = {};
    for (const b of 基) { const r = 算(x.他, x.她, '中', '拦住', 难, b); if (r.ok) ok++; c[r.tier] = (c[r.tier] || 0) + 1; }
    const t = 基.length;
    out.push({ 率: ok / t * 100, 大成功: (c['大成功'] || 0) / t * 100 });
    if (名 === '开局' || 名 === '后期') {
      const r0 = 算(x.他, x.她, '中', '拦住', 难, 基[0]);
      console.log('  ' + 难 + ' · ' + 名 + '：P=' + r0.P.toFixed(0) + ' R=' + r0.R.toFixed(0) + ' D=' + r0.D.toFixed(0) + ' S=' + r0.S.toFixed(0) + '%');
    }
  }
  console.log('  → ' + 难 + '：开局 ' + out[0].率.toFixed(1) + '%　中期 ' + out[1].率.toFixed(1) + '%　后期 ' + out[2].率.toFixed(1) + '%');
  console.log('');
}

console.log('══ 技能成长对成功率的影响（困难 · 中期她 · 主对=拦住）══');
for (const 技 of [10, 25, 40, 55, 70, 100]) {
  const x = JSON.parse(JSON.stringify(期.中期)); x.他.技能 = 技;
  let ok = 0; for (const b of 基) if (算(x.他, x.她, '中', '拦住', '困难', b).ok) ok++;
  console.log('  技能 ' + String(技).padStart(3) + ' → ' + (ok / 基.length * 100).toFixed(1) + '%');
}
console.log('\n══ 她的阶段对成功率的影响（困难 · 中期双方 · 主对=拦住）══');
for (const 阶 of [1, 2, 3, 4, 5]) {
  const x = JSON.parse(JSON.stringify(期.中期)); x.她.阶段 = 阶;
  let ok = 0; for (const b of 基) if (算(x.他, x.她, '中', '拦住', '困难', b).ok) ok++;
  console.log('  阶段 ' + 阶 + ' → ' + (ok / 基.length * 100).toFixed(1) + '%');
}

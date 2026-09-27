// 终版聚合：综合 = grade(round((v1 + 2·v2 + v3) / 4))，不加额外规则
// 重搜三档参数，目标：普通 60/75/90 ｜ 困难 35/65/95 ｜ 地狱 15/15/20
const lcg = s => { let x = (Math.imul(s, 1103515245) + 12345) % 2147483648; if (x < 0) x += 2147483648; return x; };
const mix32 = x => { x = Math.imul(x ^ (x >>> 16), 2246822507); x = Math.imul(x ^ (x >>> 13), 3266489909); return (x ^ (x >>> 16)) >>> 0; };
const rollAt = (b, k) => (mix32(lcg(b) + k * 7919) % 20) + 1;
const O = ['大失败', '失败', '部分', '成功', '大成功'];
const grade = t => t <= 5 ? O[0] : t <= 10 ? O[1] : t <= 15 ? O[2] : t <= 19 ? O[3] : O[4];
const 期 = {
  开局: { 他: { 观察: 10, 技: 10, 意志: 15 }, 她: { 勇气: 50, 痴迷: 0, 兴奋: 0 } },
  中期: { 他: { 观察: 30, 技: 30, 意志: 40 }, 她: { 勇气: 70, 痴迷: 50, 兴奋: 40 } },
  后期: { 他: { 观察: 60, 技: 60, 意志: 60 }, 她: { 勇气: 100, 痴迷: 90, 兴奋: 70 } },
};
const 基 = []; for (let d = 1; d <= 17; d++) for (let h = 0; h < 12; h++) 基.push(d * 1000000 + h * 10000 + 10);

function 分布(x, P) {
  const m = [
    Math.round((x.她.勇气 * P.hk - x.他.观察 * P.gw) / 12) + P.D,
    Math.round((x.他.技 * P.gw - 10 * P.dk) / 4) + Math.round(x.她.痴迷 * P.hk / 20) + P.D,
    Math.round((x.她.兴奋 * P.hk - x.他.意志 * P.gw) / 12) + P.D,
  ];
  const c = {};
  for (const b of 基) {
    const v = [1, 2, 3].map(k => rollAt(b, k) + m[k - 1]);
    const z = grade(Math.round((v[0] + 2 * v[1] + v[2]) / 4));
    c[z] = (c[z] || 0) + 1;
  }
  const t = 基.length, p = k => (c[k] || 0) / t * 100;
  return { m, p, 不失败: p(O[4]) + p(O[3]) + p(O[2]), 大成功: p(O[4]), 大失败: p(O[0]) };
}

const 目标 = {
  普通: { 开局: 60, 中期: 75, 后期: 90 },
  困难: { 开局: 35, 中期: 65, 后期: 95 },
  地狱: { 开局: 15, 中期: 15, 后期: 20 },
};
const 范围 = {
  普通: { dk: [0.6, 1.1], D: [-2, 8], gw: [0.3, 1.2], hk: [0.4, 1.0] },
  困难: { dk: [0.9, 1.5], D: [-6, 4], gw: [0.3, 1.2], hk: [0.9, 1.5] },
  地狱: { dk: [1.0, 1.8], D: [-14, -2], gw: [0.1, 0.9], hk: [1.1, 1.8] },
};

const 结果 = {};
for (const [难, tg] of Object.entries(目标)) {
  const R = 范围[难]; let best = null;
  for (let dk = R.dk[0]; dk <= R.dk[1] + 1e-9; dk += 0.05)
    for (let D = R.D[0]; D <= R.D[1]; D += 1)
      for (let gw = R.gw[0]; gw <= R.gw[1] + 1e-9; gw += 0.1)
        for (let hk = R.hk[0]; hk <= R.hk[1] + 1e-9; hk += 0.1) {
          const P = { dk: +dk.toFixed(2), D, gw: +gw.toFixed(1), hk: +hk.toFixed(1) };
          const a = 分布(期.开局, P), m = 分布(期.中期, P), c = 分布(期.后期, P);
          // 惩罚：曲线不单调、大成功或大失败超过 30%
          let err = Math.abs(a.不失败 - tg.开局) + Math.abs(m.不失败 - tg.中期) + Math.abs(c.不失败 - tg.后期);
          if (m.不失败 < a.不失败 - 3 || m.不失败 > c.不失败 + 3) err += 40;
          if (c.大成功 > 35 || a.大失败 > 40) err += 25;
          if (!best || err < best.err) best = { ...P, a, m, c, err };
        }
  结果[难] = best;
}

console.log('══ 终版参数（聚合 = 加权 (v1+2·v2+v3)/4 → 直接判档）══\n');
for (const [难, r] of Object.entries(结果)) {
  const t = 目标[难];
  console.log(难 + '  dk=' + r.dk + '  D=' + String(r.D).padStart(3) + '  gw=' + r.gw + '  hk=' + r.hk + '   误差 ' + r.err.toFixed(1));
  console.log('   开局 ' + r.a.不失败.toFixed(1) + '%（目标 ' + t.开局 + '）  中期 ' + r.m.不失败.toFixed(1) + '%（目标 ' + t.中期 + '）  后期 ' + r.c.不失败.toFixed(1) + '%（目标 ' + t.后期 + '）');
  console.log('   后期明细：大失败 ' + r.c.大失败.toFixed(1) + '% ｜ 部分 ' + r.c.p(O[2]).toFixed(1) + '% ｜ 成功 ' + r.c.p(O[3]).toFixed(1) + '% ｜ 大成功 ' + r.c.大成功.toFixed(1) + '%');
}
console.log('\n══ JSON ══');
console.log(JSON.stringify(Object.fromEntries(Object.entries(结果).map(([k, v]) => [k, { dk: v.dk, D: v.D, gw: v.gw, hk: v.hk }]))));

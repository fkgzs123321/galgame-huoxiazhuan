// 新公式（按设计表换算）下重搜三档参数
const lcg = s => { let x = (Math.imul(s, 1103515245) + 12345) % 2147483648; if (x < 0) x += 2147483648; return x; };
const mix32 = x => { x = Math.imul(x ^ (x >>> 16), 2246822507); x = Math.imul(x ^ (x >>> 13), 3266489909); return (x ^ (x >>> 16)) >>> 0; };
const rollAt = (b, k) => (mix32(lcg(b) + k * 7919) % 20) + 1;
const O = ['大失败', '失败', '部分', '成功', '大成功'];
const grade = t => t <= 5 ? O[0] : t <= 10 ? O[1] : t <= 15 ? O[2] : t <= 19 ? O[3] : O[4];
const 期 = {
  开局: { 他观察: 10, 技: 10, 他意志: 15, 他理智: 90, 他警觉: 0, 她勇气: 50, 她痴迷: 0, 她兴奋: 0, 她信任: 60, hBack: 0 },
  中期: { 他观察: 30, 技: 30, 他意志: 40, 他理智: 70, 他警觉: 30, 她勇气: 70, 她痴迷: 50, 她兴奋: 40, 她信任: 80, hBack: 60 },
  后期: { 他观察: 60, 技: 60, 他意志: 60, 他理智: 50, 他警觉: 60, 她勇气: 100, 她痴迷: 90, 她兴奋: 70, 她信任: 90, hBack: 100 },
};
const 基 = []; for (let d = 1; d <= 17; d++) for (let h = 0; h < 12; h++) 基.push(d * 1000000 + h * 10000 + 10);

function 算(x, P) {
  const dc = Math.round(10 * P.dk);
  const m1 = Math.round(x.她兴奋 * P.hk / 20) - Math.round(x.她勇气 * P.hk / 10) + Math.round(x.他理智 / 20) + Math.round(x.他警觉 / 10) + Math.round(x.他观察 * P.gw / 5) + P.D;
  const m2 = Math.round(x.技 * P.gw / 5) - dc - Math.round(x.她痴迷 * P.hk / 10) + P.D;
  const m3 = Math.round(x.他意志 * P.gw / 5) + Math.round(x.她信任 * P.hk / 10) + Math.round(x.hBack / 20) - Math.round(x.她兴奋 * P.hk / 10) - Math.round(x.她勇气 * P.hk / 20) + P.D;
  const c = {}; let ok = 0;
  for (const b of 基) {
    const v = [1, 2, 3].map(k => rollAt(b, k) + [m1, m2, m3][k - 1]);
    const z = grade(Math.round((v[0] + 2 * v[1] + v[2]) / 4));
    c[z] = (c[z] || 0) + 1;
    if (z !== '大失败' && z !== '失败') ok++;
  }
  const t = 基.length, p = k => (c[k] || 0) / t * 100;
  return { 不失败: ok / t * 100, p, 大失败: p('大失败') };
}

function 搜(名, 目标) {
  let best = null;
  for (let dk = 0.2; dk <= 2.4; dk += 0.05)
    for (let D = -14; D <= 10; D += 1)
      for (let gw = 0.2; gw <= 3.0; gw += 0.1)
        for (let hk = 0.1; hk <= 1.4; hk += 0.1) {
          const P = { dk: +dk.toFixed(2), D, gw: +gw.toFixed(1), hk: +hk.toFixed(1) };
          const a = 算(期.开局, P), m = 算(期.中期, P), c = 算(期.后期, P);
          let err = Math.abs(a.不失败 - 目标[0]) + Math.abs(m.不失败 - 目标[1]) + Math.abs(c.不失败 - 目标[2]);
          if (m.不失败 < a.不失败 - 3 || m.不失败 > c.不失败 + 3) err += 40;
          if (c.大失败 > 30 || a.大失败 > 40) err += 20;
          if (名 === '困难' && c.不失败 > 76) err += (c.不失败 - 76) * 4;
          if (!best || err < best.err) best = { ...P, a, m, c, err };
        }
  return best;
}

const 目标 = { 普通: [60, 75, 90], 困难: [35, 52, 73], 地狱: [15, 15, 25] };
const R = {};
for (const [名, t] of Object.entries(目标)) {
  const r = 搜(名, t); R[名] = r;
  console.log(名 + ' 目标 ' + t.join('/') + ' → 实际 ' + r.a.不失败.toFixed(1) + '/' + r.m.不失败.toFixed(1) + '/' + r.c.不失败.toFixed(1)
    + '   dk=' + r.dk + ' D=' + r.D + ' gw=' + r.gw + ' hk=' + r.hk);
}
console.log('\n单调性：');
let bad = 0;
['a', 'm', 'c'].forEach((k, i) => {
  const p = R.普通[k].不失败, d = R.困难[k].不失败, h = R.地狱[k].不失败, ok = p >= d && d >= h;
  if (!ok) bad++;
  console.log('  ' + ['开局', '中期', '后期'][i] + ' ' + p.toFixed(1) + ' ≥ ' + d.toFixed(1) + ' ≥ ' + h.toFixed(1) + '  ' + (ok ? '✅' : '❌'));
});
console.log(bad ? '❌ ' + bad + ' 处倒挂' : '✅ 全程单调');
console.log('\nJSON: ' + JSON.stringify(Object.fromEntries(Object.entries(R).map(([k, v]) => [k, { dk: v.dk, D: v.D, gw: v.gw, hk: v.hk }]))));

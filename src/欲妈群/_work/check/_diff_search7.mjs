// 语义修正后（痴迷移到"她的要求"一侧）重搜三档 —— 不加任何硬约束，看是否自然单调
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

// ★ 新语义：她的痴迷进"她的要求"，减在 m2 上
function 算(x, P) {
  const dc = 10 * P.dk;
  const m = [
    Math.round((x.她.勇气 * P.hk - x.他.观察 * P.gw) / 12) + P.D,
    Math.round((x.他.技 * P.gw - dc) / 4 - (x.她.痴迷 * P.hk / 20)) + P.D,
    Math.round((x.她.兴奋 * P.hk - x.他.意志 * P.gw) / 12) + P.D,
  ];
  const c = {}; let ok = 0;
  for (const b of 基) {
    const v = [1, 2, 3].map(k => rollAt(b, k) + m[k - 1]);
    const z = grade(Math.round((v[0] + 2 * v[1] + v[2]) / 4));
    c[z] = (c[z] || 0) + 1;
    if (z !== '大失败' && z !== '失败') ok++;
  }
  const t = 基.length, p = k => (c[k] || 0) / t * 100;
  return { 不失败: ok / t * 100, p, 大失败: p('大失败'), 部分: p('部分'), 成功: p('成功'), 大成功: p('大成功') };
}

function 搜(目标) {
  let best = null;
  for (let dk = 0.3; dk <= 2.2; dk += 0.05)
    for (let D = -12; D <= 8; D += 1)
      for (let gw = 0.1; gw <= 2.2; gw += 0.1)
        for (let hk = 0.2; hk <= 1.6; hk += 0.1) {
          const P = { dk: +dk.toFixed(2), D, gw: +gw.toFixed(1), hk: +hk.toFixed(1) };
          const a = 算(期.开局, P), m = 算(期.中期, P), c = 算(期.后期, P);
          let err = Math.abs(a.不失败 - 目标[0]) + Math.abs(m.不失败 - 目标[1]) + Math.abs(c.不失败 - 目标[2]);
          if (m.不失败 < a.不失败 - 3 || m.不失败 > c.不失败 + 3) err += 40;
          if (c.大失败 > 30 || a.大失败 > 40) err += 20;
          if (!best || err < best.err) best = { ...P, a, m, c, err };
        }
  return best;
}

console.log('══ 语义修正后（不加硬约束）══\n');
const 目标 = {
  普通: [60, 75, 90],
  困难: [35, 55, 75],
  地狱: [15, 15, 25],
};
const R = {};
for (const [难, t] of Object.entries(目标)) {
  const r = 搜(t);
  R[难] = r;
  console.log(难 + ' 目标 ' + t.join('/') + ' → 实际 ' + r.a.不失败.toFixed(1) + '/' + r.m.不失败.toFixed(1) + '/' + r.c.不失败.toFixed(1)
    + '   参数 dk=' + r.dk + ' D=' + r.D + ' gw=' + r.gw + ' hk=' + r.hk);
  console.log('     后期明细：部分 ' + r.c.部分.toFixed(0) + '%／成功 ' + r.c.成功.toFixed(0) + '%／大成功 ' + r.c.大成功.toFixed(0) + '%／大失败 ' + r.c.大失败.toFixed(0) + '%');
}
console.log('\n══ 单调性检查（这次不靠约束） ══');
let bad = 0;
['a', 'm', 'c'].forEach((k, i) => {
  const p = R.普通[k].不失败, d = R.困难[k].不失败, h = R.地狱[k].不失败;
  const ok = p >= d && d >= h; if (!ok) bad++;
  console.log('  ' + ['开局', '中期', '后期'][i] + '：普通 ' + p.toFixed(1) + ' ≥ 困难 ' + d.toFixed(1) + ' ≥ 地狱 ' + h.toFixed(1) + '  ' + (ok ? '✅' : '❌ 倒挂'));
});
console.log('\n' + (bad ? '❌ 仍有 ' + bad + ' 处倒挂' : '✅ 全程单调 —— 修语义后不用硬约束了'));
console.log('\nJSON: ' + JSON.stringify(Object.fromEntries(Object.entries(R).map(([k, v]) => [k, { dk: v.dk, D: v.D, gw: v.gw, hk: v.hk }]))));

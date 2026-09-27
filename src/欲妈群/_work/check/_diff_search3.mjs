// 重搜：参数 = (dk DC系数, D 三轮修正, gw 成长权重, hk 她的增益)
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

function 率(x, p) {
  const { dk, D, gw, hk } = p;
  const m = [
    Math.round((x.她.勇气 * hk - x.他.观察 * gw) / 12),
    Math.round((x.他.技 * gw - 10 * dk) / 2) + Math.round(x.她.痴迷 * hk / 20),
    Math.round((x.她.兴奋 * hk - x.他.意志 * gw) / 12),
  ].map(v => v + D);
  let ok = 0;
  for (const b of 基) {
    const v = [1, 2, 3].map(k => rollAt(b, k) + m[k - 1]);
    const s = v.slice().sort((a, c) => a - c);
    const allBad = v.every(z => z <= 10), allGood = v.every(z => z >= 16);
    const 综 = allBad ? O[0] : allGood ? O[4] : grade(s[1]);
    if (综 !== '大失败' && 综 !== '失败') ok++;
  }
  return ok / 基.length * 100;
}

const 目标 = {
  普通: { 开局: 60, 中期: 75, 后期: 90, 范围: { dk: [0.7, 1.2], D: [-4, 6], gw: [0.4, 1.4], hk: [0.5, 1.0] } },
  困难: { 开局: 35, 中期: 65, 后期: 95, 范围: { dk: [0.9, 1.4], D: [-5, 3], gw: [1.0, 2.6], hk: [0.9, 1.3] } },
  地狱: { 开局: 15, 中期: 15, 后期: 20, 范围: { dk: [1.1, 1.7], D: [-14, -4], gw: [0.1, 0.7], hk: [1.2, 1.8] } },
};

const 结果 = {};
for (const [难, tg] of Object.entries(目标)) {
  const R = tg.范围; let best = null;
  for (let dk = R.dk[0]; dk <= R.dk[1] + 1e-9; dk += 0.05)
    for (let D = R.D[0]; D <= R.D[1]; D += 1)
      for (let gw = R.gw[0]; gw <= R.gw[1] + 1e-9; gw += 0.1)
        for (let hk = R.hk[0]; hk <= R.hk[1] + 1e-9; hk += 0.1) {
          const p = { dk: +dk.toFixed(2), D, gw: +gw.toFixed(1), hk: +hk.toFixed(1) };
          const a = 率(期.开局, p), m = 率(期.中期, p), c = 率(期.后期, p);
          const err = Math.abs(a - tg.开局) + Math.abs(m - tg.中期) + Math.abs(c - tg.后期)
            + ((m < a - 3 || m > c + 3) ? 40 : 0);
          if (!best || err < best.err) best = { ...p, a, m, c, err };
        }
  结果[难] = best;
}

console.log('══ 三档参数与曲线 ══\n');
for (const [难, r] of Object.entries(结果)) {
  const t = 目标[难];
  console.log(难 + '  dk=' + r.dk.toFixed(2) + '  D=' + String(r.D).padStart(3) + '  gw=' + r.gw.toFixed(1) + '  hk=' + r.hk.toFixed(1));
  console.log('   开局 ' + r.a.toFixed(1) + '%（目标 ' + t.开局 + '）   中期 ' + r.m.toFixed(1) + '%（目标 ' + t.中期 + '）   后期 ' + r.c.toFixed(1) + '%（目标 ' + t.后期 + '）   误差 ' + r.err.toFixed(1));
}
console.log('\n══ 写进面板用 ══');
console.log(JSON.stringify(Object.fromEntries(Object.entries(结果).map(([k, v]) => [k, { dk: v.dk, D: v.D, gw: v.gw, hk: v.hk }])), null, 2));

// 搜三档难度参数，使不失败率贴近目标曲线
// 公式形状：m1 = round((她勇气 − 他观察×gw)/12)
//          m2 = round((他技×gw − DC×dk)/2) + round(她痴迷/20) + D
//          m3 = round((她兴奋 − 他意志×gw)/12)
// 聚合：中位投掷判档 + 三轮一致才给极端档
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
const 基 = [];
for (let d = 1; d <= 17; d++) for (let h = 0; h < 12; h++) 基.push(d * 1000000 + h * 10000 + 10);
const DC基 = 10;

function 率(期x, dk, D, gw) {
  const m1 = Math.round((期x.她.勇气 - 期x.他.观察 * gw) / 12);
  const m2 = Math.round((期x.他.技 * gw - DC基 * dk) / 2) + Math.round(期x.她.痴迷 / 20) + D;
  const m3 = Math.round((期x.她.兴奋 - 期x.他.意志 * gw) / 12);
  const mods = [m1, m2, m3]; let ok = 0;
  for (const b of 基) {
    const v = [1, 2, 3].map(k => rollAt(b, k) + mods[k - 1]);
    const s = v.slice().sort((a, c) => a - c);
    const allBad = v.every(x => x <= 10), allGood = v.every(x => x >= 16);
    const 综合 = allBad ? O[0] : allGood ? O[4] : grade(s[1]);
    if (综合 !== '大失败' && 综合 !== '失败') ok++;
  }
  return ok / 基.length * 100;
}

const 目标 = {
  普通: { 开局: 60, 中期: 75, 后期: 90 },
  困难: { 开局: 35, 中期: 65, 后期: 95 },
  地狱: { 开局: 15, 中期: 15, 后期: 20 },
};

console.log('══ 为三档各搜一组参数（dk=DC系数，D=修正，gw=成长权重）══\n');
const 结果 = {};
for (const [难, tg] of Object.entries(目标)) {
  let best = null;
  for (let dk = 0.60; dk <= 1.50; dk += 0.05)
    for (let D = -8; D <= 8; D += 1)
      for (let gw = 0.4; gw <= 1.8; gw += 0.1) {
        const a = 率(期.开局, dk, D, gw), b2 = 率(期.中期, dk, D, gw), c = 率(期.后期, dk, D, gw);
        // 惩罚：与目标差 + 曲线不平滑（中期应介于开局与后期之间）
        const err = Math.abs(a - tg.开局) + Math.abs(b2 - tg.中期) + Math.abs(c - tg.后期)
          + ((b2 < a - 3 || b2 > c + 3) ? 40 : 0);
        if (!best || err < best.err) best = { dk, D, gw, a, b2, c, err };
      }
  结果[难] = best;
  console.log(难.padEnd(4) + ' dk=' + best.dk.toFixed(2) + '  D=' + String(best.D).padStart(3) + '  gw=' + best.gw.toFixed(1)
    + '   →  开局 ' + best.a.toFixed(1) + '%（目标 ' + tg.开局 + '）  中期 ' + best.b2.toFixed(1) + '%（目标 ' + tg.中期 + '）  后期 ' + best.c.toFixed(1) + '%（目标 ' + tg.后期 + '）   误差 ' + best.err.toFixed(1));
}

console.log('\n══ 校验：三档曲线对照 ══');
console.log('难度    开局            中期            后期');
for (const [难, r] of Object.entries(结果)) {
  const 条 = (v, t) => String(v.toFixed(0)).padStart(3) + '%(目标' + String(t).padStart(3) + ')';
  console.log(难.padEnd(6) + 条(r.a, 目标[难].开局) + '   ' + 条(r.b2, 目标[难].中期) + '   ' + 条(r.c, 目标[难].后期));
}

console.log('\n══ 最终参数（可直接写进面板）══');
console.log(JSON.stringify(Object.fromEntries(Object.entries(结果).map(([k, v]) => [k, { 难度系数_dk: +v.dk.toFixed(2), 修正_D: v.D, 成长权重_gw: +v.gw.toFixed(1) }])), null, 2));

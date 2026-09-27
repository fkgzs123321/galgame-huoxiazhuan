// 重搜困难档：加"困难每个阶段都 ≤ 普通"的约束；给两组候选
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

function 算(x, P) {
  const dc = Math.round(10 * P.dk);
  const m = [
    Math.round((x.她.勇气 * P.hk - x.他.观察 * P.gw) / 12) + P.D,
    Math.round((x.他.技 * P.gw - dc) / 4) + Math.round(x.她.痴迷 * P.hk / 20) + P.D,
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

const 普通 = { dk: 0.6, D: 1, gw: 0.4, hk: 0.4 };
const 普通曲线 = { 开局: 算(期.开局, 普通).不失败, 中期: 算(期.中期, 普通).不失败, 后期: 算(期.后期, 普通).不失败 };

function 搜(目标, 标签) {
  let best = null;
  for (let dk = 0.9; dk <= 1.8; dk += 0.05)
    for (let D = -10; D <= 2; D += 1)
      for (let gw = 0.1; gw <= 1.0; gw += 0.1)
        for (let hk = 0.9; hk <= 1.6; hk += 0.1) {
          const P = { dk: +dk.toFixed(2), D, gw: +gw.toFixed(1), hk: +hk.toFixed(1) };
          const a = 算(期.开局, P), m = 算(期.中期, P), c = 算(期.后期, P);
          let err = Math.abs(a.不失败 - 目标[0]) + Math.abs(m.不失败 - 目标[1]) + Math.abs(c.不失败 - 目标[2]);
          // ★ 硬约束：困难每个阶段都不得超过普通（难度倒挂 = 逻辑错）
          if (a.不失败 > 普通曲线.开局 || m.不失败 > 普通曲线.中期 || c.不失败 > 普通曲线.后期) err += 60;
          if (m.不失败 < a.不失败 - 3 || m.不失败 > c.不失败 + 3) err += 40;
          if (c.不失败 >= 普通曲线.后期) err += 60;
          if (!best || err < best.err) best = { ...P, a, m, c, err };
        }
  console.log('【' + 标签 + '】目标 ' + 目标.join('/') + ' → 实际 ' + best.a.不失败.toFixed(1) + '/' + best.m.不失败.toFixed(1) + '/' + best.c.不失败.toFixed(1)
    + '   参数 dk=' + best.dk + ' D=' + best.D + ' gw=' + best.gw + ' hk=' + best.hk);
  console.log('   后期明细：部分 ' + best.c.部分.toFixed(0) + '% / 成功 ' + best.c.成功.toFixed(0) + '% / 大成功 ' + best.c.大成功.toFixed(0) + '% / 大失败 ' + best.c.大失败.toFixed(0) + '%');
  return best;
}

console.log('普通曲线（固定不动）：' + 普通曲线.开局.toFixed(1) + ' / ' + 普通曲线.中期.toFixed(1) + ' / ' + 普通曲线.后期.toFixed(1) + '\n');
const A = 搜([40, 55, 75], '候选 A（一直吃力，后期有起色但仍不如普通）');
const B = 搜([35, 50, 65], '候选 B（更硬，后期也只是勉强）');
console.log('\n══ 三档对照 ══');
console.log('难度   开局    中期    后期');
console.log('普通   ' + 普通曲线.开局.toFixed(1).padStart(5) + '%  ' + 普通曲线.中期.toFixed(1).padStart(5) + '%  ' + 普通曲线.后期.toFixed(1).padStart(5) + '%');
console.log('困难A  ' + A.a.不失败.toFixed(1).padStart(5) + '%  ' + A.m.不失败.toFixed(1).padStart(5) + '%  ' + A.c.不失败.toFixed(1).padStart(5) + '%');
console.log('困难B  ' + B.a.不失败.toFixed(1).padStart(5) + '%  ' + B.m.不失败.toFixed(1).padStart(5) + '%  ' + B.c.不失败.toFixed(1).padStart(5) + '%');
console.log('\n候选 A 参数：' + JSON.stringify({ dk: A.dk, D: A.D, gw: A.gw, hk: A.hk }));
console.log('候选 B 参数：' + JSON.stringify({ dk: B.dk, D: B.D, gw: B.gw, hk: B.hk }));

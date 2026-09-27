// 判定标定：试几组系数，看哪种让"开局吃力 / 中期过半 / 后期稳"的曲线成立
const lcg = s => { let x = (Math.imul(s, 1103515245) + 12345) % 2147483648; if (x < 0) x += 2147483648; return x; };
const mix32 = x => { x = Math.imul(x ^ (x >>> 16), 2246822507); x = Math.imul(x ^ (x >>> 13), 3266489909); return (x ^ (x >>> 16)) >>> 0; };
const rollAt = (b, k) => (mix32(lcg(b) + k * 7919) % 20) + 1;
const grade = t => t <= 5 ? '大失败' : t <= 10 ? '失败' : t <= 15 ? '部分成功' : t <= 19 ? '成功' : '大成功';

// 三种时期
const 时期 = {
  开局: { 他: { 技: 10, 意志: 15, 兴奋: 0, 理智: 90, 欲望: 0 }, 她: { 勇气: 50, 理智: 100, 痴迷: 0, 兴奋: 0, 信任: 60, 后门: 0 } },
  中期: { 他: { 技: 30, 意志: 40, 兴奋: 20, 理智: 70, 欲望: 30 }, 她: { 勇气: 70, 理智: 60, 痴迷: 50, 兴奋: 40, 信任: 80, 后门: 60 } },
  后期: { 他: { 技: 70, 意志: 70, 兴奋: 40, 理智: 50, 欲望: 60 }, 她: { 勇气: 100, 理智: 30, 痴迷: 90, 兴奋: 70, 信任: 90, 后门: 100 } },
};
const DC = { 观察: 12, 行动: 10, 意志: 12 };
const 难度 = { 普通: 0.8, 困难: 1.0, 地狱: 1.3 };

// 候选公式
const 公式 = {
  '① 现状：技/5 − DC': (o) => ({
    m1: Math.round(o.她.勇气 / 10) - Math.round(o.他.兴奋 / 20) - Math.round(o.她.理智 / 20),
    m2: Math.round(o.他.技 / 5) + Math.round(o.她.痴迷 / 10) - o.dc,
    m3: Math.round(o.她.兴奋 / 10) + Math.round(o.她.勇气 / 20) - Math.round(o.他.意志 / 5) - Math.round(o.她.信任 / 10),
  }),
  '② 技/5 − DC/2': (o) => ({
    m1: Math.round(o.她.勇气 / 10) - Math.round(o.他.兴奋 / 20) - Math.round(o.她.理智 / 20),
    m2: Math.round(o.他.技 / 5) + Math.round(o.她.痴迷 / 10) - Math.round(o.dc / 2),
    m3: Math.round(o.她.兴奋 / 10) + Math.round(o.她.勇气 / 20) - Math.round(o.他.意志 / 5) - Math.round(o.她.信任 / 10),
  }),
  '③ (技−DC)/2 + 痴迷/20': (o) => ({
    m1: Math.round(o.她.勇气 / 10) - Math.round(o.他.兴奋 / 20) - Math.round(o.她.理智 / 20),
    m2: Math.round((o.他.技 - o.dc) / 2) + Math.round(o.她.痴迷 / 20),
    m3: Math.round(o.她.兴奋 / 10) + Math.round(o.她.勇气 / 20) - Math.round(o.他.意志 / 5) - Math.round(o.她.信任 / 10),
  }),
  '④ 三修正一起收敛': (o) => ({
    m1: Math.round(o.她.勇气 / 20) + Math.round(o.她.痴迷 / 20) - Math.round(o.她.理智 / 20),
    m2: Math.round((o.他.技 - o.dc) / 2) + Math.round(o.她.痴迷 / 20),
    m3: Math.round(o.她.兴奋 / 10) + Math.round(o.她.勇气 / 20) - Math.round(o.他.意志 / 10) - Math.round(o.她.信任 / 20),
  }),
};

const bases = [];
for (let d = 1; d <= 17; d++) for (let h = 0; h < 12; h++) bases.push(d * 1000000 + h * 10000 + 0 + 10);

function 跑(公式f, 期, dc, 难度系数) {
  const o = { 他: 期.他, 她: 期.她, dc: Math.round(dc * 难度系数) };
  const cnt = {};
  for (const b of bases) {
    const m = 公式f(o);
    const rolls = [rollAt(b, 1), rollAt(b, 2), rollAt(b, 3)];
    const g = rolls.map((r, i) => grade(r + [m.m1, m.m2, m.m3][i]));
    const bad = g.filter(x => x === '大失败' || x === '失败').length;
    const good = g.filter(x => x === '大成功' || x === '成功').length;
    const 综合 = bad >= 2 ? '大失败' : good >= 2 ? '大成功' : g[1];
    cnt[综合] = (cnt[综合] || 0) + 1;
  }
  const tot = Object.values(cnt).reduce((a, b) => a + b, 0);
  const p = k => ((cnt[k] || 0) / tot * 100);
  return { 好: p('大成功') + p('成功'), 部分: p('部分成功'), 差: p('失败') + p('大失败'), 大失败: p('大失败'), raw: cnt };
}

for (const [名, f] of Object.entries(公式)) {
  console.log('\n【' + 名 + '】  （行动 · DC10 · 困难）');
  for (const [期名, 期] of Object.entries(时期)) {
    const r = 跑(f, 期, DC.行动, 难度.困难);
    console.log('  ' + 期名 + '：成功+大成功 ' + r.好.toFixed(1) + '%   部分 ' + r.部分.toFixed(1) + '%   失败+大失败 ' + r.差.toFixed(1) + '%   （其中大失败 ' + r.大失败.toFixed(1) + '%）');
  }
}

console.log('\n══ 难度是否已接进判定（用公式③看三档差异 · 开局 · 行动）══');
for (const [难, k] of Object.entries(难度)) {
  const r = 跑(公式['③ (技−DC)/2 + 痴迷/20'], 时期.开局, DC.行动, k);
  console.log('  ' + 难.padEnd(4) + '（系数 ' + k + '，DC ' + Math.round(10 * k) + '）：成功+大成功 ' + r.好.toFixed(1) + '%   部分 ' + r.部分.toFixed(1) + '%   大失败 ' + r.大失败.toFixed(1) + '%');
}

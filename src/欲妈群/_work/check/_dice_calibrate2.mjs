// 找出"开局吃力 / 中期过半 / 后期稳"的组合：同时调档位、聚合规则、修正系数
const lcg = s => { let x = (Math.imul(s, 1103515245) + 12345) % 2147483648; if (x < 0) x += 2147483648; return x; };
const mix32 = x => { x = Math.imul(x ^ (x >>> 16), 2246822507); x = Math.imul(x ^ (x >>> 13), 3266489909); return (x ^ (x >>> 16)) >>> 0; };
const rollAt = (b, k) => (mix32(lcg(b) + k * 7919) % 20) + 1;

const 档位 = {
  '现行 ≤5/≤10/≤15/≤19': t => t <= 5 ? '大失败' : t <= 10 ? '失败' : t <= 15 ? '部分' : t <= 19 ? '成功' : '大成功',
  '对称 ≤3/≤8/≤14/≤19': t => t <= 3 ? '大失败' : t <= 8 ? '失败' : t <= 14 ? '部分' : t <= 19 ? '成功' : '大成功',
};
const 聚合 = {
  '现行 bad≥2→大失败': g => { const bad = g.filter(x => x === '大失败' || x === '失败').length; const good = g.filter(x => x === '大成功' || x === '成功').length; return bad >= 2 ? '大失败' : good >= 2 ? '大成功' : g[1]; },
  '中位数（全败才大失败）': g => { const bad = g.every(x => x === '大失败' || x === '失败'); const good = g.every(x => x === '大成功' || x === '成功'); const s = [...g].sort((a, b) => ['大失败', '失败', '部分', '成功', '大成功'].indexOf(a) - ['大失败', '失败', '部分', '成功', '大成功'].indexOf(b)); return bad ? '大失败' : good ? '大成功' : s[1]; },
};
const 时期 = {
  开局: { 他: { 技: 10, 意志: 15, 兴奋: 0, 理智: 90, 欲望: 0 }, 她: { 勇气: 50, 理智: 100, 痴迷: 0, 兴奋: 0, 信任: 60 } },
  中期: { 他: { 技: 30, 意志: 40, 兴奋: 20, 理智: 70, 欲望: 30 }, 她: { 勇气: 70, 理智: 60, 痴迷: 50, 兴奋: 40, 信任: 80 } },
  后期: { 他: { 技: 70, 意志: 70, 兴奋: 40, 理智: 50, 欲望: 60 }, 她: { 勇气: 100, 理智: 30, 痴迷: 90, 兴奋: 70, 信任: 90 } },
};
const 修正 = {
  '③ (技−DC)/2': o => ({
    m1: Math.round(o.她.勇气 / 10) - Math.round(o.他.兴奋 / 20) - Math.round(o.她.理智 / 20),
    m2: Math.round((o.他.技 - o.dc) / 2) + Math.round(o.她.痴迷 / 20),
    m3: Math.round(o.她.兴奋 / 10) + Math.round(o.她.勇气 / 20) - Math.round(o.他.意志 / 5) - Math.round(o.她.信任 / 10),
  }),
  '④b 三项都缩到 ±5 量级': o => ({
    m1: Math.round(o.她.勇气 / 20) + Math.round(o.她.痴迷 / 20) - Math.round(o.她.理智 / 20),
    m2: Math.round((o.他.技 - o.dc) / 4) + Math.round(o.她.痴迷 / 20),
    m3: Math.round(o.她.兴奋 / 20) + Math.round(o.她.勇气 / 20) - Math.round(o.他.意志 / 10) - Math.round(o.她.信任 / 20),
  }),
};

const bases = [];
for (let d = 1; d <= 17; d++) for (let h = 0; h < 12; h++) bases.push(d * 1000000 + h * 10000 + 10);

function 跑(修, 档, 聚, 期, dc) {
  const o = { 他: 期.他, 她: 期.她, dc };
  const m = 修(o); const cnt = {};
  for (const b of bases) {
    const r = [rollAt(b, 1), rollAt(b, 2), rollAt(b, 3)];
    const g = r.map((x, i) => 档(x + [m.m1, m.m2, m.m3][i]));
    const z = 聚(g); cnt[z] = (cnt[z] || 0) + 1;
  }
  const tot = Object.values(cnt).reduce((a, b) => a + b, 0); const p = k => (cnt[k] || 0) / tot * 100;
  return { 好: p('大成功') + p('成功'), 部分: p('部分'), 大失败: p('大失败') };
}

console.log('目标：开局 好 25~35% / 大失败 ≤12%；中期 好 50~65%；后期 好 72~85%\n');
for (const [修名, 修] of Object.entries(修正)) {
  for (const [档名, 档] of Object.entries(档位)) {
    for (const [聚名, 聚] of Object.entries(聚合)) {
      const r = ['开局', '中期', '后期'].map(k => 跑(修, 档, 聚, 时期[k], 10));
      const ok = r[0].好 >= 25 && r[0].好 <= 40 && r[0].大失败 <= 12 && r[1].好 >= 45 && r[1].好 <= 68 && r[2].好 >= 70 && r[2].好 <= 88;
      console.log((ok ? '★ ' : '  ') + 修名.padEnd(22) + 档名.padEnd(22) + 聚名.padEnd(22)
        + '开局 ' + r[0].好.toFixed(0).padStart(2) + '%(大失败 ' + r[0].大失败.toFixed(0) + '%)'
        + '  中期 ' + r[1].好.toFixed(0).padStart(2) + '%(大失败 ' + r[1].大失败.toFixed(0) + '%)'
        + '  后期 ' + r[2].好.toFixed(0).padStart(2) + '%(大失败 ' + r[2].大失败.toFixed(0) + '%)');
    }
  }
}

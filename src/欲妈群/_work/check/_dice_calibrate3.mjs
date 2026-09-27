// 终选：聚合改成「全败才大失败」，难度直接给修正
const lcg = s => { let x = (Math.imul(s, 1103515245) + 12345) % 2147483648; if (x < 0) x += 2147483648; return x; };
const mix32 = x => { x = Math.imul(x ^ (x >>> 16), 2246822507); x = Math.imul(x ^ (x >>> 13), 3266489909); return (x ^ (x >>> 16)) >>> 0; };
const rollAt = (b, k) => (mix32(lcg(b) + k * 7919) % 20) + 1;
const 好档 = ['大失败', '失败', '部分', '成功', '大成功'];
const grade = t => t <= 5 ? 好档[0] : t <= 10 ? 好档[1] : t <= 15 ? 好档[2] : t <= 19 ? 好档[3] : 好档[4];

const 聚合 = {
  'A 现行 bad≥2→大失败': g => { const b = g.filter(x => x === '大失败' || x === '失败').length, o = g.filter(x => x === '大成功' || x === '成功').length; return b >= 2 ? '大失败' : o >= 2 ? '大成功' : g[1]; },
  'B look全败才大失败 + 2 成即大成功': g => { const b = g.every(x => x === '大失败' || x === '失败'), o = g.filter(x => x === '大成功' || x === '成功').length >= 2; const s = [...g].sort((x, y) => 好档.indexOf(x) - 好档.indexOf(y)); return b ? '大失败' : o ? '大成功' : s[1]; },
  'C 全败大失败 / 全成大成功 / 否则中位': g => { const b = g.every(x => x === '大失败' || x === '失败'), o = g.every(x => x === '大成功' || x === '成功'); const s = [...g].sort((x, y) => 好档.indexOf(x) - 好档.indexOf(y)); return b ? '大失败' : o ? '大成功' : s[1]; },
};
const 时期 = {
  开局: { 他: { 技: 10, 意志: 15, 兴奋: 0, 理智: 90, 欲望: 0 }, 她: { 勇气: 50, 理智: 100, 痴迷: 0, 兴奋: 0, 信任: 60 } },
  中期: { 他: { 技: 30, 意志: 40, 兴奋: 20, 理智: 70, 欲望: 30 }, 她: { 勇气: 70, 理智: 60, 痴迷: 50, 兴奋: 40, 信任: 80 } },
  后期: { 他: { 技: 70, 意志: 70, 兴奋: 40, 理智: 50, 欲望: 60 }, 她: { 勇气: 100, 理智: 30, 痴迷: 90, 兴奋: 70, 信任: 90 } },
};
// 修正：让开局三项都 ≈ 0，随进度分化
const 修正 = {
  '现值 ③': o => ({
    m1: Math.round(o.她.勇气 / 10) - Math.round(o.他.兴奋 / 20) - Math.round(o.她.理智 / 20),
    m2: Math.round((o.他.技 - o.dc) / 2) + Math.round(o.她.痴迷 / 20),
    m3: Math.round(o.她.兴奋 / 10) + Math.round(o.她.勇气 / 20) - Math.round(o.他.意志 / 5) - Math.round(o.她.信任 / 10),
  }),
  '重标 三项都以 0 为锚': o => ({
    m1: Math.round((o.她.勇气 - o.他.技) / 12),
    m2: Math.round((o.他.技 - o.dc) / 2) + Math.round(o.她.痴迷 / 20),
    m3: Math.round((o.她.兴奋 - o.他.意志) / 12),
  }),
};
const 难度修正 = { 普通: -2, 困难: 0, 地狱: 3 };

const bases = [];
for (let d = 1; d <= 17; d++) for (let h = 0; h < 12; h++) bases.push(d * 1000000 + h * 10000 + 10);

function 跑(修, 聚, 期, dc, 难修) {
  const o = { 他: 期.他, 她: 期.她, dc: dc - 难修 };   // 难度直接改 DC（更直观）
  const m = 修(o); const cnt = {};
  for (const b of bases) {
    const r = [rollAt(b, 1), rollAt(b, 2), rollAt(b, 3)];
    const g = r.map((x, i) => grade(x + [m.m1, m.m2, m.m3][i]));
    cnt[聚(g)] = (cnt[聚(g)] || 0) + 1;
  }
  const tot = Object.values(cnt).reduce((a, b) => a + b, 0); const p = k => (cnt[k] || 0) / tot * 100;
  return { 好: p('大成功') + p('成功'), 部分: p('部分'), 大失败: p('大失败') };
}

console.log('目标（故事基调是"她主导"）：开局 好 15~30% / 大失败 ≤12%｜中期 好 45~62%｜后期 好 70~85% / 大失败 ≤8%\n');
for (const [修名, 修] of Object.entries(修正)) {
  for (const [聚名, 聚] of Object.entries(聚合)) {
    const r = ['开局', '中期', '后期'].map(k => 跑(修, 聚, 时期[k], 10, 0));
    const ok = r[0].好 >= 15 && r[0].好 <= 32 && r[0].大失败 <= 12 && r[1].好 >= 43 && r[1].好 <= 64 && r[2].好 >= 68 && r[2].好 <= 88 && r[2].大失败 <= 8;
    console.log((ok ? '★ ' : '  ') + 修名.padEnd(22) + 聚名.padEnd(34)
      + '开局 ' + r[0].好.toFixed(0).padStart(2) + '%(大失败' + r[0].大失败.toFixed(0).padStart(2) + '%)'
      + '  中期 ' + r[1].好.toFixed(0).padStart(2) + '%(大失败' + r[1].大失败.toFixed(0).padStart(2) + '%)'
      + '  后期 ' + r[2].好.toFixed(0).padStart(2) + '%(大失败' + r[2].大失败.toFixed(0).padStart(2) + '%)');
  }
}

console.log('\n══ 难度效果（重标 + B 聚合 · 开局 · 行动 DC10）══');
for (const [难, k] of Object.entries(难度修正)) {
  const r = 跑(修正['重标 三项都以 0 为锚'], 聚合['B look全败才大失败 + 2 成即大成功'], 时期.开局, 10, k);
  console.log('  ' + 难.padEnd(4) + '（DC ' + (10 - k) + '）：好 ' + r.好.toFixed(1) + '%   部分 ' + r.部分.toFixed(1) + '%   大失败 ' + r.大失败.toFixed(1) + '%');
}

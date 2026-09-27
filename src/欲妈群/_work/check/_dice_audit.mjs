// 数值审计：用面板里的真公式做蒙特卡洛/穷举，算出实际分布
const lcgJS = s => { let x = (s * 1103515245 + 12345) % 2147483648; if (x < 0) x += 2147483648; return x; };
const lcgIMUL = s => { let x = (Math.imul(s, 1103515245) + 12345) % 2147483648; if (x < 0) x += 2147483648; return x; };
const rollAt = (lcg, base, kn) => (lcg(base + kn * 97) % 20) + 1;
const grade = t => t <= 5 ? '大失败' : t <= 10 ? '失败' : t <= 15 ? '部分成功' : t <= 19 ? '成功' : '大成功';

// 面板原公式
function 判定(p, h, dc, lcg, base) {
  const 技 = p.技;
  const m1 = Math.round(h.勇气 / 10) - Math.round(p.兴奋 / 20) - Math.round(h.理智 / 20);
  const willFix = p.isWill ? Math.round((p.理智 - p.欲望) / 10) : 0;
  const backFix = p.isBack ? Math.round(h.后门进度 / 10) : 0;
  const m2 = Math.round(技 / 5) + Math.round(h.痴迷 / 10) - dc + willFix + backFix;
  const m3 = Math.round(h.兴奋 / 10) + Math.round(h.勇气 / 20) - Math.round(p.意志 / 5) - Math.round(h.信任 / 10) - (p.isBack ? Math.round(h.后门进度 / 20) : 0);
  const rolls = [rollAt(lcg, base, 1), rollAt(lcg, base, 2), rollAt(lcg, base, 3)];
  const mods = [m1, m2, m3];
  const grades = rolls.map((r, i) => grade(r + mods[i]));
  const bad = grades.filter(x => x === '大失败' || x === '失败').length;
  const good = grades.filter(x => x === '大成功' || x === '成功').length;
  const 综合 = bad >= 2 ? '大失败' : good >= 2 ? '大成功' : grades[1];
  return { 综合, m1, m2, m3, rolls, grades };
}

// 穷举 day 1~17 × hour 0~23 × turn 0~9 × idx 1~5
function 抽样(p, h, dc, lcg) {
  const cnt = {};
  for (let d = 1; d <= 17; d++) for (let hh = 0; hh < 24; hh++) for (let t = 0; t < 10; t++) for (let i = 1; i <= 5; i++) {
    const r = 判定({ ...p, isWill: false }, h, dc, lcg, d * 1000000 + hh * 10000 + t * 100 + i * 10);
    cnt[r.综合] = (cnt[r.综合] || 0) + 1;
  }
  const tot = Object.values(cnt).reduce((a, b) => a + b, 0);
  return Object.fromEntries(['大成功', '成功', '部分成功', '失败', '大失败'].map(k => [k, ((cnt[k] || 0) / tot * 100).toFixed(1) + '%']));
}

const 郝佳期开局 = { 勇气: 50, 理智: 100, 痴迷: 0, 兴奋: 0, 信任: 60, 后门进度: 0 };
const 郝佳期中期 = { 勇气: 70, 理智: 60, 痴迷: 50, 兴奋: 40, 信任: 80, 后门进度: 60 };
const 郝佳期后期 = { 勇气: 100, 理智: 30, 痴迷: 90, 兴奋: 70, 信任: 90, 后门进度: 100 };

console.log('══ 用面板原公式（含 Math.round 链）穷举 Day1-17 × 24时 × 10回合 × 5动作 ══\n');
const cases = [
  ['观察 DC12（技能10，开局）', { 技: 10, 兴奋: 0, 意志: 15, 理智: 90, 欲望: 0 }, 郝佳期开局, 12],
  ['行动 DC10（技能8，开局）', { 技: 8, 兴奋: 0, 意志: 15, 理智: 90, 欲望: 0 }, 郝佳期开局, 10],
  ['行动 DC10（技能8→中期她）', { 技: 8, 兴奋: 0, 意志: 15, 理智: 90, 欲望: 0 }, 郝佳期中期, 10],
  ['行动 DC10（技能满100）', { 技: 100, 兴奋: 0, 意志: 100, 理智: 90, 欲望: 0 }, 郝佳期后期, 10],
  ['意志 DC12（技能15，开局）', { 技: 15, 兴奋: 0, 意志: 15, 理智: 90, 欲望: 0, isWill: true }, 郝佳期开局, 12],
  ['拒绝 DC12（技能15，开局）', { 技: 15, 兴奋: 0, 意志: 15, 理智: 90, 欲望: 0, isWill: true }, 郝佳期开局, 12],
  ['后门 DC15（技能10，进度80）', { 技: 10, 兴奋: 0, 意志: 15, 理智: 90, 欲望: 0, isBack: true }, { ...郝佳期开局, 后门进度: 80 }, 15],
];
for (const [名, p, h, dc] of cases) {
  console.log(名.padEnd(30) + JSON.stringify(抽样(p, h, dc, lcgJS)));
}

console.log('\n══ 修正值拆解（开局 · 观察 DC12 / 行动 DC10）══');
for (const [名, p, h, dc] of [cases[0], cases[1]]) {
  const r = 判定({ ...p, isCould: false }, h, dc, lcgJS, 1 * 1000000 + 14 * 10000 + 0 + 1 * 10);
  console.log('  ' + 名 + ' → m1=' + r.m1 + '  m2=' + r.m2 + '  m3=' + r.m3);
}

console.log('\n══ LCG 精度问题（原式 vs Math.imul）══');
let diff = 0, same = 0;
for (let seed = 1000000; seed < 1002000; seed++) { const a = rollAt(lcgJS, seed, 1), b = rollAt(lcgIMUL, seed, 1); a === b ? same++ : diff++; }
console.log('  seed 在 1e6~1e6+2000 区间：一致 ' + same + ' / 不一致 ' + diff);
let diff2 = 0, same2 = 0;
for (let seed = 100000000; seed < 100002000; seed++) { const a = rollAt(lcgJS, seed, 1), b = rollAt(lcgIMUL, seed, 1); a === b ? same2++ : diff2++; }
console.log('  seed 在 1e8~1e8+2000 区间：一致 ' + same2 + ' / 不一致 ' + diff2 + '   ← day≥100 时 seed 到这一量级');
console.log('  seed*1103515245 在 seed=1e8 时为 ' + (1e8 * 1103515245).toExponential(3) + '，2^53 = ' + Math.pow(2, 53).toExponential(3));

console.log('\n══ 三轮是否独立（同一 base 只差 kn*97）══');
const dist = {};
for (let d = 1; d <= 17; d++) for (let hh = 0; hh < 24; hh++) for (let t = 0; t < 5; t++) {
  const base = d * 1000000 + hh * 10000 + t * 100 + 10;
  const r = [1, 2, 3].map(k => rollAt(lcgJS, base, k));
  const key = r.join(',');
  dist[key] = (dist[key] || 0) + 1;
}
const keys = Object.keys(dist);
console.log('  采样 ' + (17 * 24 * 5) + ' 个 base，得到 ' + keys.length + ' 种不同的三轮组合（理论 8000 种）');
const r1 = {}, r2 = {};
for (const k of keys) { const [a, b] = k.split(','); (r1[a] = r1[a] || []).push(+b); }
console.log('  轮1 分布：' + JSON.stringify(Object.fromEntries(Object.entries(r1).slice(0, 6).map(([k, v]) => [k, v.length]))));

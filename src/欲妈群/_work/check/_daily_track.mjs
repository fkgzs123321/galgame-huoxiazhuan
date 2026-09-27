// 逐日轨迹模拟：按卡的真实成长速率，算 100 天里每一档的不失败率
const lcg = s => { let x = (Math.imul(s, 1103515245) + 12345) % 2147483648; if (x < 0) x += 2147483648; return x; };
const mix32 = x => { x = Math.imul(x ^ (x >>> 16), 2246822507); x = Math.imul(x ^ (x >>> 13), 3266489909); return (x ^ (x >>> 16)) >>> 0; };
const rollAt = (b, k) => (mix32(lcg(b) + k * 7919) % 20) + 1;
const O = ['大失败', '失败', '部分', '成功', '大成功'];
const grade = t => t <= 5 ? O[0] : t <= 10 ? O[1] : t <= 15 ? O[2] : t <= 19 ? O[3] : O[4];

// 真实轨迹（每天 2 次判定；三种技能轮着用 → 每技能每 3 次判定涨一次）
function 轨迹(d) {
  const 判定次 = d * 2;
  const 每技 = 判定次 / 3;
  return {
    他观察: Math.min(100, 10 + 3.5 * 每技),
    技: Math.min(100, 10 + 3.5 * 每技),
    他意志: Math.min(100, 15 + 3.5 * 每技),
    他理智: Math.max(20, 90 - 0.6 * d),
    他警觉: Math.min(100, 1.5 * d),
    她勇气: Math.min(100, 50 + 1.5 * d),
    她痴迷: Math.min(100, 2 * 判定次),
    她兴奋: 30,                                  // 会归零 → 取中位
    她信任: Math.min(100, 60 + 0.5 * d),
    hBack: Math.min(100, 8 * Math.floor(d / 7)), // 每周结算推进
    她阶段: Math.min(5, 1 + Math.floor(d / 16)), // 阶段 1~5，约每 16 天窜一级
  };
}

const D = { 普通: { dk: 0.20, D: 0, gw: 0.5, hk: 0.6 }, 困难: { dk: 0.25, D: -2, gw: 0.7, hk: 0.8 }, 地狱: { dk: 0.30, D: -4, gw: 0.4, hk: 0.8 } };

function 率(x, P, 加阶段) {
  const dc = Math.round(10 * P.dk);
  const 阶 = 加阶段 ? (x.她阶段 - 1) * 1.2 : 0;   // 阶段每高一级 → 他的分再降 1.2
  const m1 = Math.round(x.她兴奋 * P.hk / 20) - Math.round(x.她勇气 * P.hk / 10) + Math.round(x.他理智 / 20) + Math.round(x.他警觉 / 10) + Math.round(x.他观察 * P.gw / 5) + P.D - 阶;
  const m2 = Math.round(x.技 * P.gw / 5) - dc - Math.round(x.她痴迷 * P.hk / 10) + P.D - 阶;
  const m3 = Math.round(x.他意志 * P.gw / 5) + Math.round(x.她信任 * P.hk / 10) + Math.round(x.hBack / 20) - Math.round(x.她兴奋 * P.hk / 10) - Math.round(x.她勇气 * P.hk / 20) + P.D - 阶;
  const 基 = [];
  for (let dd = 1; dd <= 17; dd++) for (let h = 0; h < 12; h++) 基.push(dd * 1000000 + h * 10000 + 10);
  let ok = 0;
  for (const b of 基) {
    const v = [1, 2, 3].map(k => rollAt(b, k) + [m1, m2, m3][k - 1]);
    const z = grade(Math.round((v[0] + 2 * v[1] + v[2]) / 4));
    if (z !== '大失败' && z !== '失败') ok++;
  }
  return ok / 基.length * 100;
}

const 天 = [1, 3, 5, 10, 15, 20, 30, 40, 50, 60, 80, 100];
for (const 加阶段 of [false, true]) {
  console.log('\n══ ' + (加阶段 ? '★ 把「她的阶段」接进判定' : '现状（判定里没有等级项）') + ' ══');
  console.log('Day'.padEnd(6) + Object.keys(D).map(k => k.padStart(8)).join(''));
  for (const d of 天) {
    const x = 轨迹(d);
    const row = Object.entries(D).map(([难, P]) => 率(x, P, 加阶段).toFixed(1).padStart(7) + '%').join('');
    console.log(String(d).padEnd(6) + row);
  }
}
console.log('\n（轨迹假设：每天 2 次判定；三种技能轮用；她痴迷每次互动 +2；勇气每天 +1.5；阶段约每 16 天一级）');

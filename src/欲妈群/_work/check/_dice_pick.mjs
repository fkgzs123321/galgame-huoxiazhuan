// 找一个真均匀且确定的投掷哈希（离线验证，通过后再写进面板）
const lcg = s => { let x = (Math.imul(s, 1103515245) + 12345) % 2147483648; if (x < 0) x += 2147483648; return x; };
const hash32 = x => { x = Math.imul(x ^ (x >>> 16), 2246822507); x = Math.imul(x ^ (x >>> 13), 3266489909); return (x ^ (x >>> 16)) >>> 0; };

const 候选 = {
  'A 原式 %20（修前）': (b, k) => ((b + k * 97) % 20) + 1,
  'B imul+低位 %20': (b, k) => (lcg(b + k * 97) % 20) + 1,
  'C imul+再哈希+低位': (b, k) => (lcg(lcg(b) + k * 7919) % 20) + 1,
  'D murmur32 混合': (b, k) => (hash32(lcg(b) + k * 7919) % 20) + 1,
  'E murmur32 三步独立': (b, k) => (hash32(lcg(b) + k * 2654435761) % 20) + 1,
  'F murmur 高位缩放': (b, k) => Math.floor(hash32(lcg(b) + k * 7919) / 4294967296 * 20) + 1,
};

const bases = [];
for (let d = 1; d <= 17; d++) for (let h = 0; h < 24; h++) for (let t = 0; t < 5; t++) bases.push(d * 1000000 + h * 10000 + t * 100 + 10);

for (const [名, f] of Object.entries(候选)) {
  const combos = new Set(); const c1 = {}; const c2 = {}; const c3 = {};
  for (const b of bases) {
    const r = [f(b, 1), f(b, 2), f(b, 3)];
    combos.add(r.join(','));
    c1[r[0]] = (c1[r[0]] || 0) + 1; c2[r[1]] = (c2[r[1]] || 0) + 1; c3[r[2]] = (c3[r[2]] || 0) + 1;
  }
  const 轮1种数 = Object.keys(c1).length, 轮2种数 = Object.keys(c2).length, 轮3种数 = Object.keys(c3).length;
  const 单轮理论 = bases.length / 20;
  const 偏差 = Object.values(c1).reduce((a, b) => a + Math.abs(b - 单轮理论), 0) / bases.length;
  console.log(名.padEnd(22) + '组合 ' + String(combos.size).padStart(4) + '/8000   轮1取值 ' + String(轮1种数).padStart(2) + '/20  轮2 ' + String(轮2种数).padStart(2) + '/20  轮3 ' + String(轮3种数).padStart(2) + '/20   轮1偏差 ' + (偏差 * 100).toFixed(1) + '%');
}

// 确定性检查 + 碰撞检查（不同 (day,hour,turn,idx) 不该撞）
console.log('\n── 确定性 & 种子碰撞 ──');
for (const [名, f] of [['D murmur32 混合', 候选['D murmur32 混合']]]) {
  const b = 1 * 1000000 + 14 * 10000 + 0 + 10;
  console.log(名 + ' 同 base 两次：' + f(b, 1) + ' / ' + f(b, 1) + '（应相同）');
  const seen = new Map(); let 撞 = 0;
  for (let d = 1; d <= 17; d++) for (let h = 0; h < 24; h++) for (let t = 0; t < 10; t++) for (let i = 1; i <= 5; i++) {
    const seed = d * 1000000 + h * 10000 + t * 100 + i;
    const k = f(seed, 1) + ',' + f(seed, 2) + ',' + f(seed, 3);
    if (seen.has(k)) 撞++; else seen.set(k, 1);
  }
  console.log('  680 个 (day,hour,turn,idx) 里三轮结果重复 ' + 撞 + ' 次（0 最好）');
}

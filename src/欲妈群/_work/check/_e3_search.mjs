// 按 引擎模板 判定引擎 E3 重写欲妈群的判定，并算三档曲线验证
// D = P − R；S = clamp(50+D, 5, 95)；V = LCG×100，V<S 成功；档位 = judgeTier(D, 成败)
const lcg = s => { let x = (Math.imul(s, 1664525) + 1013904223) % 4294967296; if (x < 0) x += 4294967296; return x; };
const rollAt = (b, k) => (lcg(b + k * 7919) % 100000) / 1000;   // 0~99.999
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function judgeTier(D, ok) {
  if (ok) { if (D >= 30) return '大成功'; if (D >= 10) return '成功'; return '勉强成功'; }
  if (D <= -30) return '大失败';
  return '失败';
}
const 成功侧 = t => t === '大成功' || t === '成功' || t === '勉强成功';

// ── 契参数（全部可调，不写死在逻辑里）
const 难度乘 = { 普通: 0.85, 困难: 1.00, 地狱: 1.15 };
const 基础要求 = { 微: 30, 中: 45, 强: 60, 极: 75 };
const 她的强度权重 = 0.45;          // R = 基础要求 × 难度乘 × (1 + 她强度/100 × 0.45)
const 阶段修正 = { 1: 0, 2: 4, 3: 9, 4: 15, 5: 24 };
// 主对 → 三轮权重（他这一下主要看哪一轮）
const 三轮权 = { 识破: [3, 1, 1], 拦住: [1, 3, 1], 扛住: [1, 1, 3], 全场: [1, 1, 1] };
// 主对 → 取她的哪一项当对手
const 她项 = { 识破: '勇气', 拦住: '痴迷', 扛住: '兴奋', 全场: null };

function 算(他, 她, 等, 主, 难度, seed) {
  const w = 三轮权[主];
  const P1 = (他.观察 * 3 + 他.理智 * 1 + 他.警觉 * 1) / 5;
  const P2 = 他.技能;
  const P3 = (他.意志 * 3 + 他.后门 * 1) / 4;
  const P = (P1 * w[0] + P2 * w[1] + P3 * w[2]) / (w[0] + w[1] + w[2]);
  const 强度 = 她项[主] ? 她[她项[主]] : (她.勇气 + 她.痴迷 + 她.兴奋) / 3;
  const R = clamp(基础要求[等] * 难度乘[难度] * (1 + 强度 / 100 * 她的强度权重) + 阶段修正[她.阶段], 0, 100);
  const D = P - R;
  const S = clamp(50 + D, 5, 95);
  const V = rollAt(seed, 1);
  const ok = V < S;
  return { P, R, D, S, V, tier: judgeTier(D, ok), ok };
}

// ── 三期（按真实成长轨迹取的三个时点）
const 期 = {
  开局: { 他: { 观察: 10, 技能: 10, 意志: 15, 理智: 90, 警觉: 0, 后门: 0 }, 她: { 勇气: 50, 痴迷: 0, 兴奋: 0, 阶段: 1 } },
  中期: { 他: { 观察: 40, 技能: 40, 意志: 40, 理智: 70, 警觉: 30, 后门: 60 }, 她: { 勇气: 70, 痴迷: 50, 兴奋: 40, 阶段: 3 } },
  后期: { 他: { 观察: 80, 技能: 80, 意志: 80, 理智: 50, 警觉: 60, 后门: 100 }, 她: { 勇气: 100, 痴迷: 90, 兴奋: 70, 阶段: 5 } },
};
const 基 = []; for (let d = 1; d <= 17; d++) for (let h = 0; h < 12; h++) 基.push(d * 1000000 + h * 10000 + 10);


// ── 搜参数：基础要求 / 强度权重 / 难度乘 / 阶段修正
const 期点 = {
  开局: { 他:{观察:10,技能:10,意志:15,理智:90,警觉:0,后门:0}, 她:{勇气:50,痴迷:0,兴奋:0,阶段:1} },
  中期: { 他:{观察:40,技能:40,意志:40,理智:70,警觉:30,后门:60}, 她:{勇气:70,痴迷:50,兴奋:40,阶段:3} },
  后期: { 他:{观察:80,技能:80,意志:80,理智:50,警觉:60,后门:100}, 她:{勇气:100,痴迷:90,兴奋:70,阶段:5} },
};
function 率(x, 等, 主, 难度乘表, 基础要求表) {
  const w = 三轮权[主];
  const P1=(x.他.观察*3+x.他.理智*1+x.他.警觉*1)/5, P2=x.他.技能, P3=(x.他.意志*3+x.他.后门*1)/4;
  const P=(P1*w[0]+P2*w[1]+P3*w[2])/(w[0]+w[1]+w[2]);
  const 强度 = 她项[主] ? x.她[她项[主]] : (x.她.勇气+x.她.痴迷+x.她.兴奋)/3;
  const R = clamp(基础要求表[等]*难度乘表[难]* (1+强度/100*她的强度权重) + 阶段修正[x.她.阶段], 0, 100);
  const S = clamp(50+P-R, 5, 95);
  let ok=0; for(const b of 基) if (rollAt(b,1) < S) ok++;
  return ok/基.length*100;
}
const 目标={普通:[60,75,90],困难:[35,52,73],地狱:[15,15,25]};
let best=null;
for(let 微=20;微<=40;微+=5) for(let 极=55;极<=85;极+=5){
  const 基表={微:微,中:Math.round((微+极)/2),强:Math.round(极*0.8),极:极};
  const 权=0.30;
  // 难度乘：让三档开局分别落在目标附近
  for(let m0=0.60;m0<=0.95;m0+=0.05) for(let m2=1.00;m2<=1.35;m2+=0.05){
    const 乘表={普通:m0,困难:(m0+m2)/2,地狱:m2};
    let err=0; const 结果={};
    for(const [难,tg] of Object.entries(目标)){
      const a=率(期点.开局,'中','拦住',乘表,基表), b2=率(期点.中期,'中','拦住',乘表,基表), c=率(期点.后期,'中','拦住',乘表,基表);
      结果[难]=[a,b2,c];
      err+=Math.abs(a-tg[0])+Math.abs(b2-tg[1])+Math.abs(c-tg[2]);
      if(!(a>=b2-3 && b2>=c-3)) {} // 允许递减
    }
    if(!best||err<best.err) best={微,极,基表,乘表,权,结果,err};
  }
}
console.log('最优参数：基础要求='+JSON.stringify(best.基表)+'  难度乘='+JSON.stringify(Object.fromEntries(Object.entries(best.乘表).map(([k,v])=>[k,+v.toFixed(2)])))+'  她的强度权重='+best.权+'  误差='+best.err.toFixed(1));
console.log('');
console.log('难度   开局(目标)      中期(目标)      后期(目标)');
for(const [难,r] of Object.entries(best.结果)){
  const tg=目标[难];
  console.log(难.padEnd(5)+r[0].toFixed(1).padStart(5)+'%('+String(tg[0]).padStart(2)+')   '+r[1].toFixed(1).padStart(5)+'%('+String(tg[1]).padStart(2)+')   '+r[2].toFixed(1).padStart(5)+'%('+String(tg[2]).padStart(2)+')');
}

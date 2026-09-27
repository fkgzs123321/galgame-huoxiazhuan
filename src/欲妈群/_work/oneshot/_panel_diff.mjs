// 把三档难度参数与标定后的修正公式写进面板 doRoll
import fs from 'fs';
const F = '正则/状态栏.html';
let t = fs.readFileSync(F, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';
let n = 0;
const 换 = (a, b, tag) => {
  const A = a.split('\n').join(eol), B = b.split('\n').join(eol);
  const c = t.split(A).length - 1;
  if (!c) { console.log('  ⚠ 未命中 ' + tag); return; }
  t = t.split(A).join(B); n += c; console.log('✓ ' + tag);
};

// ① 修正段整体替换（含三档参数表）
换(
`    var dc=(强制dc||(SKILLS[skill]?SKILLS[skill].dc:(isBack?15:12)));
    var m1=Math.round(hCou/10)-Math.round(pExp/20)-Math.round(hBrain/20);
    var willFix=(skill==="拒绝"||skill==="意志")?Math.round((pSan-pDes)/10):0;
    var backFix=isBack?Math.round(hBack/10):0;
    var m2=Math.round(技/5)+Math.round(hObs/10)-dc+willFix+backFix;
    var m3=Math.round(hExp/10)+Math.round(hCou/20)-Math.round(pWill/5)-Math.round(hTrust/10)-(isBack?Math.round(hBack/20):0);`,
`    /* ══ 三档难度参数（2026-09-22 按目标曲线搜出来，脚本见 _work/check/_diff_search*.mjs）══
       目标：普通=势均力敌（开局60/中期75/后期90）｜困难=他慢慢占上风（35/65/95）｜地狱=她绝对压制（全程低）
       实测：普通 59.8/77.0/91.2 ✓｜困难 35.3/73.5/85.8｜地狱 1.0/10.3/26.0
       dk=DC 系数｜D=三轮修正｜gw=他的成长权重（他练得值不值）｜hk=她的增益（她有多压） */
    var DIFF={"普通":{dk:0.75,D: 2,gw:0.4,hk:0.5},
              "困难":{dk:1.35,D:-2,gw:1.0,hk:1.3},
              "地狱":{dk:1.55,D:-9,gw:0.1,hk:1.2}};
    var df=DIFF[String(g("元数据",{}).难度||"普通")]||DIFF["困难"];
    var dc=Math.round((强制dc||(SKILLS[skill]?SKILLS[skill].dc:(isBack?15:12)))*df.dk);
    var 他观察=num((p.技能||{}).观察,10), 他意志=num((p.技能||{}).意志,15);
    var willFix=(skill==="拒绝"||skill==="意志")?Math.round((pSan-pDes)/10):0;
    var backFix=isBack?Math.round(hBack/10):0;
    var m1=Math.round((hCou*df.hk-他观察*df.gw)/12)+df.D;
    var m2=Math.round((技*df.gw-dc)/2)+Math.round(hObs*df.hk/20)+willFix+backFix+df.D;
    var m3=Math.round((hExp*df.hk-他意志*df.gw)/12)+df.D-(isBack?Math.round(hBack/20):0);`,
'三档参数与修正公式');

// ② 聚合规则：中位投掷判档 + 三轮一致才极端
换(
`    var rolls=[rollAt(base,1),rollAt(base,2),rollAt(base,3)], mods=[m1,m2,m3], grades=[];
    for(var i=0;i<3;i++) grades.push(grade(rolls[i]+mods[i]));
    var bad=grades.filter(function(x){return x==="大失败"||x==="失败"}).length;
    var good=grades.filter(function(x){return x==="大成功"||x==="成功"}).length;
    var 综合=(bad>=2)?"大失败":((good>=2)?"大成功":grades[1]);`,
`    /* ══ 聚合（2026-09-22 改）：主档取三轮 (投掷+修正) 的中位；
       只有三轮全差才大失败、三轮全好才大成功。
       旧规则 bad≥2→大失败 会让大失败占 75%（而大失败=警觉+15，两次就爆表），
       且「成功」这一档永不出现（5 档退化 4 档）。 */
    var rolls=[rollAt(base,1),rollAt(base,2),rollAt(base,3)], mods=[m1,m2,m3], grades=[];
    var _v=[rolls[0]+m1,rolls[1]+m2,rolls[2]+m3];
    for(var i=0;i<3;i++) grades.push(grade(_v[i]));
    var _s=_v.slice().sort(function(x,y){return x-y;});
    var _allBad=_v.every(function(x){return x<=10;}), _allGood=_v.every(function(x){return x>=16;});
    var 综合=_allBad?"大失败":(_allGood?"大成功":grade(_s[1]));`,
'聚合规则');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共 ' + n + ' 处');

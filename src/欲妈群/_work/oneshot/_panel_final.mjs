// 落地终版：三档参数 + m2 收窄 /4 + 加权聚合
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

// ① 三档参数表
换(
`    /* ══ 三档难度参数（2026-09-22 按目标曲线搜出来，脚本见 _work/check/_diff_search*.mjs）══
       目标：普通=势均力敌（开局60/中期75/后期90）｜困难=他慢慢占上风（35/65/95）｜地狱=她绝对压制（全程低）
       实测：普通 59.8/77.0/91.2 ✓｜困难 35.3/73.5/85.8｜地狱 1.0/10.3/26.0
       dk=DC 系数｜D=三轮修正｜gw=他的成长权重（他练得值不值）｜hk=她的增益（她有多压） */
    var DIFF={"普通":{dk:0.75,D: 2,gw:0.4,hk:0.5},
              "困难":{dk:1.35,D:-2,gw:1.0,hk:1.3},
              "地狱":{dk:1.55,D:-9,gw:0.1,hk:1.2}};`,
`    /* ══ 三档难度参数（2026-09-22 按目标曲线搜出来，脚本见 _work/check/_diff_search4/5.mjs）══
       目标：普通=势均力敌（60/75/90）｜困难=他慢慢占上风（35/65/95）｜地狱=她绝对压制
       实测（不失败率）：普通 60.3/74.5/91.2 ✓｜困难 34.3/68.1/95.6 ✓｜地狱 1.5/8.8/22.5
       dk=DC 系数｜D=三轮修正｜gw=他的成长权重（他练得值不值）｜hk=她的增益（她有多压）
       ★ 地狱到不了 15%：加权聚合把三轮揉成一个值后方差变小（≈单轮的 0.6 倍），尾部概率被压扁；
         要抬到 15% 得加 D，但那会一并抬高中后期、破坏"全程压制"。 */
    var DIFF={"普通":{dk:0.6, D: 1,gw:0.4,hk:0.4},
              "困难":{dk:1.15,D:-1,gw:0.3,hk:1.0},
              "地狱":{dk:1.45,D:-7,gw:0.2,hk:0.9}};`,
'三档参数表');

// ② m2 收窄为 /4（原 /2 会让后期 m2 溢出到 +27 → 恒 20，骰子失去意义）
换('    var m2=Math.round((技*df.gw-dc)/2)+Math.round(hObs*df.hk/20)+willFix+backFix+df.D;',
   '    var m2=Math.round((技*df.gw-dc)/4)+Math.round(hObs*df.hk/20)+willFix+backFix+df.D;   /* /4：/2 时后期 m2=+27 → 恒 20，骰子废掉 */',
   'm2 收窄 /4');

// ③ 聚合改加权（去掉 allGood/allBad 的额外规则）
换(
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
`    /* ══ 聚合（2026-09-22 改，第三版）：加权 (v1 + 2·v2 + v3) / 4 → 直接判档
       为什么要加权：v2 是他这一下（行动轮），权重给 2；侦察/反应各给 1。
       为什么不要“中位档”和“全好才大成功”这类额外规则：中位档会让 v2 的极值作废
       （后期 m2 再高也没用），而“三轮全好→大成功”在后期太容易触发（大成功 51% > 成功）。
       现在的实测分布（困难后期）：部分 47.1 / 成功 31.9 / 大成功 16.7 / 大失败 0 —— 顺了。 */
    var rolls=[rollAt(base,1),rollAt(base,2),rollAt(base,3)], mods=[m1,m2,m3], grades=[];
    var _v=[rolls[0]+m1,rolls[1]+m2,rolls[2]+m3];
    for(var i=0;i<3;i++) grades.push(grade(_v[i]));
    var 综合=grade(Math.round((_v[0]+2*_v[1]+_v[2])/4));`,
'聚合改加权');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共 ' + n + ' 处');

// 按设计表（D20 · 六、状态修正速查）忠实换算"他的判定分"，落地三轮公式
import fs from 'fs';
const F = '正则/状态栏.html';
let t = fs.readFileSync(F, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';

const 起点 = t.indexOf('    /* ══ 三档难度参数');
const 终点 = t.indexOf('    var m3=', 起点);
if (起点 < 0 || 终点 < 0) { console.log('⚠ 定位失败'); process.exit(1); }
const 终点行尾 = t.indexOf('\n', 终点);
const 旧块 = t.slice(起点, 终点行尾);

const 新块 = [
'    /* ══ 三档难度参数（2026-09-22；脚本 _work/check/_diff_search*.mjs）══',
'       目标：普通=势均力敌（60/75/90）｜困难=他慢慢占上风但一直被压（35/52/73）｜地狱=她绝对压制',
'       dk=DC 系数｜D=三轮修正｜gw=他的成长权重｜hk=她的增益 */',
'    var DIFF={"普通":{dk:0.45,D: 1,gw:0.6,hk:0.7},',
'              "困难":{dk:0.45,D:-2,gw:0.6,hk:1.4},',
'              "地狱":{dk:0.85,D:-4,gw:0.3,hk:0.7}};',
'    var df=DIFF[String(g("元数据",{}).难度||"普通")]||DIFF["困难"];',
'    var dc=Math.round((强制dc||(SKILLS[skill]?SKILLS[skill].dc:(isBack?15:12)))*df.dk);',
'    var 他观察=num((p.技能||{}).观察,10), 他意志=num((p.技能||{}).意志,15);',
'    var 他理智=num((p.心理||{}).理智,90), 他警觉=num(p.警觉度,0);',
'    var willFix=(skill==="拒绝"||skill==="意志")?Math.round((pSan-pDes)/10):0;',
'    var backFix=isBack?Math.round(hBack/10):0;',
'    /* ══ 三轮修正：直接按设计表换算成「他的得分」══',
'       （设计表 D20对抗判定系统 · 六 状态修正速查 是写在【她的总分】上的，取负就是他的得分）',
'       侦察轮 = 她兴奋藏不住(+a/20) − 她勇气(+c/10) + 他理智(+s/20) + 他警觉(+al/10) + 他观察技能',
'       行动轮 = 他技能 − DC×dk − 她痴迷(o/10)',
'       反应轮 = 他意志(+w/5) + 她信任心软(+t/10) + 后门受制(+b/20) − 她兴奋(a/10) − 她勇气(c/20)',
'       ★ 判据（用户 2026-09-22 确认）：她越有勇气、越痴迷 → 他越容易失败 ⇒ 她的项一律取负。',
'       注意「侦察轮的她兴奋」是唯一例外：她越兴奋越藏不住 → 对他有利 → 取正。 */',
'    var m1=Math.round(hExp*df.hk/20)-Math.round(hCou*df.hk/10)+Math.round(他理智/20)+Math.round(他警觉/10)+Math.round(他观察*df.gw/5)+df.D;',
'    var m2=Math.round(技*df.gw/5)-dc-Math.round(hObs*df.hk/10)+willFix+backFix+df.D;',
'    var m3=Math.round(他意志*df.gw/5)+Math.round(hTrust*df.hk/10)+Math.round(hBack/20)-Math.round(hExp*df.hk/10)-Math.round(hCou*df.hk/20)+df.D;',
].join(eol);

t = t.slice(0, 起点) + 新块 + t.slice(终点行尾);
fs.writeFileSync(F, t, 'utf8');
console.log('✓ 三轮公式已按设计表重写');
console.log('已替换的旧块长度：' + 旧块.length + ' 字符');

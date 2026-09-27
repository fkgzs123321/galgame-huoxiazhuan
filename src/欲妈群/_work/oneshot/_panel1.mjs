import fs from 'fs';
const F = '正则/状态栏.html';
let s = fs.readFileSync(F, 'utf8');
const before = s.length;
const 记 = [];
const add = (label, a, b) => {
  if (!s.includes(a)) { console.log('MISS ' + label); return; }
  s = s.replace(a, b); 记.push(label);
};

// ① 阶段边界表（玩法核心：玩家要知道本档她能到哪一步，才谈得上「拒绝哪个选项」）
add('阶段边界表', `function exposureOf(uid){`,
`// 每档能做到哪一步（服务玩法：玩家据此决定拦哪一条）
var STAGE_LINE = {
  1: "只能擦边：走光、凑近、借位置贴上来；手不落在他身上",
  2: "能趁睡动手：偷抚、口交、偷拍；他睁眼就全停",
  3: "能摆到明面上：体检／教学／示范这类名义之内全套都行，名义之外一步都不行",
  4: "那道线断了：只要一句称呼；能往外说（群内晒、带出场）",
  5: "没边界了：任意时间地点，公开也不避人；由她定什么时候停"
};
function exposureOf(uid){`);

// ② 郝佳期卡里加「本档能到」
add('本档能到（主角）', `  s+=lab("后门",h.后门进度,"var(--c-danger)");`,
`  s+='<div class="row"><span class="k">本档能到</span><span class="v" style="font-weight:400">'+esc(STAGE_LINE[num(h.阶段,1)]||"—")+"</span></div>";
  s+=lab("后门",h.后门进度,"var(--c-danger)");`);

// ③ 成员详情里也加一行
add('本档能到（成员）', `  s+=lab("后门",d.后门进度,"var(--c-danger)");`,
`  s+='<div class="row"><span class="k">本档能到</span><span class="v" style="font-weight:400">'+esc(STAGE_LINE[num(d.阶段,1)]||"—")+"</span></div>";
  s+=lab("后门",d.后门进度,"var(--c-danger)");`);

// ④ 专属从「任意键泛显示」改成具名（schema 已收敛成一个键）
add('专属具名', `  var ex=d.专属||{}, ek=Object.keys(ex);
  if(ek.length) s+='<div class="row"><span class="k">专属</span><span class="v" style="font-weight:400">'+ek.map(function(k){return esc(k)+" "+esc(ex[k])}).join(" · ")+"</span></div>";`,
`  var ex=d.专属||{};
  if(ex.竞技纪录!=null) s+='<div class="row"><span class="k">竞技纪录</span><span class="v">'+num(ex.竞技纪录)+"</span></div>";`);

// ⑤ 证据与暴露度补「门槛提示」（结局条件，玩家看得懂才谈得上自救）
add('证据门槛', `  if(ev.length) s+='<div class="row"><span class="k">证据</span><span class="v" style="font-weight:400">'+ev.map(esc).join(" · ")+"</span></div>";`,
`  if(ev.length) s+='<div class="row"><span class="k">证据</span><span class="v" style="font-weight:400">'+ev.map(esc).join(" · ")+(ev.length>=3?pill("已达法律结局线","danger"):"（满3件触发法律结局）")+"</span></div>";`);

// ⑥ 本轮判定结果条（玩家拒绝之后要看得见判了什么）
add('本轮判定条', `  var ev=p.证据清单||[];`,
`  var jp=p._本轮判定||{};
  if(jp.行为||jp.说明) s+='<div class="row"><span class="k">本轮判定</span><span class="v" style="font-weight:400">'+pill(jp.行为||"—")+(jp.综合?pill(jp.综合,(String(jp.综合).indexOf("大成功")>=0||String(jp.综合).indexOf("成功")>=0)?"hot":"warn"):"")+(jp.说明?" "+esc(jp.说明):"")+"</span></div>";
  var ev=p.证据清单||[];`);

fs.writeFileSync(F, s, 'utf8');
console.log('状态栏.html ' + before + ' → ' + s.length + '（' + 记.length + ' 处）');
console.log('  ' + 记.join('\n  '));

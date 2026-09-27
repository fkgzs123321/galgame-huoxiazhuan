// 面板选项区重构：4 格 ×（顺着/拒），点即判定即推送，去掉"选中→执行"两段式
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

// ① 删掉重复的那行默认选中
换(`  if(!S.pick){ var _pk=String(局.她已选||""); if(_pk && String((选项[_pk]||{}).文本||"").trim()) S.pick=_pk; }
  if(!S.pick){ var _pk=String(局.她已选||""); if(_pk && String((选项[_pk]||{}).文本||"").trim()) S.pick=_pk; }`,
`  if(!S.pick){ var _pk=String(局.她已选||""); if(_pk && String((选项[_pk]||{}).文本||"").trim()) S.pick=_pk; }`,
'清重复行');

// ② 选项区整段重写
换(
`  var 格=["一","二","三","四"].filter(function(k){return String((选项[k]||{}).文本||"").trim();});
  if(格.length){
    var 她选=String(局.她已选||"");
    s+='<div class="opt-head">她这一关摆出来的（点一条选中）'+(她选?"　★ 她挑的是第 "+她选+" 条":"")+'</div><div class="opts">';
    格.forEach(function(k){
      var o=选项[k]||{};
      s+='<button class="opt'+(S.pick===k?" picked":"")+'" data-act="pick" data-k="'+k+'"><b>'+k+'</b>'+esc(o.文本)+'<small>'+esc(o.等级||"微")+(o.代价?" · 代价："+esc(o.代价):"")+'</small></button>';
    });
    s+='</div>';
    s+='<div class="acts">'
      +'<button class="act" data-act="exec"'+(S.pick?"":" disabled")+'>看着（不拦）'+(S.pick?"·"+S.pick:"·先选一条")+'</button>'
      +'<button class="act refuse" data-act="refuse"'+(S.pick?"":" disabled")+'>拒绝这条'+(S.pick?"·"+S.pick:"·先选一条")+'</button></div>';
  }else{
    s+='<div class="opt-head">这一关她还没摆选项 —— 等她先出手（她会写进 局面.当前选项 的四格）。</div>';
  }`,
`  var 格=["一","二","三","四"].filter(function(k){return String((选项[k]||{}).文本||"").trim();});
  var 她选=String(局.她已选||"");
  if(格.length){
    s+='<div class="opt-head">她这一关摆出来的'+(她选?"　★ 她挑的是第 "+她选+" 条":"")+'<br>每条都有自己的技能与 DC ——「顺着」＝照做并推进，「拒」＝用意志硬拦。点了就直接判、直接推进下一轮。</div><div class="opts">';
    格.forEach(function(k){
      var o=选项[k]||{};
      var 技=String(o.技能||"行动"), dc=(DC表[String(o.等级||"微")]||12);
      s+='<div class="opt'+(她选===k?" picked":"")+'">'
        +'<b>'+k+'</b>'+esc(o.文本)
        +'<small>等级 '+esc(o.等级||"微")+' · 拦它用 <b>'+esc(技)+'</b>（DC'+dc+'）'+(o.代价?" · 代价："+esc(o.代价):"")+'</small>'
        +'<div class="opt-btns">'
        +'<button data-act="do" data-k="'+k+'">顺着</button>'
        +'<button data-act="no" data-k="'+k+'">拒</button>'
        +'</div></div>';
    });
    s+='</div>';
    s+='<div class="acts"><button class="act" data-act="watch">我不动，就看着她</button></div>';
  }else{
    s+='<div class="opt-head">这一关她还没摆选项 —— 等她先出手（她会写进 局面.当前选项 的四格）。</div>';
  }`,
'选项区重写');

// ③ 常量 DC表（提到外面，判定与显示共用）
换('    var DIFF={"普通":{dk:0.20,D: 0,gw:0.5,hk:0.6},',
   '    var DC表={"微":12,"中":15,"强":18,"极":22};\n    var DIFF={"普通":{dk:0.20,D: 0,gw:0.5,hk:0.6},', 'DC表常量');

// ④ 执行函数重写：做选项（顺着/拒）＋ 看着她
{
  const i = t.indexOf('/* 执行 / 拒绝她摆的那一条：判定 → 写变量 → 推给 AI */');
  const j = t.indexOf('async function doRoll(skill, 追发, 强制dc){');
  if (i < 0 || j < 0) { console.log('  ⚠ 执行函数段未定位 i=' + i + ' j=' + j); }
  else {
    const 新 = [
      '/* ══ 点了选项就直接走完：判定 → 写变量 → 推给 AI → 下一轮 ══',
      '   模式 do = 顺着（用这一格自己的技能）｜no = 拒（用意志硬拦） */',
      'async function 做选项(模式, k){',
      '  if(S.busy) return;',
      '  var 局=g("局面",{}), o=((局.当前选项||{})[k])||{};',
      '  var 文本=String(o.文本||"").trim();',
      '  if(!文本){ S.source="这一格是空的"; render(); return; }',
      '  var 等级=String(o.等级||"微");',
      '  var 技=(模式==="no")?"意志":String(o.技能||"行动");',
      '  var dc=(模式==="no")?12:(DC表[等级]||12);',
      '  var 头=(模式==="no")',
      '    ? "【我这轮的动作】我拒绝她摆的第"+k+"条：「"+文本+"」。"',
      '    : "【我这轮的动作】她摆的第"+k+"条：「"+文本+"」（"+等级+"级），我顺着做了。";',
      '  await doRoll(技, 头, dc);',
      '  try{',
      '    await writeStat(function(box){',
      '      box.局面=box.局面||{}; box.局面.当前选项=box.局面.当前选项||{};',
      '      box.局面.当前选项[k]={文本:"",等级:"微",代价:"",技能:"行动"};',
      '      if(模式==="do") box.局面.她已选=k;',
      '    });',
      '  }catch(e){ console.warn("[欲妈群] 清格子失败",e); }',
      '  S.pick="";',
      '  await refresh(false);',
      '}',
      '',
      '/* 我不动，就看着她 —— 不判定，直接把这句话推给 AI */',
      'async function 看着她(){',
      '  if(S.busy) return; S.busy=true; render();',
      '  try{',
      '    var 局=g("局面",{}), k=String(局.她已选||"");',
      '    var o=((局.当前选项||{})[k])||{};',
      '    var 文本=String(o.文本||"").trim()||"她这一关摆出来的那件事";',
      '    await 推给AI("【我这轮的动作】我什么都没做，就看着她。「"+文本+"」\\n★ 按她这一条往下写，不要自己另掷骰、不要改数值。");',
      '  }catch(e){ console.warn("[欲妈群] 看着她 失败",e); }',
      '  finally{ S.busy=false; render(); }',
      '}',
      '',
    ].join(eol);
    t = t.slice(0, i) + 新 + t.slice(j);
    n++; console.log('✓ 执行函数重写（做选项 / 看着她）');
  }
}

// ⑤ 事件绑定
换(`  else if(act==="pick"){ S.pick=(S.pick===el.getAttribute("data-k"))?"":el.getAttribute("data-k"); render(); }
  else if(act==="exec") 执行选项("exec");
  else if(act==="refuse") 执行选项("refuse");`,
`  else if(act==="do") 做选项("do", el.getAttribute("data-k"));
  else if(act==="no") 做选项("no", el.getAttribute("data-k"));
  else if(act==="watch") 看着她();`,
'事件 do/no/watch');

// ⑥ CSS：选项内两个按钮
换('button.act:disabled{opacity:.45;cursor:not-allowed}',
`button.act:disabled{opacity:.45;cursor:not-allowed}
.opt-btns{display:flex;gap:6px;margin-top:7px}
.opt-btns button{flex:1;padding:6px 8px;border-radius:7px;border:1px solid var(--c-border);background:var(--c-btn);color:var(--c-text);font-family:var(--font);font-size:var(--fs-xs);cursor:pointer;transition:.15s}
.opt-btns button:hover{background:var(--c-btn-hover)}
.opt-btns button:last-child{border-color:rgba(239,68,68,.5);background:rgba(239,68,68,.14)}
button.opt{display:block;width:100%;text-align:left;padding:9px 10px;border-radius:9px;border:1px solid var(--c-border);background:var(--c-surface);color:var(--c-text);font-family:var(--font);font-size:var(--fs-sm);line-height:1.55}
button.opt.picked{border-color:var(--c-primary-strong);box-shadow:inset 0 0 0 1px var(--c-primary-strong)}`,
'CSS 选项按钮');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共 ' + n + ' 处');

// ⑤-2 面板：选项区 + 选中态 + 判定 + 推送链路（照同级生2 的 写()）
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

// ── ① CSS
换('button.act small{display:block;font-size:var(--fs-xs);color:var(--c-text-faint);font-weight:400}',
`button.act small{display:block;font-size:var(--fs-xs);color:var(--c-text-faint);font-weight:400}
.opt-head{margin:6px 0;color:var(--c-text-faint);font-size:var(--fs-xs);line-height:1.5}
.opts{display:grid;gap:6px;margin-bottom:8px}
button.opt{display:block;width:100%;text-align:left;padding:8px 10px;border-radius:9px;border:1px solid var(--c-border);background:var(--c-surface);color:var(--c-text);font-family:var(--font);font-size:var(--fs-sm);line-height:1.55;cursor:pointer;transition:.15s}
button.opt:hover{background:var(--c-btn-hover)}
button.opt.picked{border-color:var(--c-primary-strong);background:var(--c-btn-active);box-shadow:inset 0 0 0 1px var(--c-primary-strong)}
button.opt b{color:var(--c-primary-strong);margin-right:5px}
button.opt small{display:block;margin-top:3px;font-size:var(--fs-xs);color:var(--c-text-faint);font-weight:400}
button.act:disabled{opacity:.45;cursor:not-allowed}`,
'CSS .opt');

// ── ② S 加选中态
换('var S={stat:null,msgId:null,source:"?",open:"hao_jiaqi",theme:"夜间",busy:false};',
   'var S={stat:null,msgId:null,source:"?",open:"hao_jiaqi",theme:"夜间",busy:false,pick:""};', 'S.pick');

// ── ③ renderDice 插入选项区
换(`  var s='<div class="card">'+hd("dice","行动判定","LCG 确定性骰")+'<div class="card-bd">';
  s+='<div class="acts">';`,
`  var s='<div class="card">'+hd("dice","行动判定","LCG 确定性骰")+'<div class="card-bd">';
  /* ══ 她这一关摆出来的（AI 写进 局面.当前选项，这里只渲染，不解析数据）══ */
  var 局=g("局面",{}), 选项=局.当前选项||{};
  var 格=["一","二","三","四"].filter(function(k){return String((选项[k]||{}).文本||"").trim();});
  if(格.length){
    s+='<div class="opt-head">她这一关摆出来的（点一条选中）</div><div class="opts">';
    格.forEach(function(k){
      var o=选项[k]||{};
      s+='<button class="opt'+(S.pick===k?" picked":"")+'" data-act="pick" data-k="'+k+'"><b>'+k+'</b>'+esc(o.文本)+'<small>'+esc(o.等级||"微")+(o.代价?" · 代价："+esc(o.代价):"")+'</small></button>';
    });
    s+='</div>';
    s+='<div class="acts">'
      +'<button class="act" data-act="exec"'+(S.pick?"":" disabled")+'>执行选中'+(S.pick?"（"+S.pick+"）":"（先选一条）")+'</button>'
      +'<button class="act refuse" data-act="refuse"'+(S.pick?"":" disabled")+'>拒绝这条</button></div>';
  }else{
    s+='<div class="opt-head">这一关她还没摆选项 —— 等她先出手（她会写进 局面.当前选项 的四格）。</div>';
  }
  s+='<div class="acts" style="margin-top:8px">';`,
'选项区');

// ── ④ 事件绑定
换(`  else if(act==="roll") doRoll(el.getAttribute("data-skill"));`,
`  else if(act==="roll") doRoll(el.getAttribute("data-skill"));
  else if(act==="pick"){ S.pick=(S.pick===el.getAttribute("data-k"))?"":el.getAttribute("data-k"); render(); }
  else if(act==="exec") 执行选项("exec");
  else if(act==="refuse") 执行选项("refuse");`,
'事件 pick/exec/refuse');

// ── ⑤ 推给AI + 执行选项（插在 doRoll 之前）
换('async function doRoll(skill){',
`/* ★ 推送链路（照 同级生2）：写进输入框 → 停一下让他看见 → 带内容发送 → 触发下一楼
   坑：/send 必须带参数，裸 /send 会发空值。 */
async function 推给AI(要发){
  try{
    if(typeof triggerSlash==="function"){
      await triggerSlash("/setinput "+JSON.stringify(要发));
      await new Promise(function(r){setTimeout(r,260);});
      await triggerSlash("/send "+JSON.stringify(要发));
      await triggerSlash("/trigger");
    }else{
      var ta=document.querySelector("#send_textarea")||(window.parent&&window.parent.document.querySelector("#send_textarea"));
      if(ta){ ta.value=要发; ta.dispatchEvent(new Event("input",{bubbles:true})); }
      if(typeof createChatMessages==="function"){ await createChatMessages([{role:"user",content:要发}]); }
    }
    return true;
  }catch(e){ console.error("[欲妈群] 推送失败",e); S.source="推送失败"; return false; }
}

/* 执行 / 拒绝她摆的那一条：判定 → 写变量 → 推给 AI */
async function 执行选项(模式){
  if(S.busy) return;
  var k=S.pick;
  if(!k){ S.source="先选一条"; render(); return; }
  var 局=g("局面",{}), o=((局.当前选项||{})[k])||{};
  var 文本=String(o.文本||"").trim();
  if(!文本){ S.source="这一条是空的"; render(); return; }
  var 等级=String(o.等级||"微");
  var dcMap={微:12,中:15,强:18,极:22};
  var skill=(模式==="refuse")?"意志":"行动";
  var 头=(模式==="refuse")
    ? "【我这轮的动作】我拒绝她摆的第"+k+"条：「"+文本+"」。"
    : "【我这轮的动作】她摆的第"+k+"条：「"+文本+"」（"+等级+"级）。我按了执行。";
  await doRoll(skill, 头, dcMap[等级]||12);
  /* 处理过的这一格清空；执行则记下她已选 */
  try{
    await writeStat(function(box){
      box.局面=box.局面||{}; box.局面.当前选项=box.局面.当前选项||{};
      box.局面.当前选项[k]={文本:"",等级:"微",代价:""};
      if(模式==="exec") box.局面.她已选=k;
    });
  }catch(e){ console.warn("[欲妈群] 清格子失败",e); }
  S.pick="";
  await refresh(false);
}

async function doRoll(skill, 追发, 强制dc){`,
'推给AI + 执行选项');

// ── ⑥ doRoll 支持强制 DC
换('    var dc=(SKILLS[skill]?SKILLS[skill].dc:(isBack?15:12));',
   '    var dc=(强制dc||(SKILLS[skill]?SKILLS[skill].dc:(isBack?15:12)));', 'doRoll 强制DC');

// ── ⑦ doRoll 里加技能成长（写入回调内）+ 判定后推送
换(`      box.玩家._本轮判定={行为:skill,投掷:rolls,综合:综合,警觉:警觉,说明:说明};`,
`      box.玩家._本轮判定={行为:skill,投掷:rolls,综合:综合,警觉:警觉,说明:说明};
      /* ★ 技能成长也走面板（AI 不碰）：大成功 +3 ／ 成功 +2 ／ 其余 +1，上限 100 */
      if(skill==="观察"||skill==="行动"||skill==="意志"){
        var _g=(综合==="大成功"?3:(综合==="成功"?2:1));
        box.玩家.技能=box.玩家.技能||{};
        box.玩家.技能[skill]=Math.min(100,num(box.玩家.技能[skill],0)+_g);
      }`,
'技能成长');

换(`    if(!ok) S.source="写入失败";
    await refresh(false);`,
`    if(!ok) S.source="写入失败";
    /* ★ 判定完就把结果推给 AI —— AI 只负责写这一轮，不再自己掷骰 */
    if(追发){
      var 摘要=追发
        +"\\n【判定】Day"+day+" "+String(hour).padStart(2,"0")+":00 · "+skill+" · DC"+dc
        +" · 三轮 "+rolls.join("/")+"（修正 "+mods.map(function(x){return x>=0?"+"+x:""+x;}).join("/")+"）"
        +" · 综合 "+综合+(警觉?" · 警觉"+(警觉>0?"+":"")+警觉:"")
        +"\\n【结果】"+说明
        +"\\n★ 按上面这个结果写这一轮：你不是裁判，不要自己另掷骰、不要改数值、不要重算。";
      await 推给AI(摘要);
    }
    await refresh(false);`,
'判定后推送');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共 ' + n + ' 处');

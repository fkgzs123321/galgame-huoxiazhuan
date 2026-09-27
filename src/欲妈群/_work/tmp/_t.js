
var S={stat:null,msgId:null,source:"?",结果:""};
var 世界={ msg:{ 5:{ stat_data:{ 郝佳期:{ 阶段:5, 心理:{ 勇气:100, 痴迷:90, 兴奋:70 }, 后门进度:100 },
                              玩家:{ 技能:{观察:80,行动:80,意志:80}, 心理:{理智:50}, 警觉度:60 } } } },
           chat:{} };
function lastMsgId(){ return 5; }
function getVariables(o){ return o && o.type==='chat' ? 世界.chat : 世界.msg[5]; }
function updateVariablesWith(fn, o){
  var box = (o.type==='chat') ? 世界.chat : 世界.msg[5];
  fn(box);
  日志.push('updateVariablesWith(' + o.type + ')');
}
var 日志=[];
function num(v,d){ var n=Number(v); return isFinite(n)?n:(d||0); }
function mix32(x){ x=Math.imul(x^(x>>>16),2246822507); x=Math.imul(x^(x>>>13),3266489909); return (x^(x>>>16))>>>0; }
function rollAt(base,kn){ return (mix32(lcg(base)+kn*7919)%20)+1; }
function grade(t){ if(t<=5)return "大失败"; if(t<=10)return "失败"; if(t<=15)return "部分成功"; if(t<=19)return "成功"; return "大成功"; }
var DELTA={"大失败":15,"失败":10,"勉强成功":5,"成功":1,"大成功":0};
var EVENT_BAD=["撞见：他或第三方中途醒来/闯入，行为被迫中断","留证：水渍与纸团被发现，他起疑","目击：邻居看见她从这门进","惊动：他被惊醒没看清，警觉+5、她暴露恐惧+10","误发：照片错发到班级群，群暴露风险上升","设备：手机被她落在客厅，被他先看到"];
var EVENT_GOOD=["顺水推舟：目标睡梦中彻底配合","线索反用：他手里的线索被她反过来利用","地位提升：苏媚点赞，积分+10~+20","痴迷加深：她对儿子的痴迷+5~+10","克制反噬：他事后罪恶感回升，察觉+1","意外发现：翻到日记或调查痕迹"];

/* ====== 渲染 ====== */
function renderTop(){
  var m=g("元数据",{}), day=num(m.日数,1), exam=num(m.高考日,100), remain=Math.max(0,exam-day);
  var s='<div class="card">'+hd("him","欲妈群","v3")+'<div class="card-bd">';
  s+='<div class="row"><span class="k">时间</span><span class="v">Day '+day+" · "+esc(m.时段||"—")+" "+String(num(m.小时,0)).padStart(2,"0")+":00 · 回合"+num(m.回合,0)+"</span></div>";
  s+='<div class="row"><span class="k">距高考</span>'+bar(day/exam*100,"var(--c-info)")+'<span class="v">'+remain+" 天</span></div>";
  s+='<div class=\"row\"><span class=\"k\">难度</span><span class=\"v\">'+pill(取难度())+"</span></div>";
  var guard=g("阶段守卫",{});
  if(guard.结局已触发) s+='<div class="row"><span class="k">结局</span><span class="v">'+pill(guard.结局类型||"已触发","danger")+"</span></div>";
  return s+"</div></div>";
}

function rollAt(base,kn){ return (mix32(lcg(base)+kn*7919)%20)+1; }
function grade(t){ if(t<=5)return "大失败"; if(t<=10)return "失败"; if(t<=15)return "部分成功"; if(t<=19)return "成功"; return "大成功"; }
var DELTA={"大失败":15,"失败":10,"勉强成功":5,"成功":1,"大成功":0};
var EVENT_BAD=["撞见：他或第三方中途醒来/闯入，行为被迫中断","留证：水渍与纸团被发现，他起疑","目击：邻居看见她从这门进","惊动：他被惊醒没看清，警觉+5、她暴露恐惧+10","误发：照片错发到班级群，群暴露风险上升","设备：手机被她落在客厅，被他先看到"];
var EVENT_GOOD=["顺水推舟：目标睡梦中彻底配合","线索反用：他手里的线索被她反过来利用","地位提升：苏媚点赞，积分+10~+20","痴迷加深：她对儿子的痴迷+5~+10","克制反噬：他事后罪恶感回升，察觉+1","意外发现：翻到日记或调查痕迹"];

/* ====== 渲染 ====== */
function renderTop(){
  var m=g("元数据",{}), day=num(m.日数,1), exam=num(m.高考日,100), remain=Math.max(0,exam-day);
  var s='<div class="card">'+hd("him","欲妈群","v3")+'<div class="card-bd">';
  s+='<div class="row"><span class="k">时间</span><span class="v">Day '+day+" · "+esc(m.时段||"—")+" "+String(num(m.小时,0)).padStart(2,"0")+":00 · 回合"+num(m.回合,0)+"</span></div>";
  s+='<div class="row"><span class="k">距高考</span>'+bar(day/exam*100,"var(--c-info)")+'<span class="v">'+remain+" 天</span></div>";
  s+='<div class=\"row\"><span class=\"k\">难度</span><span class=\"v\">'+pill(取难度())+"</span></div>";
  var guard=g("阶段守卫",{});
  if(guard.结局已触发) s+='<div class="row"><span class="k">结局</span><span class="v">'+pill(guard.结局类型||"已触发","danger")+"</span></div>";
  return s+"</div></div>";
}

function judgeTier(D, ok){
  if(ok){ if(D>=30) return "大成功"; if(D>=10) return "成功"; return "勉强成功"; }
  if(D<=-30) return "大失败";
  return "失败";
}

function 取难度(){
  /* ★ 难度存【chat 层】—— 开局表单按同级生2 的写法先写 chat 层（切 swipe 会重建 message 层的变量，chat 层不动）。
     所以这里【先读 chat】，再回落到 stat_data，都没有才用普通。 */
  try{ if(typeof getVariables==="function"){ var c=getVariables({type:/chat/})||{}; var b=String(c.欲妈群难度||""); if(难度档[b]) return b; } }catch(e){}
  var a=String((g("元数据",{})||{}).难度||"");
  if(难度档 && 难度档[a]) return a;
  return "普通";
}

function writeStat(mut){
  var id=(S.msgId!=null)?S.msgId:lastMsgId();
  var ok=false;
  function 跑(opt){
    try{
      if(typeof updateVariablesWith!=="function") return false;
      updateVariablesWith(function(x){
        x=x||{};
        if(!x.stat_data) x.stat_data={};
        mut(x.stat_data);
        return x;
      }, opt);
      return true;
    }catch(e){ console.warn("[欲妈群] 写入失败",e); return false; }
  }
  if(id!=null) ok = 跑({type:/message/, message_id:id}) || ok;
  ok = 跑({type:/chat/}) || ok;
  return ok;
}

function num(v,d){ var n=Number(v); return isFinite(n)?n:(d||0); }
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]}); }
function pct(v){ return Math.max(0,Math.min(100,num(v,0))); }
function bar(v,color,marks){
  var n=pct(v),h='<span class="bar"><i style="width:'+n+'%;background:'+(color||"var(--c-primary)")+'"></i>';
  (marks||[]).forEach(function(m){ h+='<span class="mk" style="left:'+m+'%"></span>'; });
  return h+"</span>";
}

function g(p,d){ return _.get(S.stat,p,d); }
/* ★ 取难度（2026-09-22）：优先读 stat_data.元数据.难度；读不到就读 chat 层的 欲妈群难度 兜底
   —— 因为开局表单在第 0 楼写、而面板读最新楼层，一旦有后续楼层就可能读不到。 */
function 取难度(){
  /* ★ 难度存【chat 层】—— 开局表单按同级生2 的写法先写 chat 层（切 swipe 会重建 message 层的变量，chat 层不动）。
     所以这里【先读 chat】，再回落到 stat_data，都没有才用普通。 */
  try{ if(typeof getVariables==="function"){ var c=getVariables({type:/chat/})||{}; var b=String(c.欲妈群难度||""); if(难度档[b]) return b; } }catch(e){}
  var a=String((g("元数据",{})||{}).难度||"");
  if(难度档 && 难度档[a]) return a;
  return "普通";
}

function lastMsgId(){
  try{ if(typeof getLastMessageId==="function") return getLastMessageId(); }catch(e){}
  try{ var f=window.frameElement; if(f&&f.closest){var m=f.closest(".mes"); if(m&&m.getAttribute("mesid")!=null) return Number(m.getAttribute("mesid"));} }catch(e){}
  return null;
}

var 基础要求={"微":5,"中":10,"强":20,"极":35};   // 她这一关的底（小 —— 她起步时要求本来就不高）

var 难度档={"普通":{基:0.30,强:0.62,阶:1.43},
            "困难":{基:2.80,强:0.29,阶:0.87},
            "地狱":{基:4.80,强:1.00,阶:0.53}};

var 阶修表={"1":0,"2":4,"3":9,"4":15,"5":24};     // 阶段修正加在【她的要求】上，不是扣他的分

var 权重表={"识破":[3,1,1], "拦住":[1,3,1], "扛住":[1,1,3], "全场":[1,1,1]};

var 她项表={"识破":"勇气", "拦住":"痴迷", "扛住":"兴奋", "全场":""};

var DELTA={"大失败":15,"失败":10,"勉强成功":5,"成功":1,"大成功":0};

var S={stat:null,msgId:null,source:"?",open:"hao_jiaqi",theme:"夜间",pick:"",cx:"",结果:""};

var SKILLS={观察:{dc:12},行动:{dc:10},意志:{dc:12}};
// 模拟 doRoll 的写回（三层：玩家._本轮判定 / 局面.判定结果 / 技能成长）
var 结果 = writeStat(function(box){
  box.玩家=box.玩家||{};
  box.玩家._本轮判定={行为:"行动",综合:"成功"};
  box.局面=box.局面||{};
  box.局面.判定结果={选项:"她伸手隔布握住",技能:"意志",难度:"困难",结果:"成功",成功率:78,掷值:41};
});
console.log('══ 验证：同步 writeStat ══');
console.log('  writeStat 返回值        = ' + 结果 + '（true = 写成功）');
console.log('  调用记录                = ' + JSON.stringify(日志));
console.log('  message 层 局面.判定结果 = ' + JSON.stringify(世界.msg[5].stat_data.局面.判定结果));
console.log('  chat 层   局面.判定结果 = ' + JSON.stringify(世界.chat.stat_data && 世界.chat.stat_data.局面 && 世界.chat.stat_data.局面.判定结果));
console.log('  有没有 await / Promise   = 无（writeStat 现在是同步函数，返回值直接是 boolean）');
console.log('');
console.log('══ 验证：判定链（E3）══');
const 她={勇气:100,痴迷:90,兴奋:70,阶段:5};
const P1=(80*3+50*1+60*1)/5, P2=80, P3=(80*3+100*1)/4, w=[1,3,1];
const P=(P1*w[0]+P2*w[1]+P3*w[2])/(w[0]+w[1]+w[2]);
const 档=难度档["困难"];
const R=Math.max(0,Math.min(100,Math.round(10*档.基*(1+90/100*档.强)+阶修表["5"]*档.阶)));
const D=P-R, S2=Math.max(5,Math.min(95,Math.round(50+D)));
console.log('  P=' + P.toFixed(1) + '（P1 ' + P1.toFixed(0) + ' / P2 ' + P2 + ' / P3 ' + P3.toFixed(0) + '）　R=' + R + '　D=' + D.toFixed(1) + '　成功率 ' + S2 + '%');
console.log('  档位 = ' + judgeTier(D, rollAt(12345) < S2) + '（judgeTier(D, 成败) 由差值+成败联合给）');
console.log('  取难度() = ' + 取难度() + '（chat 层没有 → 回落默认）');

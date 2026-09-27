// 状态栏：剩下三处（周竞赛历史默认值 / 渲染 / D20历史写入）+ 新增自动记账
import fs from 'fs';
const F = '正则/状态栏.html';
let t = fs.readFileSync(F, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';
let n = 0;
const rep = (a, b, tag) => { const c = t.split(a).length - 1; if (!c) { console.log('⚠ 未命中 ' + tag); return; } t = t.split(a).join(b); n += c; console.log('✓ ' + c + ' 处  ' + tag); };

// ① 默认值
rep('周冠军UID:"hao_jiaqi",周竞赛历史:[]', '周冠军UID:"hao_jiaqi",周竞赛历史:""', '默认值 周竞赛历史');

// ② 渲染：字符串取最后一段
rep(
`  var wk=gr.周竞赛历史||[];
  if(wk.length){ var lastW=wk[wk.length-1];
    s+='<div class="row"><span class="k">上期结算</span><span class="v">'+esc(lastW.冠军名||"—")+"（周起始 Day"+num(lastW.周起始日)+"·"+num(lastW.获胜次数)+' 冠）</span></div>'; }`,
`  var wk=String(gr.周竞赛历史||"").split("；").filter(Boolean);
  if(wk.length){ var lw=wk[wk.length-1].split("|");
    s+='<div class="row"><span class="k">上期结算</span><span class="v">'+esc(lw[1]||"—")+"（周起始 Day"+num(lw[0],1)+'）</span></div>'; }`,
  '渲染 周竞赛历史');

// ③ 写入：D20历史 改成字符串段（含日/时/行为/综合/警觉/后门）
rep(
`    var rec={日:day,时:hour,行为:skill,
      轮:grades.map(function(gd,i){return {类型:["侦察","行动","反应"][i],投掷:rolls[i],修正:mods[i],合计:rolls[i]+mods[i],结果:gd}}),
      综合:综合,警觉:警觉,察觉:""};`,
`    var rec="Day"+day+" "+String(hour).padStart(2,"0")+":00 · "+skill+" · "+综合+(警觉?" · 警觉+"+警觉:"")+(backOk?" · 后门已利用":"")+(说明?" · "+说明:"");`,
  '写入 rec 换成字符串段');
rep(
`      box.玩家.D20历史=Array.isArray(box.玩家.D20历史)?box.玩家.D20历史:[];
      box.玩家.D20历史.push(rec);
      if(box.玩家.D20历史.length>10) box.玩家.D20历史=box.玩家.D20历史.slice(-10);`,
`      var _h=String(box.玩家.D20历史||"").split("；").filter(Boolean);
      _h.push(rec);
      box.玩家.D20历史=_h.slice(-10).join("；");`,
  '写入 D20历史');

// ④ 新增：自动记账（30天已用主题 / 周竞赛历史），并在 refresh 里调用
rep(
`  }finally{ S.busy=false; loadTheme(); render(); }
}`,
`  }finally{ S.busy=false; }
  try{ await maintainLedger(); }catch(e){ console.warn("[欲妈群] 记账失败",e); }
  loadTheme(); render();
}
/* 系统记账：这几个列表由面板维护，变量模型不写（Zod 卡没有可扩展数组，AI 一 add 就报 SCHEMA 违规） */
async function maintainLedger(){
  var box=S.stat||DEFAULT_STAT, gr=box.群||{}, md=box.元数据||{};
  var theme=String(gr.今日主题||"").trim(); if(!theme) return;
  var day=num(md.日数,1), weekStart=Math.max(1, day-((day-1)%7));
  var champ=String(gr.周冠军UID||""), champName=(champ==="hao_jiaqi")?"郝佳期":nameOf(champ);
  var needUsed=String(gr["30天已用主题"]||"").split("、").filter(Boolean).indexOf(theme)<0;
  var hist=String(gr.周竞赛历史||"").split("；").filter(Boolean);
  var needWeek=(day%7===0)&&!!champ&&!hist.some(function(x){return x.split("|")[0]===String(weekStart);});
  if(!needUsed&&!needWeek) return;
  await writeStat(function(b){
    b.群=b.群||{};
    if(needUsed){
      var a=String(b.群["30天已用主题"]||"").split("、").filter(Boolean);
      if(a.indexOf(theme)<0) a.push(theme);
      b.群["30天已用主题"]=a.slice(-30).join("、");
    }
    if(needWeek){
      var c=String(b.群.周竞赛历史||"").split("；").filter(Boolean);
      if(!c.some(function(x){return x.split("|")[0]===String(weekStart);})) c.push(weekStart+"|"+champName);
      b.群.周竞赛历史=c.slice(-8).join("；");
    }
  });
  S.stat=null; var st=await readStat(); if(st) S.stat=st;
}`,
  '新增 maintainLedger + 挂进 refresh');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共 ' + n + ' 处');

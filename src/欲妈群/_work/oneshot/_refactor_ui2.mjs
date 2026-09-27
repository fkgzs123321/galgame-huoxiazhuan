// 收尾两处：周竞赛历史渲染（按行替换）+ 新增 maintainLedger
import fs from 'fs';
const F = '正则/状态栏.html';
let t = fs.readFileSync(F, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';
let n = 0;
const L = () => t.split(/\r?\n/);

// ① 按行替换 周竞赛历史 渲染（3 行）
{
  const a = L();
  const s = a.findIndex(l => l.includes('var wk=gr.周竞赛历史'));
  if (s < 0) console.log('⚠ 找不到 周竞赛历史 渲染行');
  else {
    const nl = [
      '  var wk=String(gr.周竞赛历史||"").split("；").filter(Boolean);',
      '  if(wk.length){ var lw=wk[wk.length-1].split("|");',
      '    s+=\'<div class="row"><span class="k">上期结算</span><span class="v">\'+esc(lw[1]||"—")+"（周起始 Day"+num(lw[0],1)+"）</span></div>\'; }',
    ];
    a.splice(s, 3, ...nl);
    t = a.join(eol); n++;
    console.log('✓ 周竞赛历史渲染 L' + (s + 1) + '-L' + (s + 3));
  }
}

// ② 新增 maintainLedger 并挂进 refresh
{
  const anchor = '  }finally{ S.busy=false; loadTheme(); render(); }';
  const add = `  }finally{ S.busy=false; }
  try{ await maintainLedger(); }catch(e){ console.warn("[欲妈群] 记账失败",e); }
  loadTheme(); render();
}
/* 系统记账：这三个列表由面板维护，变量模型不写。
   （Zod 卡拿不到 extensible，AI 只要对数组用 add 就会被 MVU 判 SCHEMA 违规） */
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
}`;
  const c = t.split(anchor).length - 1;
  if (!c) console.log('⚠ 找不到 refresh 的 finally 锚点');
  else { t = t.split(anchor).join(add.split('\n').join(eol)); n++; console.log('✓ maintainLedger 已挂进 refresh'); }
}

fs.writeFileSync(F, t, 'utf8');
console.log('共 ' + n + ' 处');

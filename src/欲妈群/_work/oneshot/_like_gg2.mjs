// 照 旮旯给木-同级生2：删掉所有推送、去掉 busy/spin、判定结果写进 局面.判定结果 + 面板显示
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

// ① 交给她判：不推送，改成"写一个待判请求进局面 + 面板提示"
换(`    await 推给AI("【我这轮想做】"+文+"\\n"
      +"★ 请判断这件事该用哪个技能（观察／行动／意志）、什么等级（微／中／强／极）、主对（识破／拦住／扛住／全场），"
      +"然后写进变量：\\n"
      +"{\\"op\\":\\"replace\\",\\"path\\":\\"/局面/自定义/文本\\",\\"value\\":\\""+文.replace(/"/g,'')+"\\"}\\n"
      +"{\\"op\\":\\"replace\\",\\"path\\":\\"/局面/自定义/技能\\",\\"value\\":\\"行动\\"}\\n"
      +"{\\"op\\":\\"replace\\",\\"path\\":\\"/局面/自定义/等级\\",\\"value\\":\\"中\\"}\\n"
      +"{\\"op\\":\\"replace\\",\\"path\\":\\"/局面/自定义/主对\\",\\"value\\":\\"拦住\\"}\\n"
      +"{\\"op\\":\\"replace\\",\\"path\\":\\"/局面/自定义/待掷\\",\\"value\\":true}\\n"
      +"你自己这次不要掷骰，等她按你给的技能与难度掷完再把结果推给你。");`,
`    /* 照 旮旯给木-同级生2：不推送、不 await。只把这句话写进变量，面板提示他自己发一句；
       她（AI）下一轮读 局面.自定义.待判 就会判它该用什么技能/等级/主对。 */
    await writeStat(function(box){
      box.局面=box.局面||{}; box.局面.自定义=box.局面.自定义||{};
      box.局面.自定义={文本:文, 技能:"", 等级:"", 主对:"", 待判:true, 待掷:false};
    });
    S.结果="已经记下来了：「"+文+"」。现在你自己发一句话（比如「我这样做」）—— 她会判这件事该用什么技能与难度。";`,
   '交给她判 改写变量');

// ② doRoll：删掉推送，改成把结果写进 局面.判定结果
换(`    if(!ok) S.source="写入失败";
    /* ★ 判定完就把结果推给 AI —— AI 只负责写这一轮，不再自己掷骰 */
    if(追发){
      var 摘要=追发
        +"\\n【判定】Day"+day+" "+String(hour).padStart(2,"0")+":00 · "+skill+" · 难度"+难度名
        +"\\n　　能力 P="+Math.round(P)+"　她的要求 R="+R+"　差值 D="+D+"　成功率 "+S+"%　掷出 "+V
        +"　→ "+综合+(警觉?" · 警觉"+(警觉>0?"+":"")+警觉:"")+_ev
        +"\\n【结果】"+说明
        +"\\n★ 按上面这个结果写这一轮：你不是裁判，不要自己另掷骰、不要改数值、不要重算。";
      await 推给AI(摘要);
    }
    await refresh(false);`,
`    if(!ok) S.source="写入失败";
    /* ★ 照 旮旯给木-同级生2：不推送。判定结论写进 局面.判定结果，她（AI）下一轮读它就知道发生了什么。 */
    try{
      await writeStat(function(box){
        box.局面=box.局面||{};
        box.局面.判定结果={ 选项:String(追发||skill), 技能:skill, 难度:难度名, 等级:String(等级||""),
          P:Math.round(P), R:R, D:D, 成功率:S, 掷值:V, 结果:综合, 警觉:警觉, 说明:说明 };
      });
    }catch(e){ console.warn("[欲妈群] 写判定结果失败",e); }
    S.结果=说明+"　（P"+Math.round(P)+" − R"+R+" = D"+D+"　成功率"+S+"%　掷"+V+" → "+综合+"）";
    await refresh(false);`,
   'doRoll 结果改写变量');

// ③ 去掉 busy（转圈的根源）：所有 `if(S.busy) return; S.busy=true;` → 直接执行
{
  const 前 = (t.match(/if\(S\.busy\) return; S\.busy=true; render\(\);/g) || []).length;
  t = t.split('if(S.busy) return; S.busy=true; render();').join('/* 不用 busy：同级生2 没有这个，busy 一卡住右上角 ✦ 就永远转 */');
  const 后2 = (t.match(/finally\{ S\.busy=false; render\(\); \}/g) || []).length;
  t = t.split('finally{ S.busy=false; render(); }').join('render();');
  t = t.split('    if(!文){ S.source="先写一句"; S.busy=false; render(); return; }').join('    if(!文){ S.source="先写一句"; render(); return; }');
  换('  if(showBusy){ S.busy=true; render(); }', '  if(showBusy){ render(); }', 'refresh 去 busy');
  t = t.replace("    if(!ok) S.source=\"写入失败\";", "    if(!ok) S.source=\"写入失败\";");
  console.log('✓ 去 busy：' + 前 + ' 处守卫 / ' + 后2 + ' 处 finally');
  n += 前 + 后2;
}
// spin 永不触发（busy 恒为 false）
换(`return '<div class="card-hd">'+ICON[icon]+'<span>'+esc(title)+'</span>'+(tag?'<span class="tag">'+esc(tag)+"</span>":"")+'<button class="hd-btn'+(S.busy?" spin":"")+'" data-act="refresh">✦</button></div>';`,
   `return '<div class="card-hd">'+ICON[icon]+'<span>'+esc(title)+'</span>'+(tag?'<span class="tag">'+esc(tag)+"</span>":"")+'<button class="hd-btn" data-act="refresh">✦</button></div>';`,
   '✦ 不再 spin');

// ④ S 里加 结果 字段
换("var S={stat:null,msgId:null,source:\"?\",open:\"hao_jiaqi\",theme:\"夜间\",busy:false,pick:\"\",cx:\"\"};",
   "var S={stat:null,msgId:null,source:\"?\",open:\"hao_jiaqi\",theme:\"夜间\",pick:\"\",cx:\"\",结果:\"\"};",
   'S.结果');

// ⑤ 面板里显示判定结果（照同级生2 的 res 块）
换(`    s+='<div class="acts"><button class="act" data-act="watch">我不动，就看着她</button></div>';`,
`    s+='<div class="acts"><button class="act" data-act="watch">我不动，就看着她</button></div>';
    if(S.结果){ s+='<div class="res">'+esc(S.结果)+'</div>'; }`,
   '显示判定结果');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共 ' + n + ' 处');

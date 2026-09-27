// ③ 自定义操作：局面.自定义 变量 + 面板输入框 + 两段式（交给她判 → 掷骰）
import fs from 'fs';
const eolOf = t => (t.includes('\r\n') ? '\r\n' : '\n');
let n = 0;
const 换 = (f, pairs, tag) => {
  let t = fs.readFileSync(f, 'utf8'); const eol = eolOf(t); let hit = 0;
  for (const [a, b] of pairs) {
    const A = a.split('\n').join(eol), B = b.split('\n').join(eol);
    const c = t.split(A).length - 1;
    if (!c) { console.log('  ⚠ 未命中 ' + tag + '：' + a.slice(0, 30)); continue; }
    t = t.split(A).join(B); hit += c;
  }
  if (hit) { fs.writeFileSync(f, t, 'utf8'); n += hit; }
  console.log((hit ? '✓' : '·') + ' ' + tag.padEnd(22) + hit);
};

// ── ① schema：局面 加 自定义
换('schema.ts', [[
  `  她已选: str(''),                                 // 她从中挑走的那一条（一/二/三/四）
}).prefault({});`,
  `  她已选: str(''),                                 // 她从中挑走的那一条（一/二/三/四）
  自定义: z.object({                               // ★ 玩家自己写要做的事：先交给她判，判完面板再掷骰
    文本: str(''),
    技能: z.enum(['观察', '行动', '意志']).prefault('行动').catch('行动'),
    等级: z.enum(['微', '中', '强', '极']).prefault('中').catch('中'),
    主对: z.enum(['识破', '拦住', '扛住', '全场']).prefault('拦住').catch('拦住'),
    待掷: bool(false),
  }).prefault({}),
}).prefault({});`,
]], 'schema 自定义');

// ── ② 5 份 initvar：局面 加 自定义
for (const f of ['世界书/变量/initvar.yaml', '开场白/initvar/1.yaml', '开场白/initvar/2.yaml', '开场白/initvar/3.yaml', '开场白/initvar/4.yaml']) {
  const raw = fs.readFileSync(f, 'utf8'); const eol = eolOf(raw);
  if (raw.includes('自定义:')) { console.log('· ' + f.split('/').pop() + ' 已有'); continue; }
  const a = '  她已选: ""';
  if (!raw.includes(a)) { console.log('  ⚠ ' + f + ' 找不到 她已选'); continue; }
  const b = ['  她已选: ""', '  自定义:', '    文本: ""', '    技能: 行动', '    等级: 中', '    主对: 拦住', '    待掷: false'].join(eol);
  fs.writeFileSync(f, raw.replace(a, b), 'utf8'); n++;
  console.log('✓ ' + f.split('/').pop().padEnd(20) + '加 自定义');
}

// ── ③ 面板：自定义区（放在选项区之后）
换('正则/状态栏.html', [[
  `    s+='<div class="acts"><button class="act" data-act="watch">我不动，就看着她</button></div>';
  }else{
    s+='<div class="opt-head">这一关她还没摆选项 —— 等她先出手（她会写进 局面.当前选项 的四格）。</div>';
  }`,
  `    s+='<div class="acts"><button class="act" data-act="watch">我不动，就看着她</button></div>';
  }else{
    s+='<div class="opt-head">这一关她还没摆选项 —— 等她先出手（她会写进 局面.当前选项 的四格）。</div>';
  }
  /* ══ 自定义：他想做别的 —— 先交给她判（AI 定技能/等级/主对），判完这里出「掷」 ══ */
  var 自=局.自定义||{};
  s+='<div class="cx"><div class="cx-h">我自己要做别的（写一句你想做的，交给她判）</div>';
  s+='<input class="cx-in" id="ymq-cx" placeholder="例：翻身把脸埋进枕头里，装作还在睡" value="'+esc(S.cx||"")+'">';
  if(String(自.文本||"").trim() && 自.待掷){
    s+='<div class="cx-ready">她已经判过：「'+esc(自.文本)+'」→ 用 <b>'+esc(自.技能)+'</b>（DC'+((DC表[String(自.等级||"中")])||15)+'）· 考验 <b>'+esc(自.主对)+'</b></div>';
    s+='<div class="acts"><button class="act" data-act="rollcx">掷骰，看看成不成</button>'
      +'<button class="act" data-act="cxcancel">算了，不做了</button></div>';
  }else{
    s+='<div class="acts"><button class="act" data-act="askcx"'+(String(S.cx||"").trim()?"":" disabled")+'>交给她判（她会定技能与难度）</button></div>';
  }
  s+='</div>';`,
]], '面板 自定义区');

// ── ④ 事件：输入同步 + 三个动作
换('正则/状态栏.html', [[
  '  else if(act==="watch") 看着她();',
  `  else if(act==="watch") 看着她();
  else if(act==="askcx") 交给她判();
  else if(act==="rollcx") 掷自定义();
  else if(act==="cxcancel") 取消自定义();`,
]], '事件 自定义');
换('正则/状态栏.html', [[
  'document.addEventListener("click",function(ev){',
  `document.addEventListener("input",function(ev){
  var el=ev.target; if(el&&el.id==="ymq-cx"){ S.cx=el.value; var b=document.querySelector('[data-act="askcx"]'); if(b) b.disabled=!String(S.cx||"").trim(); }
},false);
document.addEventListener("click",function(ev){`,
]], '输入监听');
换('正则/状态栏.html', [[
  "var S={stat:null,msgId:null,source:\"?\",open:\"hao_jiaqi\",theme:\"夜间\",busy:false,pick:\"\"};",
  "var S={stat:null,msgId:null,source:\"?\",open:\"hao_jiaqi\",theme:\"夜间\",busy:false,pick:\"\",cx:\"\"};",
]], 'S.cx');

// ── ⑤ 三个函数（插在 看着她 之后）
换('正则/状态栏.html', [[
  'async function doRoll(skill, 追发, 强制dc, 主对){',
  `/* 自定义三步：① 交给她判（AI 定技能/等级/主对）→ ② 面板出「掷」→ ③ 掷完推送进下一轮 */
async function 交给她判(){
  if(S.busy) return; S.busy=true; render();
  try{
    var 文=String(S.cx||"").trim();
    if(!文){ S.source="先写一句"; S.busy=false; render(); return; }
    await 推给AI("【我这轮想做】"+文+"\\n"
      +"★ 请判断这件事该用哪个技能（观察／行动／意志）、什么等级（微／中／强／极）、主对（识破／拦住／扛住／全场），"
      +"然后写进变量：\\n"
      +"{\\"op\\":\\"replace\\",\\"path\\":\\"/局面/自定义/文本\\",\\"value\\":\\""+文.replace(/"/g,'')+"\\"}\\n"
      +"{\\"op\\":\\"replace\\",\\"path\\":\\"/局面/自定义/技能\\",\\"value\\":\\"行动\\"}\\n"
      +"{\\"op\\":\\"replace\\",\\"path\\":\\"/局面/自定义/等级\\",\\"value\\":\\"中\\"}\\n"
      +"{\\"op\\":\\"replace\\",\\"path\\":\\"/局面/自定义/主对\\",\\"value\\":\\"拦住\\"}\\n"
      +"{\\"op\\":\\"replace\\",\\"path\\":\\"/局面/自定义/待掷\\",\\"value\\":true}\\n"
      +"你自己这次不要掷骰，等她按你给的技能与难度掷完再把结果推给你。");
  }catch(e){ console.warn("[欲妈群] 交给她判 失败",e); }
  finally{ S.busy=false; render(); }
}

async function 掷自定义(){
  if(S.busy) return;
  var 自=(g("局面",{})||{}).自定义||{};
  var 文=String(自.文本||"").trim();
  if(!文){ S.source="她还没判完"; render(); return; }
  var 技=String(自.技能||"行动"), 等=String(自.等级||"中"), 主=String(自.主对||"拦住");
  await doRoll(技, "【我这轮的动作】"+文+"。", DC表[等]||15, 主);
  try{
    await writeStat(function(box){
      box.局面=box.局面||{};
      box.局面.自定义={文本:"",技能:"行动",等级:"中",主对:"拦住",待掷:false};
    });
  }catch(e){ console.warn("[欲妈群] 清自定义失败",e); }
  S.cx="";
  await refresh(false);
}

async function 取消自定义(){
  try{
    await writeStat(function(box){
      box.局面=box.局面||{};
      box.局面.自定义={文本:"",技能:"行动",等级:"中",主对:"拦住",待掷:false};
    });
  }catch(e){}
  S.cx=""; S.source="算了"; await refresh(false);
}

async function doRoll(skill, 追发, 强制dc, 主对){`,
]], '自定义三函数');

// ── ⑥ CSS
换('正则/状态栏.html', [[
  'button.act:disabled{opacity:.45;cursor:not-allowed}',
  `button.act:disabled{opacity:.45;cursor:not-allowed}
.cx{margin-top:10px;padding:9px;border:1px dashed var(--c-border);border-radius:9px;background:var(--c-surface)}
.cx-h{margin-bottom:6px;font-size:var(--fs-xs);color:var(--c-text-faint);line-height:1.5}
.cx-in{width:100%;box-sizing:border-box;padding:8px 9px;border-radius:8px;border:1px solid var(--c-border);background:var(--c-bg-2);color:var(--c-text);font-family:var(--font);font-size:var(--fs-sm)}
.cx-ready{margin:7px 0;padding:7px 8px;border-radius:7px;background:var(--c-btn-active);font-size:var(--fs-xs);line-height:1.6;color:var(--c-text-muted)}`,
]], 'CSS 自定义');

console.log('\n共 ' + n + ' 处');

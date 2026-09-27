

(function () {
  var NS = 'gg2';
  var 等级 = { 微:{c:[3,5],r:90,k:'micro'}, 中:{c:[10,15],r:60,k:'mid'}, 强:{c:[25,35],r:30,k:'strong'},
               极:{c:[50,60],r:10,k:'extreme'}, 锁:{c:null,r:0,k:'lock'} };
  var 英中 = { micro:'微', mid:'中', strong:'强', extreme:'极', lock:'锁' };
  function 归(v){v=String(v||'');return 等级[v]?v:(英中[v]||'微');}
  function 数(v,d){var n=Number(v);return isFinite(n)?n:(d||0);}
  function 夹(v,a,b){return Math.max(a,Math.min(b,v));}
  function E(s){return String(s===undefined||s===null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function 有(v){return v!==undefined&&v!==null&&String(v).trim()!=='';}
  function 键(o){try{return Object.keys(o||{}).filter(function(k){return 有(o[k])||typeof o[k]==='object';});}catch(e){return [];}}
  function 阶(s){s=String(s||'');if(/恋|爱/.test(s))return '恋';if(/依/.test(s))return '依';if(/亲/.test(s))return '亲';return '';}

  /* ── 取值 ──
     ① getCurrentMessageId(): 面板**自己所在那一楼**（iframe 里可用）→ 显示该楼的值
     ② message_id:-1        : 官方「最新楼层」语义（部分环境可用）
     ③ 多来源楼层探测       : 兜底
  */
  function 我在哪楼(){
    try{if(typeof getCurrentMessageId==='function'){var a=getCurrentMessageId();if(typeof a==='number'&&a>=0)return a;}}catch(e){}
    try{var w=window.parent||window;if(w&&typeof w.getCurrentMessageId==='function'){var b=w.getCurrentMessageId();if(typeof b==='number'&&b>=0)return b;}}catch(e){}
    return -1;
  }
  function 读楼(楼){
    if(楼===undefined||楼===null||楼<0)return null;
    try{var v=getVariables({type:'message',message_id:楼});if(v&&v.stat_data&&v.stat_data.主角)return v.stat_data;}catch(e){}
    try{if(typeof Mvu!=='undefined'&&Mvu.getMvuData){var m=Mvu.getMvuData({type:'message',message_id:楼});
      if(m&&m.stat_data&&m.stat_data.主角)return m.stat_data;}}catch(e){}
    return null;
  }
  function 取数据(楼){
    // ① 我这一楼
    var mine=我在哪楼();
    if(mine>=0){ var a=读楼(mine); if(a) return a; }
    // ② 官方最新楼层语义
    if(楼===undefined||楼===null){
      try{var v=getVariables({type:'message',message_id:-1});if(v&&v.stat_data&&v.stat_data.主角)return v.stat_data;}catch(e){}
      try{if(typeof Mvu!=='undefined'&&Mvu.getMvuData){var m=Mvu.getMvuData({type:'message',message_id:-1});
        if(m&&m.stat_data&&m.stat_data.主角)return m.stat_data;}}catch(e){}
      try{var w=window.parent||window;if(w&&typeof w.getVariables==='function'){var v2=w.getVariables({type:'message',message_id:-1});
        if(v2&&v2.stat_data&&v2.stat_data.主角)return v2.stat_data;}}catch(e){}
    } else { var b=读楼(楼); if(b) return b; }
    // ③ 兜底：多来源楼层探测
    var last=最佳楼();
    for(var i=last;i>=0&&i>last-30;i--){ var c=读楼(i); if(c) return c; }
    return null;
  }
  function 最佳楼(){
    try{if(typeof getLastMessageId==='function'){var a=getLastMessageId();if(a>0)return a;}}catch(e){}
    try{var w=window.parent||window;if(w&&typeof w.getLastMessageId==='function'){var c=w.getLastMessageId();if(c>0)return c;}}catch(e){}
    try{var ctx=(typeof SillyTavern!=='undefined'&&SillyTavern.getContext)?SillyTavern.getContext():null;
      if(ctx&&ctx.chat&&ctx.chat.length)return ctx.chat.length-1;}catch(e){}
    try{var w2=window.parent||window;var c2=w2.SillyTavern&&w2.SillyTavern.getContext?w2.SillyTavern.getContext():null;
      if(c2&&c2.chat&&c2.chat.length)return c2.chat.length-1;}catch(e){}
    try{if(typeof chat!=='undefined'&&chat.length)return chat.length-1;}catch(e){}
    return 30;
  }
  function 最好楼层(){
    var 直取=取数据();
    if(直取) return {楼:我在哪楼(), d:直取};   /* ★ 优先「我这一楼」 */
    var last=最佳楼();
    var 兜底=null;
    for(var i=last;i>=0&&i>last-30;i--){
      var sd=取数据(i);if(!sd)continue;
      if(!兜底)兜底={楼:i,d:sd};
      if(键((sd.局面&&sd.局面.当前选项)||{}).length) return {楼:i,d:sd};
    }
    return 兜底;
  }

  function 画(d){
    var t=d.时间||{},sc=d.场景||{},p=d.主角||{},she=d.她||{},ec=d.经济||{},ws=d.世界||{},局=d.局面||{};
    var 面=局.场面||{}, 女角=d.女角||ws.女角||{};
    var H='';
    H+='<div class="hd"><span class="dot"></span><span class="t">第 '+数(t.天数,1)+' 天 · '+E(t.当前日期||'—')+' · '+E(t.时段||'')+'</span>'
      +'<span class="s">'+E([t.章节,sc.场景模式,t.天气].filter(Boolean).join(' · '))+'</span></div><div class="bd">';

    /* ── 你 ── */
    H+='<h5>你 <span class="r">'+E(p.状态||'在线')+'</span></h5><div class="bars">';
    var 条=[['体力',p.身体状态,'hp'],['抵抗',p.反抗值,'re'],['心情',p.心情,'mo']];
    for(var i=0;i<条.length;i++){var v=夹(数(条[i][1]),0,100);
      H+='<span class="bar"><span class="lb">'+条[i][0]+'</span><span class="tk '+条[i][2]+'"><i style="width:'+v+'%"></i></span><span class="vv">'+v+'</span></span>';}
    H+='</div>';

    var sk=p.技能||{};
    H+='<div class="chips" style="margin-top:6px">'
      +'<span class="chip">口才<i>说话</i><b>'+数(p.说话)+'</b></span>'
      +'<span class="chip">身手<i>做事</i><b>'+数(p.做事)+'</b></span>'
      +'<span class="chip">见识<i>懂东西</i><b>'+数(p.懂东西)+'</b></span>'
      +'<span class="chip">打工<b>'+数(sk.打工)+'</b></span>'
      +'<span class="chip">学业<b>'+数(sk.学业)+'</b></span>'
      +'<span class="chip">机车<b>'+数(sk.机车)+'</b></span>'
      +'<span class="chip">现金<b>'+数(ec.现金)+'</b></span>'
      +'<span class="chip">储蓄<b>'+数(ec.累计储蓄)+'</b></span>'
      +'<span class="chip">当日<b>'+数(ec.当日盈亏)+'</b></span>'
      +'</div>';

    /* ── 屏幕外的她 ── */
    H+='<h5>屏幕外的她 <span class="r">目的进度 '+数(she.目的进度)+'%　已拿到 '+数(she.已拿到)+'　懂她 '+数(p.对她的了解)+'</span></h5>';
    H+='<div class="box pink">'
      +'<div class="row"><span class="k">谁在玩</span><span class="v hi">'+E(she.人设||'—')+'　熟练度 '+数(she.熟练度)+'　此刻情绪 '+E(she.情绪||'—')+'</span></div>'
      +'<div class="bars" style="margin:4px 0 3px">'
      +'<span class="bar"><span class="lb">她的兴奋</span><span class="tk ex"><i style="width:'+夹(数(she.兴奋度),0,100)+'%"></i></span><span class="vv">'+数(she.兴奋度)+'</span></span>'
      +'</div>';
    if(有(she.此刻)) H+='<div class="row"><span class="k">她此刻</span><span class="v">'+E(she.此刻)+'</span></div>';
    if(有(局.她打的字)) H+='<div class="row"><span class="k">正在打</span><span class="v">'+E(局.她打的字)+'</span></div>';
    if(有(局.她的倾向)) H+='<div class="row"><span class="k">她的倾向</span><span class="v">第 '+E(局.她的倾向)+' 条</span></div>';
    H+='</div>';

    /* ── 场面 ── */
    if(有(面.地点)||有(面.体位)||有(面.节奏)||有(面.留痕)||有(面.她看到的)){
      H+='<h5>场面</h5><div class="box">';
      if(有(面.地点)) H+='<div class="row"><span class="k">地点</span><span class="v">'+E(面.地点)+'</span></div>';
      if(有(面.体位)) H+='<div class="row"><span class="k">体位</span><span class="v">'+E(面.体位)+'</span></div>';
      if(有(面.节奏)) H+='<div class="row"><span class="k">节奏</span><span class="v">'+E(面.节奏)+'</span></div>';
      var 参=键(面.参与); if(参.length) H+='<div class="row"><span class="k">参与</span><span class="v">'+E(参.join('、'))+'</span></div>';
      if(有(面.留痕)) H+='<div class="row"><span class="k">留痕</span><span class="v">'+E(面.留痕)+'</span></div>';
      if(有(面.她看到的)) H+='<div class="row"><span class="k">她看到</span><span class="v">'+E(面.她看到的)+'</span></div>';
      H+='</div>';
    }

    /* ── 女角 ── */
    var 名=键(女角);
    if(名.length){
      var 活=名.filter(function(n){var o=女角[n]||{};return 数(o.好感度)||数(o.开发度);});
      H+='<details'+(活.length?' open':'')+'><summary>女角<span class="n"> '+名.length+' </span>位'+(活.length?'（有进展 '+活.length+'）':'（都还没动）')+'</summary><div class="girls">';
      for(var g=0;g<名.length;g++){
        var o=女角[名[g]]||{};
        var af=数(o.好感度), dv=数(o.开发度);
        var st=E(o.关系阶段||'—');
        H+='<div class="g"><span class="nm">'+E(名[g])+'</span><span class="st '+阶(st)+'">'+st+'</span>'
          +'<span class="tk re"><i style="width:'+夹((af+100)/2,0,100)+'%"></i></span><span class="af">好感 '+(af>0?'+':'')+af+'</span>'
          +(dv?'<span class="af" style="color:#d8a0e0">开发 '+dv+'</span>':'')+'</div>';
        var 细=[];
        if(有(o.状态)) 细.push(E(o.状态));
        if(有(o.身体记忆)) 细.push('记得：'+E(o.身体记忆));
        var 器=[['胸',o.胸],['阴',o.阴部],['后',o.后穴]];
        for(var q=0;q<器.length;q++){var v=器[q][1]||{};
          if(数(v.开发度)||有(v.现状)) 细.push('【'+器[q][0]+'】'+数(v.开发度)+(v.破瓜?' 已破':'')+(有(v.现状)?'　'+E(v.现状):''));}
        if(细.length) H+='<div class="g"><span class="lb2">'+细.join('　·　')+'</span></div>';
      }
      H+='</div></details>';
    }

    /* ── 她摆出来的 ── */
    var 选=局.当前选项||{}, 选键=键(选), 她选=String(局.她已选||'');
    var 当前反抗=数(p.反抗值,0);
    H+='<h5>她摆出来的 <span class="r">'+(她选?('她点了第 '+E(她选)+' 条'):'她还没点')+'</span></h5>';
    if(选键.length){
      H+='<div class="opts">';
      for(var k=0;k<选键.length;k++){
        var s=选[选键[k]]||{}, lv=归(s.等级), 被选=(她选===选键[k]);
        var 反抗不够 = 当前反抗 < (等级[lv].c ? 等级[lv].c[0] : 9999);
        H+='<div class="opt'+(被选?' she lit':' lit')+' lv-'+lv+'" data-k="'+E(选键[k])+'">'
          +'<span class="row1"><span class="no">'+E(选键[k])+'</span>'
          +'<span class="tx">'+E(s.文本||'')+'</span>'
          +'<span class="lv">'+lv+(等级[lv].c?' '+等级[lv].c[0]+'~'+等级[lv].c[1]:'')+'</span></span>'
          +(s.感觉?'<div class="feel">'+E(s.感觉)+'</div>':'')
          +'</div>';
      }
      H+='</div>';
      H+='<div class="fork">'
        +'<button class="fork-btn" type="button" data-fork="watch">眼睁睁看着</button>'
        +'<button class="fork-btn deny" type="button" data-fork="reject"'+(反抗不够?' disabled title="反抗值不够"':'')+'>拒绝</button>'
        +'<button class="fork-btn custom" type="button" data-fork="custom">自己来</button>'
        +'</div>';
      H+='<div class="cx" data-cx>'
        +'<div class="hint">不按她摆的来，写一件你想做的事。<b>掏空反抗值，一局顶多一两次。</b></div>'
        +'<textarea data-cx-text placeholder="例：趁她转身，把门锁上"></textarea>'
        +'<div class="row"><span class="cost">消耗 50~70 反抗值</span>'
        +'<button class="fork-btn" type="button" data-cx-cancel>算了</button>'
        +'<button class="fork-btn custom" type="button" data-cx-ok>就这么做</button></div>'
        +'</div>';
      H+='<div class="res"></div>';
      H+='<div class="tip">拒绝＝花抵抗值跟她顶（等级越高越贵越难成）；无视＝不管这条，什么都不花；自定义＝照自己的想法做一次，**掏空反抗值**，一局基本只用一两次。</div>';
    }else{
      H+='<div class="tip">这一层她没有摆选项，等她自己动手。</div>';
      if(有(局.今日指令)) H+='<div class="box" style="margin-top:5px"><div class="row"><span class="k">今日指令</span><span class="v">'+E(局.今日指令)+'</span></div></div>';
    }

    H+='</div>';
    return H;
  }

  var 楼=-1;
  var 上次指纹='';
  function 指纹(d){try{return JSON.stringify([d.主角,d.她,d.局面,d.时间]);}catch(e){return String(Math.random());}}
  function 刷新(){
    var r=最好楼层(); if(!r)return; 楼=r.楼;
    var 盒=document.getElementById(NS); if(!盒)return;
    var fp=指纹(r.d)+'|'+r.楼;
    if(fp===上次指纹) return;            /* ★ 值没变就不重画 → 折叠不会被重置 */
    上次指纹=fp;
    /* 记住折叠状态 */
    var 开={}; var ds=盒.querySelectorAll('details');
    for(var i=0;i<ds.length;i++) 开[i]=ds[i].open;
    盒.innerHTML=画(r.d);
    盒.setAttribute('data-'+NS+'-init','1');
    var ds2=盒.querySelectorAll('details');
    for(var j=0;j<ds2.length;j++) if(开[j]!==undefined) ds2[j].open=开[j];
    绑(盒);
  }

  async function 写(变化, 结果类, 文案, 报给AI){
    /* ① 写变量（判定结果 / 反抗值消耗） */
    try{updateVariablesWith(function(v){
      v=v||{};if(!v.stat_data)v.stat_data={};
      var pr=v.stat_data.主角||(v.stat_data.主角={});
      var jj=v.stat_data.局面||(v.stat_data.局面={});
      变化(pr,jj);
      return v;
    },{type:'message',message_id:(楼>=0?楼:-1)});}catch(e){console.error('[gg2] 写变量失败',e);}

    /* ② 把玩家做了什么，作为用户消息插进聊天（AI 才看得见） */
    var 要发 = 报给AI || 文案;
    try{
      if(typeof createChatMessages==='function'){
        await createChatMessages([{role:'user', content:要发}]);
      }
    }catch(e){console.error('[gg2] 插入消息失败',e);}

    /* ③ 触发 AI 生成下一楼 */
    try{
      if(typeof triggerSlash==='function'){ await triggerSlash('/trigger'); }
    }catch(e){console.error('[gg2] 触发生成失败',e);}

    /* ④ 面板上给个即时反馈 */
    var 盒=当前盒(); var res=盒&&盒.querySelector('.res');
    if(res){res.className='res on '+结果类;res.textContent=文案;}
    var 全部=盒?盒.querySelectorAll('.opt button'):[];
    for(var m=0;m<全部.length;m++) 全部[m].disabled=true;
  }

  function 绑(盒){
    /* ══ 选项 = 选中；底部按钮 = 执行（照 euphoria 的交互）══ */
    var 选中条 = '';
    var opts = 盒.querySelectorAll('.opt');
    for (var i = 0; i < opts.length; i++) {
      opts[i].onclick = function () {
        var k = this.getAttribute('data-k');
        if (!k || (this.className || '').indexOf('lv-锁') >= 0) return;
        选中条 = (选中条 === k) ? '' : k;
        for (var j = 0; j < opts.length; j++) opts[j].className = (opts[j].className || '').replace(' picked', '');
        var res = 盒.querySelector('.res');
        if (选中条) {
          this.className += ' picked';
          var sd0 = 取数据(楼), o0 = ((sd0 && sd0.局面 && sd0.局面.当前选项) || {})[选中条] || {};
          if (res) { res.className = 'res on'; res.textContent = '选中第 ' + 选中条 + ' 条：' + (o0.文本 || ''); }
        } else if (res) { res.className = 'res'; res.textContent = ''; }
      };
    }

    /* 面板内「自己来」的确认与取消 */
    var cxOk = 盒.querySelector('[data-cx-ok]'), cxNo = 盒.querySelector('[data-cx-cancel]'), cxBox = 盒.querySelector('[data-cx]');
    if (cxNo) cxNo.onclick = function () { if (cxBox) cxBox.className = 'cx'; };
    if (cxOk) cxOk.onclick = async function () {
      var ta = 盒.querySelector('[data-cx-text]');
      var 想做 = ta ? String(ta.value || '').trim() : '';
      var res = 盒.querySelector('.res');
      if (!想做) { if (res) { res.className = 'res on no'; res.textContent = '写一句你想做什么。'; } if (ta) ta.focus(); return; }
      var sd = 取数据(楼); if (!sd) return;
      var 反抗 = 数(sd.主角 && sd.主角.反抗值, 0);
      var 耗2 = 50 + Math.floor(Math.random() * 21);
      if (cxBox) cxBox.className = 'cx';
      ta.value = '';
      await 写(function (pr, jj) {
        pr.反抗值 = Math.max(0, 反抗 - 耗2);
        jj.玩家拒绝 = '自定义';
        jj.判定结果 = { 选项: 想做, 等级: '自定义', 消耗: 耗2, 结果: '自定义', 效果倍数: 1 };
      }, 'on ig', '自己来：「' + 想做 + '」｜ 扣 ' + 耗2 + ' 反抗值。', '（我不按她摆的来。我要' + 想做 + '。）');
    };

    var forks = 盒.querySelectorAll('.fork-btn');
    for (var q = 0; q < forks.length; q++) {
      forks[q].onclick = async function () {
        var act = this.getAttribute('data-fork');
        var sd = 取数据(楼); if (!sd) return;
        var 反抗 = 数(sd.主角 && sd.主角.反抗值, 0);
        var 选 = (sd.局面 && sd.局面.当前选项) || {};
        var res = 盒.querySelector('.res');
        var 等级表 = { 微: [3, 5, 90], 中: [10, 15, 60], 强: [25, 35, 30], 极: [50, 55, 10] };

        if (act === 'watch') {
          await 写(function (pr, jj) { jj.玩家拒绝 = ''; jj.判定结果 = { 选项: '', 等级: '', 消耗: 0, 结果: '看着', 效果倍数: 1 }; },
            'on ig', '眼睁睁看着 —— 不拦，让她自己点。', '（我不拦。看她点哪条。）');
          return;
        }

        if (act === 'reject' && !选中条) { if (res) { res.className = 'res on no'; res.textContent = '先在上面选一条，再点拒绝。'; } return; }
        if (act === 'custom') {
          var box = 盒.querySelector('[data-cx]');
          if (box) { box.className = box.className.indexOf('on') >= 0 ? 'cx' : 'cx on';
            var ta = box.querySelector('[data-cx-text]'); if (ta && box.className.indexOf('on') >= 0) ta.focus(); }
          return;
        }

        var o = 选[选中条] || {}, lv = 归(o.等级), 表 = 等级表[lv] || [0, 0, 0];
        var 耗 = 表[0] + Math.floor(Math.random() * (表[1] - 表[0] + 1));
        if (反抗 < 耗) { if (res) { res.className = 'res on no'; res.textContent = '反抗值不够（要 ' + 耗 + '，你只有 ' + 反抗 + '）。'; } return; }
        var 掷 = Math.floor(Math.random() * 100) + 1, 成 = 掷 <= 表[2];
        await 写(function (pr, jj) {
          pr.反抗值 = Math.max(0, 反抗 - 耗);
          jj.玩家拒绝 = String(选中条);
          jj.判定结果 = { 选项: String(o.文本 || ''), 等级: lv, 消耗: 耗, 成功率: 表[2], 掷值: 掷, 结果: 成 ? '成功' : '失败', 效果倍数: 成 ? 1 : 0.6 };
        }, 'on ' + (成 ? 'ok' : 'no'),
          '拒绝了「' + (o.文本 || '') + '」｜ 扣 ' + 耗 + ' · 掷 ' + 掷 + ' · 需 ' + 表[2] + ' → ' + (成 ? '顶住了' : '没顶住'),
          '（我拒绝第 ' + 选中条 + ' 条：「' + (o.文本 || '') + '」。花掉 ' + 耗 + ' 反抗值，' + (成 ? '顶住了' : '没顶住') + '。）');
      };
    }
  }
  try { 刷新(); } catch (e) {
    console.error('[gg2] 刷新出错', e);
    var 盒 = document.getElementById(NS);
    if (盒) 盒.innerHTML = '<div class="hd"><span class="dot"></span><span class="t">面板脚本出错</span></div><div class="bd" style="color:#e8a0a0;font-size:12px">' + String(e && e.message || e) + '</div>';
  }
  console.log('[gg2] 启动 | getCurrentMessageId=' + (typeof getCurrentMessageId) + ' | getLastMessageId=' + (typeof getLastMessageId) + ' | getVariables=' + (typeof getVariables));
  try{if(typeof eventOn==='function'&&typeof tavern_events!=='undefined'){
    [tavern_events.MESSAGE_RENDERED,tavern_events.MESSAGE_UPDATED,tavern_events.CHAT_CHANGED,tavern_events.MESSAGE_SWIPED]
      .forEach(function(t){if(t)eventOn(t,function(){setTimeout(刷新,150);});});}}catch(e){}
  try{setInterval(刷新,2000);}catch(e){}
  console.log('[gg2] 状态栏已加载');
}());


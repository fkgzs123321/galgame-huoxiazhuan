// 修两处：
// ① 折叠被重置 —— 刷新时不再重写 innerHTML，只更新「值」；并且记住折叠状态
// ② 读不到最新楼层 —— iframe 里 getLastMessageId() 可能不可用（euphoria 注释里的坑）
//    → 多个来源依次尝试：getLastMessageId() / window.parent / SillyTavern context / getChatMessages 探测
const fs = require('fs');
const path = require('path');
const p = path.join('E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/index.html');
let h = fs.readFileSync(p, 'utf8');

// ── ① 换掉取值：多来源找最新楼层号 ──
const 旧取 = `  function 取数据(楼){
    try{var v=getVariables({type:'message',message_id:楼});if(v&&v.stat_data&&v.stat_data.主角)return v.stat_data;}catch(e){}
    try{if(typeof Mvu!=='undefined'&&Mvu.getMvuData){var m=Mvu.getMvuData({type:'message',message_id:楼});
      if(m&&m.stat_data&&m.stat_data.主角)return m.stat_data;}}catch(e){}
    return null;
  }
  function 最好楼层(){
    var last=0;
    try{last=getLastMessageId();}catch(e){try{if(typeof chat!=='undefined')last=chat.length-1;}catch(e2){}}
    var 兜底=null;
    for(var i=last;i>=0&&i>last-25;i--){
      var sd=取数据(i);if(!sd)continue;
      if(!兜底)兜底={楼:i,d:sd};
      if(键((sd.局面&&sd.局面.当前选项)||{}).length) return {楼:i,d:sd};
    }
    return 兜底;
  }`;

const 新取 = `  function 取数据(楼){
    try{var v=getVariables({type:'message',message_id:楼});if(v&&v.stat_data&&v.stat_data.主角)return v.stat_data;}catch(e){}
    try{if(typeof Mvu!=='undefined'&&Mvu.getMvuData){var m=Mvu.getMvuData({type:'message',message_id:楼});
      if(m&&m.stat_data&&m.stat_data.主角)return m.stat_data;}}catch(e){}
    return null;
  }
  /* 取最新楼层号 —— iframe 里 getLastMessageId() 可能不可用，要多来源兜底 */
  function 最新楼(){
    try{if(typeof getLastMessageId==='function'){var a=getLastMessageId();if(a>0)return a;}}catch(e){}
    try{if(typeof getCurrentMessageId==='function'){var b=getCurrentMessageId();if(b>0)return b;}}catch(e){}
    try{var w=window.parent||window;if(w&&typeof w.getLastMessageId==='function'){var c=w.getLastMessageId();if(c>0)return c;}}catch(e){}
    try{var ctx=(typeof SillyTavern!=='undefined'&&SillyTavern.getContext)?SillyTavern.getContext():null;
      if(ctx&&ctx.chat&&ctx.chat.length)return ctx.chat.length-1;}catch(e){}
    try{var w2=window.parent||window;var c2=w2.SillyTavern&&w2.SillyTavern.getContext?w2.SillyTavern.getContext():null;
      if(c2&&c2.chat&&c2.chat.length)return c2.chat.length-1;}catch(e){}
    try{if(typeof chat!=='undefined'&&chat.length)return chat.length-1;}catch(e){}
    /* 最后手段：从 30 层往下探，找最后一条能读到变量的 */
    for(var i=30;i>=0;i--){ if(取数据(i)) return i; }
    return 0;
  }
  function 最好楼层(){
    var last=最新楼();
    var 兜底=null;
    for(var i=last;i>=0&&i>last-30;i--){
      var sd=取数据(i);if(!sd)continue;
      if(!兜底)兜底={楼:i,d:sd};
      if(键((sd.局面&&sd.局面.当前选项)||{}).length) return {楼:i,d:sd};
    }
    return 兜底;
  }`;

if (h.includes(旧取)) { h = h.replace(旧取, 新取); console.log('✅ ① 取值改成多来源找最新楼层'); }
else console.log('⚠ ① 取值锚点未命中');

// ── ② 刷新时不重写 innerHTML：记住折叠状态 + 只走「重画」路径 ──
const 旧刷 = `  var 楼=-1;
  function 刷新(){
    var r=最好楼层(); if(!r)return; 楼=r.楼;
    var 盒=document.getElementById(NS); if(!盒)return;
    盒.innerHTML=画(r.d);
    盒.setAttribute('data-'+NS+'-init','1');
    绑(盒);
  }`;
const 新刷 = `  var 楼=-1;
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
  }`;
if (h.includes(旧刷)) { h = h.replace(旧刷, 新刷); console.log('✅ ② 刷新时按指纹判重 + 记住折叠状态'); }
else console.log('⚠ ② 刷新锚点未命中');

fs.writeFileSync(p, h);
const m = h.match(/<script>([\s\S]*?)<\/script>/);
try { new Function('return ' + m[1]); console.log('   ✅ 语法通过（' + h.length + ' 字符）'); }
catch (e) { console.log('   ❌ ' + e.message.slice(0, 70)); }

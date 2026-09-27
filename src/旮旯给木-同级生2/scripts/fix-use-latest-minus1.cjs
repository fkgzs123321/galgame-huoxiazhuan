// 按 skills 的正解改取值：`{type:'message', message_id: -1}` = 最新楼层
// 依据 util/mvu.ts:12 —— defineMvuDataStore 内部就是把 'latest'/undefined 转成 -1
// 之前的错：我自己算楼层号（iframe 里 getLastMessageId 不可用 → 退回第 0 楼）
// 改法：-1 作首选（官方语义，不需要知道楼层号），我的多来源探测降为兜底
const fs = require('fs');
const p = 'E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/index.html';
let h = fs.readFileSync(p, 'utf8');

const 旧 = `  function 取数据(楼){
    try{var v=getVariables({type:'message',message_id:楼});if(v&&v.stat_data&&v.stat_data.主角)return v.stat_data;}catch(e){}
    try{if(typeof Mvu!=='undefined'&&Mvu.getMvuData){var m=Mvu.getMvuData({type:'message',message_id:楼});
      if(m&&m.stat_data&&m.stat_data.主角)return m.stat_data;}}catch(e){}
    return null;
  }`;
const 新 = `  /* 首选 -1：官方语义 = 最新楼层（util/mvu.ts:12），不需要自己算楼层号 */
  function 取最新(){
    try{var v=getVariables({type:'message',message_id:-1});if(v&&v.stat_data&&v.stat_data.主角)return v.stat_data;}catch(e){}
    try{if(typeof Mvu!=='undefined'&&Mvu.getMvuData){var m=Mvu.getMvuData({type:'message',message_id:-1});
      if(m&&m.stat_data&&m.stat_data.主角)return m.stat_data;}}catch(e){}
    try{var w=window.parent||window;
      if(w&&typeof w.getVariables==='function'){var v2=w.getVariables({type:'message',message_id:-1});
        if(v2&&v2.stat_data&&v2.stat_data.主角)return v2.stat_data;}}catch(e){}
    return null;
  }
  function 取数据(楼){
    if(楼===undefined||楼===null) return 取最新();
    try{var v=getVariables({type:'message',message_id:楼});if(v&&v.stat_data&&v.stat_data.主角)return v.stat_data;}catch(e){}
    try{if(typeof Mvu!=='undefined'&&Mvu.getMvuData){var m=Mvu.getMvuData({type:'message',message_id:楼});
      if(m&&m.stat_data&&m.stat_data.主角)return m.stat_data;}}catch(e){}
    return null;
  }`;

if (h.includes(旧)) { h = h.replace(旧, 新); console.log('✅ 加了 取最新()（用 message_id: -1）'); }
else console.log('⚠ 锚点未命中');

// 最好楼层：先试 -1
const 旧2 = `  function 最好楼层(){
    var last=最新楼();`;
const 新2 = `  function 最好楼层(){
    var 直取=取最新();
    if(直取) return {楼:-1, d:直取};       /* ★ 官方语义直接命中，不用算楼层 */
    var last=最新楼();`;
if (h.includes(旧2)) { h = h.replace(旧2, 新2); console.log('✅ 最好楼层() 改为先用 -1 直取'); }
else console.log('⚠ 最好楼层锚点未命中');

// 写变量也要用 -1（否则拒绝按钮写错楼层）
h = h.replace(/\{type:'message',message_id:楼\}/g, "{type:'message',message_id:(楼>=0?楼:-1)}");

fs.writeFileSync(p, h);
const m = h.match(/<script>([\s\S]*?)<\/script>/);
try { new Function('return ' + m[1]); console.log('   ✅ 语法通过（' + h.length + ' 字符）'); }
catch (e) { console.log('   ❌ ' + e.message.slice(0, 70)); }
console.log('   含 取最新:', h.includes('取最新'));
console.log('   含 message_id:-1:', h.includes("message_id:-1"));

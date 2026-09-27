// 面板取值改用 getCurrentMessageId()（= 面板所在楼层），而不是 getLastMessageId()
// 依据：
//   @types/iframe/util.d.ts：「在前端界面里获取前端界面所在楼层号」
//   tavern-ui skill：「消息原文：通过 getChatMessages(getCurrentMessageId())[0] 取整条消息」
//   → getCurrentMessageId() 在 iframe 里**可用**；getLastMessageId() **不可用**（会返回 0/第一楼）
// 这样「2 楼的面板」读的就是「2 楼的变量」✓
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');

const 新取值 = `  /* ── 取值 ──
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
  }`;

// ── 替换 CDN 面板里的「取最新 + 取数据 + 最新楼」 ──
function 改面板(p) {
  let h = fs.readFileSync(p, 'utf8');
  const 起 = h.indexOf('  /* 首选 -1：官方语义 = 最新楼层');
  if (起 < 0) { console.log('⚠ ' + p + ' 未命中（可能已是新版）'); return false; }
  // 找到「取最新」到「function 最好楼层」之前，整体替换
  const 终 = h.indexOf('  function 最好楼层(){');
  if (终 < 0) { console.log('⚠ 找不到 最好楼层'); return false; }
  h = h.slice(0, 起) + 新取值 + '\n' + h.slice(终);
  // 最好楼层：先试「我这一楼」
  h = h.replace(`  function 最好楼层(){
    var 直取=取最新();`,
    `  function 最好楼层(){
    var 直取=取数据();`);
  h = h.replace(`  function 最好楼层(){
    var 直取=取数据();
    if(直取) return {楼:-1, d:直取};       /* ★ 官方语义直接命中，不用算楼层 */
    var last=最新楼();`,
    `  function 最好楼层(){
    var 直取=取数据();
    if(直取) return {楼:我在哪楼(), d:直取};   /* ★ 优先「我这一楼」 */
    var last=最佳楼();`);
  fs.writeFileSync(p, h);
  const m = h.match(/<script>([\s\S]*?)<\/script>/);
  if (m) { try { new Function('return ' + m[1]); console.log('✅ ' + path.basename(p) + ' 语法通过（' + h.length + '）'); } catch (e) { console.log('❌ ' + e.message.slice(0, 60)); return false; } }
  return true;
}

改面板('E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/index.html');

// ── 同步到主文档脚本 ──
try {
  const 生 = fs.readFileSync(path.join(D, 'scripts/port-panel-to-script.cjs'), 'utf8');
  execFileSync('node', [path.join(D, 'scripts/port-panel-to-script.cjs')], { encoding: 'utf8' });
  console.log('✅ 主文档脚本已同步');
} catch (e) { console.log('⚠ 脚本同步：' + String(e.stdout || e.message).split('\n')[0]); }

try { console.log(execFileSync('node', [forge, 'pack', '旮旯给木-同级生2'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').slice(-1)[0]); }
catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 2).join(' ')); }

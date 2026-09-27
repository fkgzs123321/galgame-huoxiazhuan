// 让「拒绝 / 无视」按钮真的生效：写变量 → 把玩家的话作为用户消息插入 → 触发 AI 生成下一楼
// 依据 @types/function/slash.d.ts 的官方示例：
//   await createChatMessages([{ role: 'user', content: '你好' }]);
//   await triggerSlash('/trigger');
// 现状问题：按钮只调 updateVariablesWith（改变量）+ 显示一行文案 → AI 完全不知道玩家做了什么
const fs = require('fs');
const p = 'E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/index.html';
let h = fs.readFileSync(p, 'utf8');

// ── 替换「写()」函数：加上发消息 + 触发生成 ──
const 旧写 = h.match(/  function 写\(变化, 结果类, 文案\)\{[\s\S]*?\n  \}/);
if (!旧写) { console.log('❌ 找不到 写() 函数'); process.exit(1); }

const 新写 = `  async function 写(变化, 结果类, 文案, 报给AI){
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
  }`;

h = h.replace(旧写[0], 新写);

// ── 按钮回调：加 await + 传「报给AI」的话 ──
h = h.replace(
  `    for(var i=0;i<rs.length;i++){rs[i].onclick=function(){`,
  `    for(var i=0;i<rs.length;i++){rs[i].onclick=async function(){`
);
h = h.replace(
  `      写(function(pr,jj){
        pr.反抗值=Math.max(0,反抗-耗);
        jj.玩家拒绝=String(k);
        jj.判定结果={选项:String(o.文本||''),等级:lv,消耗:耗,成功率:表.r,掷值:掷,结果:成?'成功':'失败',效果倍数:成?1:0.6};
      },'on '+(成?'ok':'no'),
        '拒绝了「'+(o.文本||'')+'」｜ 扣 '+耗+' · 掷 '+掷+' · 需 '+表.r+' → '+(成?'顶住了':'没顶住'));`,
  `      await 写(function(pr,jj){
        pr.反抗值=Math.max(0,反抗-耗);
        jj.玩家拒绝=String(k);
        jj.判定结果={选项:String(o.文本||''),等级:lv,消耗:耗,成功率:表.r,掷值:掷,结果:成?'成功':'失败',效果倍数:成?1:0.6};
      },'on '+(成?'ok':'no'),
        '拒绝了「'+(o.文本||'')+'」｜ 扣 '+耗+' · 掷 '+掷+' · 需 '+表.r+' → '+(成?'顶住了':'没顶住'),
        '（我拒绝第 '+k+' 条：「'+(o.文本||'')+'」。花掉 '+耗+' 反抗值，'+(成?'顶住了':'没顶住')+'。）');`
);
h = h.replace(
  `    for(var j=0;j<ig.length;j++){ig[j].onclick=function(){`,
  `    for(var j=0;j<ig.length;j++){ig[j].onclick=async function(){`
);
h = h.replace(
  `      写(function(pr,jj){
        jj.玩家拒绝='';
        jj.判定结果={选项:String(o.文本||''),等级:'',消耗:0,成功率:0,掷值:0,结果:'无视',效果倍数:1};
      },'on ig','无视了「'+(o.文本||'')+'」｜ 不花抵抗值，也没表态。');`,
  `      await 写(function(pr,jj){
        jj.玩家拒绝='';
        jj.判定结果={选项:String(o.文本||''),等级:'',消耗:0,成功率:0,掷值:0,结果:'无视',效果倍数:1};
      },'on ig','无视了「'+(o.文本||'')+'」｜ 不花抵抗值，也没表态。',
        '（第 '+k+' 条「'+(o.文本||'')+'」我不管。什么都不做。）');`
);

fs.writeFileSync(p, h);
const m = h.match(/<script>([\s\S]*?)<\/script>/);
try { new Function('return ' + m[1]); console.log('✅ 面板已加：发消息 + 触发生成（' + h.length + ' 字符）｜语法通过'); }
catch (e) { console.log('❌ ' + e.message.slice(0, 90)); process.exit(1); }
console.log('   含 createChatMessages: ' + h.includes('createChatMessages'));
console.log('   含 triggerSlash: ' + h.includes('triggerSlash'));
console.log('   按钮改 async: ' + h.includes('onclick=async function'));

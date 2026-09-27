// 选完选项后：写进酒馆输入框（不自动发送）
const fs = require('fs');
const p = 'E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/index.html';
let t = fs.readFileSync(p, 'utf8');

const 旧 = [
  '    /* ② 把玩家做了什么，作为用户消息插进聊天（AI 才看得见） */',
  '    var 要发 = 报给AI || 文案;',
  '    try{',
  "      if(typeof createChatMessages==='function'){",
  "        await createChatMessages([{role:'user', content:要发}]);",
  '      }',
  "    }catch(e){console.error('[gg2] 插入消息失败',e);}",
  '',
  '    /* ③ 触发 AI 生成下一楼 */',
  '    try{',
  "      if(typeof triggerSlash==='function'){ await triggerSlash('/trigger'); }",
  "    }catch(e){console.error('[gg2] 触发生成失败',e);}",
].join('\n');

const 新 = [
  '    /* ② 写进酒馆的输入框（不发送，让玩家自己按发送键 —— 他自己能看见、能改） */',
  '    var 要发 = 报给AI || 文案;',
  '    try{',
  "      if(typeof triggerSlash==='function'){",
  "        await triggerSlash('/setinput ' + JSON.stringify(要发));",
  '      } else {',
  "        var ta=document.querySelector('#send_textarea')||(window.parent&&window.parent.document.querySelector('#send_textarea'));",
  "        if(ta){ ta.value=要发; ta.dispatchEvent(new Event('input',{bubbles:true})); }",
  '      }',
  "    }catch(e){console.error('[gg2] 写输入框失败',e);}",
  '',
  '    /* ③ 不自动生成 —— 交给玩家按发送 */',
].join('\n');

if (t.includes(旧)) { t = t.replace(旧, 新); console.log('✅ 已改：插入消息 + 自动生成 → 只写输入框'); }
else console.log('⚠ 锚点未命中');

fs.writeFileSync(p, t);
const m = t.match(/<script>([\s\S]*?)<\/script>/);
try { new Function('return ' + m[1]); console.log('✅ 语法通过（' + t.length + ' 字符）'); }
catch (e) { console.log('❌ ' + e.message); process.exit(1); }
console.log("  还有 /trigger: " + t.includes("triggerSlash('/trigger')"));
console.log("  有 /setinput: " + t.includes('/setinput'));

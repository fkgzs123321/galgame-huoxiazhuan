// 选完选项后：① 写进输入框 ② 发送 ③ 触发生成
const fs = require('fs');
const p = 'E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/index.html';
let t = fs.readFileSync(p, 'utf8');

const 旧 = [
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

const 新 = [
  '    /* ② 写进输入框 → 发送 → 触发生成 */',
  '    var 要发 = 报给AI || 文案;',
  '    try{',
  "      if(typeof triggerSlash==='function'){",
  "        await triggerSlash('/setinput ' + JSON.stringify(要发));   /* ① 内容进输入框 */",
  "        await triggerSlash('/send');                              /* ② 发送（不在输入框留残余） */",
  '      } else {',
  "        var ta=document.querySelector('#send_textarea')||(window.parent&&window.parent.document.querySelector('#send_textarea'));",
  "        if(ta){ ta.value=要发; ta.dispatchEvent(new Event('input',{bubbles:true})); }",
  "        if(typeof createChatMessages==='function'){ await createChatMessages([{role:'user', content:要发}]); }",
  '      }',
  "    }catch(e){console.error('[gg2] 发送失败',e);}",
  '',
  '    /* ③ 触发生成下一楼 */',
  '    try{',
  "      if(typeof triggerSlash==='function'){ await triggerSlash('/trigger'); }",
  "    }catch(e){console.error('[gg2] 触发生成失败',e);}",
].join('\n');

if (t.includes(旧)) { t = t.replace(旧, 新); console.log('✅ 已改：写输入框 → 发送 → 生成'); }
else console.log('⚠ 锚点未命中');

fs.writeFileSync(p, t);
const m = t.match(/<script>([\s\S]*?)<\/script>/);
try { new Function('return ' + m[1]); console.log('✅ 语法通过（' + t.length + ' 字符）'); }
catch (e) { console.log('❌ ' + e.message); process.exit(1); }
console.log("  有 /setinput: " + t.includes('/setinput'));
console.log("  有 /send: " + t.includes("triggerSlash('/send')"));
console.log("  有 /trigger: " + t.includes("triggerSlash('/trigger')"));

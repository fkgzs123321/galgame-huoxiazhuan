// 推给AI：改成 /setinput → /send → /trigger（进输入框 + 发送 + 生成），不 await
import fs from 'fs';
const F = '正则/状态栏.html';
let t = fs.readFileSync(F, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';
let n = 0;

// ① 换掉整个 推给AI
const i = t.indexOf('/* ══ 推给 AI（2026-09-22 按 @types 官方接口重做）══');
const j = t.indexOf('/* ══ 点了选项就直接走完');
if (i < 0 || j < i) { console.log('⚠ 推给AI 段未定位 ' + i + ' ' + j); process.exit(1); }
const 新 = [
  '/* ══ 推给 AI（2026-09-22 第三次修）══',
  '   用户要的是「内容进输入框 → 自动发送 → AI 回下一楼」。',
  '   查 slash_command.txt：',
  '     /setinput (string) —— 把用户输入设为这段文本，并【用管道传给下一条命令】',
  '     /send     (string) —— 向聊天记录添加用户消息，★ 但不触发生成',
  '     /trigger           —— 触发生成',
  '   所以链路 = /setinput <文本> | /send | /trigger',
  '   ★ 文本必须【压成单行】：slash 命令里出现换行会把命令截断。',
  '   ★ 一律不 await —— 一旦它不 resolve 就会把界面卡住（之前转圈就是这个原因）。 */',
  'function 压一行(s){',
  '  return String(s==null?"":s).replace(/\\r\\n|\\r|\\n/g," ").replace(/\\|/g,"丨").replace(/\\s+/g," ").trim();',
  '}',
  'function 推给AI(文本){',
  '  var t=压一行(文本);',
  '  if(!t) return false;',
  '  try{',
  '    if(typeof triggerSlash==="function"){',
  '      triggerSlash("/setinput "+t+" | /send | /trigger");      /* ★ 不 await */',
  '      return true;',
  '    }',
  '  }catch(e){ console.warn("[欲妈群] triggerSlash 失败",e); }',
  '  try{',
  '    if(typeof createChatMessages==="function"){                /* 兜底：直接插一条 user 消息 */',
  '      createChatMessages([{ role:"user", message:t }]);',
  '      return true;',
  '    }',
  '  }catch(e){ console.warn("[欲妈群] createChatMessages 失败",e); }',
  '  S.source="没能推给 AI";',
  '  return false;',
  '}',
  '',
].join(eol);
t = t.slice(0, i) + 新 + t.slice(j);
n++; console.log('✓ 推给AI → /setinput … | /send | /trigger（单行、不 await、有兜底）');

// ② 判定摘要：去掉 <判定> 里的换行（压成单行，正则仍能匹配）
{
  const a = [
    '    var 摘要="<判定>"',
    '      +"他做的："+(追发||skill)+"\\n"',
    '      +"技能："+skill+" ｜ 难度："+难度名+(等级?" ｜ 等级："+等级:"")+"\\n"',
    '      +"P="+Math.round(P)+" − R="+R+" = D"+D+" ｜ 成功率 "+S+"% ｜ 掷出 "+V+"\\n"',
    '      +"结果："+综合+(_ev?" ｜"+_ev.replace(/^｜/,""):"")+" ｜ "+说明',
    '      +"</判定>"',
    '      +"\\n（★ 引擎已算好，照这个结果写这一轮：不要自己另掷骰、不要改数值、不要重算。）";',
  ].join(eol);
  const b = [
    '    var 摘要="<判定>他做的："+(追发||skill)',
    '      +" ｜ 技能："+skill+" ｜ 难度："+难度名+(等级?" ｜ 等级："+等级:"")',
    '      +" ｜ P="+Math.round(P)+" − R="+R+" = D"+D+" ｜ 成功率 "+S+"% ｜ 掷出 "+V',
    '      +" ｜ 结果："+综合+(_ev?" ｜"+_ev.replace(/^｜/,""):"")+" ｜ "+说明',
    '      +"</判定>（★ 引擎已算好，照它写这一轮：不要另掷骰、不要改数值、不要重算。）";',
  ].join(eol);
  if (t.indexOf(a) < 0) console.log('  ⚠ 判定摘要未命中（可能已经是单行）');
  else { t = t.replace(a, b); n++; console.log('✓ 判定摘要压成单行'); }
}

// ③ 交给她判 / 看着她 的推送文本压成单行（去掉换行）
t = t.split('推给AI("【我这轮想做】"+文+"\\n"\n      +"★ 请先判断').join('推给AI("【我这轮想做】"+文+" ｜ ★ 请先判断');
t = t.split('推给AI("【我这轮的动作】我什么都没做，就看着她。「"+文本+"」\\n★ 按她这一条往下写，不要自己另掷骰、不要改数值。");')
     .join('推给AI("【我这轮的动作】我什么都没做，就看着她。「"+文本+"」 ｜ ★ 按她这一条往下写，不要自己另掷骰、不要改数值。");');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共改 ' + n + ' 处');

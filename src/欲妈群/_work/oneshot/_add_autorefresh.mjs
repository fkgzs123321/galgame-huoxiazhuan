// 照 旮旯给木-同级生2 加三套自动刷新（酒馆事件 + MVU 事件 + 轮询 + 指纹防重排）
import fs from 'fs';
const F = '正则/状态栏.html';
let t = fs.readFileSync(F, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';

const 锚 = 'if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);\nelse init();';
if (t.indexOf(锚.split('\n').join(eol)) < 0) { console.log('⚠ 锚点未命中'); process.exit(1); }

const 补 = [
  'if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);',
  'else init();',
  '',
  '/* ══ ★ 变量一变，面板自动重绘（照 旮旯给木-同级生2：三套机制，缺一都可能不刷新）══',
  '   ① 酒馆事件（消息更新/切 swipe/生成结束/变量变动）',
  '   ② MVU 自己的 VARIABLE_UPDATE_ENDED（比酒馆的更准）',
  '   ③ 兜底轮询 1.5 秒（MVU 写变量未必派发事件）',
  '   三者都走 可能重绘()：先比指纹，变了才真重绘 —— 避免无谓重排。 */',
  'var 指纹="";',
  'function 指纹取(){',
  '  try{ return S.stat ? JSON.stringify(S.stat) : ""; }catch(e){ return String(Date.now()); }',
  '}',
  'function 可能重绘(强制){',
  '  var f=指纹取();',
  '  if(强制 || f!==指纹){',
  '    指纹=f;',
  '    try{',
  '      var st=readStat(); if(st) S.stat=st;   /* ★ 重绘前重新读一遍变量 */',
  '      loadTheme();',
  '      render();',
  '    }catch(e){ console.warn("[欲妈群] 重绘失败",e); }',
  '  }',
  '}',
  '/* ① 酒馆事件 */',
  'try{',
  '  var _ctx=(typeof SillyTavern!=="undefined"&&SillyTavern.getContext)?SillyTavern.getContext():null;',
  '  if(_ctx&&_ctx.eventSource&&_ctx.eventTypes){',
  '    var _T=_ctx.eventTypes;',
  '    [_T.MESSAGE_UPDATED,_T.MESSAGE_RENDERED,_T.MESSAGE_SWIPED,_T.CHAT_CHANGED,_T.GENERATION_ENDED,_T.VARIABLES_UPDATED,_T.VARIABLE_CHANGED]',
  '      .forEach(function(x){ if(x) _ctx.eventSource.on(x,function(){ 可能重绘(false); }); });',
  '  }',
  '}catch(e){ console.warn("[欲妈群] 酒馆事件绑定失败",e); }',
  '/* ② MVU 变量事件 */',
  'try{',
  '  if(typeof Mvu!=="undefined"&&Mvu.eventOn&&Mvu.events){',
  '    Mvu.eventOn(Mvu.events.VARIABLE_UPDATE_ENDED,function(){ 可能重绘(true); });',
  '  }',
  '}catch(e){ console.warn("[欲妈群] MVU 事件绑定失败",e); }',
  '/* ③ 兜底轮询 */',
  'try{ setInterval(function(){ 可能重绘(false); },1500); }catch(e){}',
].join(eol);

t = t.replace(锚.split('\n').join(eol), 补);
fs.writeFileSync(F, t, 'utf8');
console.log('✓ 已加三套自动刷新（照同级生2）');

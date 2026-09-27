import fs from 'fs';

// ================= 主题 CSS(两面板共用,各自插入) =================
const THEME_CSS = `
/* ===== 主题系统: dark(默认) / glass(磨砂玻璃) / light(亮色) ===== */
html[data-theme="light"]{
  --bg-0:#f5f3ee;--bg-1:#ece9e1;--bg-card:rgba(255,255,255,.94);
  --c-text:#2c2b27;--c-dim:#7d7a70;--c-dim2:#a5a196;
  --c-accent:#d0454f;--c-gold:#b8860b;--c-success:#3d9e6e;--c-danger:#d64545;
  --c-warn:#b07d2a;--c-info:#4a7fa8;--c-powder:#c26a8a;
  --c-border:rgba(0,0,0,.12);
}
html[data-theme="glass"]{
  --bg-0:rgba(18,18,24,.4);--bg-1:rgba(27,27,35,.5);--bg-card:rgba(30,30,37,.38);
  --c-border:rgba(255,255,255,.14);
}
html[data-theme="glass"] .sb,html[data-theme="glass"] .detail,html[data-theme="glass"] .panel,
html[data-theme="glass"] .battle-wrap,html[data-theme="glass"] .roster-card{
  backdrop-filter:blur(18px) saturate(1.3);-webkit-backdrop-filter:blur(18px) saturate(1.3);
}
.theme-btn{cursor:pointer;font-size:14px;opacity:.75;transition:opacity .15s;padding:0 2px}
.theme-btn:hover{opacity:1}
.mini-num{font-size:10px;color:var(--c-text);font-weight:700;margin-left:3px;min-width:16px;display:inline-block}
`;

// ================= 主题 JS(两面板共用逻辑,插入各自脚本) =================
const THEME_JS = `
/* 主题切换(dark/glass/light,localStorage 持久化) */
function ydsApplyTheme(t){
  if(!t)t='dark';
  if(document.documentElement)document.documentElement.setAttribute('data-theme',t);
  try{localStorage.setItem('yds_theme',t)}catch(e){}
  if(typeof State!=='undefined')State.theme=t;
}
function ydsInitTheme(){var t='dark';try{t=localStorage.getItem('yds_theme')||'dark'}catch(e){}ydsApplyTheme(t)}
function ydsToggleTheme(){var cur=(typeof State!=='undefined'&&State.theme)?State.theme:'dark';var next=cur==='dark'?'glass':(cur==='glass'?'light':'dark');ydsApplyTheme(next);if(typeof render==='function')render()}
`;

// ================= 1. 状态栏界面.html =================
let sb = fs.readFileSync('src/欲望都市/正则/状态栏界面.html', 'utf8');
let sb0 = sb;

// 1a. CSS 插入(在 .mini-bar 定义后)
sb = sb.replace(
  '.mini-bar>i{display:block;height:100%;border-radius:3px}',
  '.mini-bar>i{display:block;height:100%;border-radius:3px}' + THEME_CSS
);
// 1b. renderHeader: 体力/性欲/勃起加数值 + 🎨 按钮
sb = sb.replace(
  "+'<span class=\\\"hl\\\">体力</span>'+miniBar(p.体力,'#59c98d')\n    +'<span class=\\\"hl\\\">性欲</span>'+miniBar(p.性欲,'#e0525e')\n    +'<span class=\\\"hl\\\">勃起</span>'+miniBar(p.勃起度,'#d9a441')+'</span>'",
  "+'<span class=\\\"hl\\\">体力</span>'+miniBar(p.体力,'#59c98d')+'<b class=\\\"mini-num\\\">'+num(p.体力,0)+'</b>'\n    +'<span class=\\\"hl\\\">性欲</span>'+miniBar(p.性欲,'#e0525e')+'<b class=\\\"mini-num\\\">'+num(p.性欲,0)+'</b>'\n    +'<span class=\\\"hl\\\">勃起</span>'+miniBar(p.勃起度,'#d9a441')+'<b class=\\\"mini-num\\\">'+num(p.勃起度,0)+'</b>'+'<span class=\\\"theme-btn\\\" data-act=\\\"theme\\\" title=\\\"切换主题\\\">🎨</span>'+'</span>'"
);
// 1c. click 加 theme 分支
sb = sb.replace(
  "        else if(act==='send-round'){",
  "        else if(act==='theme'){ydsToggleTheme()}\n        else if(act==='send-round'){"
);
// 1d. 主题 JS 插入(在 State 定义后或脚本末尾;插到 ydsInitTheme 调用处)
// 找 State 定义行
sb = sb.replace(
  "var State={data:{},loading:true,view:'roster',detail:'',selSkills:[],actionText:''};",
  "var State={data:{},loading:true,view:'roster',detail:'',selSkills:[],actionText:''};\n" + THEME_JS
);
// 1e. 初始化时应用主题(在 readStatData 或 render 前;插到 State 定义后调用)
sb = sb.replace(
  THEME_JS,
  THEME_JS + "\nydsInitTheme();"
);
fs.writeFileSync('src/欲望都市/正则/状态栏界面.html', sb);
console.log('状态栏:', sb !== sb0 ? '✓ 主题+数值' : '✗ 未变');
console.log('  数值:', sb.includes("mini-num"), '| 主题按钮:', sb.includes('data-act="theme"'), '| 主题JS:', sb.includes('ydsToggleTheme'));

// ================= 2. 战斗面板界面.html =================
let bp = fs.readFileSync('src/欲望都市/正则/战斗面板界面.html', 'utf8');
let bp0 = bp;

// 2a. CSS 插入
bp = bp.replace(
  '.battle-ctrl-title{font-size:12px;font-weight:700;color:var(--c-gold);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px}',
  '.battle-ctrl-title{font-size:12px;font-weight:700;color:var(--c-gold);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px}' + THEME_CSS.replace('html[data-theme="glass"] .sb,html[data-theme="glass"] .detail,html[data-theme="glass"] .panel,\nhtml[data-theme="glass"] .battle-wrap,html[data-theme="glass"] .roster-card{', 'html[data-theme="glass"] .battle-wrap,html[data-theme="glass"] .skill-card,html[data-theme="glass"] .item-card,html[data-theme="glass"] .api-settings{')
);
// 2b. 战斗面板标题栏加 🎨 按钮(战斗操作区标题行)
bp = bp.replace(
  "+'<div class=\\\"battle-ctrl-title\\\"><span>⚡ 本回合进攻</span><span class=\\\"rounds\\\">'",
  "+'<div class=\\\"battle-ctrl-title\\\"><span>⚡ 本回合进攻<span class=\\\"theme-btn\\\" data-act=\\\"theme\\\" title=\\\"切换主题\\\" style=\\\"margin-left:8px\\\">🎨</span></span><span class=\\\"rounds\\\">'"
);
// 2c. click 加 theme 分支(战斗面板 1672 行委托)
bp = bp.replace(
  "root.addEventListener('click',function(e){",
  "root.addEventListener('click',function(e){var __t2=e.target;while(__t2&&__t2!==root){var __a2=__t2.getAttribute&&__t2.getAttribute('data-act');if(__a2==='theme'){ydsToggleTheme();return}__t2=__t2.parentNode}});\n  root.addEventListener('click',function(e){"
);
// 2d. 主题 JS(在 State 定义后)
bp = bp.replace(
  "var State={data:{},loading:true,selSkills:[],selItem:'',actionText:'',log:[],finished:false,resultText:'',healCd:{提肛:0,思维分散:0},herHealCount:0,herHealCd:0,herItemUsed:0,stats:null,herSkillCd:{},playerSkillCd:{},flavorOn:true,flavorBusy:false,apiPanelOpen:false,apiMode:'preset',apiPreset:'',apiUrl:'',apiKey:'',apiModel:'',apiTemp:'same_as_preset',apiMaxTokens:'same_as_preset',proxyNames:[],modelList:[]};",
  "var State={data:{},loading:true,selSkills:[],selItem:'',actionText:'',log:[],finished:false,resultText:'',healCd:{提肛:0,思维分散:0},herHealCount:0,herHealCd:0,herItemUsed:0,stats:null,herSkillCd:{},playerSkillCd:{},flavorOn:true,flavorBusy:false,apiPanelOpen:false,apiMode:'preset',apiPreset:'',apiUrl:'',apiKey:'',apiModel:'',apiTemp:'same_as_preset',apiMaxTokens:'same_as_preset',proxyNames:[],modelList:[]};\n" + THEME_JS + "\nydsInitTheme();"
);
fs.writeFileSync('src/欲望都市/正则/战斗面板界面.html', bp);
console.log('战斗面板:', bp !== bp0 ? '✓ 主题' : '✗ 未变');
console.log('  主题按钮:', bp.includes('data-act="theme"'), '| 主题JS:', bp.includes('ydsToggleTheme'));

import fs from 'fs';
const CARD = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';

// ── ① loader：把面板 URL 挂到 window 上，供面板自己 fetch 原文
{
  const F = CARD + '/正则/状态栏界面.html';
  let t = fs.readFileSync(F, 'utf8');
  const 锚 = '  var D=document.getElementById("ymq-load");';
  if (t.indexOf(锚) < 0) console.log('⚠ loader 锚点未命中');
  else {
    t = t.replace(锚,
      '  var D=document.getElementById("ymq-load");\n' +
      '  try{ window.__YMQ_URL = U; }catch(e){}   /* ★ 面板要 fetch 自己这份原文来当模板 */');
    fs.writeFileSync(F, t, 'utf8');
    console.log('✓ loader：把 URL 挂到 window.__YMQ_URL');
  }
}

// ── ② 面板：改成 fetch 原文当模板
{
  const F = CARD + '/正则/状态栏.html';
  let t = fs.readFileSync(F, 'utf8');
  const eol = t.includes('\r\n') ? '\r\n' : '\n';
  let n = 0;
  const 换 = (a, b, tag) => {
    const A = a.split('\n').join(eol), B = b.split('\n').join(eol);
    const c = t.split(A).length - 1;
    if (!c) { console.log('  ⚠ 未命中 ' + tag); return; }
    t = t.split(A).join(B); n += c; console.log('✓ ' + tag);
  };

  换(`function 补模板(){
  var root=id("root"); if(!root) return;
  if(!S.模板) S.模板=root.innerHTML;              /* 首次：留住原始模板 */
  if(S.模板.indexOf("{{format_message_variable")<0) return;   /* ST 已替换过 → 别动，值随楼层 */
  if(document.activeElement&&document.activeElement.id==="ymq-cx") return;  /* 正在打字就别重排 */
  root.innerHTML=S.模板;
  补宏(root);
  var i=id("ymq-cx"); if(i) i.value=S.cx||"";
}`,
`/* ★★ 原文模板从哪儿来（2026-09-23 重做）
   以前是抓 root.innerHTML —— 但 **ST 渲染楼层时会先把那 531 个宏替换掉**，
   抓到的就是"替换后的值"（一楼的值）。于是之后每次重绘都因为"没有 {{ }}"而直接 return，
   面板上的数字就永远停在 ST 渲染那一刻 —— 这就是"变量更新了但面板不动"的真因。
   现在：直接向 CDN 要一份**自己这份原文**（含 {{ }} 的那种），当模板用。 */
var CDN_自="https://testingcf.jsdelivr.net/gh/fkgzs123321/galgame-yumaqun@main/index.html";
function 拉原文(){
  try{ if(window.__YMQ_URL) CDN_自=String(window.__YMQ_URL); }catch(e){}
  try{
    fetch(CDN_自,{cache:"no-cache"}).then(function(r){ return r.text(); }).then(function(txt){
      var m=String(txt).replace(/^\\uFEFF?\\s*\`\`\`(?:html|HTML)?\\s*\\r?\\n/,"").replace(/\\r?\\n\`\`\`\\s*$/,"");
      if(m.indexOf("{{format_message_variable")<0){ console.warn("[欲妈群] 取到的原文里没有宏，放弃当模板"); return; }
      S.模板=m; S.模板就绪=true;
      console.log("[欲妈群] 已取到含宏的原文当模板（"+m.length+" 字符）");
      指纹=""; 可能重绘(true);
    });
  }catch(e){ console.warn("[欲妈群] fetch 原文失败",e); }
}
function 补模板(){
  var root=id("root"); if(!root) return;
  if(!S.模板就绪) return;                    /* 模板没到手 → 别动，让 ST 自己去填 */
  if(document.activeElement&&document.activeElement.id==="ymq-cx") return;  /* 正在打字就别重排 */
  root.innerHTML=S.模板;
  补宏(root);
  var i=id("ymq-cx"); if(i) i.value=S.cx||"";
}`,
   '补模板 → fetch 原文当模板');

  // init 时启动拉原文（放在 init 里 补模板() 之前）
  换('  loadTheme(); 补模板(); 同步();',
     '  loadTheme(); 拉原文(); 补模板(); 同步();',
     'init 里加 拉原文()');

  fs.writeFileSync(F, t, 'utf8');
  console.log('\n共改 ' + n + ' 处');
}

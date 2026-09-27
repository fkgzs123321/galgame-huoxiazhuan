import fs from 'fs';
const CARD = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';
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

// ── ① 补宏 改成「记住宏节点 + 只改文本」，不再重建 DOM
换(`function 补宏(root){
  if(!root||!S.stat) return;
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null,false), ns=[];
  while(w.nextNode()){ if(RE_宏有.test(w.currentNode.nodeValue)) ns.push(w.currentNode); }
  ns.forEach(function(n){ n.nodeValue=n.nodeValue.replace(RE_宏,function(_m,p){ return 宏值(p); }); });
  Array.prototype.forEach.call(root.querySelectorAll("*"),function(el){
    ["style","class","value","placeholder","title"].forEach(function(a){
      var v=el.getAttribute(a);
      if(!v||v.indexOf("{{format_message_variable")<0) return;
      el.setAttribute(a, v.replace(RE_宏,function(_m,p){ return 宏值(p); }));
    });
  });
}`,
`/* ★★ 2026-09-23 重做：不再「整体重建 DOM」。
   旧做法每次重绘都 root.innerHTML=S.模板（115KB 面板整块重建）→ 点击后界面卡死。
   现在照 旮旯给木-同级生2 的精神：**首次记下每个含宏的节点和它的原文**，
   之后只把「值」写回那几个节点，DOM 结构一个都不动。 */
var 宏节点=null;
function 收集宏节点(root){
  宏节点=[];
  try{
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null,false);
    while(w.nextNode()){
      if(RE_宏有.test(w.currentNode.nodeValue)) 宏节点.push({n:w.currentNode, t:w.currentNode.nodeValue});
    }
    Array.prototype.forEach.call(root.querySelectorAll("*"),function(el){
      ["style","class","value","placeholder","title"].forEach(function(a){
        var v=el.getAttribute(a);
        if(v&&v.indexOf("{{format_message_variable")>=0) 宏节点.push({e:el, a:a, t:v});
      });
    });
    console.log("[欲妈群] 记下 "+宏节点.length+" 个含宏节点（之后只改文本、不重建 DOM）");
  }catch(e){ console.warn("[欲妈群] 收集宏节点失败",e); }
}
function 补宏(root){
  if(!root||!S.stat) return;
  if(!宏节点) 收集宏节点(root);
  if(!宏节点) return;
  for(var i=0;i<宏节点.length;i++){
    var x=宏节点[i], s=x.t.replace(RE_宏,function(_m,p){ return 宏值(p); });
    try{ if(x.n){ x.n.nodeValue=s; } else { x.e.setAttribute(x.a,s); } }catch(e){}
  }
}`,
   '补宏 → 记节点 + 只改文本');

// ── ② 补模板 不再重建 DOM（宏已就地填；只补一次输入框的值）
换(`function 补模板(){
  var root=id("root"); if(!root) return;
  if(!S.模板就绪) return;                    /* 模板没到手 → 别动，让 ST 自己去填 */
  if(document.activeElement&&document.activeElement.id==="ymq-cx") return;  /* 正在打字就别重排 */
  root.innerHTML=S.模板;
  补宏(root);
  var i=id("ymq-cx"); if(i) i.value=S.cx||"";
}`,
`function 补模板(){
  var root=id("root"); if(!root) return;
  /* ★ 不再 root.innerHTML=S.模板（那会整块重建 115KB DOM、点一下卡死）。
     宏的值由 补宏() 就地写回节点；这里只保证输入框里的字还在。 */
  try{ 补宏(root); }catch(e){}
  var i=id("ymq-cx");
  if(i && document.activeElement!==i) i.value=S.cx||"";
}`,
   '补模板 → 不再重建 DOM');

// ── ③ refresh 里不再每次拉原文（只首次）
换('  loadTheme(); 拉原文(); 补模板(); 同步();',
   '  loadTheme(); if(!S.模板就绪) 拉原文(); 补模板(); 同步();',
   'refresh 不再每次 fetch');

// ── ④ 拉原文成功后 收集宏节点
换('      S.模板=m; S.模板就绪=true;',
   '      S.模板=m; S.模板就绪=true; 宏节点=null;   /* 让下一次 补宏 重新收集节点 */',
   '拉原文后重置宏节点缓存');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共改 ' + n + ' 处');

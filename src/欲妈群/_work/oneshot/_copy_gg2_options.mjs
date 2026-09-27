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

// ── ① 做选项：照同级生2 —— 只写「她已选」，并把当前这一批锁住（本地 UI 状态）
换(`  S.用过的=S.用过的||{};
  S.用过的[k]=文本;                       /* 记「点的时候那格写的是什么」 */
  S.pick="";`,
`  /* ★ 照 旮旯给木-同级生2 的做法：点完只【禁用这一批选项按钮】，
     等 AI 下一轮重摆四格 → 内容变了 → 自动解锁（下面 显隐() 里比对）。
     锁的是「这一批的指纹」，不是"哪一格"—— 所以四格一个不少。 */
  S.锁批=批指纹(选项);
  S.pick="";`,
   '做选项：改成锁「这一批」');

// ── ② 显隐：照同级生2 —— 四格常驻、按变量渲染；本批已锁则禁用按钮
换(`  S.用过的=S.用过的||{};
  ["一","二","三","四"].forEach(function(k){
    var o=选项[k]||{}, 文本=String(o.文本||"").trim(), 有=!!文本;
    if(有) 有几格++;
    /* 选项内容变了（AI 新一轮重摆）→ 清除这一格的「已用」标记 */
    if(S.用过的[k] && S.用过的[k]!==文本) delete S.用过的[k];
    var 已用=有 && S.用过的[k]===文本;
    var el=id("d-opt-"+k); if(!el) return;
    el.hidden=!有;                       /* 有内容就一直显示（不再"点一下少一个"） */
    el.className="opt"+(她选&&她选===k?" picked":"")+(已用?" done":"");
    /* 已用过的：按钮禁用（这一条这轮已经做过了） */
    var bs=el.querySelectorAll(".opt-btns button");
    Array.prototype.forEach.call(bs,function(b){ b.disabled=已用; });
    var 标=id("d-done-"+k);
    if(标) 标.hidden=!已用;
    填("d-dc-"+k, DC表[String(o.等级||"微")]||12);
    隐("d-cost-"+k, !String(o.代价||"").trim());
  });`,
`  /* ★ 照 旮旯给木-同级生2：选项区**完全按变量渲染**，面板自己不改变量。
     点过之后只把「这一批」锁住（禁用按钮）；AI 下一轮重摆四格 → 指纹变了 → 自动解锁。 */
  var 本批=批指纹(选项), 已锁=(S.锁批 && S.锁批===本批);
  ["一","二","三","四"].forEach(function(k){
    var o=选项[k]||{}, 文本=String(o.文本||"").trim(), 有=!!文本;
    if(有) 有几格++;
    var el=id("d-opt-"+k); if(!el) return;
    el.hidden=!有;                                   /* 有内容就显示；空的才藏（等 AI 摆） */
    el.className="opt"+(她选&&她选===k?" picked":"")+(已锁?" locked":"");
    var bs=el.querySelectorAll(".opt-btns button");
    Array.prototype.forEach.call(bs,function(b){ b.disabled=已锁; });   /* 本批点过 → 禁用，等重摆 */
    填("d-dc-"+k, DC表[String(o.等级||"微")]||12);
    隐("d-cost-"+k, !String(o.代价||"").trim());
  });
  if(!已锁) S.锁批="";`,
   '显隐：照同级生2 按变量渲染 + 本批锁定');

// ── ③ 加 批指纹()
换(`function 指纹取(){`,
`/* 四格的「这一批」指纹：AI 一重摆，指纹就变 → 解锁 */
function 批指纹(选项){
  var a=[];
  ["一","二","三","四"].forEach(function(k){ a.push(String(((选项||{})[k]||{}).文本||"")); });
  return a.join("\\u0001");
}
function 指纹取(){`,
   '加 批指纹()');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共改 ' + n + ' 处');

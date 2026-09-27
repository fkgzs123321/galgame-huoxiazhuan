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

// ── ① 做选项：不再清空变量那一格（UI 不该改 data），改用本地 UI 状态记录
换(`  try{
    await writeStat(function(box){
      box.局面=box.局面||{}; box.局面.当前选项=box.局面.当前选项||{};
      box.局面.当前选项[k]={文本:"",等级:"微",代价:"",技能:"行动"};
      if(模式==="do") box.局面.她已选=k;
    });
  }catch(e){ console.warn("[欲妈群] 清格子失败",e); }`,
`  /* ★★ 2026-09-23 按 skills（sillytavern-embedded-ui · Keep state ownership explicit）改：
     「玩家点过哪一格」是 **UI state**，不该写进 MVU 变量；原来把那一格清空，等于 UI 越权改 data，
     而且"变空就隐藏"正是规范里禁止的 silently hiding（Render defensive data）。
     现在：变量不动，只在本地记「这一格点过、点的时候文本是什么」；
     选项内容一变（AI 新一轮重摆）→ 自动清除已用标记，四格重新可点。 */
  try{
    await writeStat(function(box){
      box.局面=box.局面||{};
      if(模式==="do") box.局面.她已选=k;
    });
  }catch(e){ console.warn("[欲妈群] 写 她已选 失败",e); }
  S.用过的=S.用过的||{};
  S.用过的[k]=文本;                       /* 记「点的时候那格写的是什么」 */
  S.pick="";`,
   '做选项：不清变量，改记 UI 状态');

// ── ② 显隐：保留显示 + 已用过的标记（并把内容变了的标记清掉）
换(`  ["一","二","三","四"].forEach(function(k){
    var o=选项[k]||{}, 有=!!String(o.文本||"").trim();
    if(有) 有几格++;
    var el=id("d-opt-"+k); if(!el) return;
    el.hidden=!有;
    el.className="opt"+(她选&&她选===k?" picked":"");
    填("d-dc-"+k, DC表[String(o.等级||"微")]||12);
    隐("d-cost-"+k, !String(o.代价||"").trim());
  });`,
`  S.用过的=S.用过的||{};
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
   '显隐：四格常驻 + 已用标记');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共改 ' + n + ' 处');

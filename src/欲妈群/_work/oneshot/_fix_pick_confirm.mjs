import fs from 'fs';
const Q = String.fromCharCode(96);
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

// ── ① 四格 HTML：去掉「顺着/拒」两个按钮，整格变成可选中的一项
for (const k of ['一', '二', '三', '四']) {
  const a = '<div class="opt-btns"><button data-act="do" data-k="' + k + '">顺着</button><button data-act="no" data-k="' + k + '">拒</button></div>';
  const b = '';
  const c = t.split(a).length - 1;
  if (c) { t = t.split(a).join(b); n += c; console.log('✓ 去掉第' + k + '格的两个按钮'); }
  else console.log('  ⚠ 第' + k + '格的按钮未命中');
}

// ── ② 每格加 data-k（整格可点）+ 尾部的确认区
换('<div class="acts" id="d-watch" hidden><button class="act" data-act="watch">我不动，就看着她</button></div>',
`<div class="acts" id="d-confirm" hidden><button class="act confirm" data-act="confirm">就拦这一条</button></div>
    <div class="acts" id="d-watch" hidden><button class="act" data-act="watch">我不动，就看着她</button></div>`,
   '加「就拦这一条」确认键');

// ── ③ 点整格 = 选中（而不是直接判定）
换('  else if(act==="do") 做选项("do", el.getAttribute("data-k"));\n  else if(act==="no") 做选项("no", el.getAttribute("data-k"));',
   '  else if(act==="pick"){ S.选中=el.getAttribute("data-k"); render(); }\n  else if(act==="confirm") 确认拦截();',
   '点击改成「选中」+「确认」');

// ── ④ 做选项 → 确认拦截（只保留"拒"这一路）
换(`async function 做选项(模式, k){
  /* 不用 busy 守卫 */
  var 局=g("局面",{}), o=((局.当前选项||{})[k])||{};
  var 文本=String(o.文本||"").trim();
  if(!文本){ S.source="这一格是空的"; render(); return; }
  var 等级=String(o.等级||"微");
  var 技=(模式==="no")?"意志":String(o.技能||"行动");
  var dc=(模式==="no")?12:(DC表[等级]||12);
  var 头=(模式==="no")
    ? "【我这轮的动作】我拒绝她摆的第"+k+"条：「"+文本+"」。"
    : "【我这轮的动作】她摆的第"+k+"条：「"+文本+"」（"+等级+"级），我顺着做了。";`,
`/* ★ 2026-09-23 按引擎设计改：玩家只有两个动作 ——「眼睁睁看着」/「拦下某一条」。
   所以交互是【从四条里选中一条】→【就拦这一条】，不是每格各配一个"顺着/拒"。
   （原来那两个按钮是我自创的，已去掉。） */
async function 确认拦截(){
  var k=String(S.选中||"");
  if(!k){ S.结果="先在上面点一条你想拦的。"; render(); return; }
  var 局=g("局面",{}), o=((局.当前选项||{})[k])||{};
  var 文本=String(o.文本||"").trim();
  if(!文本){ S.结果="这一格是空的。"; render(); return; }
  var 等级=String(o.等级||"微");
  var 技="意志";                        /* 拦住它 → 用意志硬顶 */
  var dc=(DC表[等级]||12);
  var 头="【我这轮的动作】她摆的第"+k+"条：「"+文本+"」（"+等级+"级）。我不干，硬拦这一条。";`,
   '做选项 → 确认拦截');

// ⑤ 收尾：把 做选项 剩下的尾巴里的 模式 引用清掉
t = t.replace('      if(模式==="do") box.局面.她已选=k;', '      box.局面.她已选=k;');
t = t.replace('  S.锁批=批指纹(选项);\n  S.pick="";', '  S.锁批=批指纹(选项);\n  S.选中="";');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共改 ' + n + ' 处');
console.log('还剩 做选项( 调用：' + ((t.match(/做选项\(/g) || []).length) + '（应 0）');

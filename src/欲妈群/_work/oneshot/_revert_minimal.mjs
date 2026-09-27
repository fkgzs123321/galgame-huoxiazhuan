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

// ① 四格：每格恢复一个按钮，文案「选这个」（删掉「拒」）
for (const k of ['一', '二', '三', '四']) {
  // 现状：按钮已被我删光，只剩 …</small></div>
  const a = '</small></div>';
  const b = '</small><div class="opt-btns"><button data-act="do" data-k="' + k + '">选这个</button></div></div>';
  // 只替换 id="d-opt-{k}" 那一串里的结尾 —— 用整体匹配更安全
  const re = new RegExp('(id="d-opt-' + k + '"[\\s\\S]*?)</small></div>');
  if (re.test(t)) { t = t.replace(re, '$1' + b.replace('/></div>', '/></div>').replace('</small><div', '</small><div')); n++; console.log('✓ 第' + k + '格：加回一个「选这个」'); }
  else console.log('  ⚠ 第' + k + '格未命中');
}

// ② 删掉我加的底部「就拦这一条」
换('<div class="acts" id="d-confirm" hidden><button class="act confirm" data-act="confirm">就拦这一条</button></div>\n    ', '', '删底部「就拦这一条」');

// ③ 事件：pick/confirm → 回到 do（直接用原来的判定）
换('  else if(act==="pick"){ S.选中=el.getAttribute("data-k"); render(); }\n  else if(act==="confirm") 确认拦截();',
   '  else if(act==="do") 做选项("do", el.getAttribute("data-k"));',
   '事件回到 do');

// ④ 确认拦截() → 做选项()（并去掉 S.选中 那一段）
换(`/* ★ 2026-09-23 按引擎设计改：玩家只有两个动作 ——「眼睁睁看着」/「拦下某一条」。
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
`/* 每格一个按钮「选这个」—— 选它就照她的这一条走，面板当场跑判定。 */
async function 做选项(模式, k){
  var 局=g("局面",{}), o=((局.当前选项||{})[k])||{};
  var 文本=String(o.文本||"").trim();
  if(!文本){ S.source="这一格是空的"; render(); return; }
  var 等级=String(o.等级||"微");
  var 技=String(o.技能||"行动");
  var dc=(DC表[等级]||12);
  var 头="【我这轮的动作】她摆的第"+k+"条：「"+文本+"」（"+等级+"级），我要这条。";`,
   '确认拦截 → 做选项');

// ⑤ 去掉 S.选中 的残留
t = t.replace('  S.锁批=批指纹(选项);\n  S.选中="";', '  S.锁批=批指纹(选项);');
t = t.replace('  S.锁批=批指纹(选项);\n  S.pick="";', '  S.锁批=批指纹(选项);');

// ⑥ 去掉选中高亮 / 整格可点 与我加的两处 CSS
t = t.replace('    el.setAttribute("data-act","pick"); el.setAttribute("data-k",k);\n', '');
t = t.replace('+(S.选中===k?" sel":"")', '');
t = t.replace('\n  隐("d-confirm", !有几格 || 已锁);', '');
t = t.replace('.opt[data-act]{cursor:pointer}\n.opt.sel{border-color:var(--c-accent,#f472b6);box-shadow:inset 0 0 0 1px var(--c-accent,#f472b6)}\n.act.confirm{background:rgba(244,114,182,.18);border-color:var(--c-accent,#f472b6);font-weight:700}', '');

fs.writeFileSync(F, t, 'utf8');
console.log('\n共改 ' + n + ' 处');
console.log('残留检查：确认拦截=' + ((t.match(/确认拦截/g) || []).length) + '　S.选中=' + ((t.match(/S\.选中/g) || []).length) + '　act==="pick"=' + ((t.match(/act==="pick"/g) || []).length) + '　d-confirm=' + ((t.match(/d-confirm/g) || []).length));

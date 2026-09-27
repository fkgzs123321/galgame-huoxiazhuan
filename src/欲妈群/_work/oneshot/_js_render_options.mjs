import fs from 'fs';
const CARD = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';
const F = CARD + '/正则/状态栏.html';
let t = fs.readFileSync(F, 'utf8');
const eol = t.includes('\r\n') ? '\r\n' : '\n';
let n = 0;

// ── ① HTML：四格的静态结构整段删掉，留一个空容器（内容交给 JS 拼，照同级生2）
const 起 = t.indexOf('<div class="opts" id="d-opts">');
const 止 = t.indexOf('<div class="acts" id="d-confirm"');
const 止2 = t.indexOf('<div class="acts" id="d-watch"');
const 尾 = 止 >= 0 ? 止 : 止2;
if (起 < 0 || 尾 < 0) { console.log('⚠ 选项区定位失败 ' + 起 + ' ' + 尾); process.exit(1); }
t = t.slice(0, 起) + '<div class="opts" id="d-opts"></div>' + eol + '    ' + t.slice(尾);
n++;
console.log('✓ HTML：选项区改成空容器 #d-opts（内容由 JS 拼）');

// ── ② 加 渲染选项()：照 旮旯给木-同级生2 的 renderOpts
const fn = [
  '/* ★ 选项区由 JS 拼 HTML（照 旮旯给木-同级生2 的 renderOpts）。',
  '   为什么不用宏：宏只在 ST 渲染楼层那一刻填一次，变量之后再怎么变它都不动 ——',
  '   这就是「她在二楼重摆了四个选项、面板还是一楼那四个」的原因。',
  '   JS 每次重绘都重读变量，所以永远是最新的。 */',
  'function 渲染选项(){',
  '  var box=id("d-opts"); if(!box) return;',
  '  var 选项=(S.stat&&S.stat.局面&&S.stat.局面.当前选项)||{};',
  '  var 她选=String((S.stat&&S.stat.局面&&S.stat.局面.她已选)||"");',
  '  var 本批=批指纹(选项), 已锁=(S.锁批 && S.锁批===本批);',
  '  var 有几格=0, html="";',
  '  ["一","二","三","四"].forEach(function(k){',
  '    var o=选项[k]||{}, 文本=String(o.文本||"").trim();',
  '    if(!文本) return;',
  '    有几格++;',
  '    var 等级=String(o.等级||"微"), 代价=String(o.代价||"").trim();',
  '    var dc=DC表[等级]||12;',
  '    html+=\'<div class="opt\'+(她选===k?" picked":"")+(已锁?" locked":"")+'" data-opt="\'+k+\'">\'',
  '      +\'<b>\'+k+\'</b>\'+esc(文本)',
  '      +\'<small>等级 \'+esc(等级)+\' · 拦它用 <b>\'+esc(o.技能||"行动")+\'</b>（DC\'+dc+\'）· 考验 <b>\'+esc(o.主对||"拦住")+\'</b>\'',
  '      +(代价?(\' · 代价：\'+esc(代价)):"")+\'</small>\'',
  '      +\'<div class="opt-btns"><button data-act="do" data-k="\'+k+\'"\'+(已锁?" disabled":"")+\'>选这个</button></div></div>\';',
  '  });',
  '  box.innerHTML=html;',
  '  return 有几格;',
  '}',
].join(eol);

// 插在 同步() 之前
const 锚 = 'function 同步(){';
if (t.indexOf(锚) < 0) { console.log('⚠ 同步() 未找到'); process.exit(1); }
t = t.replace(锚, fn + eol + eol + 锚);
n++;
console.log('✓ 加 渲染选项()');

// ── ③ 同步() 里改成调 渲染选项()，并去掉原来按宏判定 hidden 的那段
const 旧 = t.indexOf('  /* ★ 照 旮旯给木-同级生2：选项区**完全按变量渲染**，面板自己不改变量。');
const 旧尾 = t.indexOf('  if(!已锁) S.锁批="";', 旧);
if (旧 < 0 || 旧尾 < 0) { console.log('  ⚠ 旧选项显隐段未命中（旧=' + 旧 + '）'); }
else {
  const 新 = [
    '  /* ★ 照 旮旯给木-同级生2：选项区完全由 JS 按变量渲染，面板自己不改变量。 */',
    '  var 选项=(S.stat&&S.stat.局面&&S.stat.局面.当前选项)||{}, 她选=String((S.stat&&S.stat.局面&&S.stat.局面.她已选)||"");',
    '  var 有几格=渲染选项();',
    '  if(!(S.锁批 && S.锁批===批指纹(选项))) S.锁批="";',
  ].join(eol);
  t = t.slice(0, 旧) + 新 + t.slice(旧尾 + '  if(!已锁) S.锁批="";'.length);
  n++;
  console.log('✓ 同步() 改成调 渲染选项()');
}

fs.writeFileSync(F, t, 'utf8');
console.log('\n共改 ' + n + ' 处');

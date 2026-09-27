// 把 dist/nanpa2-ui/index.html 的面板搬进主文档脚本（不改造原逻辑，只在外面套壳）
// 原面板假设 <div id="gg2"> 已存在（它在 HTML 里）→ 脚本先把它建出来，再执行原面板的 IIFE
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');

const src = fs.readFileSync(path.join(ROOT, 'dist/nanpa2-ui/index.html'), 'utf8');
const css = (src.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
const js = (src.match(/<script>([\s\S]*?)<\/script>/) || [, ''])[1].trim();  // ★ 原样保留

const 脚本 = `// 状态栏 · 主文档注入版（面板逻辑原样取自 dist/nanpa2-ui/index.html）
//
// 为什么必须用脚本：正则替换出的 HTML 会被渲染进 iframe，
// 而 iframe 里 getLastMessageId() 不可用 → 只能读到第 0 楼（开场白）
// → 表现为「变量里有选项、面板不显示」。
// 本脚本跑在主文档：getLastMessageId() 可用，且能把面板插进任意楼层。
(function () {
  var NS = 'gg2';
  var CSS = ${JSON.stringify(css)};

  function 装样式() {
    if (document.getElementById(NS + '-style')) return;
    var s = document.createElement('style');
    s.id = NS + '-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* 目标楼层：优先「有当前选项」的最近楼层，退回最新一层 */
  function 找目标() {
    var last = 0;
    try { last = getLastMessageId(); } catch (e) {
      try { if (typeof chat !== 'undefined') last = chat.length - 1; } catch (e2) {}
    }
    for (var i = last; i >= 0 && i > last - 30; i--) {
      var sd = null;
      try { var v = getVariables({ type: 'message', message_id: i }); if (v && v.stat_data) sd = v.stat_data; } catch (e) {}
      if (!sd) continue;
      var o = (sd.局面 && sd.局面.当前选项) || {};
      var n = 0; try { n = Object.keys(o).filter(function (k) { return o[k]; }).length; } catch (e) {}
      if (n) return i;
    }
    for (var j = last; j >= 0 && j > last - 30; j--) {
      try { var v2 = getVariables({ type: 'message', message_id: j }); if (v2 && v2.stat_data && v2.stat_data.主角) return j; } catch (e) {}
    }
    return last;
  }

  function 节点(楼) {
    var a = document.querySelector('.mes[mesid="' + 楼 + '"] .mes_text');
    if (a) return a;
    var all = document.querySelectorAll('.mes_text');
    return all.length ? all[all.length - 1] : null;
  }

  function 建盒() {
    var 楼 = 找目标();
    var 目标 = 节点(楼);
    if (!目标) return;
    if (目标.querySelector('#' + NS)) return;      // 已有 → 不重复
    装样式();
    var 盒 = document.createElement('div');
    盒.id = NS;
    var 插 = 目标.querySelector('.gg2');
    if (插) { 插.parentNode.replaceChild(盒, 插); return; }   // 老的 class 盒 → 换掉
    目标.appendChild(盒);
  }

  建盒();
  try {
    if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined') {
      [tavern_events.MESSAGE_RENDERED, tavern_events.MESSAGE_UPDATED, tavern_events.CHAT_CHANGED, tavern_events.MESSAGE_SWIPED]
        .forEach(function (t) { if (t) eventOn(t, function () { setTimeout(建盒, 200); }); });
    }
  } catch (e) {}
  try { new MutationObserver(function () { 建盒(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  try { setInterval(建盒, 2000); } catch (e) {}
}());

/* ── 下面是原面板逻辑（原样，它会 document.getElementById('gg2') 找到上面的盒子）── */
${js}
`;
fs.writeFileSync(path.join(D, '脚本/状态栏注入.txt'), 脚本);
try { new Function('return ' + 脚本); console.log('✅ 状态栏注入.txt（' + 脚本.length + ' 字符）'); }
catch (e) { console.log('❌ ' + e.message.slice(0, 80)); process.exit(1); }

try { console.log(execFileSync('node', [forge, 'pack', '旮旯给木-同级生2'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').slice(-1)[0]); }
catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 2).join(' ')); }

// 重写主文档脚本：**遍历每一楼各插一个面板**（每层显示该层自己的变量）
// 之前的问题：脚本用单例 <div id="gg2">，且靠 getLastMessageId()+mesid 找目标 → 找不到就不显示
// 现在：遍历 .mes → 每层在 .mes_text 末尾插一个面板 → 用该层 mesid 读变量
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');

const src = fs.readFileSync(path.join(ROOT, 'dist/nanpa2-ui/index.html'), 'utf8');
const css = (src.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
let js = (src.match(/<script>([\s\S]*?)<\/script>/) || [, ''])[1].trim();

// 把面板改造成「可重复调用」：
//   ① 去掉最外层 IIFE 包装（改成函数体）
//   ② document.getElementById(NS) → 传入的容器 容器
//   ③ 取值改为「读指定楼层」而不是「我这一楼」
js = js.replace(/^\s*\(function \(\) \{/, '');
js = js.replace(/\}\)\(\);\s*$/, '');
js = js.replace(/document\.getElementById\(NS\)/g, '容器');
// 去掉面板自己的「刷新/事件/定时」部分（由外层统一驱动）
js = js.replace(/\n\s*刷新\(\);[\s\S]*$/, '\n');
js = js.replace(/var 楼=-1;\s*/g, '');

const 脚本 = `// 状态栏 · 每层注入版（主文档脚本）
// 为什么用脚本：正则替换 / CDN 只在「有占位符的楼层」生效，
// 而占位符是打包时追加到开场白的 → AI 后续楼层永远没有。
// 本脚本遍历每一楼，在 .mes_text 末尾各插一个面板，并用该层的 mesid 读变量。
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

  /* ── 面板逻辑（由 dist/nanpa2-ui/index.html 生成，改成可重复调用）── */
  var _当前容器 = null;
  var 容器 = null;
  var 楼层 = -1;      /* ★ 这次要渲染的楼层 */
  var 上次指纹 = '';

${js.split('\n').map(l => '  ' + l).join('\n')}

  /* ── 外层驱动：每一楼各插一个 ── */
  function 渲染一层(层) {
    var id = Number(层.getAttribute('mesid'));
    if (isNaN(id) || id < 0) return;
    var txt = 层.querySelector('.mes_text');
    if (!txt) return;
    var 盒 = txt.querySelector('#' + NS);
    if (!盒) {
      盒 = document.createElement('div');
      盒.id = NS + '-' + id;
      盒.setAttribute('data-' + NS, '1');
      盒.style.marginTop = '10px';
      txt.appendChild(盒);
    }
    容器 = 盒;
    楼层 = id;
    上次指纹 = '';        /* 每层独立渲染 */
    刷新();
  }

  function 全跑() {
    var 层们 = document.querySelectorAll('.mes');
    if (!层们.length) return;
    装样式();
    for (var i = 0; i < 层们.length; i++) {
      try { 渲染一层(层们[i]); } catch (e) {}
    }
  }

  setTimeout(全跑, 500);
  try {
    if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined') {
      [tavern_events.MESSAGE_RENDERED, tavern_events.MESSAGE_UPDATED, tavern_events.CHAT_CHANGED, tavern_events.MESSAGE_SWIPED]
        .forEach(function (t) { if (t) eventOn(t, function () { setTimeout(全跑, 200); }); });
    }
  } catch (e) {}
  try { new MutationObserver(function () { 全跑(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  try { setInterval(全跑, 2500); } catch (e) {}
  console.log('[gg2] 状态栏已启动（每层注入）');
}());
`;
fs.writeFileSync(path.join(D, '脚本/状态栏注入.txt'), 脚本);
try { new Function('return ' + 脚本); console.log('✅ 状态栏注入.txt（' + 脚本.length + ' 字符）｜语法通过'); }
catch (e) { console.log('❌ ' + e.message.slice(0, 90)); process.exit(1); }

try { console.log(execFileSync('node', [forge, 'pack', '旮旯给木-同级生2'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').slice(-1)[0]); }
catch (e) { console.log('⚠ ' + String(e.stdout || e.message).split('\n').slice(0, 2).join(' ')); }

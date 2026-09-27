// 状态栏填充 v2 —— 解决「独立界面在 iframe 里，脚本够不着」
//
// 已确定的事实：
//   ① 独立界面（``` + <body>）→ 酒馆渲染在 **iframe** 里
//   ② iframe 里的内联 <script> **不执行**（text.md：纯文本版无法执行 JavaScript）
//   ③ 而独立脚本跑在**主文档** → getElementById('gg2-root') 找不到 DOM 内的状态栏
// 解法：脚本在主文档取数据（Mvu 只在这里可用），然后**对主文档和每个 iframe 各填充一次**
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');

// 从 HTML 里抽原始填充逻辑（那段 async IIFE 的**函数体**，去掉首尾包装）
const html = fs.readFileSync(path.join(D, '正则/状态栏界面.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
let 原 = m[1];
// 去掉外层 (async function () { ... })();
const 起 = 原.indexOf('(async function');
let i = 原.indexOf('{', 起), 深 = 0, 终 = -1;
for (let k = i; k < 原.length; k++) { if (原[k] === '{') 深++; else if (原[k] === '}') { 深--; if (!深) { 终 = k; break; } } }
原 = 原.slice(i + 1, 终);
// 把 document / window 换成传入的 DOC / WIN（对 iframe 内的文档操作）
原 = 原.split('document').join('DOC');
// 幂等标记改到 DOC 上（每个文档各自一份）
原 = 原.replace(/ROOT\.getAttribute\('data-' \+ NS \+ '-init'\)/, "ROOT.getAttribute('data-' + NS + '-init')");

const 脚本 = `// 状态栏填充 v2
// 为什么这样写：独立界面渲染在 iframe 里，iframe 内的内联 script 不执行；
// 而本脚本跑在主文档（Mvu 在这里可用）→ 所以在主文档取数据，再对每个文档各填充一次。
(function () {
  function 取数据() {
    try { if (typeof Mvu !== 'undefined' && Mvu.getMvuData) { var d = Mvu.getMvuData({ type: 'message', message_id: 'latest' }); if (d && d.stat_data) return d; } } catch (e) {}
    try { var m = getVariables({ type: 'message', message_id: 'latest' }); if (m && m.stat_data) return m; } catch (e) {}
    try { return getVariables({ type: 'chat' }) || {}; } catch (e) {}
    return {};
  }

  async function 填充(DOC, WIN, 数据) {
${原.split('\n').map(l => '    ' + l).join('\n')}
  }

  function 全跑() {
    var 数据 = 取数据();
    var 跑过 = 0;
    // ① 主文档
    try { if (document.getElementById('gg2-root')) { 填充(document, window, 数据); 跑过++; } } catch (e) { console.log('[状态栏] 主文档失败：' + e.message); }
    // ② 每个 iframe（同源可直接访问 contentDocument）
    var ifr = document.querySelectorAll('iframe');
    for (var i = 0; i < ifr.length; i++) {
      try {
        var d = ifr[i].contentDocument;
        if (d && d.getElementById('gg2-root')) { 填充(d, ifr[i].contentWindow || window, 数据); 跑过++; }
      } catch (e) {}
    }
    if (!跑过) console.log('[状态栏] 未找到 #gg2-root（状态栏可能还没渲染）');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(全跑, 300);
  else document.addEventListener('DOMContentLoaded', function () { setTimeout(全跑, 300); });
  try {
    if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined') {
      [tavern_events.MESSAGE_RENDERED, tavern_events.MESSAGE_UPDATED, tavern_events.CHAT_CHANGED, tavern_events.MESSAGE_SWIPED]
        .forEach(function (t) { if (t) eventOn(t, function () { setTimeout(全跑, 150); }); });
    }
  } catch (e) {}
  try { new MutationObserver(function () { 全跑(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  try { setInterval(全跑, 2000); } catch (e) {}
}());
`;
fs.writeFileSync(path.join(D, '脚本/状态栏填充.txt'), 脚本);
// 语法检查
try { new Function('return ' + 脚本); console.log('✅ 状态栏填充 v2 语法通过（' + 脚本.length + ' 字符）'); }
catch (e) { console.log('❌ 语法错误：' + e.message); }

// 开局表单同样处理
const html2 = fs.readFileSync(path.join(D, '正则/开局选择界面.html'), 'utf8');
const m2 = html2.match(/<script>([\s\S]*?)<\/script>/);
if (m2) {
  let 原2 = m2[1];
  const 起2 = 原2.indexOf('(async function');
  let i2 = 原2.indexOf('{', 起2), 深2 = 0, 终2 = -1;
  for (let k = i2; k < 原2.length; k++) { if (原2[k] === '{') 深2++; else if (原2[k] === '}') { 深2--; if (!深2) { 终2 = k; break; } } }
  原2 = 原2.slice(i2 + 1, 终2).split('document').join('DOC');
  const 脚本2 = `// 开局表单 v2（同样：在主文档跑，对每个文档各填充一次）
(function () {
  async function 填充(DOC, WIN) {
${原2.split('\n').map(l => '    ' + l).join('\n')}
  }
  function 全跑() {
    try { if (document.getElementById('gg3-root')) 填充(document, window); } catch (e) {}
    var ifr = document.querySelectorAll('iframe');
    for (var i = 0; i < ifr.length; i++) { try { var d = ifr[i].contentDocument; if (d && d.getElementById('gg3-root')) 填充(d, ifr[i].contentWindow || window); } catch (e) {} }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(全跑, 300);
  else document.addEventListener('DOMContentLoaded', function () { setTimeout(全跑, 300); });
  try { new MutationObserver(function () { 全跑(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  try { setInterval(全跑, 2000); } catch (e) {}
}());
`;
  fs.writeFileSync(path.join(D, '脚本/开局表单.txt'), 脚本2);
  try { new Function('return ' + 脚本2); console.log('✅ 开局表单 v2 语法通过（' + 脚本2.length + ' 字符）'); }
  catch (e) { console.log('❌ 开局表单语法错误：' + e.message); }
}

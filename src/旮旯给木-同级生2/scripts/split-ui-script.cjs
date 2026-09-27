// 严格按 skills：界面与脚本分离
// 依据：
//   - references/ui/regex-scripts.md：正则替换文件负责「结构」；含 <body> 的才是「独立界面」
//   - AGENTS.md：脚本放 脚本/，在主文档里跑，可监听酒馆事件
// 问题：把 <script> 塞在正则替换的 HTML 里 → 消息流的 markdown 渲染**不保证执行** → 界面永远空
// 改法：① 状态栏 / 开局界面 → 都改成「内嵌片段」（去掉 <body> 与反引号）
//       ② 它们的 JS 抽成独立脚本（脚本/状态栏填充.txt、脚本/开局表单.txt）
//       ③ 脚本在主文档里「找 DOM → 填充」，用 MutationObserver 兜底
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');
const 记 = [];

const 抽 = (文件) => {
  const p = path.join(D, '正则', 文件);
  let h = fs.readFileSync(p, 'utf8');
  // 去 body / 反引号
  h = h.replace(/^```\s*\n<body>\s*\n/, '').replace(/\n<\/body>\s*\n```\s*$/, '\n');
  const m = h.match(/<script>([\s\S]*?)<\/script>/);
  if (m) h = h.replace(/<script>[\s\S]*?<\/script>\s*/, '');
  fs.writeFileSync(p, h);
  return m ? m[1] : null;
};

const 状态栏JS = 抽('状态栏界面.html');
const 表单JS = 抽('开局选择界面.html');
记.push('① 两个界面去掉 <script>，去掉 <body>／反引号 → 变成内嵌片段');

// 脚本：把原 JS 包一层「等 DOM → 填充 → 监听」，并在 iframe 里也尝试
const 包 = (js, 名) => `// ${名} —— 由正则替换出的界面只负责结构，数据填充与交互在这里
// 依据 references/ui/regex-scripts.md：正则只负责定位/结构；行为放酒馆助手脚本
(function () {
  var 载入 = function (${名 === '状态栏' ? '' : ''}) { ${js} };
  // 尝试在主文档里跑；若界面在 iframe 里，则对每个 iframe 也跑一遍
  function 全跑() {
    try { 载入(); } catch (e) { console.log('[${名}] 主文档失败：' + e.message); }
    try {
      var ifr = document.querySelectorAll('iframe');
      for (var i = 0; i < ifr.length; i++) {
        try {
          var w = ifr[i].contentWindow;
          if (!w || !w.document) continue;
          var f = w.Function;
          var s = w.document.createElement('script');
          s.textContent = 'try{(' + 载入.toString() + ')()}catch(e){}';
          w.document.body.appendChild(s);
        } catch (e) {}
      }
    } catch (e) {}
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(全跑, 200);
  else document.addEventListener('DOMContentLoaded', function () { setTimeout(全跑, 200); });
  try {
    if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined') {
      [tavern_events.MESSAGE_RENDERED, tavern_events.MESSAGE_UPDATED, tavern_events.CHAT_CHANGED, tavern_events.MESSAGE_SWIPED]
        .forEach(function (t) { if (t) eventOn(t, function () { setTimeout(全跑, 120); }); });
    }
  } catch (e) {}
  try { new MutationObserver(function () { 全跑(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
}());
`;

if (状态栏JS) { fs.writeFileSync(path.join(D, '脚本/状态栏填充.txt'), 包(状态栏JS, '状态栏')); 记.push('② 脚本/状态栏填充.txt 已写（' + 状态栏JS.length + ' 字符 JS）'); }
if (表单JS) { fs.writeFileSync(path.join(D, '脚本/开局表单.txt'), 包(表单JS, '开局表单')); 记.push('② 脚本/开局表单.txt 已写（' + 表单JS.length + ' 字符 JS）'); }
记.push('   两个脚本都会：主动找 DOM → 填充 → 监听事件 + MutationObserver；并对 iframe 内也执行一次');

// 注册两个脚本
{
  const S = JSON.parse(fs.readFileSync(path.join(D, 'tavern-cards-state.json'), 'utf8'));
  const 脚本 = S.extensions.tavern_helper.scripts;
  const 加 = (名, 文件, id) => {
    if (脚本[名]) return;
    脚本[名] = { type: 'script', script_file: 文件, enabled: true, id, info: '', button: { enabled: false, buttons: [] }, data: {} };
  };
  加('状态栏填充', '脚本/状态栏填充.txt', 'b1c2d3e4-5f6a-4b7c-9d8e-2f3a4b5c6d7e');
  加('开局表单', '脚本/开局表单.txt', 'c2d3e4f5-6a7b-4c8d-9e0f-3a4b5c6d7e8f');
  fs.writeFileSync(path.join(D, 'tavern-cards-state.json'), JSON.stringify(S, null, 2));
  记.push('③ 已注册脚本：' + Object.keys(脚本).join(' / '));
}
console.log(记.join('\n'));

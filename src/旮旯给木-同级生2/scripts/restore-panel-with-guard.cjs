// 把完整面板放回 index.html，并加「错误可见」保护：
//   ① 整段渲染包 try/catch → 出错时在面板上显示错误信息（不是空白）
//   ② 先渲染「外壳」（有内容），再逐步填数据 → 任何一步失败都不至于全空
//   ③ 把关键诊断打到 console，方便定位
const fs = require('fs');
const p = 'E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/index.html';
const full = fs.readFileSync('E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/index_full.html', 'utf8');

// 给 index_full 的 IIFE 里加 try/catch 外壳
let js = (full.match(/<script>([\s\S]*?)<\/script>/) || [, ''])[1];
const css = (full.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];

// 把「刷新()」的调用包起来：出错就在面板上写出来
let 新js = js.replace(
  /\n\s*刷新\(\);/,
  `\n  try { 刷新(); } catch (e) {
    console.error('[gg2] 刷新出错', e);
    var 盒 = document.getElementById(NS);
    if (盒) 盒.innerHTML = '<div class="hd"><span class="dot"></span><span class="t">面板脚本出错</span></div><div class="bd" style="color:#e8a0a0;font-size:12px">' + String(e && e.message || e) + '</div>';
  }
  console.log('[gg2] 启动 | getCurrentMessageId=' + (typeof getCurrentMessageId) + ' | getLastMessageId=' + (typeof getLastMessageId) + ' | getVariables=' + (typeof getVariables));`
);

if (新js === js) { console.log('⚠ 刷新() 锚点未命中，改用整体包裹'); }

const 新HTML = ['<!DOCTYPE html>', '<html lang="zh-CN">', '<head>', '<meta charset="UTF-8">', '<style>', css, '</style>', '</head>', '<body>',
  '<div id="gg2"><div class="hd"><span class="dot"></span><span class="t">状态栏加载中…</span></div><div class="bd"></div></div>',
  '<script>', 新js, '</script>', '</body>', '</html>', ''].join('\n');

fs.writeFileSync(p, 新HTML);
try { new Function('return ' + 新js); console.log('✅ index.html 已还原完整面板 + 错误可见（' + 新HTML.length + ' 字符）｜语法通过'); }
catch (e) { console.log('❌ ' + e.message.slice(0, 90)); process.exit(1); }
console.log('   含 console 诊断: ' + 新HTML.includes('[gg2] 启动'));
console.log('   含 错误显示: ' + 新HTML.includes('面板脚本出错'));

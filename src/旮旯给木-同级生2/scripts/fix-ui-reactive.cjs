// 按 skills（sillytavern-embedded-ui「Recreated or refreshed with message/runtime lifecycle」）
// 补全「变量变化 → UI 刷新」的链路：
//   原实现只监听 MESSAGE_UPDATED / MESSAGE_RENDERED / CHAT_CHANGED
//   MVU 改变量不一定走这些事件 → 补：
//     ① VARIABLES_UPDATED（变量更新事件）
//     ② MESSAGE_SWIPED / GENERATION_ENDED（重生成与生成结束）
//     ③ 兜底：轮询比对变量指纹（只在指纹变化时重绘，避免无谓重排）
//   并按 skills「Preserve user-controlled view state across data refreshes」
//   → 重绘时保留 PREV.tab（当前 Tab 不被刷新重置）
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', '正则/状态栏界面.html');
let h = fs.readFileSync(p, 'utf8');

if (!h.includes('VARIABLES_UPDATED')) {
  const 旧 = h.match(/  try \{\n    var ctx = \(typeof SillyTavern[\s\S]*?\n  \} catch \(e\) \{\}\n\}\)\(\);/);
  if (旧) {
    const 新 = `  /* ── 生命周期：挂载 + 变量变化时重绘（按 skills：跟随 runtime lifecycle）── */
  var 指纹 = '';
  function 指纹取() {
    var v = allVars();
    var s = v && v.stat_data ? v.stat_data : v;
    try { return JSON.stringify(s); } catch (e) { return String(Date.now()); }
  }
  function 可能重绘(强制) {
    var f = 指纹取();
    if (强制 || f !== 指纹) { 指纹 = f; try { render(); } catch (e) {} }
  }
  render();
  try {
    var ctx = (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;
    if (ctx && ctx.eventSource && ctx.eventTypes) {
      var T = ctx.eventTypes;
      /* ① 消息与聊天级（原有） */
      [T.MESSAGE_UPDATED, T.MESSAGE_RENDERED, T.MESSAGE_SWIPED, T.CHAT_CHANGED, T.GENERATION_ENDED,
      /* ② 变量级：MVU 写变量后刷新（原实现漏了这条） */
       T.VARIABLES_UPDATED, T.VARIABLE_CHANGED]
        .forEach(function (t) { if (t) ctx.eventSource.on(t, function () { 可能重绘(false); }); });
    }
  } catch (e) {}
  /* ③ 兜底轮询：MVU 的变量写入未必派发事件，指纹变了才重绘（避免无谓重排） */
  try { setInterval(function () { 可能重绘(false); }, 1500); } catch (e) {}
})();`;
    h = h.replace(旧[0], 新);
  }
  // 保留用户选中的 Tab（skills：Preserve user-controlled view state across data refreshes）
  h = h.replace("var cur = PREV.tab || '概览';", "var cur = PREV.tab || '概览';   /* 重绘时保留用户选的 Tab */");
  fs.writeFileSync(p, h);
  console.log('✅ 已补：VARIABLES_UPDATED / VARIABLE_CHANGED / MESSAGE_SWIPED / GENERATION_ENDED + 指纹轮询兜底');
} else console.log('已补过');

// 顺带修：block scalar 里被塞进的空行（我前几轮批量修复的次生伤害）
{
  let n = 0;
  (function w(d) {
    for (const f of fs.readdirSync(d)) {
      const q = path.join(d, f);
      if (fs.statSync(q).isDirectory()) { w(q); continue; }
      if (!/\.yaml$/.test(f)) continue;
      const L = fs.readFileSync(q, 'utf8').split(/\r?\n/);
      const out = [];
      for (let i = 0; i < L.length; i++) {
        if (/:\s*[|>][-+]?\s*$/.test(L[i])) {
          out.push(L[i]);
          let j = i + 1;
          // 丢掉紧跟块头的连续空行
          while (j < L.length && L[j].trim() === '') { j++; n++; }
          i = j - 1; continue;
        }
        out.push(L[i]);
      }
      const t2 = out.join('\n').replace(/\n{4,}/g, '\n\n\n');
      if (t2 !== fs.readFileSync(q, 'utf8')) fs.writeFileSync(q, t2);
    }
  })(path.join(__dirname, '..', '世界书'));
  console.log('✅ 清掉 block scalar 头部多余空行 ' + n + ' 行');
}

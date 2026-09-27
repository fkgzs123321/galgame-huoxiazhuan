// 内联 script 用同步版取值（render 不是 async，不能 await）
// 保留「只认 assistant + 回溯 15 层」两个关键点
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const p = path.join(D, '正则/状态栏界面.html');
let t = fs.readFileSync(p, 'utf8');

const 同步取值 = `function allVars() {
    /* 照 src/暗黑地牢 的取法，但这个函数是同步的（render 不是 async）：
       ① 从 getLastMessageId() 往回找最多 15 层
       ② 只认 role === 'assistant' 的楼层（用户消息层没有变量）
       ③ getVariables 同步调用；Mvu 若可用则优先 */
    try {
      var maxId = 0;
      try { maxId = getLastMessageId(); } catch (e0) {}
      for (var i = 0; i < 15; i++) {
        var cid = maxId - i;
        if (cid < 0) break;
        var msg = null;
        try { msg = getChatMessages(cid); } catch (e1) { continue; }
        if (Object.prototype.toString.call(msg) === '[object Promise]') continue;  // 异步接口 → 这个函数用不了，跳过
        if (Array.isArray(msg)) msg = msg[0];
        if (!msg) continue;
        if (msg.role && msg.role !== 'assistant') continue;
        var v = null;
        try { if (typeof getVariables === 'function') v = getVariables({ type: 'message', message_id: msg.message_id }); } catch (e2) {}
        if (!v) { try { if (window.Mvu && Mvu.getMvuData) v = Mvu.getMvuData({ type: 'message', message_id: msg.message_id }); } catch (e3) {} }
        if (v && v.stat_data) return v.stat_data;
      }
    } catch (e) {}
    try { if (typeof getVariables === 'function') { var c = getVariables({ type: 'chat' }); if (c && c.stat_data) return c.stat_data; } } catch (e4) {}
    return {};
  }`;

const 起 = t.search(/function (allVars|sd)\(\)/);
if (起 >= 0) {
  let j = t.indexOf('{', 起), 深 = 0, 终 = -1;
  for (let k = j; k < t.length; k++) { if (t[k] === '{') 深++; else if (t[k] === '}') { 深--; if (!深) { 终 = k; break; } } }
  t = t.slice(0, 起) + 同步取值 + t.slice(终 + 1);
}
// 去掉 await allVars()
t = t.replace(/await allVars\(\)/g, 'allVars()');
fs.writeFileSync(p, t);

const m = t.match(/<script>([\s\S]*?)<\/script>/);
try { new Function('return ' + m[1]); console.log('✅ 状态栏界面.html script 语法通过'); }
catch (e) { console.log('❌ ' + e.message.slice(0, 80)); }
console.log('   含 role !== assistant:', m[1].includes("role !== 'assistant'"));
console.log('   含 getChatMessages:', m[1].includes('getChatMessages'));
console.log('   残留 await allVars:', m[1].includes('await allVars'));

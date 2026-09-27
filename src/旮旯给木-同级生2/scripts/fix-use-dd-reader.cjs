// 照搬 src/暗黑地牢（生产卡、能正常显示）的取值逻辑
// 它的实现（三点我之前全漏了）：
//   ① getLastMessageId() 往回找最多 15 层
//   ② ★★ 只认 msg.role === 'assistant' 的楼层（用户消息层没有变量）
//   ③ ★ 全程 await（getChatMessages / Mvu.getMvuData 都是异步）
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');

const 取值函数 = `async function sd() {
    /* 照 src/暗黑地牢 的取法（生产卡验证过的实现）：
       - 从 getLastMessageId() 往回找最多 15 层
       - 只认 role === 'assistant' 的楼层：用户消息层没有变量
       - getChatMessages / Mvu.getMvuData 都要 await
       - 全找不到 → 兜底空对象 */
    try {
      let maxId = 0;
      try { maxId = getLastMessageId(); } catch (e0) {}
      for (let i = 0; i < 15; i++) {
        let cid = maxId - i;
        if (cid < 0) break;
        let msg = null;
        try { msg = await getChatMessages(cid); } catch (e1) { continue; }
        if (Array.isArray(msg)) msg = msg[0];
        if (!msg) continue;
        if (msg.role && msg.role !== 'assistant') continue;
        let v = null;
        try {
          if (window.Mvu && Mvu.getMvuData) v = await Mvu.getMvuData({ type: 'message', message_id: msg.message_id });
          else if (typeof getVariables === 'function') v = await getVariables({ type: 'message', message_id: msg.message_id });
        } catch (e2) {}
        if (v && v.stat_data) return v.stat_data;
      }
    } catch (e) {}
    try { if (typeof getVariables === 'function') { var c = await getVariables({ type: 'chat' }); if (c && c.stat_data) return c.stat_data; } } catch (e3) {}
    return {};
  }`;

// ① 内联 script
{
  const p = path.join(D, '正则/状态栏界面.html');
  let t = fs.readFileSync(p, 'utf8');
  const 起 = t.search(/function (allVars|sd)\(\)/);
  if (起 >= 0) {
    let j = t.indexOf('{', 起), 深 = 0, 终 = -1;
    for (let k = j; k < t.length; k++) { if (t[k] === '{') 深++; else if (t[k] === '}') { 深--; if (!深) { 终 = k; break; } } }
    t = t.slice(0, 起) + 取值函数.replace('async function sd()', 'async function allVars()') + t.slice(终 + 1);
    // 调用处加 await（原代码是同步调用 allVars()）
    t = t.replace(/([^a-zA-Z_$])allVars\(\)/g, '$1await allVars()');
    t = t.replace(/await await /g, 'await ');
    fs.writeFileSync(p, t);
    const m = t.match(/<script>([\s\S]*?)<\/script>/);
    try { new Function('return ' + m[1]); console.log('✅ 状态栏界面.html：allVars 已照搬暗黑地牢取法 ｜ 语法通过'); }
    catch (e) { console.log('❌ ' + e.message.slice(0, 70)); }
  } else console.log('⚠ 找不到 allVars/sd');
}

// ② 脚本文件
{
  const p = path.join(D, '脚本/状态栏填充.txt');
  let t = fs.readFileSync(p, 'utf8');
  const 起 = t.search(/function (取数据|sd)\(\)/);
  if (起 >= 0) {
    let j = t.indexOf('{', 起), 深 = 0, 终 = -1;
    for (let k = j; k < t.length; k++) { if (t[k] === '{') 深++; else if (t[k] === '}') { 深--; if (!深) { 终 = k; break; } } }
    t = t.slice(0, 起) + 取值函数.replace('async function sd()', 'async function 取数据()') + t.slice(终 + 1);
    t = t.replace(/var 数据 = 取数据\(\);/, 'var 数据 = await 取数据();');
    t = t.replace(/function 全跑\(\) \{/, 'async function 全跑() {');
    fs.writeFileSync(p, t);
    try { new Function('return ' + t); console.log('✅ 脚本/状态栏填充.txt：取数据 已照搬 ｜ 语法通过'); }
    catch (e) { console.log('❌ ' + e.message.slice(0, 70)); }
  } else console.log('⚠ 找不到 取数据/sd');
}

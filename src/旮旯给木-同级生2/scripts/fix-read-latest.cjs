// 照搬 euphoria 验证过的取值逻辑（其 script 注释记录了三条踩坑经验）
//   ① 状态栏挂在第 0 楼 → 它那一楼的 stat_data 永远是开局值 → 必须读【最新】那一层
//   ② 用 getLastMessageId()，不要用 chat.length（iframe 里 chat 可能不可见）
//   ③ 不要「先看当前楼层」短路（第 0 楼永远有值 → 一短路就读不到后面）
// 我的旧实现用 Mvu.getMvuData({..., message_id:'latest'}) —— 没有「往回找」，
// latest 可能指向没有 stat_data 的楼层 → 读不到 → 界面空白。
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');

const 新取值 = `function sd() {
    /* 从最新楼层往回找（照 euphoria 验证过的做法）：
       状态栏挂在第 0 楼，它自己那一楼的 stat_data 永远是开局值；
       AI 每一层的更新写在各自的楼层里，所以必须读最新的那一层。
       楼层号用 getLastMessageId()，不要用 chat.length（iframe 里 chat 可能不可见）。
       不要加「先看当前楼层」的短路：第 0 楼永远有值，一短路就再也读不到后面。 */
    var _last = -1;
    try { _last = getLastMessageId(); } catch (e0) {
      try { if (typeof chat !== 'undefined') _last = chat.length - 1; } catch (e1) {}
    }
    try {
      for (var i = _last; i >= 0; i--) {
        var vv = getVariables({ type: 'message', message_id: i });
        if (vv && vv.stat_data && (vv.stat_data.主角 || vv.stat_data.时间)) return vv.stat_data;
      }
    } catch (e2) {}
    try { var M = (typeof Mvu !== 'undefined' && Mvu.getMvuData) ? Mvu.getMvuData({ type: 'message', message_id: 'latest' }) : null; if (M && M.stat_data) return M.stat_data; } catch (e4) {}
    try { var v = getVariables({ type: 'message' }); if (v && v.stat_data) return v.stat_data; } catch (e) {}
    try { var c = getVariables({ type: 'chat' }); if (c && c.stat_data) return c.stat_data; } catch (e3) {}
    return {};
  }`;

// ── ① 内联 script（状态栏界面.html）──
{
  const p = path.join(D, '正则/状态栏界面.html');
  let t = fs.readFileSync(p, 'utf8');
  // 替换里面的 allVars 定义
  const 起 = t.indexOf('function allVars()');
  if (起 >= 0) {
    let j = t.indexOf('{', 起), 深 = 0, 终 = -1;
    for (let k = j; k < t.length; k++) { if (t[k] === '{') 深++; else if (t[k] === '}') { 深--; if (!深) { 终 = k; break; } } }
    t = t.slice(0, 起) + 新取值.replace('function sd()', 'function allVars()') + t.slice(终 + 1);
    fs.writeFileSync(p, t);
    console.log('✅ 状态栏界面.html：allVars 已换成「从最新往回找」');
  } else {
    // 没有 allVars → 检查有没有 sd
    const 起2 = t.indexOf('function sd()');
    if (起2 >= 0) {
      let j = t.indexOf('{', 起2), 深 = 0, 终 = -1;
      for (let k = j; k < t.length; k++) { if (t[k] === '{') 深++; else if (t[k] === '}') { 深--; if (!深) { 终 = k; break; } } }
      t = t.slice(0, 起2) + 新取值 + t.slice(终 + 1);
      fs.writeFileSync(p, t);
      console.log('✅ 状态栏界面.html：sd 已替换');
    } else console.log('⚠ 状态栏界面.html 里找不到 allVars/sd');
  }
  const m = t.match(/<script>([\s\S]*?)<\/script>/);
  try { new Function('return ' + m[1]); console.log('   script 语法通过'); } catch (e) { console.log('   ❌ ' + e.message); }
}

// ── ② 脚本文件（状态栏填充.txt）──
{
  const p = path.join(D, '脚本/状态栏填充.txt');
  let t = fs.readFileSync(p, 'utf8');
  const 起 = t.indexOf('function 取数据()');
  if (起 >= 0) {
    let j = t.indexOf('{', 起), 深 = 0, 终 = -1;
    for (let k = j; k < t.length; k++) { if (t[k] === '{') 深++; else if (t[k] === '}') { 深--; if (!深) { 终 = k; break; } } }
    t = t.slice(0, 起) + 新取值.replace('function sd()', 'function 取数据()') + t.slice(终 + 1);
    fs.writeFileSync(p, t);
    try { new Function('return ' + t); console.log('✅ 脚本/状态栏填充.txt：取数据已换成「从最新往回找」｜语法通过'); }
    catch (e) { console.log('❌ 脚本语法错误：' + e.message); }
  } else console.log('⚠ 脚本里找不到 取数据()');
}

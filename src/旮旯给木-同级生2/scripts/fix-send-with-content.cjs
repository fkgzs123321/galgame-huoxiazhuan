// 修正：/send 必须显式带内容（不带参数时发的是空值）
//   顺序：① 写进输入框（让玩家看见）→ ② 带内容发送 → ③ 生成
const fs = require('fs');
const p = 'E:/Games/写卡/tavern_helper_template/dist/nanpa2-ui/index.html';
let t = fs.readFileSync(p, 'utf8');

const 旧 = [
  "        await triggerSlash('/setinput ' + JSON.stringify(要发));   /* ① 内容进输入框 */",
  "        await triggerSlash('/send');                              /* ② 发送（不在输入框留残余） */",
].join('\n');

const 新 = [
  "        await triggerSlash('/setinput ' + JSON.stringify(要发));   /* ① 内容进输入框，玩家能看见 */",
  "        await new Promise(function(r){setTimeout(r,260);});        /* ② 停一下，让他看清 */",
  "        await triggerSlash('/send ' + JSON.stringify(要发));        /* ③ 带内容发送（不带参数会发空值） */",
].join('\n');

if (t.includes(旧)) { t = t.replace(旧, 新); console.log('✅ /send 改成显式带内容 + 中间停 260ms'); }
else console.log('⚠ 锚点未命中');

fs.writeFileSync(p, t);
const m = t.match(/<script>([\s\S]*?)<\/script>/);
try { new Function('return ' + m[1]); console.log('✅ 语法通过（' + t.length + ' 字符）'); }
catch (e) { console.log('❌ ' + e.message); process.exit(1); }
console.log("  /send 带参: " + t.includes("triggerSlash('/send ' + JSON.stringify(要发))"));

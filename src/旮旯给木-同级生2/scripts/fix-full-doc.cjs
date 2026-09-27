// 照 src/暗黑地牢（能正常显示）的完整文档结构补全
// 它的结构（关键：完整 HTML 文档 + script 在 body 内）：
//   ```
//   <!DOCTYPE html>
//   <html lang="zh-CN">
//   <head>
//   <meta charset="UTF-8">
//   <style>…</style>
//   </head>
//   <body>
//   …HTML…
//   <script>…</script>
//   </body>
//   </html>
//   ```
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');

for (const f of ['正则/状态栏界面.html', '正则/开局选择界面.html']) {
  const p = path.join(D, f);
  let t = fs.readFileSync(p, 'utf8');

  // ① 去掉旧的包裹（反引号 / body 标签保持内容）
  t = t.replace(/^\s*```\s*\n/, '').replace(/\n\s*```\s*$/, '');
  t = t.replace(/<body>\s*\n?/, '').replace(/\n?\s*<\/body>/, '');

  // ② 拆出 style 段与其余
  const 样式 = [];
  t = t.replace(/<style>[\s\S]*?<\/style>/g, (m) => { 样式.push(m); return '__STYLE__'; });

  // ③ 拆出 script（要放到 body 内的末尾）
  const 脚本 = [];
  t = t.replace(/<script>[\s\S]*?<\/script>/g, (m) => { 脚本.push(m); return '__SCRIPT__'; });

  // ④ 重组为完整文档
  const 体 = t.replace('__STYLE__', '').replace('__SCRIPT__', '').trim();
  const 新 = [
    '```',
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="UTF-8">',
    ...样式,
    '</head>',
    '<body>',
    体,
    ...脚本,
    '</body>',
    '</html>',
    '```',
    '',
  ].join('\n');

  fs.writeFileSync(p, 新);
  const L = 新.split(/\r?\n/).filter(x => x.trim());
  console.log('✅ ' + f + '（' + 新.length + ' 字符）');
  console.log('   首3行: ' + [L[0], L[1], L[2]].map(x => JSON.stringify(x)).join(' '));
  console.log('   末3行: ' + L.slice(-3).map(x => JSON.stringify(x)).join(' '));
  console.log('   DOCTYPE=' + 新.includes('<!DOCTYPE html>') + ' html=' + 新.includes('<html') + ' head=' + 新.includes('</head>') + ' body=' + 新.includes('<body>') + ' script=' + 新.includes('<script>'));
  // script 语法
  const m = 新.match(/<script>([\s\S]*?)<\/script>/);
  if (m) { try { new Function('return ' + m[1]); console.log('   ✅ script 语法通过'); } catch (e) { console.log('   ❌ ' + e.message.slice(0, 60)); } }
}

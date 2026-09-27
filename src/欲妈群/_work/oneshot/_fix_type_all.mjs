import fs from 'fs';
const CARD = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';
const F = CARD + '/正则/状态栏.html';
let t = fs.readFileSync(F, 'utf8');

// 把文件里【所有】type:/xxx/ 的写法统一改成字符串（getVariables 与 updateVariablesWith 两条路径都要）
const 前 = (t.match(/type:\/(message|chat)\//g) || []).length;
t = t.split('{type:/message/, message_id:id}').join('{type:"message", message_id:id}');
t = t.split('{type:/message/,message_id:id}').join('{type:"message",message_id:id}');
t = t.split('{type:/chat/}').join('{type:"chat"}');
const 后 = (t.match(/type:\/(message|chat)\//g) || []).length;

fs.writeFileSync(F, t, 'utf8');
console.log('✓ type:/xxx/ 写法：' + 前 + ' → ' + 后 + (后 ? ' ❌ 还有残留' : ' ✅ 全清'));

// 逐条列出现在的调用
console.log('');
console.log('── 现在所有 type: 的写法 ──');
for (const m of t.matchAll(/\{type:"(message|chat)"[^}]*\}/g)) console.log('  ' + m[0]);

// 语法检查 + 同步 CDN
const m = [...t.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
fs.writeFileSync(CARD + '/_work/tmp/_ui_script.js', m, 'utf8');

const 剥 = t.replace(/^\uFEFF?\s*```(?:html|HTML)?\s*\r?\n/, '').replace(/\r?\n```\s*$/, '');
fs.writeFileSync(CARD + '/_cdn/index.html', 剥, 'utf8');
console.log('✓ CDN 副本已同步（' + 剥.length + ' 字符）');

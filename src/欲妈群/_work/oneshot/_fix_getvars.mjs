import fs from 'fs';
const CARD = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';
const F = CARD + '/正则/状态栏.html';

let t = fs.readFileSync(F, 'utf8');
const 前 = t.length;

// getVariables 的 type 必须是字符串 —— AGENTS.md / @types/function/variables.d.ts：
//   全局 {type:'global'}　角色卡 {type:'character'}　聊天 {type:'chat'}　楼层 {type:'message', message_id}
const 换 = [
  ['getVariables({type:/message/,message_id:id})', 'getVariables({type:"message",message_id:id})'],
  ['getVariables({type:/message/, message_id:id})', 'getVariables({type:"message", message_id:id})'],
  ['getVariables({type:/chat/})', 'getVariables({type:"chat"})'],
];
let n = 0;
for (const [a, b] of 换) {
  const c = t.split(a).length - 1;
  if (c) { t = t.split(a).join(b); n += c; console.log('✓ ' + (n) + '处：' + a.slice(11, 46) + '  →  ' + b.slice(11, 46)); }
}
fs.writeFileSync(F, t, 'utf8');
console.log('');
console.log('共修 ' + n + ' 处');
const 剩 = (t.match(/type:\/(message|chat)\//g) || []).length;
console.log('剩余的 type:/xxx/ 写法：' + 剩 + (剩 ? ' ❌' : ' ✅（应 0）'));

// 同步到 CDN 副本（剥围栏）
const 剥 = t.replace(/^\uFEFF?\s*```(?:html|HTML)?\s*\r?\n/, '').replace(/\r?\n```\s*$/, '');
fs.writeFileSync(CARD + '/_cdn/index.html', 剥, 'utf8');
console.log('✓ 已更新 CDN 副本 index.html（' + 剥.length + ' 字符）');

// 语法检查
const m = [...t.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
fs.writeFileSync(CARD + '/_work/tmp/_ui_script.js', m, 'utf8');
console.log('✓ 已导出脚本供 --check（' + m.length + ' 字符）');

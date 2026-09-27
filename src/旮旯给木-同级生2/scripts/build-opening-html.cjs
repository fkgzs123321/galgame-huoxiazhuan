// 开局界面也走 CDN：把 正则/开局选择界面.html 组装成自包含 HTML → dist/nanpa2-ui/opening.html
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const PROC = 'E:/Games/写卡/tavern_helper_template';

const 源 = fs.readFileSync(path.join(D, '正则/开局选择界面.html'), 'utf8');
const 样式 = (源.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
const 脚本 = (源.match(/<script>[\s\S]*?<\/script>/) || [''])[0];
// 体 = 去掉 style/script/反引号/html/head/body/meta 之后剩下的
let 体 = 源
  .replace(/<style>[\s\S]*?<\/style>/, '')
  .replace(/<script>[\s\S]*?<\/script>/, '')
  .replace(/```/g, '')
  .replace(/<!DOCTYPE html>/gi, '')
  .replace(/<\/?html[^>]*>/gi, '')
  .replace(/<\/?head>/gi, '')
  .replace(/<meta[^>]*>/gi, '')
  .replace(/<\/?body>/gi, '')
  .trim();

const HTML = ['<!DOCTYPE html>', '<html lang="zh-CN">', '<head>', '<meta charset="UTF-8">', 样式, '</head>', '<body>', 体, 脚本, '</body>', '</html>', ''].join('\n');

const 目标 = path.join(PROC, 'dist', 'nanpa2-ui', 'opening.html');
fs.mkdirSync(path.dirname(目标), { recursive: true });
fs.writeFileSync(目标, HTML);
console.log('✅ 写出 ' + 目标 + '（' + HTML.length + ' 字符）');
console.log('   含 DOCTYPE=' + HTML.includes('<!DOCTYPE html>') + ' ｜ body=' + HTML.includes('<body>') + ' ｜ script=' + HTML.includes('<script>'));
console.log('   体长度=' + 体.length + ' ｜ 样式=' + 样式.length + ' ｜ 脚本=' + 脚本.length);
const m = 脚本.match(/<script>([\s\S]*?)<\/script>/);
if (m) { try { new Function('return ' + m[1]); console.log('   ✅ script 语法通过'); } catch (e) { console.log('   ❌ ' + e.message.slice(0, 60)); } }

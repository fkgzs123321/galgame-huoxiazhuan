// _regex_sim_yyjs.mjs - 模拟 ST 正则管线在开场白上的效果
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const card = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', '怨妇救赎', '怨妇救赎.json'), 'utf8'));
const fm = card.data.first_mes;
const rs = card.data.extensions.regex_scripts || [];

function parseRegex(s) {
  const m = s.match(/^\/([\s\S]*)\/([gimsuy]*)$/);
  if (m) return new RegExp(m[1], m[2]);
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

console.log('=== 第一句话开头 130 字符 ===');
console.log(fm.slice(0, 130));
console.log('...\n');

console.log('=== 显示层处理（markdownOnly:true 的替换脚本）===');
let display = fm;
rs.filter(r => !r.promptOnly).forEach(r => {
  const re = parseRegex(r.findRegex);
  display = display.replace(re, (m, g1, g2) =>
    r.scriptName === '变量更新美化'
      ? `[折叠卡片·变量更新·内容${String(g2 || '').length}字]`
      : '[状态栏HTML]'
  );
});
console.log('  原始含 <UpdateVariable>:', fm.includes('<UpdateVariable>'));
console.log('  处理后含 <UpdateVariable>:', display.includes('<UpdateVariable>') ? '✗ 仍显示!' : '✓ 已折叠');
console.log('  处理后含 initvar 内容:  ', display.includes('初始变量') ? '✗ 仍显示!' : '✓ 已隐藏');
console.log('  占位符被替换:          ', display.includes('<StatusPlaceHolderImpl/>') ? '✗ 仍在!' : '✓');
console.log('  处理后长度:', display.length, '（原', fm.length, '）');
console.log('  折叠卡片片段:', display.match(/\[折叠卡片[^\]]*\]/)?.[0] || '未找到');

console.log('\n=== AI 层处理（promptOnly:true 的隐藏脚本）===');
let prompt = fm;
rs.filter(r => r.promptOnly).forEach(r => {
  const re = parseRegex(r.findRegex);
  prompt = prompt.replace(re, '');
});
console.log('  占位符:      ', prompt.includes('<StatusPlaceHolderImpl/>') ? '✗ 仍在!' : '✓ 已隐藏');
console.log('  UpdateVariable:', prompt.includes('<UpdateVariable>') ? '✗ 仍在!' : '✓ 已隐藏');
console.log('  AI层长度:', prompt.length);

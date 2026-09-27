// 修「角色/*/基础信息.txt」的值内冒号（YAML 会把它当嵌套映射）+ 修裸散文行
import fs from 'node:fs';
import path from 'node:path';

const 目录 = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/世界书/角色/';
const 行正则 = /^(\s*)([^\s:#][^:]*):\s(.*)/;   // ★ 不加尾部 $：JS 的 . 不匹配 \r，CRLF 文件会永远匹配不上

let 改 = 0;
for (const d of fs.readdirSync(目录)) {
  const p = path.join(目录, d, '基础信息.txt');
  if (!fs.existsSync(p)) continue;
  const L = fs.readFileSync(p, 'utf8').split('\n');
  let 动 = 0;
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    if (/<%|%>/.test(l)) continue;
    const m = l.match(行正则);
    if (!m) continue;
    const 值 = m[3];
    if (!/:\s/.test(值)) continue;
    L[i] = m[1] + m[2] + ': ' + 值.replace(/:\s/g, '：');
    动++;
  }
  if (动) { fs.writeFileSync(p, L.join('\n')); 改 += 动; console.log('✓ ' + d + ' → ' + 动 + ' 行'); }
}
console.log('共改', 改, '行');

// 复验
const YAML = (await import('yaml')).default;
let 坏 = 0, 总 = 0;
for (const d of fs.readdirSync(目录)) {
  const p = path.join(目录, d, '基础信息.txt');
  if (!fs.existsSync(p)) continue;
  总++;
  try { YAML.parse(fs.readFileSync(p, 'utf8')); } catch (e) { 坏++; console.log('  ✗ ' + d + ' → ' + e.message.split('\n')[0].slice(0, 70)); }
}
console.log('角色基础信息 ' + 总 + ' 份，YAML 解析失败 ' + 坏 + ' 份');

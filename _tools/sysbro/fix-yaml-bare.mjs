// 修「关系设定」下的裸散文行 —— 用块内序号键（其一/其二/…），不用同一个键名
import fs from 'node:fs';
import path from 'node:path';

const 目录 = 'E:/Games/写卡/tavern_helper_template/src/系统哥的末日/世界书/角色/';
const 序 = ['其一', '其二', '其三', '其四', '其五'];

let 改 = 0;
for (const d of fs.readdirSync(目录)) {
  const p = path.join(目录, d, '基础信息.txt');
  if (!fs.existsSync(p)) continue;
  let L = fs.readFileSync(p, 'utf8').split('\n');

  // ① 先回滚上一轮加错的统一键名
  L = L.map((l) => l.replace(/^(\s+)他的态度: /, '$1'));

  // ② 在关系设定块内，按「与X:」分组，给裸散文行配序号键
  let 在关系 = false, 计数 = 0;
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    if (/^  \S/.test(l) && !/^  关系设定/.test(l)) 在关系 = false;
    if (/^  关系设定\s*:/.test(l)) { 在关系 = true; 计数 = 0; continue; }
    if (!在关系) continue;
    if (/<%|%>/.test(l)) continue;
    if (/^\s{4}\S/.test(l)) { 计数 = 0; continue; }        // 换到下一个人，序号归零
    if (/^\s{6}\S/.test(l) && !l.includes(': ')) {
      L[i] = '      ' + 序[计数] + ': ' + l.trim();
      计数++; 改++;
    }
  }
  fs.writeFileSync(p, L.join('\n'));
}
console.log('共改', 改, '行');

const YAML = (await import('yaml')).default;
let 坏 = 0, 总 = 0;
for (const d of fs.readdirSync(目录)) {
  const p = path.join(目录, d, '基础信息.txt');
  if (!fs.existsSync(p)) continue;
  总++;
  try { YAML.parse(fs.readFileSync(p, 'utf8')); } catch (e) { 坏++; console.log('  ✗ ' + d + ' → ' + e.message.split('\n')[0].slice(0, 70)); }
}
console.log('角色基础信息 ' + 总 + ' 份，YAML 解析失败 ' + 坏 + ' 份');

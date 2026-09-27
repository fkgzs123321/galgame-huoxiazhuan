import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wb = path.join(__dirname, 'src', '欲妈群', '世界书');

// 蓝灯条目（enabled=true, constant=true）
const blue = [
  'D0系统控制器.txt',
  '[mvu_plot]思维链强制输出.txt',
  '[mvu_plot]防口胡与世界观铁律.txt',
  '[控制中心]功能开关与配置.txt',
];

// MVU 蓝灯条目
const mvuBlue = [
  '变量/变量列表.txt',
  '变量/变量输出格式.txt',
  '变量/变量更新规则.yaml',
];

// 绿灯条目（enabled=true, selective=true）
const green = [
  '[事件]线下聚会.txt',
  '[场景]隐秘场所.txt',
  '[规则]随机欲妈生成.txt',
];

// initvar（enabled=false）
const initvar = '变量/initvar.yaml';

function safe(p) {
  try { return fs.readFileSync(p, 'utf-8'); } catch { return null; }
}

let blueTotal = 0, greenTotal = 0, allTotal = 0, initvarLen = 0;

console.log('=== 蓝灯条目（应进token）===');
for (const n of blue) {
  const c = safe(path.join(wb, n));
  if (c) { console.log(`  ${n}: ${c.length} chars`); blueTotal += c.length; }
}
for (const n of mvuBlue) {
  const c = safe(path.join(wb, n));
  if (c) { console.log(`  ${n}: ${c.length} chars`); blueTotal += c.length; }
}
console.log(`  蓝灯合计: ${blueTotal} chars (约 ${Math.round(blueTotal/4)} tokens)`);

console.log('\n=== 绿灯条目（selective，关键词触发）===');
for (const n of green) {
  const c = safe(path.join(wb, n));
  if (c) { console.log(`  ${n}: ${c.length} chars`); greenTotal += c.length; }
}
console.log(`  绿灯合计: ${greenTotal} chars (约 ${Math.round(greenTotal/4)} tokens)`);

console.log('\n=== initvar.yaml（enabled=false，不应进token）===');
const iv = safe(path.join(wb, initvar));
if (iv) { console.log(`  ${initvar}: ${iv.length} chars`); initvarLen = iv.length; }

// 全部世界书文件
function walk(dir) {
  let files = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(walk(p));
    else if (e.name.endsWith('.txt') || e.name.endsWith('.yaml')) files.push(p);
  }
  return files;
}

const allFiles = walk(wb);
for (const f of allFiles) {
  const c = safe(f);
  if (c) allTotal += c.length;
}
console.log(`\n=== 全部世界书文件 ===`);
console.log(`  文件数: ${allFiles.length}`);
console.log(`  总字符数: ${allTotal} chars (约 ${Math.round(allTotal/4)} tokens)`);

console.log(`\n=== 关键对比 ===`);
console.log(`  蓝灯+绿灯（正常应进token）: ${blueTotal + greenTotal} chars (约 ${Math.round((blueTotal+greenTotal)/4)} tokens)`);
console.log(`  全部文件（EJS失效时全加载）: ${allTotal} chars (约 ${Math.round(allTotal/4)} tokens)`);
console.log(`  12万token对应的字符数: ${120000*4} chars`);
console.log(`  如果是12万token，说明: ${120000*4 > allTotal ? '不可能！总文件都没那么多' : '可能EJS失效全加载'}`);

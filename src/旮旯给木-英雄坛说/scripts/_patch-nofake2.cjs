// 按行号精确删掉残留的臆想交互
const fs = require('fs');
const p = 'src/旮旯给木-英雄坛说/正则/_面板逻辑.js';
let 行 = fs.readFileSync(p, 'utf8').split(/\r?\n/);

// 从后往前删，免得前面的行号错位
const 删段 = [];
function 找(子串) { for (let i = 0; i < 行.length; i++) if (行[i].includes(子串)) return i; return -1; }

// ① 兴奋度按钮那段（830 行附近：从 span> 到 </div> 的两行）
let i = 找('data-ar="-10"');
if (i >= 0) { 删段.push([i, i + 1]); }
// ② 任务推进/放弃（674-675）
i = 找('data-tadv');
if (i >= 0) { 删段.push([i, i + 2]); }
// ③ 物品三个按钮（926-928 附近：从 槽 = 那行下面开始）
i = 找('data-op="equip"');
if (i >= 0) { 删段.push([i - 2, i + 4]); }
// ④ 总览页显示兴奋度那一行（279）
i = 找("行('熟练度', H.熟练度 || '新手') + 行('兴奋度'");
if (i >= 0) { 删段.push([i, i]); }

删段.sort((a, b) => b[0] - a[0]);
for (const [a, b] of 删段) 行.splice(a, b - a + 1, '    // （此处原是臆想的交互，已按「面板职责边界」移除）');

fs.writeFileSync(p, 行.join('\n'));
console.log('✅ 按行号删掉 ' + 删段.length + ' 段残留');
console.log('   删的行区间: ' + 删段.map(x => (x[0] + 1) + '~' + (x[1] + 1)).join(' / '));

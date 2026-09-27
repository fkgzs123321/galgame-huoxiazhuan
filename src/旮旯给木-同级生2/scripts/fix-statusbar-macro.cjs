// 严格按 references/ui/text.md 改状态栏
// 原文要点：
//   ① 直接在 正则/状态栏界面.html 写 HTML 与**宏**，无需独立前端项目、无需构建工具
//   ② **文件以 3 个反引号行起止，这两行是文件内容的一部分、必须保留**
//   ③ **无需 <script> 标签**
//   ④ 变量用宏读：{{format_message_variable::stat_data.路径}}，由 SillyTavern 替换
//   ⑤ 「路径不存在时宏返回空字符串」→ 路径写错就空白
// 做法：**每个纯显示位置插宏作为初始值** —— JS 跑得起来就用 JS 的动态值，
//       JS 跑不起来也能靠宏显示数值 → **从根本上不怕「界面空白」**
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..');
const p = path.join(D, '正则/状态栏界面.html');
let h = fs.readFileSync(p, 'utf8');

// 宏工具
const 宏 = (路径) => '{{format_message_variable::stat_data.' + 路径 + '}}';

// ── ① 每个纯显示位置插宏（作为初始内容）──
const 插 = [
  // [查找, 替换]
  ['<div class="d1" id="gg2-date">—</div>', '<div class="d1" id="gg2-date">' + 宏('时间.当前日期') + ' · 第 ' + 宏('时间.天数') + ' 天</div>'],
  ['<div class="d2" id="gg2-sub">—</div>', '<div class="d2" id="gg2-sub">' + 宏('时间.章节') + ' · ' + 宏('场景.场景模式') + '</div>'],
  ['<b id="gg2-left">—</b>', '<b id="gg2-left">' + 宏('时间.天数') + '</b>'],
  ['<span class="v" id="gg2-hpv">—</span>', '<span class="v" id="gg2-hpv">' + 宏('主角.身体状态') + '</span>'],
  ['<span class="v" id="gg2-rev">—</span>', '<span class="v" id="gg2-rev">' + 宏('主角.反抗值') + '</span>'],
  ['<span class="v" id="gg2-exv">—</span>', '<span class="v" id="gg2-exv">' + 宏('她.兴奋度') + '</span>'],
  ['<b id="gg2-who">—</b>', '<b id="gg2-who">' + 宏('她.人设') + '</b>'],
  ['<b id="gg2-goal">—</b>', '<b id="gg2-goal">' + 宏('她.目的进度') + '%</b>'],
  ['<b id="gg2-know">—</b>', '<b id="gg2-know">' + 宏('主角.对她的了解') + '</b>'],
  ['<b id="gg2-d0">—</b>', '<b id="gg2-d0">' + 宏('局面.今日指令') + '</b>'],
  ['<b id="gg2-place">—</b>', '<b id="gg2-place">' + 宏('场景.当前地点') + '</b>'],
  ['<b id="gg2-cast">—</b>', '<b id="gg2-cast">' + 宏('场景.在场') + '</b>'],
  ['<div class="win" id="gg2-win">在线</div>', '<div class="win" id="gg2-win">' + 宏('主角.状态') + '</div>'],
];
let n = 0;
for (const [a, b] of 插) if (h.includes(a)) { h = h.replace(a, b); n++; }
console.log('① 插入宏作为初始值：' + n + '/' + 插.length + ' 处');

// 属性 / 技能 / 金钱 chip 也插宏（它们是 chips() 生成的，先给静态骨架）
const chip = (k, 路径, cls) => '<span' + (cls ? ' class="' + cls + '"' : '') + '>' + k + '<b>' + 宏(路径) + '</b></span>';
h = h.replace('<div class="chips" id="gg2-attr"></div>',
  '<div class="chips" id="gg2-attr">' + chip('说话', '主角.说话') + chip('做事', '主角.做事') + chip('懂东西', '主角.懂东西') + '</div>');
h = h.replace('<div class="chips" id="gg2-skill"></div>',
  '<div class="chips" id="gg2-skill">' + chip('打工', '主角.技能.打工', 'sk') + chip('学业', '主角.技能.学业', 'sk') + chip('机车', '主角.技能.机车', 'sk') + '</div>');
h = h.replace('<div class="chips" id="gg2-money"></div>',
  '<div class="chips" id="gg2-money">' + chip('现金', '经济.现金', 'mn') + chip('累计储蓄', '经济.累计储蓄', 'mn') + chip('当日', '经济.当日盈亏', 'mn') + '</div>');
console.log('② 属性/技能/金钱 chip 已插宏');

// ── ③ 恢复 3 个反引号（text.md 明令：这两行是文件内容的一部分、必须保留）──
if (!h.trimStart().startsWith('```')) h = '```\n' + h.trimStart();
if (!h.trimEnd().endsWith('```')) h = h.trimEnd() + '\n```\n';
console.log('③ 已恢复首尾 3 反引号（按 text.md 要求）');

fs.writeFileSync(p, h);
console.log('   最终 ' + h.length + ' 字符');
console.log('   宏数量：' + (h.match(/\{\{format_message_variable::/g) || []).length);

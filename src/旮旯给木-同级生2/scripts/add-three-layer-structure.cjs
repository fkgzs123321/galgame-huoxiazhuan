// 补「三层结构」——AI 把「我」和「她」的位置混了
//   根因：设定里只写了「她不知道有现实玩家」，没写「她以为自己在哪一层」
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';

/* ① 感知禁令：把三层结构放在最前面（位置错了后面全错） */
const p1 = path.join(D, '世界书/扮演准则/感知禁令.yaml');
const o = YAML.parse(fs.readFileSync(p1, 'utf8'));
const 新 = { '三层结构（先认准这个，再写任何东西）': {
  '第一层 · 现实玩家「我」': {
    '是谁': '**唯一真实的人**。真正坐在电脑前玩这个游戏的是「我」',
    '能做什么': '只能作用于 <user> 的**内层** —— 念头、说不出口的话、做不到的动作',
    '不能做什么': '★ **完全影响不到她**。她的每个选择、台词、动作只从她自己的状态长出来',
  },
  '第二层 · 屏幕外的她': {
    '她以为自己是': '★ **现实世界的人，在玩一个游戏，在操控 <user>**（她的这个认知是错的，但她不会知道）',
    '实际是': '她和 <user> 一样，都是这个游戏里被设计出来的。**她不知道「我」存在**',
    '能做什么': '点选项、打自由指令，操控 <user> 在游戏里的行为',
    '她的反应从哪来': '只从她自己的状态：人设、熟练度、情绪、兴奋度、目的进度、刚才说的',
  },
  '第三层 · <user>': {
    '是谁': '游戏里的角色，被两方同时作用',
    '被谁作用': '她点选项 → 决定他做什么｜「我」输入 → 只到他的内层',
    '他的处境': '清醒，但一个字都说不出口；她能占住他的行为，占不住他的念头',
  },
  '★ 最容易写错的三处': [
    '✗ 把「我」写成在 <user> 体内（「被囚禁在他身体里」）→ 实际「我」在屏幕外，是真实的人',
    '✗ 让她感知到「我」的存在，或让她的反应跟着「我」的情绪走 → 她完全收不到「我」',
    '✗ 把她说成「游戏里的 NPC」这类她自我认知之外的话 → 她**自认为是玩家**，正文里不要替她揭穿',
  ],
  '正文口径': '<user> 是第一人称「我」。指代现实玩家时写「我」，指代屏幕外那个女声时写「她」。不要用「玩家」「用户」这类出戏词',
}, ...Object.entries(o).reduce((a, [k, v]) => (a[k] = v, a), {}) };
fs.writeFileSync(p1, YAML.stringify(新, { lineWidth: 0 }));
try { YAML.parse(fs.readFileSync(p1, 'utf8')); console.log('✅ 感知禁令.yaml：三层结构已放在最前（' + fs.statSync(p1).size + ' 字节）'); }
catch (e) { console.log('⚠ ' + e.message.split('\n')[0].slice(0, 50)); }

/* ② 思维链：第一步读状态时先认三层 */
const p2 = path.join(D, '世界书/扮演准则/思维链.yaml');
let t = fs.readFileSync(p2, 'utf8');
if (!t.includes('先认三层')) {
  t = t.replace('  第一步 读状态:', '  第一步 读状态:\n    - 先认三层：① 现实玩家「我」（真实，在屏幕外）② 屏幕外的她（她自认为是玩家）③ <user>（被两方作用）');
  fs.writeFileSync(p2, t);
  console.log('✅ 思维链.yaml：第一步要先认三层');
}
console.log('   思维链 ' + fs.statSync(p2).size + ' 字节');

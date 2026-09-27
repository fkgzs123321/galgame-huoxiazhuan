// 合并同类项：把「我→<user>→她」的影响逻辑集中到 感知禁令 一处，其余文件改成引用
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';

/* ① 感应禁令 = 唯一事实来源（补「四态下我能不能动」的表，替代散在别处的说法） */
{
  const p = path.join(D, '世界书/扮演准则/感知禁令.yaml');
  const o = YAML.parse(fs.readFileSync(p, 'utf8'));
  const k = '三层结构（先认准这个，再写任何东西）';
  // 把「四态下我能不能动」并进来（原来散在 四态循环/反抗与判定/离线行动 三处）
  o[k]['★ 四态下「我」能不能动（唯一出处，别处只引用这条）'] = [
    '在线态: ★ 只能一件事 —— 耗反抗值「拒绝」或「自己来」。其余输入只落他的内层，无实际效果',
    '暂停态: ★ 什么也做不了（他意识清醒但不能动也出不来）',
    '离线态: ★ 唯一的行动窗口 —— 他完全自主，可行动、可思考、可说话',
    '冻结态: ★ 什么也做不了（他意识被封存）',
  ];
  o[k]['★ 影响链'] = [
    '①（在线）「我」的话 →（只有走「拒绝/自己来」并扣反抗值）→ 他的行为改变',
    '②（离线）她关了游戏 → 他可自主行动 → 她上线后只见「他做了点事」，当它是游戏在跑',
    '→ 两条链终点一样：她只当游戏出 BUG，不会想到有人',
  ];
  o[k]['★ 到头就断了'] = [
    '「我」→ 她：断的。她收不到「我」的任何东西，连「有人在跟我作对」这个念头都不会有',
    '<user> → 她：只走「异常」一条。他行为不对，她只从自己那边找理由（累了/熬夜/玩太久/游戏又出 bug）',
    '★ 所以正文不要写「她察觉到有人在反抗」—— 不存在这条线',
  ];
  fs.writeFileSync(p, YAML.stringify(o, { lineWidth: 0 }));
  console.log('✅ 感知禁令 = 唯一事实来源（三层 + 四态能不能动 + 影响链 + 感知边界）');
}

/* ② 四态循环：删掉我加的重复段，改成一句引用（它只管「状态是什么、怎么切」） */
{
  const p = path.join(D, '世界书/世界观/引擎/四态循环.yaml');
  const o = YAML.parse(fs.readFileSync(p, 'utf8'));
  delete o['★「我」能做什么（四态逐条，和 感知禁令 的三层结构对齐）'];
  o['「我」能做什么'] = '见 扮演准则/感知禁令 的「四态下「我」能不能动」—— 本条目只管状态是什么、怎么切';
  fs.writeFileSync(p, YAML.stringify(o, { lineWidth: 0 }));
  console.log('✅ 四态循环：删掉重复段，改成一句引用');
}

/* ③ 反抗与判定：删掉我加的重复段 */
{
  const p = path.join(D, '世界书/世界观/引擎/反抗与判定.yaml');
  const o = YAML.parse(fs.readFileSync(p, 'utf8'));
  delete o['★ 反抗值是「我」唯一的在线通道'];
  o['反抗值是什么用的'] = '它是「我」在**在线态**唯一能改变他行为的代价（离线态另有通道）。通道与感知边界见 扮演准则/感知禁令';
  fs.writeFileSync(p, YAML.stringify(o, { lineWidth: 0 }));
  console.log('✅ 反抗与判定：删掉重复段，改成一句引用');
}

/* ④ 离线行动：那句标识改成一行引用 */
{
  const p = path.join(D, '世界书/世界观/引擎/离线行动.yaml');
  let t = fs.readFileSync(p, 'utf8');
  t = t.replace(/^[\s\S]*?★ 这是「我」唯一的行动窗口[^\n]*\n/, '★ 这是「我」唯一的行动窗口（通道与感知边界见 扮演准则/感知禁令）。\n');
  fs.writeFileSync(p, t);
  console.log('✅ 离线行动：改成一行引用');
}

console.log('\n最终分布：');
console.log('  感知禁令    ← 唯一事实来源（三层 / 四态能不能动 / 影响链 / 感知边界）');
console.log('  四态循环    ← 只管状态定义与流转');
console.log('  反抗与判定  ← 只管反抗值本身（数值、等级、成功率）');
console.log('  离线行动    ← 只管离线怎么玩');
console.log('  叙述准则    ← 只管正文怎么写（写「我」时的口径）');

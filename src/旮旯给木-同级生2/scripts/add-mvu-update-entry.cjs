// 让「额外模型」（负责更新变量的 AI）能看到选项池 + 输出格式
//   依据 skills references/conventions.md 的「双 AI 发送路由」：
//     [mvu_plot]   → 只发给输出剧情的 AI
//     [mvu_update] → 只发给更新变量的 AI（额外模型）★
//     无前缀       → 两个都发
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';

const 内容 = `【只给负责更新变量的模型看。这一段不进剧情 AI 的上下文。】

你的任务：把这一层该摆的选项，写进 局面.当前选项。

■ 选项从哪来（四层，按顺序取）
  第一层 公共池：不涉及具体人的通用动作（坐着不动、敲敲玻璃、去喝水…），全是 微/中
  第二层 关卡池：当前这一关能做的动作。主料
  第三层 女角池：只跟某个女角有关的动作。★ 那个女角在场时才取
  第四层 她的偏好：★ 不改「有哪些」，只改「挑哪几个、什么顺序、怎么写」

  ★ 铁律：你写的每一条，都必须能在这四层里找到出处。**不许自己发明选项**。
  ★ 措辞可以随当下场面写，**等级不许改**（池子里是「强」，写出来还得是「强」）。

■ 写进去的格式（面板只认这三个字段）
局面:
  当前选项:
    "1":
      文本: 她看到的选项名
      等级: 微
      感觉: 一行，<user> 对这个选项的预判
    "2":
      文本: ...
      等级: 中
      感觉: ...
    "3":
      文本: ...
      等级: 强
      感觉: ...
    "4":
      文本: ...
      等级: 极
      感觉: ...
  她的倾向: "1"
  她已选: ""

■ 硬约束
  · 键名只用 "1" "2" "3" "4"，不要用 0 或字母
  · 三到四条。其中至少一条是「微」级
  · 等级只能是 微 / 中 / 强 / 极 / 锁 这五个之一
  · 不要加别的字段（面板不认）
  · 不要重复上一层的组合（换掉已经演完的那些）
  · 有女角在场才摆跟她有关的选项；不在场一律不摆，也不要换个人来说那句话

■ 她打字的分支（兴奋度 80 以上时）
  · 「当前选项」留空
  · 把她说的话写进「她打的字」
  · 这个时候她是在直接跟 <user> 说话，不是在选

■ 同时要更新的（跟选项一起写）
  主角.反抗值    —— 她顺从这个选项会涨多少（微 +1~2 ／ 中 +4~6 ／ 强 +9~12 ／ 极 +16~20）
  局面.她的倾向  —— 她最可能点的那一条的键
  场面.地点     —— 这一层发生在哪
`;

const p = path.join(D, '世界书/变量/选项池输出.yaml');
fs.writeFileSync(p, 内容);
console.log('✅ 已建 世界书/变量/选项池输出.yaml（' + 内容.length + ' 字符）');

/* 注册到 entryManifest，条目名带 [mvu_update] 前缀 */
const sp = path.join(D, 'tavern-cards-state.json');
const S = JSON.parse(fs.readFileSync(sp, 'utf8'));
S.entryManifest.MVU = S.entryManifest.MVU || {};
S.entryManifest.MVU['[mvu_update]选项池输出'] = {
  path: '世界书/变量/选项池输出.yaml',
  scope: 'specific',
  keywords: [],
  abstract: '[mvu_update]选项池输出（只发给更新变量的 AI）',
  enabled: true,
  strategy: { type: 'constant' },
  position: { type: 'before_character_definition', order: 60 },
};
fs.writeFileSync(sp, JSON.stringify(S, null, 2));
console.log('✅ 已注册 [mvu_update]选项池输出（order 60，常驻，只发给额外模型）');
console.log('   MVU 组现有条目: ' + Object.keys(S.entryManifest.MVU).join(' / '));

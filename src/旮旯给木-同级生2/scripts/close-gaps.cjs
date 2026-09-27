// 三件结构性缺口，一次做完并闭环
// ① 三维接线：写点（变量更新规则）+ 读点（前端判定真的读三维）—— 修掉「判定空转」
// ② 女角关系值 5 → 4：删「心动值」（与好感度阈值重叠，硬依据）
// ③ CoT：卡侧注入 + 明确告知预设侧要加什么（闭环的边界写清楚）
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-同级生2');
const { execFileSync } = require('child_process');

const 记 = [];

// ═══ ① 三维写点：变量更新规则 ═══
{
  const p = path.join(D, '世界书/变量/变量更新规则.yaml');
  let t = fs.readFileSync(p, 'utf8');
  if (!t.includes('三维成长')) {
    t += `
三维成长（这是三维唯一的写点，不写它们永远是 40）:
  谁写: AI 在每层结算时按这一节写
  触发: 当日「她让 <user> 做的事」按类型涨对应的一维
  说话: 对话、社交、交涉、哄人 类行为，+2 到 5
  做事: 打工、体力活、动手、跑腿 类行为，+2 到 5
  懂东西: 学习、调查、观察、推理 类行为，+2 到 5
  单轮上限: 每一维每层最多 +5
  不做就不涨: 没做对应类型的事，那一维停在原地
  范围: 0 到 100，只增不减（练过不会忘）
  为什么是这三个: 24 个属性压成三维，为的是明牌。玩家看得出「我这方面还行/不行」

三维怎么参与判定（读点）:
  在哪用: 拒绝判定。成功率乘一个三维系数
  系数: 0.6 + 0.8 × 三维平均值 ÷ 100   → 三维 40 时约 0.92，三维 80 时约 1.24
  为什么用乘法: 与难度同理，保证三维高低都不改变量级
  谁算: 前端在按下拒绝按钮时算，AI 不参与
`;
    fs.writeFileSync(p, t);
    记.push('① 变量更新规则：补三维写点 + 读点说明');
  }
}

// ═══ ② 删「心动值」（阈值与好感度重叠）═══
{
  const 文件 = [
    '世界书/变量/initvar.yaml',
    '底座_nanpa2/状态表.yaml',
  ];
  let 命中 = fs.readdirSync(path.join(D, '世界书/角色/底座_nanpa2')).length;
  // initvar: 删掉每位女角的心动值
  const iv = YAML.parse(fs.readFileSync(path.join(D, 文件[0]), 'utf8'));
  let n = 0;
  if (iv.女角) for (const k of Object.keys(iv.女角)) { if (iv.女角[k] && '心动值' in iv.女角[k]) { delete iv.女角[k].心动值; n++; } }
  if (n) { fs.writeFileSync(path.join(D, 文件[0]), YAML.stringify(iv, { lineWidth: 0 })); 记.push('② initvar：删掉 ' + n + ' 位女角的心动值'); }
  // 状态表: 删「心动值」那一条 + 在该处留一行依据
  let st = fs.readFileSync(path.join(D, 文件[1]), 'utf8');
  if (st.includes('- 名: 心动值')) {
    st = st.replace(/\n  - 名: 心动值[\s\S]*?(?=\n  - 名: )/, '\n');
    st = st.replace(/\n  - 名: 信任度/, '\n  # ⚠️「心动值」已删（2026-09-15）：它的阈值（≥45 表白／≥50 初H）与好感度\n  #   （≥50 约会／≥80 初H）重叠，属于「同一件事两个载体」。合并进好感度。\n  - 名: 信任度');
    fs.writeFileSync(path.join(D, 文件[1]), st);
    记.push('② 状态表：删除「心动值」条目并注明依据');
  }
}

// ═══ ③ CoT 注入 ═══
{
  const p = path.join(D, '世界书/扮演准则/CoT注入.yaml');
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, `@@generate_before
<%/*
  CoT 注入 · 引擎层 · 只做投放，不新增内容

  依据 模块化设计 §二 #10：
    「最重要的规则 → injectPrompt("CoT")，放预设思维链位置（AI 注意力最高区），
      比放世界书有效得多」
  投放内容: 推演链 + 加载纪律（这两条是「她怎么想、条目怎么读」，最该待在注意力最高的地方）

  ⚠️ 闭环的另一半在预设里，卡侧做不到：
     玩家的 SillyTavern 预设需要一个 world info 类型的块，
     内容写 <%- getPromptsInjected("CoT") %>
     没有那一行，本条目注入的东西不会出现在 prompt 里。
     已在说明式开场白与 creator_notes 里告知。
*/%>
<%
this.registerPromptInjection('CoT',
  '【推演链】' + getwi('推演链') + '\\n【加载纪律】' + getwi('加载纪律'));
%>
[CoT 已注入：推演链 + 加载纪律]
`);
    记.push('③ 新增条目 扮演准则/CoT注入.yaml（注入 推演链 + 加载纪律）');
  }
  // 说明式开场白告知预设侧
  const kp = path.join(D, '开场白/0.txt');
  let k = fs.readFileSync(kp, 'utf8');
  if (!k.includes('getPromptsInjected')) {
    k += `
【要用上思维链注入，预设里需要加一行】
在预设的提示词列表里新建一个 world info 类型的块，内容写：
<%- getPromptsInjected("CoT") %>
没有这一行，推演链与加载纪律不会出现在思维链位置，只按普通条目投放。
`;
    fs.writeFileSync(kp, k);
    记.push('③ 说明式开场白：告知预设侧要加的那一行');
  }
}

// ═══ 注册 CoT 条目 + 补 use_case ═══
{
  const patch = [{
    op: 'add', path: '/entryManifest/扮演准则/CoT注入',
    value: { abstract: '引擎层 CoT 注入：把推演链与加载纪律投放到预设的思维链位置（AI 注意力最高区）',
      path: '世界书/扮演准则/CoT注入.yaml', keywords: [], scope: 'specific' }
  }];
  fs.writeFileSync(path.join(D, '_p.json'), JSON.stringify(patch));
  try { execFileSync('node', [path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs'), 'patch', '旮旯给木-同级生2', '--file', path.join(D, '_p.json')], { encoding: 'utf8' }); 记.push('③ CoT 条目已注册'); }
  catch (e) { 记.push('⚠️ CoT 注册：' + String(e.stdout || e.message).split('\n')[0]); }
  fs.rmSync(path.join(D, '_p.json'));
}

// ═══ ④ 前端：拒绝判定真的读三维 ═══
{
  const p = path.join(D, '正则/状态栏界面.html');
  let h = fs.readFileSync(p, 'utf8');
  if (!h.includes('三维系数')) {
    h = h.replace(
      "    var rate = lv.rate * (1 + (Number(she.兴奋度) || 0) / 100 * 0.5);\n    rate = rate * (1 - ({ 新手: 0, 上手: .1, 沉浸: .2, 狂热: .3, 收官: .4 }[she.熟练度] || 0));",
      "    var rate = lv.rate * (1 + (Number(she.兴奋度) || 0) / 100 * 0.5);\n    rate = rate * (1 - ({ 新手: 0, 上手: .1, 沉浸: .2, 狂热: .3, 收官: .4 }[she.熟练度] || 0));\n    /* 三维系数（读点）：权重归一化平均 → 0.6~1.4。三维真的参与判定 */\n    var pw = ((Number(p.说话) || 0) + (Number(p.做事) || 0) + (Number(p.懂东西) || 0)) / 3;\n    var 三维系数 = 0.6 + 0.8 * (pw / 100);\n    rate = rate * 三维系数;"
    );
    h = h.replace(
      "      成功率: Math.round(rate * 100) / 100, 掷值: Math.round(r1 * 10000) / 100,",
      "      成功率: Math.round(rate * 100) / 100, 掷值: Math.round(r1 * 10000) / 100, 三维系数: Math.round(三维系数 * 1000) / 1000,"
    );
    h = h.replace(
      "      + '扣 ' + spent + '　掷 ' + Math.round(r1 * 100) + ' / 需 ' + Math.round(rate) + '　结果 ' + R + '</span>';",
      "      + '扣 ' + spent + '　掷 ' + Math.round(r1 * 100) + ' / 需 ' + Math.round(rate) + '　三维 ×' + (Math.round(三维系数 * 100) / 100) + '　结果 ' + R + '</span>';"
    );
    fs.writeFileSync(p, h);
    记.push('④ 前端：拒绝判定已读三维（系数 0.6~1.4），并在结果条显示');
  }
}

console.log(记.join('\n'));

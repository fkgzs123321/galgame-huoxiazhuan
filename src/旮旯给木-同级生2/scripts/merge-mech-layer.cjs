// 机制层合并同类项：每个主题定一个「唯一出处」，其余退成引用
//   ★ 例外：带 [mvu_update] 的两个条目（选项池输出 / 本卡变量路径）
//     是给「额外模型」看的，它可能看不到别处 → 必须自包含，不参与合并
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';
const 读 = (r) => YAML.parse(fs.readFileSync(path.join(D, r), 'utf8'));
const 写 = (r, o) => fs.writeFileSync(path.join(D, r), YAML.stringify(o, { lineWidth: 0 }));
const 改文 = (r, f) => fs.writeFileSync(path.join(D, r), f(fs.readFileSync(path.join(D, r), 'utf8')));

/* ── 主定义点们（保持内容，只加一句「本主题的唯一出处」声明）── */
{
  const p = '世界书/世界观/引擎/出招.yaml';
  const o = 读(p);
  o['★ 本条目是「选项怎么来」的唯一出处'] =
    '「固定四条」「四层来源」「兴奋度 80 以上改自由打字」这三件事只在**本条目**写具体规则，别处只写「见 出招」。'
    + '（例外：带 [mvu_update] 前缀的条目要自包含，不引用）';
  写(p, o);
  console.log('✅ 出招 = 唯一出处（四条 / 四层来源 / 自由打字）');
}
{
  const p = '世界书/世界观/引擎/交互循环.yaml';
  const o = 读(p);
  o['★ 本条目是「一层怎么走、正文怎么写」的唯一出处'] =
    '「回合闭合（演完 + 出新）」和「四段叙事结构」只在**本条目**写具体规则，别处只写「见 交互循环」。'
    + '（例外：带 [mvu_update] 前缀的条目要自包含，不引用）';
  写(p, o);
  console.log('✅ 交互循环 = 唯一出处（回合闭合 / 四段叙事）');
}

/* ── 从属处退成引用 ── */
{
  // 思维链：删掉那些细则是别处的 → 只留步骤骨架 + 引用
  const p = '世界书/扮演准则/思维链.yaml';
  const o = 读(p);
  const s = o['每层输出前，按这八步走一遍再动笔'];
  if (s) {
    s['第二步 她决策'] = ['按她人设的「诉求」+ 性癖 + 情绪 + 兴奋度挑；**四条、四层来源、误点、自由打字**的细则见 世界观/引擎/出招'];
    s['第三步 摆出选项'] = ['每条写 文本/等级/感觉，键名 "1"~"4"，写进 局面.当前选项（路径写法见 变量/本卡变量路径）'];
    s['第六步 叙述'] = ['按 叙述准则 + 当前文风写。**四段结构**见 世界观/引擎/交互循环 的「这一层怎么写」'];
    s['第八步 闭合自检'] = ['三问：演完了吗 / 尾部有新的四条吗 / 新选项跟本层有关吗（规则见 世界观/引擎/交互循环）'];
  }
  // 约束里删掉「我」那条（已归 感知禁令）
  o['约束'] = (o['约束'] || []).filter(x => !String(x).includes('「我」在**屏幕外**'));
  o['约束'].push('「我」的位置与通道：见 扮演准则/感知禁令');
  写(p, o);
  console.log('✅ 思维链：细则退成引用，只留步骤骨架');
}
{
  // 叙述准则：四条那条退成引用
  const p = '世界书/扮演准则/叙述准则.yaml';
  const o = 读(p);
  if (o['标记规范']) o['选项数'] = '四条（细则见 世界观/引擎/出招）';
  写(p, o);
  console.log('✅ 叙述准则：四条退成引用');
}
{
  // 感知禁令 / 玩家的输入：提到四段的地方退成引用
  for (const r of ['世界书/扮演准则/感知禁令.yaml', '世界书/扮演准则/玩家的输入.yaml']) {
    const p = path.join(D, r);
    let t = fs.readFileSync(p, 'utf8');
    const 原 = t;
    t = t.replace(/(四段[^\n]*)/g, (m) => m.includes('见 交互循环') ? m : m + '（细则见 世界观/引擎/交互循环）');
    if (t !== 原) fs.writeFileSync(p, t);
  }
  console.log('✅ 感知禁令 / 玩家的输入：四段退成引用');
}
console.log('\n保留自包含（给额外模型看，不参与合并）：');
console.log('  变量/选项池输出.yaml（[mvu_update]）');
console.log('  变量/本卡变量路径.yaml（[mvu_update]）');

// 强化「回合闭合」：演完上一层的选项 → 底部生成本层选项（保证每层都有选项可选）
const fs = require('fs');
const path = require('path');
const YAML = require('E:/Games/写卡/tavern_helper_template/node_modules/yaml');
const D = 'E:/Games/写卡/tavern_helper_template/src/旮旯给木-同级生2';

/* ── ① 卡内：交互循环.yaml ── */
{
  const p = path.join(D, '世界书/世界观/引擎/交互循环.yaml');
  const o = YAML.parse(fs.readFileSync(p, 'utf8'));
  o['每一层的结构'] = {
    '铁律': '★ 每一层都要有选项可选 —— 这是硬要求。一层里既要有「演完」，也要有「新选项」',
    '一句话': '一层 = 把上一层她点的选项演完，再在底部生出本层的选项',
    '第一步 演完上层': [
      '上一层底部摆出的选项里，她点的那一条 —— 必须在这一层**演完**',
      '演完 = 这件事发生了、有过程、有结果、有落点。不是提一下、不是停在半路',
      '★ 禁止：演到一半就停（那这一层就没演完，下一层也没得接）',
      '★ 禁止：把上一层的选项忘了（那她点了等于没点）',
      '演完要能被看见：谁在场、发生了什么、她（或她们）的反应、留下什么',
    ],
    '第二步 底部生成本层选项': [
      '本层末尾，摆出新的三到四条选项，写进 局面.当前选项',
      '每条标注等级与消耗（微／中／强／极／锁）',
      '★ 新选项跟着本层的结果走 —— 本层演成什么样，决定下一层有什么可点',
      '★ 换掉已经演完的那些，不要重复摆同一件事',
    ],
    '顺序不能反': '先演完，再摆新的。反了就会变成「上一件事还没做完就换下一件」',
    '为什么': '每一层读完应该是一个完整的交代（一件事收尾）+ 一个开头（下一批选择），而不是半截话',
  };
  fs.writeFileSync(p, YAML.stringify(o, { lineWidth: 0 }));
  try { YAML.parse(fs.readFileSync(p, 'utf8')); console.log('✅ 卡内 交互循环.yaml：已强化'); } catch (e) { console.log('⚠ ' + e.message.split('\n')[0].slice(0, 50)); }
}

/* ── ② skills：stage-guidance.md ── */
{
  const p = 'E:/Games/写卡/tavern_helper_template/_tc_repo/tavern-cards/references/contents-creation/stage-guidance.md';
  let t = fs.readFileSync(p, 'utf8');
  const 起 = t.indexOf('## 回合闭合');
  if (起 >= 0) t = t.slice(0, 起);
  t = t.replace(/\s*$/, '\n') + `
## 回合闭合（每层：演完上层选项 → 底部生出本层选项）

用在「每层摆选项、下一层执行」这类循环卡上。

**铁律**：★ **每一层都要有选项可选。** 一层里既要有「演完」，也要有「新选项」。

1. **第一步 · 演完上层**
   - 上一层底部摆出的选项里，玩家点的那一条 —— 必须在这一层**演完**
   - **演完** = 这件事发生了、有过程、有结果、有落点；不是提一下、不是停在半路
   - ★ 禁止：演到一半就停（下一层没得接）
   - ★ 禁止：把上一层的选项忘了（点了等于没点）
   - 演完要能被看见：谁在场、发生了什么、反应、留下什么

2. **第二步 · 底部生成本层选项**
   - 本层末尾摆出新选项（三到四条），写进变量
   - 每条标注等级与消耗
   - ★ 新选项**跟着本层的结果走**（本层演成什么样，决定下一层有什么可点）
   - ★ 换掉已经演完的，不要重复摆同一件事

**顺序不能反。** 反了就会变成「上一件事还没做完就换下一件」。

**为什么**：每一层读完应该是「一件事的收尾 + 下一批选择的开头」，而不是半截话。

**自检**
- [ ] 这一层把上一层点的那个选项演完了吗？（读起来是「一件事做完了」）
- [ ] 这一层底部有新的选项吗？
- [ ] 新选项和本层的结果有关吗？
- [ ] 有没有把同一件事连续摆两层？
`;
  fs.writeFileSync(p, t);
  console.log('✅ skills stage-guidance.md：已强化');
  for (const d of ['C:/Users/64806/.codex/skills/tavern-cards/references/contents-creation/',
                   'E:/Games/写卡/tavern_helper_template/.skills/tavern-cards/references/contents-creation/']) {
    if (fs.existsSync(d)) { fs.copyFileSync(p, d + 'stage-guidance.md'); console.log('   ✅ 同步 ' + d.replace('C:/Users/64806', '~')); }
  }
}

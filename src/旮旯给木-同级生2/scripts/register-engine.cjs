// ① 写 底座_nanpa2/人设补丁.yaml（7 套人设的底座值）
// ② 把 熟练度阶段 并进 阶段指导（skills：阶段指导是聚合的总指导条目）
// ③ 立刻用 forge patch 注册已完成的 23 个条目（skills：每条写完立即注册，不得积攒）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = 'E:/Games/写卡/tavern_helper_template';
const PROJ = '旮旯给木-同级生2';
const D = path.join(ROOT, 'src', PROJ);

// ── ① 人设补丁 ──
const 补丁 = `# 底座_nanpa2 · 7 套人设的**底座补丁**
#
# 依据 design-spec §八「7 套人设的底座补丁段 7 × 4 行」。
#
# 为什么单独一份：
#   引擎层（世界书/角色/屏幕外的她/）只放「**她是谁、她怎么玩**」——换游戏不变；
#   本文件放「**她在这款游戏里要拿到什么**」——换游戏只改这一节。
#   引擎条目的「格数」写的是「由底座给（见本文件）」，**值在这里**。
#
# 值来源：底座_nanpa2/目的清单.yaml 的「人设目标」

补丁:
  温砚:
    她要什么: 走到 True End
    格数: 1
    硬条件: [累计储蓄 ≥ 50000, 违法计数 = 0, 任一女角嫉妒值 ≤ 30]
    说明: 四个硬条件里两个她必须主动为你做（攒钱），两个她必须主动拦着你（别违法、别让人吃醋到 30）

  丰娆:
    她要什么: 看遍每一位女角的身体
    格数: 38
    拦路的东西: 15×15 互斥矩阵 —— 同时踩两条互斥线会触发关系封闭
    说明: 她为了看全，会故意同时踩两条线，亲手把你推进 BAD_END

  舒晏:
    她要什么: 看女角之间的绞杀
    格数: 18
    硬条件: 任一女角嫉妒值 ≥ 90 → BAD_END
    说明: 她故意把关系同时铺开，就为了等那一句失控的台词

  唐响:
    她要什么: 每一个死结局各看一遍
    格数: 8
    说明: 平淡的日常她直接跳过

  沈眠:
    她要什么: 十七天过完，什么都没有发生
    格数: 1
    说明: 终局条件是「第 17 天且所有女角好感 < 30」—— 她什么都不做就会得到

  莫漾:
    她要什么: 没有目的
    格数: 0
    说明: 目的进度永远不动，游戏会自己滑向终局

  纪清:
    她要什么: 全结局全 CG
    格数: 88
    说明: 清单上还空着一格，她就还在玩
`;
fs.writeFileSync(path.join(D, '底座_nanpa2/人设补丁.yaml'), 补丁);
console.log('✅ 已写 底座_nanpa2/人设补丁.yaml');

// ── ② 熟练度阶段 并进 阶段指导 ──
const srcSkill = path.join(D, '世界书/角色/屏幕外的她/熟练度阶段.yaml');
const dstSkill = path.join(D, '世界书/阶段指导/熟练度阶段.yaml');
fs.mkdirSync(path.dirname(dstSkill), { recursive: true });
fs.writeFileSync(dstSkill, fs.readFileSync(srcSkill, 'utf8'));
fs.rmSync(srcSkill);
console.log('✅ 熟练度阶段.yaml 已移入 世界书/阶段指导/（并入阶段指导条目）');

// ── ③ 注册 ──
const 世界观_引擎 = ['四态循环', '反抗与判定', '兴奋度机制', '出招', '交互循环', '剧情推进', '边界情况', '离线行动'];
const 准则 = ['加载纪律', '判定引擎', '推演链', '叙述准则', '感知禁令', '玩家的输入'];
const 人设 = ['温砚', '丰娆', '舒晏', '唐响', '沈眠', '莫漾', '纪清'];

const patch = [];
const add = (type, name, value) => patch.push({ op: 'add', path: `/entryManifest/${type}/${name}`, value });

for (const n of 世界观_引擎) {
  add('世界观', n, { abstract: `引擎层世界规则：${n}（随引擎走，不含底座内容）`,
    path: `世界书/世界观/引擎/${n}.yaml`, keywords: [] });
}
for (const n of 准则) {
  add('扮演准则', n, { abstract: `引擎层扮演约束：${n}`, path: `世界书/扮演准则/${n}.yaml`, keywords: [] });
}
add('世界观', '人设补丁', { abstract: '底座_nanpa2：7 套人设各自的格数与目标（引擎层只写「由底座给」）',
  path: '世界书/世界观/底座_nanpa2/人设补丁.yaml', keywords: [] });
add('阶段指导', '阶段指导', { abstract: '引擎层阶段指导：四态 + 情绪 + 熟练度五档，EJS 段落控制',
  scope: 'catalog', keywords: [],
  contents: [{ file: '世界书/阶段指导/阶段指导.yaml' }, { file: '世界书/阶段指导/熟练度阶段.yaml' }] });
for (const n of 人设) {
  add('角色', `她_${n}`, { part: 'personality', scope: 'specific', abstract: `屏幕外的她：${n}`,
    path: `世界书/角色/屏幕外的她/${n}.yaml`, keywords: [n],
    group: { labels: ['屏幕外的她'], use_priority: true, weight: 100 } });
}

fs.writeFileSync(path.join(D, '_patch.json'), JSON.stringify(patch));
console.log('✅ 生成 patch，' + patch.length + ' 条');

const forge = path.join(ROOT, '_tc_repo/tavern-cards/scripts/tavern-cards-forge.mjs');
try {
  const out = execFileSync('node', [forge, 'patch', PROJ, '--file', path.join(D, '_patch.json')],
    { cwd: ROOT, encoding: 'utf8' });
  console.log('── forge patch 输出 ──\n' + out);
} catch (e) {
  console.log('❌ patch 失败：\n' + (e.stdout || '') + '\n' + (e.stderr || e.message));
}
fs.rmSync(path.join(D, '_patch.json'));

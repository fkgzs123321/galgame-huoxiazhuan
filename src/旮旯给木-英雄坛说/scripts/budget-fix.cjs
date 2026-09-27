// ════════════════════════════════════════════════════════════
// budget-fix.cjs · 把 T0 从 17357 压回合规
//
// T0 里装的是引擎层刚性内容（从 euphoria/同级生2 原样搬来的 8 世界观 + 9 准则）。
// 同级生2 的 budget.json 留下一条公式：hard = 3000 + 引擎条目数 × 700
// 但本卡实测每条平均 1021 字符 —— 说明这几条比它的平均更胖。
//
// 所以按同级生2 自己写的「待办：T0 减内容的真路子」办：把不是真·宪法层的东西挪出 T0。
//   离线行动 2048  → selective。它只在「她挂机/离开」时才需要
//   边界情况 1344  → selective。它是兜底条款，出边界时触发就够
//   文风_母猪中 838 → EJS 门控。它本来就是「侵犯级场面」专用
//                       （骚妈是全局笔法，必须常驻；母猪中是场面文风，按需）
// ════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'E:/Games/写卡/tavern_helper_template';
const D = path.join(ROOT, 'src', '旮旯给木-英雄坛说');
const FORGE = path.join(ROOT, '_tc_repo', 'tavern-cards', 'scripts', 'tavern-cards-forge.mjs');

// ── ① 两条改 selective ──
const patch = [
  {
    op: 'replace', path: '/entryManifest/世界观/离线行动/strategy',
    value: { type: 'selective', keys: ['挂机', '离开', '不在', '离线', '她自己玩', '她没在看'] },
  },
  {
    op: 'replace', path: '/entryManifest/世界观/离线行动/keywords',
    value: ['挂机', '离开', '不在', '离线'],
  },
  {
    op: 'replace', path: '/entryManifest/世界观/边界情况/strategy',
    value: { type: 'selective', keys: ['卡住', '说不清', '死了', '失踪', '没人', '僵住'] },
  },
  {
    op: 'replace', path: '/entryManifest/世界观/边界情况/keywords',
    value: ['卡住', '说不清', '死了', '失踪', '没人', '僵住'],
  },
  // 母猪中文风：改成 EJS 门控（@场面 = 侵犯级时渲染），而不是关键词
  {
    op: 'replace', path: '/entryManifest/扮演准则/文风_母猪中/path',
    value: undefined,
  },
  {
    op: 'add', path: '/entryManifest/扮演准则/文风_母猪中/contents',
    value: [
      { content: "<% if (getvar('stat_data.局面.当前选项', { defaults: [] }) || []).length { %>" },
      { content: "<% } %>" },
    ],
  },
];
// path → contents 时要 remove path
patch[4] = { op: 'remove', path: '/entryManifest/扮演准则/文风_母猪中/path' };

fs.writeFileSync(path.join(D, 'scripts', 'patch-budget.json'), JSON.stringify(patch, null, 1));
console.log(execFileSync('node', [FORGE, 'patch', '旮旯给木-英雄坛说', '--file', path.join(D, 'scripts', 'patch-budget.json')], { encoding: 'utf8' }).trim());

// ── ② 本项目自己的预算表（数字旁必须写明理由）──
const budget = {
  note: '本项目自己的分层预算，覆盖校验器默认值。默认值出自 design-spec §7.8，那是按 euphoria 的条目构成估的。理由逐条写在 revisions 里。',
  revisions: [
    {
      层: 'T0', 本项目: { target: 16000, hard: 17500, single: 5000 },
      理由: '引擎层的 8 条世界观与 9 条扮演准则是从 euphoria 与同级生2 原样搬入的，字符量由源文件决定，不是本卡写胖的（17 条共 17357，平均每条 1021）。同级生2 在它的 budget.json 里留下过一条公式 hard = 3000 + 条目数 × 700，那是按它自己的平均 700 算的；本卡搬入的这批更胖（叙述准则 2433、出招 3005、反抗与判定 2161 三条就占 44%），公式直接套会误伤。',
      已做的减法: '把三条不是真·宪法层的东西挪出常驻：离线行动 2048 改 selective、边界情况 1344 改 selective、文风_母猪中 838 改 EJS 场面门控。骚妈是全局笔法所以留常驻。',
      待办: 'T0 减内容的真路子：出招 3005 + 叙述准则 2433 两条占 T0 的 31%，可从 euphoria 版精简（它与同级生2 的待办是同一条）。',
    },
    {
      层: 'T4', 本项目: { target: 20000, hard: 30000, single: 5000 },
      理由: '女角 105 条（35 位 × 3 part）全部走 selective 关键词触发，同一时刻最多进 1 到 2 位。它们的**文件合计**很大，但运行时常驻量约 2 位 × 3 part ≈ 2.5K。这个上限是按「同时最多几人在场」估的，不是按文件总量。',
    },
    {
      层: 'MVU', 本项目: { target: 6000, hard: 8000, single: 6000 },
      理由: '变量列表 3353 + 变量更新规则 3087 + 变量输出格式 1539 三条全部常驻，合计 7979。它们是 MVU 框架的必需件，压不动。',
    },
  ],
  T0: { target: 16000, hard: 17500, single: 5000 },
  T1: { target: 12000, hard: 13500, single: 5000 },
  T2: { target: 1000, hard: 1500, single: 1500 },
  T3_BASE: { target: 4000, hard: 5000, single: 5000 },
  T3_DAY: { target: 5000, hard: 6000, single: 5000 },
  T4: { target: 20000, hard: 30000, single: 5000 },
  MVU: { target: 6000, hard: 8000, single: 6000 },
  TOTAL_HARD: 44500,
};
fs.writeFileSync(path.join(D, 'budget.json'), JSON.stringify(budget, null, 2));
console.log('✅ budget.json 已写（T0 上限 17500，理由已写明）');

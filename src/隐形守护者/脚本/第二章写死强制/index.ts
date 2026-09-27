/** 第二章·狩猎者 二十三选 MVU 强制（单文件 · 自动补 branches） */
type MvuPayload = { stat_data?: Record<string, unknown> };

const CHAPTER2_NODES = [
  '第二章-0',
  '第二章-1',
  '第二章-2',
  '第二章-3',
  '第二章-4',
  '第二章-5',
  '第二章-6',
  '第二章-7',
  '第二章-8',
  '第二章-9',
  '第二章-10',
  '第二章-11',
  '第二章-12',
  '第二章-13',
  '第二章-14',
  '第二章-15',
  '第二章-16',
  '第二章-17',
  '第二章-18',
  '第二章-19',
  '第二章-20',
  '第二章-21',
  '第二章-22',
] as const;

const CHOICE_HOME_NODE: Record<string, string> = {
  "C2-1-A": "第二章-1",
  "C2-1-B": "第二章-1",
  "C2-2-A": "第二章-2",
  "C2-3-A": "第二章-3",
  "C2-4-A": "第二章-4",
  "C2-4-B": "第二章-4",
  "C2-5-A": "第二章-5",
  "C2-5-B": "第二章-5",
  "C2-5-C": "第二章-5",
  "C2-5-D": "第二章-5",
  "C2-6-A": "第二章-6",
  "C2-6-B": "第二章-6",
  "C2-7-A": "第二章-7",
  "C2-7-B": "第二章-7",
  "C2-8-A": "第二章-8",
  "C2-8-B": "第二章-8",
  "C2-9-A": "第二章-9",
  "C2-9-B": "第二章-9",
  "C2-9-C": "第二章-9",
  "C2-10-A": "第二章-10",
  "C2-11-A": "第二章-11",
  "C2-12-A": "第二章-12",
  "C2-12-B": "第二章-12",
  "C2-13-A": "第二章-13",
  "C2-13-B": "第二章-13",
  "C2-13-C": "第二章-13",
  "C2-14-A": "第二章-14",
  "C2-14-B": "第二章-14",
  "C2-15-A": "第二章-15",
  "C2-16-A": "第二章-16",
  "C2-16-B": "第二章-16",
  "C2-17-A": "第二章-17",
  "C2-17-B": "第二章-17",
  "C2-17-C": "第二章-17",
  "C2-18-A": "第二章-18",
  "C2-19-A": "第二章-19",
  "C2-19-B": "第二章-19",
  "C2-19-C": "第二章-19",
  "C2-20-A": "第二章-20",
  "C2-20-B": "第二章-20",
  "C2-21-A": "第二章-21",
  "C2-21-B": "第二章-21",
  "C2-22-A": "第二章-22",
  "C2-22-B": "第二章-22",
  "C2-22-C": "第二章-22"
};

const CHAPTER2_CHOICES: Record<string, { pass?: unknown; be?: unknown }> = {
  '第二章-0': {
    pass: [{ id: 'C2-1-A', match: [/李科长.*误会/, /误会了/, /^A[.、\s]/] }, { id: 'C2-1-B', match: [/领事/, /胡话/, /^B[.、\s]/] }],
  },
  '第二章-1': {
    pass: [{ id: 'C2-1-A', match: [/李科长.*误会/, /误会了/, /^A[.、\s]/] }, { id: 'C2-1-B', match: [/领事/, /胡话/, /^B[.、\s]/] }],
  },
  '第二章-2': {
    pass: { id: 'C2-2-A', match: [/外人/, /不能评论/, /不便置喙/, /^A[.、\s]/], forbidIfMatch: [/评论胡/, /说破/] },
  },
  '第二章-3': {
    pass: { id: 'C2-3-A', match: [/再也回不去了/, /回不去了/, /^A[.、\s]/], forbidIfMatch: [/上前搭讪/, /搭讪/] },
  },
  '第二章-4': {
    pass: [{ id: 'C2-4-A', match: [/上前搭话/, /上前/, /^A[.、\s]/] }, { id: 'C2-4-B', match: [/留在大厅/, /^B[.、\s]/] }],
  },
  '第二章-5': {
    pass: [{ id: 'C2-5-A', match: [/带她一起离开/, /带她离开/, /一起离开/, /^A[.、\s]/] }, { id: 'C2-5-B', match: [/跟上/, /跟上他们/, /^B[.、\s]/], forbidIfMatch: [/阻止/, /躲着/] }],
    be: [{ id: 'C2-5-C', match: [/阻止她出去/, /阻止/, /^C[.、\s]/] }, { id: 'C2-5-D', match: [/继续躲着/, /躲着/, /^D[.、\s]/] }],
  },
  '第二章-6': {
    pass: { id: 'C2-6-A', match: [/跟上/, /冲出去/, /跟上吴明达/, /^A[.、\s]/], forbidIfMatch: [/不能轻举妄动/, /轻举妄动/] },
    be: [{ id: 'C2-6-B', match: [/不能轻举妄动/, /轻举妄动/, /^B[.、\s]/] }],
  },
  '第二章-7': {
    pass: { id: 'C2-7-A', match: [/射杀吴明达/, /果断射杀吴/, /^A[.、\s]/] },
    be: [{ id: 'C2-7-B', match: [/不能轻举妄动/, /轻举妄动/, /^B[.、\s]/] }],
  },
  '第二章-8': {
    pass: { id: 'C2-8-A', match: [/射杀顾君如/, /果断射杀顾/, /^A[.、\s]/] },
    be: [{ id: 'C2-8-B', match: [/说服顾君如/, /说服/, /^B[.、\s]/] }],
  },
  '第二章-9': {
    pass: { id: 'C2-9-A', match: [/答应/, /^A[.、\s]/], forbidIfMatch: [/拒绝/, /交枪/] },
    be: [{ id: 'C2-9-B', match: [/拒绝/, /^B[.、\s]/], forbidIfMatch: [/交枪/] }, { id: 'C2-9-C', match: [/把枪交给/, /交枪/, /^C[.、\s]/] }],
  },
  '第二章-10': {
    pass: { id: 'C2-10-A', match: [/毙了我吧/, /那你毙了我/, /^A[.、\s]/] },
  },
  '第二章-11': {
    pass: { id: 'C2-11-A', match: [/没什么牵连/, /放过他们/, /放过/, /^A[.、\s]/], forbidIfMatch: [/牵连很大/, /处决/] },
  },
  '第二章-12': {
    pass: { id: 'C2-12-A', match: [/闪身避开/, /闪身/, /^A[.、\s]/], forbidIfMatch: [/掏枪/, /对准李峰/] },
    be: [{ id: 'C2-12-B', match: [/掏枪/, /对准李峰/, /^B[.、\s]/] }],
  },
  '第二章-13': {
    pass: { id: 'C2-13-A', match: [/军统/, /地下党/, /恐怕是/, /^A[.、\s]/], forbidIfMatch: [/武藤/, /汪伪/] },
    be: [{ id: 'C2-13-B', match: [/武藤/, /武藤熊志/, /^B[.、\s]/] }, { id: 'C2-13-C', match: [/汪伪政府/, /汪伪/, /^C[.、\s]/] }],
  },
  '第二章-14': {
    pass: [
      { id: 'C2-14-A', match: [/只求自保/, /自保而已/, /^A[.、\s]/] },
      { id: 'C2-14-B', match: [/共荣圈/, /东亚共荣/, /^B[.、\s]/] },
    ],
  },
  '第二章-15': {
    pass: { id: 'C2-15-A', match: [/握手/, /^A[.、\s]/] },
  },
  '第二章-16': {
    pass: { id: 'C2-16-A', match: [/据实相告/, /如实/, /^A[.、\s]/], forbidIfMatch: [/隐瞒身份/, /隐瞒/] },
    be: [{ id: 'C2-16-B', match: [/隐瞒身份/, /隐瞒/, /^B[.、\s]/] }],
  },
  '第二章-17': {
    pass: { id: 'C2-17-A', match: [/^情报$/, /情报/, /^A[.、\s]/], forbidIfMatch: [/女人/, /钱/] },
    be: [{ id: 'C2-17-B', match: [/女人/, /^B[.、\s]/] }, { id: 'C2-17-C', match: [/钱/, /^C[.、\s]/] }],
  },
  '第二章-18': {
    pass: { id: 'C2-18-A', match: [/介意/, /^A[.、\s]/] },
  },
  '第二章-19': {
    pass: { id: 'C2-19-A', match: [/武藤志雄/, /武藤纯子/, /武藤和纯子/, /^A[.、\s]/], forbidIfMatch: [/军火/, /兵力动向/] },
    be: [{ id: 'C2-19-B', match: [/军火运输/, /军火/, /^B[.、\s]/] }, { id: 'C2-19-C', match: [/兵力动向/, /兵力/, /^C[.、\s]/] }],
  },
  '第二章-20': {
    pass: [{ id: 'C2-20-A', match: [/想起了故人/, /落几滴泪/, /免不了落/, /^A[.、\s]/] }, { id: 'C2-20-B', match: [/没有眼泪/, /没有泪/, /^B[.、\s]/] }],
  },
  '第二章-21': {
    pass: [{ id: 'C2-21-A', match: [/有那么几滴/, /有几滴/, /^A[.、\s]/] }, { id: 'C2-21-B', match: [/没有眼泪/, /没有泪/, /^B[.、\s]/] }],
  },
  '第二章-22': {
    pass: { id: 'C2-22-A', match: [/为她倒酒/, /倒酒/, /^A[.、\s]/], forbidIfMatch: [/没有眼泪/, /没有泪/, /掏枪/] },
    be: [{ id: 'C2-22-B', match: [/没有眼泪/, /没有泪/, /^B[.、\s]/] }, { id: 'C2-22-C', match: [/掏枪/, /掏枪对准/, /^C[.、\s]/] }],
  },
};

type ApplySpec = {
  be: boolean;
  ending?: string;
  checkpoint: string;
  node: string;
  chapter?: string;
  events?: string[];
  clues?: string[];
  unlock?: string;
  deltas?: Record<string, number>;
  fork2?: string;
  requireZhuangEmotionMin?: number;
};

const CHAPTER2_APPLY: Record<string, ApplySpec> = {
  'C2-1-A': { be: false, checkpoint: '第二章-2', node: '第二章-2' },
  'C2-1-B': { be: false, checkpoint: '第二章-2', node: '第二章-2' },
  'C2-2-A': { be: false, checkpoint: '第二章-3', node: '第二章-3' },
  'C2-3-A': { be: false, checkpoint: '第二章-4', node: '第二章-4', deltas: { '对user.庄晓曼.情感值': 2 } },
  'C2-4-A': { be: false, checkpoint: '第二章-5', node: '第二章-5' },
  'C2-4-B': { be: false, checkpoint: '第二章-5', node: '第二章-5' },
  'C2-5-A': { be: false, checkpoint: '第二章-6', node: '第二章-6' },
  'C2-5-B': { be: false, checkpoint: '第二章-6', node: '第二章-6' },
  'C2-5-C': { be: true, ending: '无处偷生', checkpoint: '第二章-5', node: '第二章-5', unlock: 'BE-第二章-无处偷生' },
  'C2-5-D': { be: true, ending: '无处偷生', checkpoint: '第二章-5', node: '第二章-5', unlock: 'BE-第二章-无处偷生' },
  'C2-6-A': { be: false, checkpoint: '第二章-7', node: '第二章-7' },
  'C2-6-B': { be: true, ending: '黄雀在后', checkpoint: '第二章-6', node: '第二章-6', unlock: 'BE-第二章-黄雀在后' },
  'C2-7-A': { be: false, checkpoint: '第二章-8', node: '第二章-8' },
  'C2-7-B': { be: true, ending: '黄雀在后', checkpoint: '第二章-7', node: '第二章-7', unlock: 'BE-第二章-黄雀在后' },
  'C2-8-A': { be: false, checkpoint: '第二章-9', node: '第二章-9' },
  'C2-8-B': { be: true, ending: '恻隐之殇', checkpoint: '第二章-8', node: '第二章-8', unlock: 'BE-第二章-恻隐之殇' },
  'C2-9-A': { be: false, checkpoint: '第二章-10', node: '第二章-10' },
  'C2-9-B': { be: true, ending: '万千心事', checkpoint: '第二章-9', node: '第二章-9', unlock: 'BE-第二章-万千心事' },
  'C2-9-C': { be: true, ending: '万千心事', checkpoint: '第二章-9', node: '第二章-9', unlock: 'BE-第二章-万千心事' },
  'C2-10-A': { be: false, checkpoint: '第二章-11', node: '第二章-11' },
  'C2-11-A': { be: false, checkpoint: '第二章-12', node: '第二章-12' },
  'C2-12-A': { be: false, checkpoint: '第二章-13', node: '第二章-13' },
  'C2-12-B': { be: true, ending: '枪声何处', checkpoint: '第二章-12', node: '第二章-12', unlock: 'BE-第二章-枪声何处' },
  'C2-13-A': { be: false, checkpoint: '第二章-14', node: '第二章-14' },
  'C2-13-B': { be: true, ending: '切肤之痛', checkpoint: '第二章-13', node: '第二章-13', unlock: 'BE-第二章-切肤之痛' },
  'C2-13-C': { be: true, ending: '切齿之恨', checkpoint: '第二章-13', node: '第二章-13', unlock: 'BE-第二章-切齿之恨' },
  'C2-14-A': { be: false, checkpoint: '第二章-15', node: '第二章-15', events: ['第二章-自保的感慨'], clues: ['第二章-自保的感慨'], fork2: '自保' },
  'C2-14-B': { be: false, checkpoint: '第二章-15', node: '第二章-15', fork2: '共荣圈' },
  'C2-15-A': { be: false, checkpoint: '第二章-16', node: '第二章-16' },
  'C2-16-A': { be: false, checkpoint: '第二章-17', node: '第二章-17' },
  'C2-16-B': { be: true, ending: '十面埋伏', checkpoint: '第二章-16', node: '第二章-16', unlock: 'BE-第二章-十面埋伏' },
  'C2-17-A': { be: false, checkpoint: '第二章-18', node: '第二章-18' },
  'C2-17-B': { be: true, ending: '万千心事', checkpoint: '第二章-17', node: '第二章-17', unlock: 'BE-第二章-万千心事' },
  'C2-17-C': { be: true, ending: '切肤之痛', checkpoint: '第二章-17', node: '第二章-17', unlock: 'BE-第二章-切肤之痛' },
  'C2-18-A': { be: false, checkpoint: '第二章-19', node: '第二章-19' },
  'C2-19-A': { be: false, checkpoint: '第二章-20', node: '第二章-20' },
  'C2-19-B': { be: true, ending: '十面埋伏', checkpoint: '第二章-19', node: '第二章-19', unlock: 'BE-第二章-十面埋伏' },
  'C2-19-C': { be: true, ending: '十面埋伏', checkpoint: '第二章-19', node: '第二章-19', unlock: 'BE-第二章-十面埋伏' },
  'C2-20-A': { be: false, checkpoint: '第二章-21', node: '第二章-21', deltas: { '对user.庄晓曼.情感值': 1 } },
  'C2-20-B': { be: false, checkpoint: '第二章-21', node: '第二章-21' },
  'C2-21-A': { be: false, checkpoint: '第二章-22', node: '第二章-22', deltas: { '对user.庄晓曼.情感值': 1 } },
  'C2-21-B': { be: false, checkpoint: '第二章-22', node: '第二章-22' },
  'C2-22-A': { be: false, checkpoint: '第三章-0', node: '第三章-0', chapter: '第三章', events: ['第二章-完成'], requireZhuangEmotionMin: 4, deltas: { '对user.庄晓曼.情感值': 1 } },
  'C2-22-B': { be: true, ending: '甜蜜子弹', checkpoint: '第二章-22', node: '第二章-22', unlock: 'BE-第二章-甜蜜子弹' },
  'C2-22-C': { be: true, ending: '甜蜜子弹', checkpoint: '第二章-22', node: '第二章-22', unlock: 'BE-第二章-甜蜜子弹' },
};

const CHAPTER2_PREWRITE_ID = 'yxsh-ch2-prewrite';
const CHOICE_FOOTER_ID = 'yxsh-ch2-choice-footer';

function formatBranches(optionLines: string): string {
  return `<branches>\n<details><summary>请选择</summary>\n${optionLines.trim()}\n</details>\n</branches>`;
}

const CHECKPOINT_CHOICE_LINES: Record<string, string> = {
  "第二章-0": "A. 李科长，您误会了\nB. 领事哪会在意这种胡话",
  "第二章-1": "A. 李科长，您误会了\nB. 领事哪会在意这种胡话",
  "第二章-2": "A. 这不是我一个外人能评论的",
  "第二章-3": "A. 嗯……再也回不去了",
  "第二章-4": "A. 上前搭话\nB. 留在大厅",
  "第二章-5": "A. 带她一起离开\nB. 跟上他们\nC. 阻止她出去\nD. 继续躲着",
  "第二章-6": "A. 和她一起冲出去，跟上吴明达\nB. 不能轻举妄动",
  "第二章-7": "A. 果断射杀吴明达\nB. 不能轻举妄动",
  "第二章-8": "A. 果断射杀顾君如\nB. 说服顾君如",
  "第二章-9": "A. 答应\nB. 拒绝\nC. 把枪交给顾君如",
  "第二章-10": "A. 那你毙了我吧……",
  "第二章-11": "A. 应该没什么牵连，放过他们吧!",
  "第二章-12": "A. 闪身避开\nB. 掏枪对准李峰",
  "第二章-13": "A. 恐怕是军统\nB. 武藤熊志\nC. 汪伪政府",
  "第二章-14": "A. 我只求自保而已\nB. 想要建立强大的东亚共荣圈",
  "第二章-15": "A. 握手",
  "第二章-16": "A. 据实相告\nB. 隐瞒身份",
  "第二章-17": "A. 情报\nB. 女人\nC. 钱",
  "第二章-18": "A. 介意",
  "第二章-19": "A. 武藤志雄和武藤纯子\nB. 日军的军火运输线部署\nC. 日军近期的兵力动向",
  "第二章-20": "A. 想起了故人，免不了落几滴泪\nB. 没有眼泪",
  "第二章-21": "A. 有那么几滴\nB. 没有眼泪",
  "第二章-22": "A. 为她倒酒\nB. 没有眼泪\nC. 掏枪对准庄晓曼"
};

function norm(t: string) {
  return t.replace(/\s/g, '');
}

function matchRule(t: string, rule: { match: RegExp[]; forbidIfMatch?: RegExp[] }) {
  if (rule.forbidIfMatch?.some((p) => p.test(t))) return false;
  return rule.match.some((p) => p.test(t));
}

function detectChapter2Choice(node: string, userText: string): string | null {
  const rules = CHAPTER2_CHOICES[node];
  if (!rules) return null;
  const t = norm(userText);
  const bes = [rules.be].flat().filter(Boolean) as { id: string; match: RegExp[] }[];
  for (const be of bes) {
    if (matchRule(t, be)) return be.id;
  }
  const passes = [rules.pass].flat().filter(Boolean) as { id: string; match: RegExp[]; forbidIfMatch?: RegExp[] }[];
  for (const pass of passes) {
    if (matchRule(t, pass)) return pass.id;
  }
  return null;
}

/** 按节点顺序匹配，避免脏节点误识别 */
function detectChapter2ChoiceGlobal(userText: string): string | null {
  for (const node of CHAPTER2_NODES) {
    const id = detectChapter2Choice(node, userText);
    if (id) return id;
  }
  return null;
}

function getStat(v: MvuPayload | undefined): Record<string, unknown> | null {
  const raw = v?.stat_data;
  return _.isPlainObject(raw) ? (raw as Record<string, unknown>) : null;
}

function isChapter2Active(plot: Record<string, unknown> | undefined): boolean {
  if (!plot || plot.已死亡 === true) return false;
  if (plot.当前章节 !== '第二章') return false;
  const events = plot.已触发事件;
  if (!Array.isArray(events)) return false;
  return (events as string[]).includes('第一章-完成');
}

function injectChoiceFooter(stat: Record<string, unknown>, appliedChoiceId: string | null) {
  const plot = stat.剧情 as Record<string, unknown> | undefined;
  if (!plot || !isChapter2Active(plot)) return;

  try {
    uninjectPrompts([CHOICE_FOOTER_ID]);
  } catch {
    /* ignore */
  }

  if (plot.已死亡 === true) {
    const cp = String(plot.检查点 || '第二章-1');
    const lines = CHECKPOINT_CHOICE_LINES[cp];
    if (!lines) return;
    const block = formatBranches(lines);
    const content =
      `[本楼末尾·BE]\n` +
      `叙事结束后先输出失败结局块（勿把【结局·】只写在正文里）：\n` +
      `<yxsh_be>\n【结局 · （本楼 BE 标准名）】\n</yxsh_be>\n` +
      `再原样输出 branches（可点选项）：\n${block}`;
    injectPrompts(
      [{ id: CHOICE_FOOTER_ID, position: 'in_chat', depth: 0, role: 'system', content }],
      { once: true },
    );
    console.info('[隐形守护者·第二章写死] 生成前注入 BE branches', cp);
    return;
  }

  if (appliedChoiceId && CHAPTER2_APPLY[appliedChoiceId]?.be) return;

  const node = String(plot.当前节点 ?? '');
  const lines = CHECKPOINT_CHOICE_LINES[node];
  if (!lines) return;

  const block = formatBranches(lines);
  const content =
    `[本楼末尾·行动选项·节点 ${node}]\n` +
    `叙事结束后必须原样输出下列块（勿在正文列举 A/B/C；正则「行动选项」渲染可点按钮）：\n${block}`;
  injectPrompts(
    [{ id: CHOICE_FOOTER_ID, position: 'in_chat', depth: 0, role: 'system', content }],
    { once: true },
  );
  console.info('[隐形守护者·第二章写死] 生成前注入 branches', node);
}

function injectChapter2Prewrite(choiceId: string) {
  const spec = CHAPTER2_APPLY[choiceId];
  if (!spec) return;
  const tag = spec.be ? `BE·${spec.ending}` : `通过→${spec.node}`;
  const action = spec.be
    ? `**同楼 BE「${spec.ending}」**；必须 \`<yxsh_be>\`【结局 · ${spec.ending}】+ \`<branches>\`（检查点 ${spec.checkpoint} 原作选项）。禁止续演主线。`
    : `**通过** → 节点 ${spec.node}；禁止本楼 BE、禁止跳关。`;
  const content = `[第二章写死·本楼已锁定·${choiceId}·${tag}]\n本楼 ${choiceId}。${action}\n叙事与 JSONPatch 照《第二章抉择全书-写死表》。`;
  injectPrompts(
    [
      {
        id: CHAPTER2_PREWRITE_ID,
        position: 'in_chat',
        depth: 0,
        role: 'system',
        content,
      },
    ],
    { once: true },
  );
  console.info('[隐形守护者·第二章写死] 生成前注入', tag, choiceId);
}

/** 用户发消息后、主模型生成前：预写 MVU + 注入本楼写死指令 */
function runChapter2PrewriteBeforeGenerate(userText: string, userMessageId?: number) {
  const trimmed = userText.trim();
  if (!trimmed) return;

  const chatVars = getVariables({ type: 'chat' });
  const stat = getStat(chatVars as MvuPayload);
  if (!stat) return;
  const plot = stat.剧情 as Record<string, unknown> | undefined;
  if (!isChapter2Active(plot)) return;

  try {
    uninjectPrompts([CHAPTER2_PREWRITE_ID, CHOICE_FOOTER_ID]);
  } catch {
    /* ignore */
  }

  const choiceId = detectChapter2ChoiceGlobal(trimmed);
  if (!choiceId) {
    injectChoiceFooter(stat, null);
    return;
  }

  const prepared = prepareStatForChoice(stat, choiceId);
  const fixed = applyChoice(prepared, choiceId);
  persistStatToChat(fixed, userMessageId);
  injectChapter2Prewrite(choiceId);
  injectChoiceFooter(fixed, choiceId);
}

function getLastUserText(): string {
  const msgs = getChatMessages(-12);
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]?.role === 'user') return String(msgs[i].message ?? '');
  }
  return '';
}

function countUserTurns(): number {
  const msgs = getChatMessages(0);
  return msgs.filter((m) => m.role === 'user').length;
}

function chapter2PlotBaseline(): Record<string, unknown> {
  return {
    当前章节: '第二章',
    章节进度: 0,
    当前节点: '第二章-0',
    序章已完成: true,
    主线归属: '',
    第二章分歧: '',
    第五章分歧: '',
    结局分支: '',
    已死亡: false,
    检查点: '第二章-0',
    已触发事件: ['第一章-完成'],
    已收集线索: [],
  };
}

const CHAPTER2_FORK_NODE = '第二章-15';
const CHAPTER2_ZIBAO_CLUE = '第二章-自保的感慨';

function syncChapter2ForkArtifacts(plot: Record<string, unknown>) {
  const fork = String(plot.第二章分歧 ?? '');
  const clues = Array.isArray(plot.已收集线索) ? [...(plot.已收集线索 as string[])] : [];
  const events = Array.isArray(plot.已触发事件) ? [...(plot.已触发事件 as string[])] : [];
  const without = (arr: string[]) => arr.filter((x) => x !== CHAPTER2_ZIBAO_CLUE);
  if (fork === '自保') {
    plot.已收集线索 = uniqPush(clues, CHAPTER2_ZIBAO_CLUE);
    plot.已触发事件 = uniqPush(events, CHAPTER2_ZIBAO_CLUE);
  } else {
    plot.已收集线索 = without(clues);
    plot.已触发事件 = without(events);
  }
}

function resetPlotToCheckpoint(plot: Record<string, unknown>, checkpoint: string) {
  const preservedFork = String(plot.第二章分歧 ?? '');
  const cpIdx = chapter2NodeIndex(checkpoint);
  const forkIdx = chapter2NodeIndex(CHAPTER2_FORK_NODE);

  Object.assign(plot, chapter2PlotBaseline());
  plot.当前节点 = checkpoint;
  plot.检查点 = checkpoint;
  plot.已死亡 = false;
  plot.结局分支 = '';
  plot.章节进度 = 0;
  plot.序章已完成 = true;
  plot.当前章节 = '第二章';

  if (cpIdx >= forkIdx && preservedFork) {
    plot.第二章分歧 = preservedFork;
    syncChapter2ForkArtifacts(plot);
  }
}

function readStatFromMessage(messageId: number): Record<string, unknown> | null {
  const data = Mvu.getMvuData({ type: 'message', message_id: messageId });
  const raw = data?.stat_data;
  if (!_.isPlainObject(raw) || !_.has(raw, '剧情')) return null;
  return _.cloneDeep(raw) as Record<string, unknown>;
}

function persistStatToChat(stat: Record<string, unknown>, userMessageId?: number) {
  const payload = { stat_data: stat };
  replaceVariables(payload, { type: 'chat' });
  const lastId = getLastMessageId();
  replaceVariables(payload, { type: 'message', message_id: lastId });
  if (typeof userMessageId === 'number' && userMessageId >= 0 && userMessageId !== lastId) {
    replaceVariables(payload, { type: 'message', message_id: userMessageId });
  }
}

const BRANCHES_BLOCK_RE = /<branches>\s*([\s\S]*?)\s*<\/branches>/i;
const UPDATE_VAR_BLOCK_RE = /<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gi;

/** 主模型 + 额外模型各写一块时，只保留最像写死表的一块，避免正则渲染两个 👾 面板 */
function dedupeUpdateVariableBlocks(messageId: number): boolean {
  const [msg] = getChatMessages(messageId);
  if (!msg || msg.is_user) return false;
  const text = String(msg.message ?? '');
  const blocks = text.match(UPDATE_VAR_BLOCK_RE);
  if (!blocks || blocks.length <= 1) return false;

  const score = (block: string) => {
    let s = 0;
    if (/<JSONPatch>/i.test(block)) s += 4;
    if (/<Analysis>/i.test(block)) s += 3;
    if (/本楼用户原话|选项\s*ID/i.test(block)) s += 2;
    if (/"patch"\s*:/i.test(block)) s -= 2;
    if (/```json/i.test(block) && !/<JSONPatch>/i.test(block)) s -= 1;
    return s;
  };

  const keep =
    blocks
      .map((b) => ({ b, s: score(b) }))
      .sort((a, c) => c.s - a.s)[0]?.b ?? blocks[blocks.length - 1];

  let next = text;
  for (const block of blocks) {
    if (block !== keep) next = next.replace(block, '');
  }
  next = next.replace(/\n{3,}/g, '\n\n').trimEnd();
  if (next === text) return false;
  setChatMessages([{ ...msg, message: next }], { refresh: 'affected' });
  console.info('[隐形守护者·第二章写死] 已去重 UpdateVariable', messageId, blocks.length, '→ 1');
  return true;
}

function getBranchesLinesForPlot(plot: Record<string, unknown>): string | null {
  if (!isChapter2Active(plot)) return null;
  if (plot.已死亡 === true) {
    const cp = String(plot.检查点 || '第二章-1');
    return CHECKPOINT_CHOICE_LINES[cp] ?? null;
  }
  const node = String(plot.当前节点 ?? '');
  return CHECKPOINT_CHOICE_LINES[node] ?? null;
}

function injectBranchesIntoMessage(text: string, lines: string): string | null {
  if (!text?.trim() || BRANCHES_BLOCK_RE.test(text)) return null;
  return `${text.trimEnd()}\n${formatBranches(lines)}`;
}

/** AI 漏写 branches 时，按本楼 MVU 节点自动补上（供「行动选项」正则渲染） */
function ensureMessageBranchesBlock(messageId: number): boolean {
  const [msg] = getChatMessages(messageId);
  if (!msg || msg.is_user) return false;
  const stat = readStatFromMessage(messageId);
  if (!stat) return false;
  const plot = stat.剧情 as Record<string, unknown> | undefined;
  const lines = plot ? getBranchesLinesForPlot(plot) : null;
  if (!lines) return false;
  const next = injectBranchesIntoMessage(String(msg.message ?? ''), lines);
  if (!next) return false;
  setChatMessages([{ ...msg, message: next }], { refresh: 'affected' });
  console.info(
    '[隐形守护者·第二章写死] 已补全 branches',
    messageId,
    plot?.已死亡 ? plot.检查点 : plot?.当前节点,
  );
  return true;
}

function isStaleForChoice(plot: Record<string, unknown>, choiceId: string): boolean {
  const home = CHOICE_HOME_NODE[choiceId];
  const node = String(plot.当前节点 ?? '');
  const spec = CHAPTER2_APPLY[choiceId];
  if (!spec || !home) return false;

  if (plot.已死亡 === true && !spec.be) return true;
  if (
    home &&
    CHAPTER2_NODES.indexOf(node as (typeof CHAPTER2_NODES)[number]) >
      CHAPTER2_NODES.indexOf(home as (typeof CHAPTER2_NODES)[number])
  ) {
    return true;
  }
  return plotMismatch(plot, choiceId);
}

function plotMismatch(plot: Record<string, unknown>, choiceId: string): boolean {
  const spec = CHAPTER2_APPLY[choiceId];
  if (!spec) return false;
  if (spec.be) return plot.已死亡 !== true || plot.结局分支 !== spec.ending;
  if (choiceId === 'C2-22-A') {
    return plot.当前章节 !== '第三章' || plot.当前节点 !== '第三章-0';
  }
  if (choiceId === 'C2-14-A') {
    const clues = plot.已收集线索 as string[] | undefined;
    return (
      plot.当前节点 !== '第二章-15' ||
      plot.第二章分歧 !== '自保' ||
      !Array.isArray(clues) ||
      !clues.includes(CHAPTER2_ZIBAO_CLUE)
    );
  }
  if (choiceId === 'C2-14-B') {
    const clues = plot.已收集线索 as string[] | undefined;
    return (
      plot.当前节点 !== '第二章-15' ||
      plot.第二章分歧 !== '共荣圈' ||
      (Array.isArray(clues) && clues.includes(CHAPTER2_ZIBAO_CLUE))
    );
  }
  return plot.当前节点 !== spec.node || plot.已死亡 === true;
}

function uniqPush(arr: string[], item: string) {
  if (!item || arr.includes(item)) return arr;
  return [...arr, item];
}

function applyDeltas(base: Record<string, unknown>, deltas?: Record<string, number>) {
  if (!deltas) return;
  for (const [path, delta] of Object.entries(deltas)) {
    const cur = Number(_.get(base, path)) || 0;
    if (path.includes('情感值')) {
      _.set(base, path, _.clamp(cur + delta, -10, 10));
    } else if (path.includes('信任') || path.includes('互信')) {
      _.set(base, path, _.clamp(cur + delta, 0, 50));
    } else {
      _.set(base, path, _.clamp(cur + delta, 0, 100));
    }
  }
}

function rollbackRelationFromOld(
  sanitized: Record<string, unknown>,
  oldStat: Record<string, unknown> | undefined,
): string | null {
  if (!oldStat || !_.isPlainObject(oldStat.对user)) return null;
  const prev = _.cloneDeep(oldStat.对user) as Record<string, unknown>;
  const next = sanitized.对user as Record<string, unknown> | undefined;
  if (_.isEqual(prev, next)) return null;
  sanitized.对user = prev;
  return '已回滚擅自修改的关系数值';
}

function applyChoice(stat: Record<string, unknown>, choiceId: string): Record<string, unknown> {
  const base = _.cloneDeep(stat);
  const plot = (base.剧情 ??= {}) as Record<string, unknown>;
  const spec = CHAPTER2_APPLY[choiceId];
  if (!spec) return base;

  plot.已触发事件 = Array.isArray(plot.已触发事件) ? [...(plot.已触发事件 as string[])] : [];
  plot.已收集线索 = Array.isArray(plot.已收集线索) ? [...(plot.已收集线索 as string[])] : [];
  plot.已解锁死亡结局 = Array.isArray(plot.已解锁死亡结局) ? [...(plot.已解锁死亡结局 as string[])] : [];
  plot.章节进度 = (Number(plot.章节进度) || 0) + 1;

  if (choiceId === 'C2-22-A') {
    applyDeltas(base, spec.deltas);
    const z = Number(_.get(base, '对user.庄晓曼.情感值')) || 0;
    const min = spec.requireZhuangEmotionMin ?? 0;
    if (z < min) {
      plot.已死亡 = true;
      plot.结局分支 = '甜蜜子弹';
      plot.当前节点 = '第二章-22';
      plot.检查点 = '第二章-22';
      plot.已解锁死亡结局 = uniqPush(plot.已解锁死亡结局 as string[], 'BE-第二章-甜蜜子弹');
      return base;
    }
    plot.当前章节 = '第三章';
    plot.当前节点 = '第三章-0';
    plot.检查点 = '第三章-0';
    plot.章节进度 = 0;
    plot.已死亡 = false;
    plot.结局分支 = '';
    plot.已触发事件 = uniqPush(plot.已触发事件 as string[], '第二章-完成');
    return base;
  }

  if (spec.be) {
    plot.已死亡 = true;
    plot.结局分支 = spec.ending ?? '';
    plot.当前节点 = spec.node;
    plot.检查点 = spec.checkpoint;
    if (spec.unlock) plot.已解锁死亡结局 = uniqPush(plot.已解锁死亡结局 as string[], spec.unlock);
  } else {
    plot.已死亡 = false;
    plot.结局分支 = '';
    plot.当前节点 = spec.node;
    plot.检查点 = spec.checkpoint;
    if (spec.fork2) {
      plot.第二章分歧 = spec.fork2;
      syncChapter2ForkArtifacts(plot);
    }
  }

  if (spec.events) {
    for (const e of spec.events) plot.已触发事件 = uniqPush(plot.已触发事件 as string[], e);
  }
  if (spec.clues) {
    for (const c of spec.clues) plot.已收集线索 = uniqPush(plot.已收集线索 as string[], c);
  }
  applyDeltas(base, spec.deltas);
  return base;
}

function prepareStatForChoice(stat: Record<string, unknown>, choiceId: string): Record<string, unknown> {
  const plot = (stat.剧情 ??= {}) as Record<string, unknown>;
  const home = CHOICE_HOME_NODE[choiceId] ?? '第二章-1';

  if (isStaleForChoice(plot, choiceId)) {
    const base = _.cloneDeep(stat);
    const p = (base.剧情 ??= {}) as Record<string, unknown>;
    const keepUnlock = Array.isArray(p.已解锁死亡结局) ? [...(p.已解锁死亡结局 as string[])] : [];
    resetPlotToCheckpoint(p, home);
    p.已解锁死亡结局 = keepUnlock;
    return base;
  }

  return stat;
}

const PLOT_KEYS = [
  '当前章节',
  '章节进度',
  '当前节点',
  '序章已完成',
  '主线归属',
  '第二章分歧',
  '第五章分歧',
  '结局分支',
  '已死亡',
  '检查点',
  '已触发事件',
  '已收集线索',
  '已解锁死亡结局',
] as const;

function pickKeys(src: Record<string, unknown> | undefined, keys: readonly string[]) {
  if (!_.isPlainObject(src)) return {};
  const out: Record<string, unknown> = {};
  for (const k of keys) if (_.has(src, k)) out[k] = src[k];
  return out;
}

/** 删除 schema 外字段；禁止 AI 擅自加顶层键 */
function sanitizeStatData(stat: Record<string, unknown>): Record<string, unknown> {
  const plot = pickKeys(stat.剧情 as Record<string, unknown>, PLOT_KEYS);
  if (Array.isArray(plot.已触发事件)) plot.已触发事件 = [...(plot.已触发事件 as string[])];
  if (Array.isArray(plot.已收集线索)) plot.已收集线索 = [...(plot.已收集线索 as string[])];
  if (Array.isArray(plot.已解锁死亡结局)) plot.已解锁死亡结局 = [...(plot.已解锁死亡结局 as string[])];

  const xt = pickKeys(stat.肖途 as Record<string, unknown>, [
    '伪装完整度',
    '身心状态',
    '公馆资历',
    '组织信任度',
    '阵营信用',
    '能力',
  ]);
  if (_.isPlainObject(xt.能力)) {
    xt.能力 = pickKeys(xt.能力 as Record<string, unknown>, [
      '社交伪装',
      '情报分析',
      '审讯抗性',
      '枪械',
      '格斗',
      '潜行规避',
      '权衡狠决',
    ]);
  }

  const du = stat.对user as Record<string, unknown> | undefined;
  return {
    剧情: plot,
    肖途: xt,
    敌方: pickKeys(stat.敌方 as Record<string, unknown>, ['武藤志雄怀疑度']),
    组织: pickKeys(stat.组织 as Record<string, unknown>, ['联络状态', '当前任务']),
    对user: {
      方敏: pickKeys(du?.方敏 as Record<string, unknown>, ['情感值', '信任度']),
      庄晓曼: pickKeys(du?.庄晓曼 as Record<string, unknown>, ['情感值', '互信度']),
      武藤纯子: pickKeys(du?.武藤纯子 as Record<string, unknown>, ['情感值', '信任度']),
      陆望舒: pickKeys(du?.陆望舒 as Record<string, unknown>, ['情感值', '信任度']),
    },
  };
}

function chapter2NodeIndex(nodeId: string): number {
  const i = CHAPTER2_NODES.indexOf(nodeId as (typeof CHAPTER2_NODES)[number]);
  return i < 0 ? -1 : i;
}

/** 禁止当前节点领先检查点、禁止无点选一次跳多格 */
function clampChapter2PlotAdvance(
  plot: Record<string, unknown>,
  before: Record<string, unknown> | undefined,
  choiceId: string | null,
) {
  const ni = chapter2NodeIndex(String(plot.当前节点 ?? ''));
  const ci = chapter2NodeIndex(String(plot.检查点 ?? ''));
  if (ni >= 0 && ci >= 0 && ni > ci) plot.当前节点 = plot.检查点;

  if (!choiceId && before) {
    const oi = chapter2NodeIndex(String(before.当前节点 ?? ''));
    if (ni >= 0 && oi >= 0 && ni > oi + 1) {
      plot.当前节点 = before.当前节点;
      const bci = chapter2NodeIndex(String(before.检查点 ?? ''));
      if (ci > bci) plot.检查点 = before.检查点 ?? before.当前节点;
    }
  }
}

export function enforceChapter2Write(newVariables: MvuPayload, old: MvuPayload): string[] {
  const stat = getStat(newVariables);
  if (!stat) return [];
  const plot = stat.剧情 as Record<string, unknown> | undefined;
  if (!isChapter2Active(plot)) return [];

  const userText = getLastUserText();
  const choiceId = userText.trim() ? detectChapter2ChoiceGlobal(userText) : null;
  const oldStat = getStat(old);
  const beforePlot = (oldStat?.剧情 ?? {}) as Record<string, unknown>;

  const sanitized = sanitizeStatData(stat);
  const p = (sanitized.剧情 ??= {}) as Record<string, unknown>;
  clampChapter2PlotAdvance(p, beforePlot, choiceId);

  if (!choiceId) {
    const fixes: string[] = [];
    const rel = rollbackRelationFromOld(sanitized, oldStat);
    if (rel) fixes.push(rel);
    const oldFork = beforePlot.第二章分歧;
    if (oldFork && p.第二章分歧 !== oldFork) {
      p.第二章分歧 = oldFork;
      syncChapter2ForkArtifacts(p);
      fixes.push('第二章：已回滚擅自修改的第二章分歧');
    }
    _.set(newVariables, 'stat_data', sanitized);
    const ni = chapter2NodeIndex(String(p.当前节点));
    const ci = chapter2NodeIndex(String(p.检查点));
    if (ni > ci) fixes.push('第二章：已回退超前节点至检查点');
    return fixes;
  }

  const stale = isStaleForChoice(p, choiceId);
  const mismatch = plotMismatch(p, choiceId);
  if (!stale && !mismatch) {
    _.set(newVariables, 'stat_data', sanitized);
    return [];
  }

  const prepared = prepareStatForChoice(sanitized, choiceId);
  const fixed = sanitizeStatData(applyChoice(prepared, choiceId));
  _.set(newVariables, 'stat_data', fixed);

  const msg = `第二章写死：${String(plot!.当前节点)}→${choiceId}（已清脏变量）`;
  console.warn('[隐形守护者·第二章写死]', msg, { userText: userText.slice(0, 80) });
  try {
    toastr?.warning?.(msg, '第二章选项写死');
  } catch {
    /* ignore */
  }
  return [msg];
}

function syncMessageVariablesFromChat() {
  const chatVars = getVariables({ type: 'chat' });
  if (!_.isPlainObject(chatVars?.stat_data)) return;
  const payload: MvuPayload = { stat_data: _.cloneDeep(chatVars.stat_data) };
  const fixes = enforceChapter2Write(payload, {});
  if (!fixes.length) return;
  replaceVariables(payload, { type: 'chat' });
  const id = getLastMessageId();
  replaceVariables(payload, { type: 'message', message_id: id });
}

function inheritStatAfterTruncate() {
  const id = getLastMessageId();
  for (let mid = id; mid >= 0; mid--) {
    const [msg] = getChatMessages(mid);
    if (!msg || msg.role === 'user') continue;
    const data = Mvu.getMvuData({ type: 'message', message_id: mid });
    if (_.isPlainObject(data?.stat_data) && _.has(data.stat_data, '剧情')) {
      replaceVariables({ stat_data: _.cloneDeep(data.stat_data) }, { type: 'chat' });
      replaceVariables({ stat_data: _.cloneDeep(data.stat_data) }, { type: 'message', message_id: id });
      const vars = getVariables({ type: 'chat' });
      enforceChapter2Write(vars, {});
      replaceVariables(vars, { type: 'chat' });
      return;
    }
  }
  const fresh: MvuPayload = {
    stat_data: {
      剧情: chapter2PlotBaseline(),
    },
  };
  replaceVariables(fresh, { type: 'chat' });
  replaceVariables(fresh, { type: 'message', message_id: id });
}

$(() => {
  errorCatched(async () => {
    await waitGlobalInitialized('Mvu');

    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (variables, variables_before) => {
      enforceChapter2Write(variables, variables_before);
      const lastId = getLastMessageId();
      setTimeout(() => {
        dedupeUpdateVariableBlocks(lastId);
        ensureMessageBranchesBlock(lastId);
      }, 80);
    });

    eventOn(tavern_events.MESSAGE_SENT, (message_id) => {
      const [msg] = getChatMessages(message_id);
      if (!msg?.is_user) return;
      runChapter2PrewriteBeforeGenerate(String(msg.message ?? ''), message_id);
    });

    eventOn(tavern_events.GENERATION_AFTER_COMMANDS, (_type, _option, dry_run) => {
      if (dry_run) return;
      runChapter2PrewriteBeforeGenerate(getLastUserText());
    });

    eventOn(tavern_events.MESSAGE_RECEIVED, (message_id) => {
      const [msg] = getChatMessages(message_id);
      if (!msg) return;
      if (!msg.is_user) {
        setTimeout(() => {
          dedupeUpdateVariableBlocks(message_id);
          ensureMessageBranchesBlock(message_id);
        }, 150);
        return;
      }
      setTimeout(() => syncMessageVariablesFromChat(), 80);
    });

    eventOn(tavern_events.MESSAGE_DELETED, () => {
      setTimeout(() => {
        inheritStatAfterTruncate();
        syncMessageVariablesFromChat();
      }, 120);
    });

    eventOn(tavern_events.CHAT_CHANGED, () => {
      setTimeout(() => syncMessageVariablesFromChat(), 200);
    });

    console.info('[隐形守护者] 第二章写死强制（二十三选+自动补 branches）已启用');
  })();
});

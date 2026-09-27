/** 序章 12 选 · 与 scripts/prologue-choices.mjs 同步 */
export const PROLOGUE_CHOICES = {
  '序章-1': {
    pass: {
      id: 'P1-A',
      match: [/保持沉默/, /^A[.、\s]/, /选择A/, /选A/],
      forbidIfMatch: [/另有隐情/, /不是我/, /辩白/, /听我解释/, /绝非我所为/, /老师不是我/],
    },
    be: [{ id: 'P1-B', match: [/老师不是我/, /另有隐情/, /听我辩白/, /绝非我所为/, /听我解释/, /^B[.、\s]/, /选择B/, /选B/] }],
  },
  '序章-2': {
    pass: {
      id: 'P2-A',
      match: [/都已经过去了/, /问那么多干嘛/, /^A[.、\s]/],
      forbidIfMatch: [/不是我干的/, /请你相信我/],
    },
    be: [{ id: 'P2-B', match: [/不是我干的/, /请你相信我/, /^B[.、\s]/] }],
  },
  '序章-3': {
    pass: {
      id: 'P3-A',
      match: [/图书馆/, /看看书/, /^A[.、\s]/],
      forbidIfMatch: [/旅馆/, /休息/, /睡觉/, /酒馆/, /喝酒/, /忘掉烦心/],
    },
    be: [
      { id: 'P3-B', match: [/旅馆/, /好好休息/, /睡觉/, /^B[.、\s]/] },
      { id: 'P3-C', match: [/酒馆/, /喝酒/, /忘掉烦心/, /^C[.、\s]/] },
    ],
  },
  '序章-4': {
    pass: { id: 'P4-A', match: [/再呆一会儿/, /再等/, /^A[.、\s]/] },
    be: [{ id: 'P4-B', match: [/我还是回去吧/, /回去吧/, /^B[.、\s]/] }],
  },
  '序章-5': {
    pass: [
      { id: 'P5-A', match: [/逐一了解/, /^A[.、\s]/] },
      { id: 'P5-C', match: [/入党申请书/, /取申请书/, /^C[.、\s]/] },
    ],
    be: [{ id: 'P5-B', match: [/跳过了解/, /直接要任务/, /^B[.、\s]/] }],
  },
} as const;

export const BRIEFING = [
  '序章-基地简报-纪律',
  '序章-基地简报-形势',
  '序章-基地简报-代号',
  '序章-基地简报-方敏安排',
] as const;

export type ApplySpec = {
  be: boolean;
  ending?: string;
  checkpoint: string;
  node: string;
  chapter?: string;
  prologueDone?: boolean;
  events?: string[];
  clues?: string[];
  unlock?: string;
  task?: string;
  deltas?: Record<string, number>;
};

export const PROLOGUE_APPLY: Record<string, ApplySpec> = {
  'P1-A': {
    be: false,
    checkpoint: '序章-2',
    node: '序章-2',
    events: ['序章-方汉洲演戏'],
    clues: ['序章-方汉洲赶人当众台词'],
    deltas: { '肖途.组织信任度': 3 },
  },
  'P1-B': {
    be: true,
    ending: '新的征程',
    checkpoint: '序章-1',
    node: '序章-1',
    unlock: 'BE-序章-新的征程',
    deltas: { '肖途.伪装完整度': -25, '肖途.身心状态': -15 },
  },
  'P2-A': {
    be: false,
    checkpoint: '序章-3',
    node: '序章-3',
    events: ['序章-方敏追问'],
    deltas: { '对user.方敏.情感值': 1, '对user.方敏.信任度': 2 },
  },
  'P2-B': {
    be: true,
    ending: '赤诚之道',
    checkpoint: '序章-2',
    node: '序章-2',
    unlock: 'BE-序章-赤诚之道',
    deltas: { '对user.方敏.信任度': -10 },
  },
  'P3-A': {
    be: false,
    checkpoint: '序章-4',
    node: '序章-4',
    events: ['序章-图书馆接头'],
  },
  'P3-B': {
    be: true,
    ending: '好梦还乡',
    checkpoint: '序章-3',
    node: '序章-3',
    unlock: 'BE-序章-好梦还乡',
  },
  'P3-C': {
    be: true,
    ending: '匹夫之刃',
    checkpoint: '序章-3',
    node: '序章-3',
    unlock: 'BE-序章-匹夫之刃',
  },
  'P4-A': {
    be: false,
    checkpoint: '序章-5',
    node: '序章-5',
    deltas: { '肖途.组织信任度': 2 },
  },
  'P4-B': {
    be: true,
    ending: '随波逐流',
    checkpoint: '序章-4',
    node: '序章-4',
    unlock: 'BE-序章-随波逐流',
  },
  'P5-B': {
    be: false,
    checkpoint: '序章-5',
    node: '序章-5',
    deltas: { '肖途.组织信任度': -3 },
  },
  'P5-C': {
    be: false,
    checkpoint: '第一章-0',
    node: '第一章-0',
    chapter: '第一章',
    prologueDone: true,
    events: ['序章-完成'],
    clues: ['入党申请书'],
    task: '打入武藤公馆，建立长期潜伏身份',
  },
};

function norm(t: string) {
  return t.replace(/\s/g, '');
}

function matchRule(t: string, rule: { match: RegExp[]; forbidIfMatch?: RegExp[] }) {
  if (rule.forbidIfMatch?.some((p) => p.test(t))) return false;
  return rule.match.some((p) => p.test(t));
}

export function detectPrologueChoice(node: string, userText: string): string | null {
  const rules = PROLOGUE_CHOICES[node as keyof typeof PROLOGUE_CHOICES];
  if (!rules) return null;
  const t = norm(userText);
  const bes = Array.isArray(rules.be) ? rules.be : [rules.be];
  for (const be of bes) {
    if (matchRule(t, be)) return be.id;
  }
  const passes = Array.isArray(rules.pass) ? rules.pass : [rules.pass];
  for (const pass of passes) {
    if (matchRule(t, pass)) return pass.id;
  }
  return null;
}

export function plotMismatch(stat: { 剧情: Record<string, unknown> }, choiceId: string): boolean {
  const spec = PROLOGUE_APPLY[choiceId];
  if (!spec) return false;
  const plot = stat.剧情;
  if (spec.be) {
    return plot.已死亡 !== true || plot.结局分支 !== spec.ending;
  }
  if (choiceId === 'P3-A') {
    const ev = plot.已触发事件 as string[];
    return plot.当前节点 !== '序章-4' || !ev?.some((e) => String(e).includes('图书馆接头'));
  }
  if (choiceId === 'P1-A') {
    return plot.当前节点 !== '序章-2' || plot.已死亡 === true;
  }
  if (choiceId === 'P5-C') {
    const clues = plot.已收集线索 as string[];
    const okBrief = BRIEFING.every((k) => clues?.includes(k));
    return !okBrief || plot.序章已完成 !== true || plot.当前节点 !== '第一章-0';
  }
  if (choiceId === 'P5-A' || choiceId === 'P5-B') {
    return plot.当前节点 !== '序章-5';
  }
  return plot.当前节点 !== spec.node || plot.已死亡 === true;
}

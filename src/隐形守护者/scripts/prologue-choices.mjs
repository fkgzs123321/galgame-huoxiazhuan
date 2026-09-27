/** 序章 12 选 · 唯一真相源（校验脚本与 MVU 强制共用） */
export const PROLOGUE_CHOICES = {
  '序章-1': {
    pass: {
      id: 'P1-A',
      match: [/保持沉默/, /^A[.、\s]/, /选择A/, /选A/],
      forbidIfMatch: [/另有隐情/, /不是我/, /辩白/, /听我解释/, /绝非我所为/, /老师不是我/],
    },
    be: [
      {
        id: 'P1-B',
        match: [/老师不是我/, /另有隐情/, /听我辩白/, /绝非我所为/, /听我解释/, /^B[.、\s]/, /选择B/, /选B/],
      },
    ],
  },
  '序章-2': {
    pass: {
      id: 'P2-A',
      match: [/都已经过去了/, /问那么多干嘛/, /^A[.、\s]/],
      forbidIfMatch: [/不是我干的/, /请你相信我/],
    },
    be: [
      {
        id: 'P2-B',
        match: [/不是我干的/, /请你相信我/, /^B[.、\s]/],
      },
    ],
  },
  '序章-3': {
    pass: {
      id: 'P3-A',
      match: [/图书馆/, /看看书/, /^A[.、\s]*去图书馆/, /^A[.、\s]*图书馆/],
      forbidIfMatch: [/旅馆/, /休息/, /睡觉/, /酒馆/, /喝酒/, /忘掉烦心/, /保持沉默/],
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
};

/** @type {Record<string, { be: boolean, ending?: string, checkpoint: string, node: string, events?: string[], clues?: string[], deltas?: Record<string, number> }>} */
export const PROLOGUE_APPLY = {
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
    events: [],
    deltas: { '肖途.伪装完整度': -25, '肖途.身心状态': -15 },
    unlock: 'BE-序章-新的征程',
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
  'P5-A': {
    be: false,
    checkpoint: '序章-5',
    node: '序章-5',
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

const BRIEFING = [
  '序章-基地简报-纪律',
  '序章-基地简报-形势',
  '序章-基地简报-代号',
  '序章-基地简报-方敏安排',
];

export function detectPrologueChoice(node, userText) {
  const rules = PROLOGUE_CHOICES[node];
  if (!rules) return null;
  const t = String(userText || '').replace(/\s/g, '');

  const tryRule = (rule) => {
    if (rule.forbidIfMatch?.some((p) => (p.test ? p.test(t) : t.includes(String(p).replace(/\s/g, ''))))) {
      return false;
    }
    return rule.match.some((p) => (p.test ? p.test(t) : t.includes(String(p).replace(/\s/g, ''))));
  };

  for (const be of [rules.be].flat()) {
    if (tryRule(be)) return be.id;
  }
  const passes = Array.isArray(rules.pass) ? rules.pass : [rules.pass];
  for (const pass of passes) {
    if (tryRule(pass)) return pass.id;
  }
  return null;
}

export function needsPrologueEnforce(stat, choiceId) {
  const apply = PROLOGUE_APPLY[choiceId];
  if (!apply) return false;
  if (apply.be) {
    return !stat.剧情.已死亡 || stat.剧情.结局分支 !== apply.ending;
  }
  if (choiceId === 'P3-A') {
    return !stat.剧情.已触发事件.some((e) => String(e).includes('图书馆接头'));
  }
  if (choiceId === 'P1-A') {
    return stat.剧情.当前节点 !== '序章-2' || stat.剧情.已死亡;
  }
  if (choiceId.startsWith('P1-B') || choiceId.startsWith('P2-B') || choiceId.startsWith('P3-') && apply.be) {
    return !stat.剧情.已死亡;
  }
  return stat.剧情.当前节点 !== apply.node;
}

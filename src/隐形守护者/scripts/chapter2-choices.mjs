/** 第二章·狩猎者 · 唯一真相源（校验脚本与 MVU 强制共用） */
export const CHAPTER2_NODES = [
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
];

export const CHAPTER2_CHOICE_HOME = {
  'C2-1-A': '第二章-1',
  'C2-1-B': '第二章-1',
  'C2-2-A': '第二章-2',
  'C2-3-A': '第二章-3',
  'C2-4-A': '第二章-4',
  'C2-4-B': '第二章-4',
  'C2-5-A': '第二章-5',
  'C2-5-B': '第二章-5',
  'C2-5-C': '第二章-5',
  'C2-5-D': '第二章-5',
  'C2-6-A': '第二章-6',
  'C2-6-B': '第二章-6',
  'C2-7-A': '第二章-7',
  'C2-7-B': '第二章-7',
  'C2-8-A': '第二章-8',
  'C2-8-B': '第二章-8',
  'C2-9-A': '第二章-9',
  'C2-9-B': '第二章-9',
  'C2-9-C': '第二章-9',
  'C2-10-A': '第二章-10',
  'C2-11-A': '第二章-11',
  'C2-12-A': '第二章-12',
  'C2-12-B': '第二章-12',
  'C2-13-A': '第二章-13',
  'C2-13-B': '第二章-13',
  'C2-13-C': '第二章-13',
  'C2-14-A': '第二章-14',
  'C2-14-B': '第二章-14',
  'C2-15-A': '第二章-15',
  'C2-16-A': '第二章-16',
  'C2-16-B': '第二章-16',
  'C2-17-A': '第二章-17',
  'C2-17-B': '第二章-17',
  'C2-17-C': '第二章-17',
  'C2-18-A': '第二章-18',
  'C2-19-A': '第二章-19',
  'C2-19-B': '第二章-19',
  'C2-19-C': '第二章-19',
  'C2-20-A': '第二章-20',
  'C2-20-B': '第二章-20',
  'C2-21-A': '第二章-21',
  'C2-21-B': '第二章-21',
  'C2-22-A': '第二章-22',
  'C2-22-B': '第二章-22',
  'C2-22-C': '第二章-22',
};

export const CHAPTER2_CHOICES = {
  '第二章-0': {
    pass: [
      { id: 'C2-1-A', match: [/李科长.*误会/, /误会了/, /^A[.、\s]/] },
      { id: 'C2-1-B', match: [/领事/, /胡话/, /^B[.、\s]/] },
    ],
  },
  '第二章-1': {
    pass: [
      { id: 'C2-1-A', match: [/李科长.*误会/, /误会了/, /^A[.、\s]/] },
      { id: 'C2-1-B', match: [/领事/, /胡话/, /^B[.、\s]/] },
    ],
  },
  '第二章-2': {
    pass: {
      id: 'C2-2-A',
      match: [/外人/, /不能评论/, /不便置喙/, /^A[.、\s]/],
      forbidIfMatch: [/评论胡/, /说破/],
    },
  },
  '第二章-3': {
    pass: {
      id: 'C2-3-A',
      match: [/再也回不去了/, /回不去了/, /^A[.、\s]/],
      forbidIfMatch: [/上前搭讪/, /搭讪/],
    },
  },
  '第二章-4': {
    pass: [
      { id: 'C2-4-A', match: [/上前搭话/, /上前/, /^A[.、\s]/] },
      { id: 'C2-4-B', match: [/留在大厅/, /^B[.、\s]/] },
    ],
  },
  '第二章-5': {
    pass: [
      { id: 'C2-5-A', match: [/带她一起离开/, /带她离开/, /一起离开/, /^A[.、\s]/] },
      { id: 'C2-5-B', match: [/跟上/, /跟上他们/, /^B[.、\s]/], forbidIfMatch: [/阻止/, /躲着/] },
    ],
    be: [
      { id: 'C2-5-C', match: [/阻止她出去/, /阻止/, /^C[.、\s]/] },
      { id: 'C2-5-D', match: [/继续躲着/, /躲着/, /^D[.、\s]/] },
    ],
  },
  '第二章-6': {
    pass: {
      id: 'C2-6-A',
      match: [/跟上/, /冲出去/, /跟上吴明达/, /^A[.、\s]/],
      forbidIfMatch: [/不能轻举妄动/, /轻举妄动/],
    },
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
    be: [
      { id: 'C2-9-B', match: [/拒绝/, /^B[.、\s]/], forbidIfMatch: [/交枪/] },
      { id: 'C2-9-C', match: [/把枪交给/, /交枪/, /^C[.、\s]/] },
    ],
  },
  '第二章-10': {
    pass: { id: 'C2-10-A', match: [/毙了我吧/, /那你毙了我/, /^A[.、\s]/] },
  },
  '第二章-11': {
    pass: {
      id: 'C2-11-A',
      match: [/没什么牵连/, /放过他们/, /放过/, /^A[.、\s]/],
      forbidIfMatch: [/牵连很大/, /处决/],
    },
  },
  '第二章-12': {
    pass: {
      id: 'C2-12-A',
      match: [/闪身避开/, /闪身/, /^A[.、\s]/],
      forbidIfMatch: [/掏枪/, /对准李峰/],
    },
    be: [{ id: 'C2-12-B', match: [/掏枪/, /对准李峰/, /^B[.、\s]/] }],
  },
  '第二章-13': {
    pass: {
      id: 'C2-13-A',
      match: [/军统/, /地下党/, /恐怕是/, /^A[.、\s]/],
      forbidIfMatch: [/武藤/, /汪伪/],
    },
    be: [
      { id: 'C2-13-B', match: [/武藤/, /武藤熊志/, /^B[.、\s]/] },
      { id: 'C2-13-C', match: [/汪伪政府/, /汪伪/, /^C[.、\s]/] },
    ],
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
    pass: {
      id: 'C2-16-A',
      match: [/据实相告/, /如实/, /^A[.、\s]/],
      forbidIfMatch: [/隐瞒身份/, /隐瞒/],
    },
    be: [{ id: 'C2-16-B', match: [/隐瞒身份/, /隐瞒/, /^B[.、\s]/] }],
  },
  '第二章-17': {
    pass: {
      id: 'C2-17-A',
      match: [/^情报$/, /情报/, /^A[.、\s]/],
      forbidIfMatch: [/女人/, /钱/],
    },
    be: [
      { id: 'C2-17-B', match: [/女人/, /^B[.、\s]/] },
      { id: 'C2-17-C', match: [/钱/, /^C[.、\s]/] },
    ],
  },
  '第二章-18': {
    pass: { id: 'C2-18-A', match: [/介意/, /^A[.、\s]/] },
  },
  '第二章-19': {
    pass: {
      id: 'C2-19-A',
      match: [/武藤志雄/, /武藤纯子/, /武藤和纯子/, /^A[.、\s]/],
      forbidIfMatch: [/军火/, /兵力动向/],
    },
    be: [
      { id: 'C2-19-B', match: [/军火运输/, /军火/, /^B[.、\s]/] },
      { id: 'C2-19-C', match: [/兵力动向/, /兵力/, /^C[.、\s]/] },
    ],
  },
  '第二章-20': {
    pass: [
      { id: 'C2-20-A', match: [/想起了故人/, /落几滴泪/, /免不了落/, /^A[.、\s]/] },
      { id: 'C2-20-B', match: [/没有眼泪/, /没有泪/, /^B[.、\s]/] },
    ],
  },
  '第二章-21': {
    pass: [
      { id: 'C2-21-A', match: [/有那么几滴/, /有几滴/, /^A[.、\s]/] },
      { id: 'C2-21-B', match: [/没有眼泪/, /没有泪/, /^B[.、\s]/] },
    ],
  },
  '第二章-22': {
    pass: {
      id: 'C2-22-A',
      match: [/为她倒酒/, /倒酒/, /^A[.、\s]/],
      forbidIfMatch: [/没有眼泪/, /没有泪/, /掏枪/],
    },
    be: [
      { id: 'C2-22-B', match: [/没有眼泪/, /没有泪/, /^B[.、\s]/] },
      { id: 'C2-22-C', match: [/掏枪/, /掏枪对准/, /^C[.、\s]/] },
    ],
  },
};

export const CHAPTER2_APPLY = {
  'C2-1-A': { be: false, checkpoint: '第二章-2', node: '第二章-2' },
  'C2-1-B': { be: false, checkpoint: '第二章-2', node: '第二章-2' },
  'C2-2-A': { be: false, checkpoint: '第二章-3', node: '第二章-3' },
  'C2-3-A': {
    be: false,
    checkpoint: '第二章-4',
    node: '第二章-4',
    deltas: { '对user.庄晓曼.情感值': 2 },
  },
  'C2-4-A': { be: false, checkpoint: '第二章-5', node: '第二章-5' },
  'C2-4-B': { be: false, checkpoint: '第二章-5', node: '第二章-5' },
  'C2-5-A': { be: false, checkpoint: '第二章-6', node: '第二章-6' },
  'C2-5-B': { be: false, checkpoint: '第二章-6', node: '第二章-6' },
  'C2-5-C': {
    be: true,
    ending: '无处偷生',
    checkpoint: '第二章-5',
    node: '第二章-5',
    unlock: 'BE-第二章-无处偷生',
  },
  'C2-5-D': {
    be: true,
    ending: '无处偷生',
    checkpoint: '第二章-5',
    node: '第二章-5',
    unlock: 'BE-第二章-无处偷生',
  },
  'C2-6-A': { be: false, checkpoint: '第二章-7', node: '第二章-7' },
  'C2-6-B': {
    be: true,
    ending: '黄雀在后',
    checkpoint: '第二章-6',
    node: '第二章-6',
    unlock: 'BE-第二章-黄雀在后',
  },
  'C2-7-A': { be: false, checkpoint: '第二章-8', node: '第二章-8' },
  'C2-7-B': {
    be: true,
    ending: '黄雀在后',
    checkpoint: '第二章-7',
    node: '第二章-7',
    unlock: 'BE-第二章-黄雀在后',
  },
  'C2-8-A': { be: false, checkpoint: '第二章-9', node: '第二章-9' },
  'C2-8-B': {
    be: true,
    ending: '恻隐之殇',
    checkpoint: '第二章-8',
    node: '第二章-8',
    unlock: 'BE-第二章-恻隐之殇',
  },
  'C2-9-A': { be: false, checkpoint: '第二章-10', node: '第二章-10' },
  'C2-9-B': {
    be: true,
    ending: '万千心事',
    checkpoint: '第二章-9',
    node: '第二章-9',
    unlock: 'BE-第二章-万千心事',
  },
  'C2-9-C': {
    be: true,
    ending: '万千心事',
    checkpoint: '第二章-9',
    node: '第二章-9',
    unlock: 'BE-第二章-万千心事',
  },
  'C2-10-A': { be: false, checkpoint: '第二章-11', node: '第二章-11' },
  'C2-11-A': { be: false, checkpoint: '第二章-12', node: '第二章-12' },
  'C2-12-A': { be: false, checkpoint: '第二章-13', node: '第二章-13' },
  'C2-12-B': {
    be: true,
    ending: '枪声何处',
    checkpoint: '第二章-12',
    node: '第二章-12',
    unlock: 'BE-第二章-枪声何处',
  },
  'C2-13-A': { be: false, checkpoint: '第二章-14', node: '第二章-14' },
  'C2-13-B': {
    be: true,
    ending: '切肤之痛',
    checkpoint: '第二章-13',
    node: '第二章-13',
    unlock: 'BE-第二章-切肤之痛',
  },
  'C2-13-C': {
    be: true,
    ending: '切齿之恨',
    checkpoint: '第二章-13',
    node: '第二章-13',
    unlock: 'BE-第二章-切齿之恨',
  },
  'C2-14-A': {
    be: false,
    checkpoint: '第二章-15',
    node: '第二章-15',
    events: ['第二章-自保的感慨'],
    clues: ['第二章-自保的感慨'],
    fork2: '自保',
  },
  'C2-14-B': {
    be: false,
    checkpoint: '第二章-15',
    node: '第二章-15',
    fork2: '共荣圈',
  },
  'C2-15-A': { be: false, checkpoint: '第二章-16', node: '第二章-16' },
  'C2-16-A': { be: false, checkpoint: '第二章-17', node: '第二章-17' },
  'C2-16-B': {
    be: true,
    ending: '十面埋伏',
    checkpoint: '第二章-16',
    node: '第二章-16',
    unlock: 'BE-第二章-十面埋伏',
  },
  'C2-17-A': { be: false, checkpoint: '第二章-18', node: '第二章-18' },
  'C2-17-B': {
    be: true,
    ending: '万千心事',
    checkpoint: '第二章-17',
    node: '第二章-17',
    unlock: 'BE-第二章-万千心事',
  },
  'C2-17-C': {
    be: true,
    ending: '切肤之痛',
    checkpoint: '第二章-17',
    node: '第二章-17',
    unlock: 'BE-第二章-切肤之痛',
  },
  'C2-18-A': { be: false, checkpoint: '第二章-19', node: '第二章-19' },
  'C2-19-A': { be: false, checkpoint: '第二章-20', node: '第二章-20' },
  'C2-19-B': {
    be: true,
    ending: '十面埋伏',
    checkpoint: '第二章-19',
    node: '第二章-19',
    unlock: 'BE-第二章-十面埋伏',
  },
  'C2-19-C': {
    be: true,
    ending: '十面埋伏',
    checkpoint: '第二章-19',
    node: '第二章-19',
    unlock: 'BE-第二章-十面埋伏',
  },
  'C2-20-A': {
    be: false,
    checkpoint: '第二章-21',
    node: '第二章-21',
    deltas: { '对user.庄晓曼.情感值': 1 },
  },
  'C2-20-B': { be: false, checkpoint: '第二章-21', node: '第二章-21' },
  'C2-21-A': {
    be: false,
    checkpoint: '第二章-22',
    node: '第二章-22',
    deltas: { '对user.庄晓曼.情感值': 1 },
  },
  'C2-21-B': { be: false, checkpoint: '第二章-22', node: '第二章-22' },
  'C2-22-A': {
    be: false,
    checkpoint: '第三章-0',
    node: '第三章-0',
    chapter: '第三章',
    events: ['第二章-完成'],
    deltas: { '对user.庄晓曼.情感值': 1 },
    requireZhuangEmotionMin: 4,
  },
  'C2-22-B': {
    be: true,
    ending: '甜蜜子弹',
    checkpoint: '第二章-22',
    node: '第二章-22',
    unlock: 'BE-第二章-甜蜜子弹',
  },
  'C2-22-C': {
    be: true,
    ending: '甜蜜子弹',
    checkpoint: '第二章-22',
    node: '第二章-22',
    unlock: 'BE-第二章-甜蜜子弹',
  },
};

export const CHAPTER2_CHECKPOINT_LINES = {
  '第二章-0': 'A. 李科长，您误会了\nB. 领事哪会在意这种胡话',
  '第二章-1': 'A. 李科长，您误会了\nB. 领事哪会在意这种胡话',
  '第二章-2': 'A. 这不是我一个外人能评论的',
  '第二章-3': 'A. 嗯……再也回不去了',
  '第二章-4': 'A. 上前搭话\nB. 留在大厅',
  '第二章-5':
    'A. 带她一起离开\nB. 跟上他们\nC. 阻止她出去\nD. 继续躲着',
  '第二章-6': 'A. 和她一起冲出去，跟上吴明达\nB. 不能轻举妄动',
  '第二章-7': 'A. 果断射杀吴明达\nB. 不能轻举妄动',
  '第二章-8': 'A. 果断射杀顾君如\nB. 说服顾君如',
  '第二章-9': 'A. 答应\nB. 拒绝\nC. 把枪交给顾君如',
  '第二章-10': 'A. 那你毙了我吧……',
  '第二章-11': 'A. 应该没什么牵连，放过他们吧!',
  '第二章-12': 'A. 闪身避开\nB. 掏枪对准李峰',
  '第二章-13': 'A. 恐怕是军统\nB. 武藤熊志\nC. 汪伪政府',
  '第二章-14': 'A. 我只求自保而已\nB. 想要建立强大的东亚共荣圈',
  '第二章-15': 'A. 握手',
  '第二章-16': 'A. 据实相告\nB. 隐瞒身份',
  '第二章-17': 'A. 情报\nB. 女人\nC. 钱',
  '第二章-18': 'A. 介意',
  '第二章-19':
    'A. 武藤志雄和武藤纯子\nB. 日军的军火运输线部署\nC. 日军近期的兵力动向',
  '第二章-20': 'A. 想起了故人，免不了落几滴泪\nB. 没有眼泪',
  '第二章-21': 'A. 有那么几滴\nB. 没有眼泪',
  '第二章-22': 'A. 为她倒酒\nB. 没有眼泪\nC. 掏枪对准庄晓曼',
};

function norm(t) {
  return String(t || '').replace(/\s/g, '');
}

function matchRule(t, rule) {
  if (rule.forbidIfMatch?.some((p) => (p.test ? p.test(t) : t.includes(String(p).replace(/\s/g, ''))))) {
    return false;
  }
  return rule.match.some((p) => (p.test ? p.test(t) : t.includes(String(p).replace(/\s/g, ''))));
}

export function detectChapter2Choice(node, userText) {
  const rules = CHAPTER2_CHOICES[node];
  if (!rules) return null;
  const t = norm(userText);
  const bes = [rules.be].flat().filter(Boolean);
  for (const be of bes) {
    if (matchRule(t, be)) return be.id;
  }
  const passes = [rules.pass].flat().filter(Boolean);
  for (const pass of passes) {
    if (matchRule(t, pass)) return pass.id;
  }
  return null;
}

export function detectChapter2ChoiceGlobal(userText) {
  for (const node of CHAPTER2_NODES) {
    const id = detectChapter2Choice(node, userText);
    if (id) return id;
  }
  return null;
}

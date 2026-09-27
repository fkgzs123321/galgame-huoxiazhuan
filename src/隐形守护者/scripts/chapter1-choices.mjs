/** 第一章·太阳之影 十五选 · 唯一真相源（校验脚本与 MVU 强制共用） */
export const CHAPTER1_NODES = [
  '第一章-0',
  '第一章-1',
  '第一章-2',
  '第一章-3',
  '第一章-4',
  '第一章-5',
  '第一章-6',
  '第一章-7',
  '第一章-8',
  '第一章-9',
  '第一章-10',
  '第一章-11',
  '第一章-12',
  '第一章-13',
  '第一章-14',
  '第一章-15',
];

/** 抉择归属节点（第一章-0 与 第一章-1 共用发布会举手） */
export const CHAPTER1_CHOICE_HOME = {
  'C1-1-A': '第一章-1',
  'C1-1-B': '第一章-1',
  'C1-2-A': '第一章-2',
  'C1-2-B': '第一章-2',
  'C1-3-A': '第一章-3',
  'C1-3-B': '第一章-3',
  'C1-4-A': '第一章-4',
  'C1-4-B': '第一章-4',
  'C1-4-C': '第一章-4',
  'C1-5-A': '第一章-5',
  'C1-5-B': '第一章-5',
  'C1-6-A': '第一章-6',
  'C1-6-B': '第一章-6',
  'C1-7-A': '第一章-7',
  'C1-7-B': '第一章-7',
  'C1-8-A': '第一章-8',
  'C1-8-B': '第一章-8',
  'C1-9-A': '第一章-9',
  'C1-9-B': '第一章-9',
  'C1-10-A': '第一章-10',
  'C1-10-B': '第一章-10',
  'C1-10-C': '第一章-10',
  'C1-11-A': '第一章-11',
  'C1-11-B': '第一章-11',
  'C1-12-A': '第一章-12',
  'C1-12-B': '第一章-12',
  'C1-13-A': '第一章-13',
  'C1-13-B': '第一章-13',
  'C1-14-A': '第一章-14',
  'C1-14-B': '第一章-14',
  'C1-15-A': '第一章-15',
  'C1-15-B': '第一章-15',
  'C1-15-C': '第一章-15',
};

export const CHAPTER1_CHOICES = {
  '第一章-0': {
    pass: { id: 'C1-1-A', match: [/举手/, /^A[.、\s]/], forbidIfMatch: [/不举手/] },
    be: [{ id: 'C1-1-B', match: [/不举手/, /^B[.、\s]/] }],
  },
  '第一章-1': {
    pass: { id: 'C1-1-A', match: [/举手/, /^A[.、\s]/], forbidIfMatch: [/不举手/] },
    be: [{ id: 'C1-1-B', match: [/不举手/, /^B[.、\s]/] }],
  },
  '第一章-2': {
    pass: {
      id: 'C1-2-A',
      match: [/和平谈判/, /外交解决/, /^A[.、\s]/],
      forbidIfMatch: [/继续战争/, /武力解决/],
    },
    be: [{ id: 'C1-2-B', match: [/继续战争/, /武力解决/, /^B[.、\s]/] }],
  },
  '第一章-3': {
    pass: {
      id: 'C1-3-A',
      match: [/没问题/, /请领事放心/, /^A[.、\s]/],
      forbidIfMatch: [/必须立即开战/, /明天就打/],
    },
    be: [{ id: 'C1-3-B', match: [/必须立即开战/, /明天就打/, /^B[.、\s]/] }],
  },
  '第一章-4': {
    pass: {
      id: 'C1-4-A',
      match: [/国民党潜伏/, /潜伏人员/, /^A[.、\s]/],
      forbidIfMatch: [/不交名单/, /虚假/, /完全虚假/],
    },
    be: [
      { id: 'C1-4-B', match: [/不交名单/, /^B[.、\s]/] },
      { id: 'C1-4-C', match: [/完全虚假/, /虚假名单/, /^C[.、\s]/] },
    ],
  },
  '第一章-5': {
    pass: { id: 'C1-5-A', match: [/答应/, /^A[.、\s]/], forbidIfMatch: [/拒绝/, /恕难/] },
    be: [{ id: 'C1-5-B', match: [/拒绝/, /恕难从命/, /^B[.、\s]/] }],
  },
  '第一章-6': {
    pass: {
      id: 'C1-6-A',
      match: [/滔天罪行/, /岂会忘记/, /^A[.、\s]/],
      forbidIfMatch: [/必将胜利/, /踏平中国/],
    },
    be: [{ id: 'C1-6-B', match: [/必将胜利/, /踏平中国/, /皇军/, /^B[.、\s]/] }],
  },
  '第一章-7': {
    pass: {
      id: 'C1-7-A',
      match: [/做自己该做/, /该做的事情/, /^A[.、\s]/],
      forbidIfMatch: [/公开反抗/, /痛骂日本人/],
    },
    be: [{ id: 'C1-7-B', match: [/公开反抗/, /痛骂日本人/, /^B[.、\s]/] }],
  },
  '第一章-8': {
    pass: {
      id: 'C1-8-A',
      match: [/愿意/, /300元/, /三百/, /^A[.、\s]/],
      forbidIfMatch: [/恕难从命/, /严词拒绝/],
    },
    be: [{ id: 'C1-8-B', match: [/恕难从命/, /严词拒绝/, /^B[.、\s]/] }],
  },
  '第一章-9': {
    pass: { id: 'C1-9-A', match: [/^是$/, /^A[.、\s]*是/, /来过/, /^A[.、\s]/], forbidIfMatch: [/没来过/] },
    be: [{ id: 'C1-9-B', match: [/没来过/, /^B[.、\s]/] }],
  },
  '第一章-10': {
    pass: {
      id: 'C1-10-A',
      match: [/捡起枪/, /对准方老师/, /方老师/, /^A[.、\s]/],
      forbidIfMatch: [/吓呆/, /挟持武藤/],
    },
    be: [
      { id: 'C1-10-B', match: [/吓呆/, /^B[.、\s]/] },
      { id: 'C1-10-C', match: [/挟持武藤/, /武藤志雄/, /^C[.、\s]/] },
    ],
  },
  '第一章-11': {
    pass: {
      id: 'C1-11-A',
      match: [/有第一次/, /第一次/, /^A[.、\s]/],
      forbidIfMatch: [/不敢做/, /不敢/],
    },
    be: [{ id: 'C1-11-B', match: [/不敢做/, /我可不敢/, /^B[.、\s]/] }],
  },
  '第一章-12': {
    pass: {
      id: 'C1-12-A',
      match: [/很快被放出来/, /放出来/, /^A[.、\s]/],
      forbidIfMatch: [/都在场/, /学生都在/],
    },
    be: [{ id: 'C1-12-B', match: [/都在场/, /学生都在/, /^B[.、\s]/] }],
  },
  '第一章-13': {
    pass: { id: 'C1-13-A', match: [/逐一了解/, /^A[.、\s]/], forbidIfMatch: [/打字机/] },
    be: [{ id: 'C1-13-B', match: [/打字机/, /^B[.、\s]/] }],
  },
  '第一章-14': {
    pass: {
      id: 'C1-14-A',
      match: [/邀请四人/, /抗日秘密/, /^A[.、\s]/],
      forbidIfMatch: [/潜入/, /搜查/],
    },
    be: [{ id: 'C1-14-B', match: [/潜入/, /搜查/, /^B[.、\s]/] }],
  },
  '第一章-15': {
    pass: {
      id: 'C1-15-A',
      match: [/四个不同/, /时间地点/, /^A[.、\s]/],
      forbidIfMatch: [/不同字迹/, /四种字迹/, /没写时间/],
    },
    be: [
      { id: 'C1-15-B', match: [/不同字迹/, /四种字迹/, /^B[.、\s]/] },
      { id: 'C1-15-C', match: [/没写时间/, /约会要细心/, /^C[.、\s]/] },
    ],
  },
};

export const CHAPTER1_APPLY = {
  'C1-1-A': {
    be: false,
    checkpoint: '第一章-2',
    node: '第一章-2',
    events: ['第一章-发布会举手'],
    deltas: { '肖途.阵营信用': 2, '敌方.武藤志雄怀疑度': -1 },
  },
  'C1-1-B': {
    be: true,
    ending: '失之交臂',
    checkpoint: '第一章-1',
    node: '第一章-1',
    unlock: 'BE-第一章-失之交臂',
    deltas: { '肖途.组织信任度': -5 },
  },
  'C1-2-A': {
    be: false,
    checkpoint: '第一章-3',
    node: '第一章-3',
    deltas: { '肖途.阵营信用': 2 },
  },
  'C1-2-B': {
    be: false,
    checkpoint: '第一章-3',
    node: '第一章-3',
    deltas: { '肖途.阵营信用': -2 },
  },
  'C1-3-A': {
    be: false,
    checkpoint: '第一章-4',
    node: '第一章-4',
    deltas: { '肖途.阵营信用': 2 },
  },
  'C1-3-B': {
    be: true,
    ending: '疏远',
    checkpoint: '第一章-3',
    node: '第一章-3',
    unlock: 'BE-第一章-疏远',
  },
  'C1-4-A': {
    be: false,
    checkpoint: '第一章-5',
    node: '第一章-5',
    events: ['第一章-交潜伏名单'],
  },
  'C1-4-B': {
    be: true,
    ending: '命比纸薄',
    checkpoint: '第一章-4',
    node: '第一章-4',
    unlock: 'BE-第一章-命比纸薄',
  },
  'C1-4-C': {
    be: true,
    ending: '潜伏阴魂',
    checkpoint: '第一章-4',
    node: '第一章-4',
    unlock: 'BE-第一章-潜伏阴魂',
  },
  'C1-5-A': {
    be: false,
    checkpoint: '第一章-6',
    node: '第一章-6',
    deltas: { '肖途.阵营信用': 3 },
  },
  'C1-5-B': {
    be: true,
    ending: '分道扬镳',
    checkpoint: '第一章-5',
    node: '第一章-5',
    unlock: 'BE-第一章-分道扬镳',
  },
  'C1-6-A': {
    be: false,
    checkpoint: '第一章-7',
    node: '第一章-7',
    events: ['第一章-纯子得知真相'],
    clues: ['纯子得知真相'],
  },
  'C1-6-B': {
    be: true,
    ending: '被捕牺牲',
    checkpoint: '第一章-6',
    node: '第一章-6',
    unlock: 'BE-第一章-被捕牺牲',
    deltas: { '肖途.伪装完整度': -20, '敌方.武藤志雄怀疑度': 2 },
  },
  'C1-7-A': {
    be: false,
    checkpoint: '第一章-8',
    node: '第一章-8',
    events: ['第一章-遇见方敏'],
    deltas: { '对user.方敏.信任度': 2 },
  },
  'C1-7-B': {
    be: true,
    ending: '被捕牺牲',
    checkpoint: '第一章-7',
    node: '第一章-7',
    unlock: 'BE-第一章-被捕牺牲',
  },
  'C1-8-A': {
    be: false,
    checkpoint: '第一章-9',
    node: '第一章-9',
    deltas: { '肖途.阵营信用': 2 },
  },
  'C1-8-B': {
    be: true,
    ending: '分道扬镳',
    checkpoint: '第一章-8',
    node: '第一章-8',
    unlock: 'BE-第一章-分道扬镳',
  },
  'C1-9-A': {
    be: false,
    checkpoint: '第一章-10',
    node: '第一章-10',
  },
  'C1-9-B': {
    be: true,
    ending: '苍白谎言',
    checkpoint: '第一章-9',
    node: '第一章-9',
    unlock: 'BE-第一章-苍白谎言',
  },
  'C1-10-A': {
    be: false,
    checkpoint: '第一章-11',
    node: '第一章-11',
    events: ['第一章-方汉洲假死'],
  },
  'C1-10-B': {
    be: true,
    ending: '惊弓之鸟',
    checkpoint: '第一章-10',
    node: '第一章-10',
    unlock: 'BE-第一章-惊弓之鸟',
  },
  'C1-10-C': {
    be: true,
    ending: '壮烈捐躯',
    checkpoint: '第一章-10',
    node: '第一章-10',
    unlock: 'BE-第一章-壮烈捐躯',
  },
  'C1-11-A': {
    be: false,
    checkpoint: '第一章-12',
    node: '第一章-12',
  },
  'C1-11-B': {
    be: true,
    ending: '被捕牺牲',
    checkpoint: '第一章-11',
    node: '第一章-11',
    unlock: 'BE-第一章-被捕牺牲',
  },
  'C1-12-A': {
    be: false,
    checkpoint: '第一章-13',
    node: '第一章-13',
  },
  'C1-12-B': {
    be: true,
    ending: '捕风捉影',
    checkpoint: '第一章-12',
    node: '第一章-12',
    unlock: 'BE-第一章-捕风捉影',
  },
  'C1-13-A': {
    be: false,
    checkpoint: '第一章-14',
    node: '第一章-14',
  },
  'C1-13-B': {
    be: true,
    ending: '笨头笨脑',
    checkpoint: '第一章-13',
    node: '第一章-13',
    unlock: 'BE-第一章-笨头笨脑',
  },
  'C1-14-A': {
    be: false,
    checkpoint: '第一章-15',
    node: '第一章-15',
  },
  'C1-14-B': {
    be: true,
    ending: '处决',
    checkpoint: '第一章-14',
    node: '第一章-14',
    unlock: 'BE-第一章-处决',
  },
  'C1-15-A': {
    be: false,
    checkpoint: '第二章-0',
    node: '第二章-0',
    chapter: '第二章',
    events: ['第一章-完成'],
    deltas: { '肖途.公馆资历': 5, '肖途.组织信任度': 5 },
  },
  'C1-15-B': {
    be: true,
    ending: '捕风捉影',
    checkpoint: '第一章-15',
    node: '第一章-15',
    unlock: 'BE-第一章-捕风捉影',
  },
  'C1-15-C': {
    be: true,
    ending: '捕风捉影',
    checkpoint: '第一章-15',
    node: '第一章-15',
    unlock: 'BE-第一章-捕风捉影',
  },
};

export const CHAPTER1_CHECKPOINT_LINES = {
  '第一章-0': 'A. 举手\nB. 不举手',
  '第一章-1': 'A. 举手\nB. 不举手',
  '第一章-2': 'A. 和平谈判，通过外交解决争端\nB. 继续战争，通过武力解决争端',
  '第一章-3': 'A. 没问题，请领事放心!\nB. 必须立即开战，恨不得明天就打过去',
  '第一章-4':
    'A. 交一份只有国民党潜伏人员的名单\nB. 不交名单\nC. 交一份完全虚假的名单',
  '第一章-5': 'A. 答应\nB. 拒绝',
  '第一章-6': 'A. 日军滔天罪行，中国人岂会忘记\nB. 战争必将胜利，皇军不久将踏平中国',
  '第一章-7': 'A. 我只是做自己该做的事情罢了\nB. 我就是要公开反抗日本人',
  '第一章-8': 'A. 愿意是愿意，只是300元有点。。。\nB. 恕难从命',
  '第一章-9': 'A. 是\nB. 我没来过这',
  '第一章-10':
    'A. 捡起枪对准方老师\nB. 吓呆了\nC. 捡起枪挟持武藤志雄',
  '第一章-11': 'A. 做什么事情都是有第一次的\nB. 我可不敢做这种事情',
  '第一章-12': 'A. 老师死后，学生们很快被放出来\nB. 学生都在场',
  '第一章-13': 'A. 逐一了解\nB. 用打字机',
  '第一章-14': 'A. 邀请四人参加抗日秘密活动\nB. 潜入武藤公馆搜查',
  '第一章-15':
    'A. 你写了四个不同的会议时间地点\nB. 你用了四种不同的字迹\nC. 你没写时间和字迹',
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

export function detectChapter1Choice(node, userText) {
  const rules = CHAPTER1_CHOICES[node];
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

export function detectChapter1ChoiceGlobal(userText) {
  for (const node of CHAPTER1_NODES) {
    const id = detectChapter1Choice(node, userText);
    if (id) return id;
  }
  return null;
}

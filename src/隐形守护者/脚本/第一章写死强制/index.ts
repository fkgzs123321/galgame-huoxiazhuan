/** 第一章·太阳之影 十五选 MVU 强制（单文件 · 自动补 branches） */
type MvuPayload = { stat_data?: Record<string, unknown> };

const CHAPTER1_NODES = [
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
] as const;

const CHOICE_HOME_NODE: Record<string, string> = {
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

const CHAPTER1_CHOICES: Record<string, { pass?: unknown; be?: unknown }> = {
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
};

const CHAPTER1_APPLY: Record<string, ApplySpec> = {
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
  'C1-2-A': { be: false, checkpoint: '第一章-3', node: '第一章-3', deltas: { '肖途.阵营信用': 2 } },
  'C1-2-B': { be: false, checkpoint: '第一章-3', node: '第一章-3', deltas: { '肖途.阵营信用': -2 } },
  'C1-3-A': { be: false, checkpoint: '第一章-4', node: '第一章-4', deltas: { '肖途.阵营信用': 2 } },
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
  'C1-5-A': { be: false, checkpoint: '第一章-6', node: '第一章-6', deltas: { '肖途.阵营信用': 3 } },
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
  'C1-8-A': { be: false, checkpoint: '第一章-9', node: '第一章-9', deltas: { '肖途.阵营信用': 2 } },
  'C1-8-B': {
    be: true,
    ending: '分道扬镳',
    checkpoint: '第一章-8',
    node: '第一章-8',
    unlock: 'BE-第一章-分道扬镳',
  },
  'C1-9-A': { be: false, checkpoint: '第一章-10', node: '第一章-10' },
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
  'C1-11-A': { be: false, checkpoint: '第一章-12', node: '第一章-12' },
  'C1-11-B': {
    be: true,
    ending: '被捕牺牲',
    checkpoint: '第一章-11',
    node: '第一章-11',
    unlock: 'BE-第一章-被捕牺牲',
  },
  'C1-12-A': { be: false, checkpoint: '第一章-13', node: '第一章-13' },
  'C1-12-B': {
    be: true,
    ending: '捕风捉影',
    checkpoint: '第一章-12',
    node: '第一章-12',
    unlock: 'BE-第一章-捕风捉影',
  },
  'C1-13-A': { be: false, checkpoint: '第一章-14', node: '第一章-14' },
  'C1-13-B': {
    be: true,
    ending: '笨头笨脑',
    checkpoint: '第一章-13',
    node: '第一章-13',
    unlock: 'BE-第一章-笨头笨脑',
  },
  'C1-14-A': { be: false, checkpoint: '第一章-15', node: '第一章-15' },
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

const CHAPTER1_PREWRITE_ID = 'yxsh-ch1-prewrite';
const CHOICE_FOOTER_ID = 'yxsh-ch1-choice-footer';

function formatBranches(optionLines: string): string {
  return `<branches>\n<details><summary>请选择</summary>\n${optionLines.trim()}\n</details>\n</branches>`;
}

const CHECKPOINT_CHOICE_LINES: Record<string, string> = {
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
  '第一章-10': 'A. 捡起枪对准方老师\nB. 吓呆了\nC. 捡起枪挟持武藤志雄',
  '第一章-11': 'A. 做什么事情都是有第一次的\nB. 我可不敢做这种事情',
  '第一章-12': 'A. 老师死后，学生们很快被放出来\nB. 学生都在场',
  '第一章-13': 'A. 逐一了解\nB. 用打字机',
  '第一章-14': 'A. 邀请四人参加抗日秘密活动\nB. 潜入武藤公馆搜查',
  '第一章-15':
    'A. 你写了四个不同的会议时间地点\nB. 你用了四种不同的字迹\nC. 你没写时间和字迹',
};

function norm(t: string) {
  return t.replace(/\s/g, '');
}

function matchRule(t: string, rule: { match: RegExp[]; forbidIfMatch?: RegExp[] }) {
  if (rule.forbidIfMatch?.some((p) => p.test(t))) return false;
  return rule.match.some((p) => p.test(t));
}

function detectChapter1Choice(node: string, userText: string): string | null {
  const rules = CHAPTER1_CHOICES[node];
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
function detectChapter1ChoiceGlobal(userText: string): string | null {
  for (const node of CHAPTER1_NODES) {
    const id = detectChapter1Choice(node, userText);
    if (id) return id;
  }
  return null;
}

function getStat(v: MvuPayload | undefined): Record<string, unknown> | null {
  const raw = v?.stat_data;
  return _.isPlainObject(raw) ? (raw as Record<string, unknown>) : null;
}

function isChapter1Active(plot: Record<string, unknown> | undefined): boolean {
  if (!plot || plot.已死亡 === true) return false;
  if (plot.序章已完成 !== true) return false;
  return plot.当前章节 === '第一章';
}

function injectChoiceFooter(stat: Record<string, unknown>, appliedChoiceId: string | null) {
  const plot = stat.剧情 as Record<string, unknown> | undefined;
  if (!plot || !isChapter1Active(plot)) return;

  try {
    uninjectPrompts([CHOICE_FOOTER_ID]);
  } catch {
    /* ignore */
  }

  if (plot.已死亡 === true) {
    const cp = String(plot.检查点 || '第一章-1');
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
    console.info('[隐形守护者·第一章写死] 生成前注入 BE branches', cp);
    return;
  }

  if (appliedChoiceId && CHAPTER1_APPLY[appliedChoiceId]?.be) return;

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
  console.info('[隐形守护者·第一章写死] 生成前注入 branches', node);
}

function injectChapter1Prewrite(choiceId: string) {
  const spec = CHAPTER1_APPLY[choiceId];
  if (!spec) return;
  const tag = spec.be ? `BE·${spec.ending}` : `通过→${spec.node}`;
  const action = spec.be
    ? `**同楼 BE「${spec.ending}」**；必须 \`<yxsh_be>\`【结局 · ${spec.ending}】+ \`<branches>\`（检查点 ${spec.checkpoint} 原作选项）。禁止续演主线。`
    : `**通过** → 节点 ${spec.node}；禁止本楼 BE、禁止跳关。`;
  const content = `[第一章写死·本楼已锁定·${choiceId}·${tag}]\n本楼 ${choiceId}。${action}\n叙事与 JSONPatch 照《第一章抉择全书-写死表》。`;
  injectPrompts(
    [
      {
        id: CHAPTER1_PREWRITE_ID,
        position: 'in_chat',
        depth: 0,
        role: 'system',
        content,
      },
    ],
    { once: true },
  );
  console.info('[隐形守护者·第一章写死] 生成前注入', tag, choiceId);
}

/** 用户发消息后、主模型生成前：预写 MVU + 注入本楼写死指令 */
function runChapter1PrewriteBeforeGenerate(userText: string, userMessageId?: number) {
  const trimmed = userText.trim();
  if (!trimmed) return;

  const chatVars = getVariables({ type: 'chat' });
  const stat = getStat(chatVars as MvuPayload);
  if (!stat) return;
  const plot = stat.剧情 as Record<string, unknown> | undefined;
  if (!isChapter1Active(plot)) return;

  try {
    uninjectPrompts([CHAPTER1_PREWRITE_ID, CHOICE_FOOTER_ID]);
  } catch {
    /* ignore */
  }

  const choiceId = detectChapter1ChoiceGlobal(trimmed);
  if (!choiceId) {
    injectChoiceFooter(stat, null);
    return;
  }

  const prepared = prepareStatForChoice(stat, choiceId);
  const fixed = applyChoice(prepared, choiceId);
  persistStatToChat(fixed, userMessageId);
  injectChapter1Prewrite(choiceId);
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

function chapter1PlotBaseline(): Record<string, unknown> {
  return {
    当前章节: '第一章',
    章节进度: 0,
    当前节点: '第一章-0',
    序章已完成: true,
    主线归属: '',
    第二章分歧: '',
    第五章分歧: '',
    结局分支: '',
    已死亡: false,
    检查点: '第一章-0',
    已触发事件: ['序章-完成'],
    已收集线索: [],
  };
}

function resetPlotToCheckpoint(plot: Record<string, unknown>, checkpoint: string) {
  Object.assign(plot, chapter1PlotBaseline());
  plot.当前节点 = checkpoint;
  plot.检查点 = checkpoint;
  plot.已死亡 = false;
  plot.结局分支 = '';
  plot.章节进度 = 0;
  plot.序章已完成 = true;
  plot.当前章节 = '第一章';
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
  console.info('[隐形守护者·第一章写死] 已去重 UpdateVariable', messageId, blocks.length, '→ 1');
  return true;
}

function getBranchesLinesForPlot(plot: Record<string, unknown>): string | null {
  if (!isChapter1Active(plot)) return null;
  if (plot.已死亡 === true) {
    const cp = String(plot.检查点 || '第一章-1');
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
    '[隐形守护者·第一章写死] 已补全 branches',
    messageId,
    plot?.已死亡 ? plot.检查点 : plot?.当前节点,
  );
  return true;
}

function isStaleForChoice(plot: Record<string, unknown>, choiceId: string): boolean {
  const home = CHOICE_HOME_NODE[choiceId];
  const node = String(plot.当前节点 ?? '');
  const spec = CHAPTER1_APPLY[choiceId];
  if (!spec || !home) return false;

  if (plot.已死亡 === true && !spec.be) return true;
  if (
    home &&
    CHAPTER1_NODES.indexOf(node as (typeof CHAPTER1_NODES)[number]) >
      CHAPTER1_NODES.indexOf(home as (typeof CHAPTER1_NODES)[number])
  ) {
    return true;
  }
  return plotMismatch(plot, choiceId);
}

function plotMismatch(plot: Record<string, unknown>, choiceId: string): boolean {
  const spec = CHAPTER1_APPLY[choiceId];
  if (!spec) return false;
  if (spec.be) return plot.已死亡 !== true || plot.结局分支 !== spec.ending;
  if (choiceId === 'C1-1-A' && plot.当前节点 !== '第一章-2') return true;
  if (choiceId === 'C1-15-A') {
    return plot.当前章节 !== '第二章' || plot.当前节点 !== '第二章-0';
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
  const spec = CHAPTER1_APPLY[choiceId];
  if (!spec) return base;

  plot.已触发事件 = Array.isArray(plot.已触发事件) ? [...(plot.已触发事件 as string[])] : [];
  plot.已收集线索 = Array.isArray(plot.已收集线索) ? [...(plot.已收集线索 as string[])] : [];
  plot.已解锁死亡结局 = Array.isArray(plot.已解锁死亡结局) ? [...(plot.已解锁死亡结局 as string[])] : [];
  plot.章节进度 = (Number(plot.章节进度) || 0) + 1;

  if (choiceId === 'C1-15-A') {
    plot.当前章节 = '第二章';
    plot.当前节点 = '第二章-0';
    plot.检查点 = '第二章-0';
    plot.章节进度 = 0;
    plot.已死亡 = false;
    plot.结局分支 = '';
    plot.已触发事件 = uniqPush(plot.已触发事件 as string[], '第一章-完成');
    applyDeltas(base, spec.deltas);
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
  const home = CHOICE_HOME_NODE[choiceId] ?? '第一章-1';

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

function chapter1NodeIndex(nodeId: string): number {
  const i = CHAPTER1_NODES.indexOf(nodeId as (typeof CHAPTER1_NODES)[number]);
  return i < 0 ? -1 : i;
}

/** 禁止当前节点领先检查点、禁止无点选一次跳多格 */
function clampChapter1PlotAdvance(
  plot: Record<string, unknown>,
  before: Record<string, unknown> | undefined,
  choiceId: string | null,
) {
  const ni = chapter1NodeIndex(String(plot.当前节点 ?? ''));
  const ci = chapter1NodeIndex(String(plot.检查点 ?? ''));
  if (ni >= 0 && ci >= 0 && ni > ci) plot.当前节点 = plot.检查点;

  if (!choiceId && before) {
    const oi = chapter1NodeIndex(String(before.当前节点 ?? ''));
    if (ni >= 0 && oi >= 0 && ni > oi + 1) {
      plot.当前节点 = before.当前节点;
      const bci = chapter1NodeIndex(String(before.检查点 ?? ''));
      if (ci > bci) plot.检查点 = before.检查点 ?? before.当前节点;
    }
  }
}

export function enforceChapter1Write(newVariables: MvuPayload, old: MvuPayload): string[] {
  const stat = getStat(newVariables);
  if (!stat) return [];
  const plot = stat.剧情 as Record<string, unknown> | undefined;
  if (!isChapter1Active(plot)) return [];

  const userText = getLastUserText();
  const choiceId = userText.trim() ? detectChapter1ChoiceGlobal(userText) : null;
  const oldStat = getStat(old);
  const beforePlot = (oldStat?.剧情 ?? {}) as Record<string, unknown>;

  const sanitized = sanitizeStatData(stat);
  const p = (sanitized.剧情 ??= {}) as Record<string, unknown>;
  clampChapter1PlotAdvance(p, beforePlot, choiceId);

  if (!choiceId) {
    const fixes: string[] = [];
    const rel = rollbackRelationFromOld(sanitized, oldStat);
    if (rel) fixes.push(rel);
    _.set(newVariables, 'stat_data', sanitized);
    const ni = chapter1NodeIndex(String(p.当前节点));
    const ci = chapter1NodeIndex(String(p.检查点));
    if (ni > ci) fixes.push('第一章：已回退超前节点至检查点');
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

  const msg = `第一章写死：${String(plot!.当前节点)}→${choiceId}（已清脏变量）`;
  console.warn('[隐形守护者·第一章写死]', msg, { userText: userText.slice(0, 80) });
  try {
    toastr?.warning?.(msg, '第一章选项写死');
  } catch {
    /* ignore */
  }
  return [msg];
}

function syncMessageVariablesFromChat() {
  const chatVars = getVariables({ type: 'chat' });
  if (!_.isPlainObject(chatVars?.stat_data)) return;
  const payload: MvuPayload = { stat_data: _.cloneDeep(chatVars.stat_data) };
  const fixes = enforceChapter1Write(payload, {});
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
      enforceChapter1Write(vars, {});
      replaceVariables(vars, { type: 'chat' });
      return;
    }
  }
  const fresh: MvuPayload = {
    stat_data: {
      剧情: chapter1PlotBaseline(),
    },
  };
  replaceVariables(fresh, { type: 'chat' });
  replaceVariables(fresh, { type: 'message', message_id: id });
}

$(() => {
  errorCatched(async () => {
    await waitGlobalInitialized('Mvu');

    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (variables, variables_before) => {
      enforceChapter1Write(variables, variables_before);
      const lastId = getLastMessageId();
      setTimeout(() => {
        dedupeUpdateVariableBlocks(lastId);
        ensureMessageBranchesBlock(lastId);
      }, 80);
    });

    eventOn(tavern_events.MESSAGE_SENT, (message_id) => {
      const [msg] = getChatMessages(message_id);
      if (!msg?.is_user) return;
      runChapter1PrewriteBeforeGenerate(String(msg.message ?? ''), message_id);
    });

    eventOn(tavern_events.GENERATION_AFTER_COMMANDS, (_type, _option, dry_run) => {
      if (dry_run) return;
      runChapter1PrewriteBeforeGenerate(getLastUserText());
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

    console.info('[隐形守护者] 第一章写死强制（十五选+自动补 branches）已启用');
  })();
});

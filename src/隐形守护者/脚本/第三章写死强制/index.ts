/** 第三章·生死途 二十七选 MVU 强制（单文件 · 自动补 branches） */
type MvuPayload = { stat_data?: Record<string, unknown> };

const CHAPTER3_NODES = [
  '第三章-0',
  '第三章-1',
  '第三章-2',
  '第三章-3',
  '第三章-4',
  '第三章-5',
  '第三章-6',
  '第三章-7',
  '第三章-8',
  '第三章-9',
  '第三章-10',
  '第三章-11',
  '第三章-12',
  '第三章-13',
  '第三章-14',
  '第三章-15',
  '第三章-16',
] as const;

const CHOICE_HOME_NODE: Record<string, string> = {
  "C3-0-A": "第三章-0",
  "C3-1-A": "第三章-1",
  "C3-1-B": "第三章-1",
  "C3-2-A": "第三章-2",
  "C3-2-B": "第三章-2",
  "C3-3-A": "第三章-3",
  "C3-3-B": "第三章-3",
  "C3-4-A": "第三章-4",
  "C3-4-B": "第三章-4",
  "C3-5-A": "第三章-5",
  "C3-6-A": "第三章-6",
  "C3-6-B": "第三章-6",
  "C3-6-C": "第三章-6",
  "C3-7-A": "第三章-7",
  "C3-8-A": "第三章-8",
  "C3-8-B": "第三章-8",
  "C3-8-C": "第三章-8",
  "C3-9-A": "第三章-9",
  "C3-9-B": "第三章-9",
  "C3-10-A": "第三章-10",
  "C3-11-A": "第三章-11",
  "C3-12-A": "第三章-12",
  "C3-12-B": "第三章-12",
  "C3-13-A": "第三章-13",
  "C3-13-B": "第三章-13",
  "C3-14-A": "第三章-14",
  "C3-14-B": "第三章-14",
  "C3-14-C": "第三章-14",
  "C3-14-D": "第三章-14",
  "C3-15-A": "第三章-15",
  "C3-16-A": "第三章-16"
};

const CHAPTER3_CHOICES: Record<string, { pass?: unknown; be?: unknown }> = {
  '第三章-0': {
    pass: { id: 'C3-0-A', match: [/第二号/, /有什么指示/, /指示吗/, /^A[.、\s]/] },
  },
  '第三章-1': {
    pass: [{ id: 'C3-1-A', match: [/你也在跟踪/, /跟踪我/, /^A[.、\s]/] }, { id: 'C3-1-B', match: [/找我有什么事/, /有什么事/, /^B[.、\s]/], forbidIfMatch: [/跟踪/] }],
  },
  '第三章-2': {
    pass: [{ id: 'C3-2-A', match: [/不置可否/, /^A[.、\s]/], forbidIfMatch: [/点头承认/] }, { id: 'C3-2-B', match: [/点头承认/, /^B[.、\s]/] }],
  },
  '第三章-3': {
    pass: [{ id: 'C3-3-A', match: [/拒绝回答/, /^A[.、\s]/], forbidIfMatch: [/告诉庄/, /全部情况/] }, { id: 'C3-3-B', match: [/告诉庄晓曼全部情况/, /告诉庄晓曼/, /全部情况/, /^B[.、\s]/] }],
  },
  '第三章-4': {
    pass: { id: 'C3-4-B', match: [/叫住她套取情报/, /叫住她/, /套取情报/, /^B[.、\s]/] },
    be: [{ id: 'C3-4-A', match: [/开枪射杀庄晓曼/, /开枪射杀/, /射杀庄/, /^A[.、\s]/] }],
  },
  '第三章-5': {
    pass: { id: 'C3-5-A', match: [/地下工作者/, /你为什么会在这里/, /为什么会在这里/, /^A[.、\s]/, /^B[.、\s]/] },
  },
  '第三章-6': {
    pass: { id: 'C3-6-C', match: [/与庄晓曼跳舞/, /和庄晓曼跳舞/, /跳舞/, /^C[.、\s]/] },
    be: [{ id: 'C3-6-A', match: [/都不理会/, /^A[.、\s]/] }, { id: 'C3-6-B', match: [/追上方敏/, /^B[.、\s]/] }],
  },
  '第三章-7': {
    pass: { id: 'C3-7-A', match: [/你们打算制造谁死亡/, /制造谁死亡/, /会不会暴露我的身份/, /暴露我的身份/, /^A[.、\s]/, /^B[.、\s]/] },
  },
  '第三章-8': {
    pass: { id: 'C3-8-C', match: [/再考虑一下/, /再考虑/, /^C[.、\s]/] },
    be: [{ id: 'C3-8-A', match: [/断然拒绝/, /^A[.、\s]/] }, { id: 'C3-8-B', match: [/点头答应/, /^B[.、\s]/], forbidIfMatch: [/再考虑/] }],
  },
  '第三章-9': {
    be: [{ id: 'C3-9-A', match: [/辱骂/, /^A[.、\s]/] }, { id: 'C3-9-B', match: [/非礼/, /^B[.、\s]/] }],
  },
  '第三章-10': {
    pass: { id: 'C3-10-A', match: [/商贸团的人身安全遭到危害/, /人身安全遭到危害/, /商贸团.*安全/, /^A[.、\s]/], forbidIfMatch: [/丁力犀/, /杀掉商贸团/, /方敏/, /黄夫人/] },
  },
  '第三章-11': {
    pass: { id: 'C3-11-A', match: [/犯人必须和日本人有联系/, /必须和日本人有联系/, /日本人.*联系/, /^A[.、\s]/] },
  },
  '第三章-12': {
    pass: { id: 'C3-12-B', match: [/利用胡一彪/, /胡一彪/, /^B[.、\s]/] },
    be: [{ id: 'C3-12-A', match: [/利用丁力犀/, /丁力犀/, /^A[.、\s]/] }],
  },
  '第三章-13': {
    pass: { id: 'C3-13-B', match: [/有没有兴趣从商贸团身上捞一笔/, /捞一笔/, /商贸团.*捞/, /^B[.、\s]/] },
    be: [{ id: 'C3-13-A', match: [/能否帮我杀掉商贸团成员/, /杀掉商贸团成员/, /^A[.、\s]/] }],
  },
  '第三章-14': {
    pass: { id: 'C3-14-B', match: [/黄夫人/, /^B[.、\s]/], forbidIfMatch: [/方敏/, /龙老板/, /黄老板/] },
    be: [{ id: 'C3-14-A', match: [/方敏/, /^A[.、\s]/], forbidIfMatch: [/黄夫人/] }, { id: 'C3-14-C', match: [/龙老板/, /^C[.、\s]/] }, { id: 'C3-14-D', match: [/黄老板/, /^D[.、\s]/] }],
  },
  '第三章-15': {
    pass: { id: 'C3-15-A', match: [/不该听信胡队长/, /叫出黄夫人/, /听信胡队长/, /^A[.、\s]/] },
  },
  '第三章-16': {
    pass: { id: 'C3-16-A', match: [/交给胡一彪/, /布置妥当/, /勒索信/, /继续/, /^A[.、\s]/] },
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
  requireZibaoForHuang?: boolean;
  requireMainClear?: boolean;
};

const CHAPTER3_APPLY: Record<string, ApplySpec> = {
  'C3-0-A': { be: false, checkpoint: '第三章-1', node: '第三章-1' },
  'C3-1-A': { be: false, checkpoint: '第三章-2', node: '第三章-2', deltas: { '对user.庄晓曼.情感值': -1 } },
  'C3-1-B': { be: false, checkpoint: '第三章-2', node: '第三章-2', deltas: { '对user.庄晓曼.情感值': 1 } },
  'C3-2-A': { be: false, checkpoint: '第三章-3', node: '第三章-3', deltas: { '对user.庄晓曼.情感值': -1 } },
  'C3-2-B': { be: false, checkpoint: '第三章-3', node: '第三章-3', deltas: { '对user.庄晓曼.情感值': 1 } },
  'C3-3-A': { be: false, checkpoint: '第三章-4', node: '第三章-4', deltas: { '对user.庄晓曼.情感值': -1 } },
  'C3-3-B': { be: false, checkpoint: '第三章-4', node: '第三章-4', deltas: { '对user.庄晓曼.情感值': 3 } },
  'C3-4-A': { be: true, ending: '蔷薇之刺', checkpoint: '第三章-4', node: '第三章-4', unlock: 'BE-第三章-蔷薇之刺' },
  'C3-4-B': { be: false, checkpoint: '第三章-5', node: '第三章-5' },
  'C3-5-A': { be: false, checkpoint: '第三章-6', node: '第三章-6' },
  'C3-6-A': { be: true, ending: '铁血锄奸', checkpoint: '第三章-6', node: '第三章-6', unlock: 'BE-第三章-铁血锄奸' },
  'C3-6-B': { be: true, ending: '刀下亡魂', checkpoint: '第三章-6', node: '第三章-6', unlock: 'BE-第三章-刀下亡魂' },
  'C3-6-C': { be: false, checkpoint: '第三章-7', node: '第三章-7' },
  'C3-7-A': { be: false, checkpoint: '第三章-8', node: '第三章-8' },
  'C3-8-A': { be: true, ending: '铁血锄奸', checkpoint: '第三章-8', node: '第三章-8', unlock: 'BE-第三章-铁血锄奸' },
  'C3-8-B': { be: false, checkpoint: '第三章-9', node: '第三章-9' },
  'C3-8-C': { be: false, checkpoint: '第三章-10', node: '第三章-10' },
  'C3-9-A': { be: true, ending: '香消玉损', checkpoint: '第三章-9', node: '第三章-9', unlock: 'BE-第三章-香消玉损' },
  'C3-9-B': { be: true, ending: '色中恶鬼', checkpoint: '第三章-9', node: '第三章-9', unlock: 'BE-第三章-色中恶鬼' },
  'C3-10-A': { be: false, checkpoint: '第三章-11', node: '第三章-11' },
  'C3-11-A': { be: false, checkpoint: '第三章-12', node: '第三章-12' },
  'C3-12-A': { be: true, ending: '引火烧身', checkpoint: '第三章-12', node: '第三章-12', unlock: 'BE-第三章-引火烧身' },
  'C3-12-B': { be: false, checkpoint: '第三章-13', node: '第三章-13' },
  'C3-13-A': { be: true, ending: '香消玉损', checkpoint: '第三章-13', node: '第三章-13', unlock: 'BE-第三章-香消玉损' },
  'C3-13-B': { be: false, checkpoint: '第三章-14', node: '第三章-14' },
  'C3-14-A': { be: true, ending: '香消玉损', checkpoint: '第三章-14', node: '第三章-14', unlock: 'BE-第三章-香消玉损' },
  'C3-14-B': { be: false, checkpoint: '第三章-15', node: '第三章-15', requireZibaoForHuang: true },
  'C3-14-C': { be: true, ending: '香消玉损', checkpoint: '第三章-14', node: '第三章-14', unlock: 'BE-第三章-香消玉损' },
  'C3-14-D': { be: true, ending: '色中恶鬼', checkpoint: '第三章-14', node: '第三章-14', unlock: 'BE-第三章-色中恶鬼' },
  'C3-15-A': { be: false, checkpoint: '第三章-16', node: '第三章-16' },
  'C3-16-A': { be: false, checkpoint: '第四章-0', node: '第四章-0', chapter: '第四章', events: ['第三章-完成'], requireMainClear: true },
};

const CHAPTER3_PREWRITE_ID = 'yxsh-ch2-prewrite';
const CHOICE_FOOTER_ID = 'yxsh-ch2-choice-footer';

function formatBranches(optionLines: string): string {
  return `<branches>\n<details><summary>请选择</summary>\n${optionLines.trim()}\n</details>\n</branches>`;
}

const CHECKPOINT_CHOICE_LINES: Record<string, string> = {
  "第三章-0": "A. 第二号有什么指示吗？",
  "第三章-1": "A. 你也在跟踪我吗？\nB. ……找我有什么事？",
  "第三章-2": "A. 不置可否\nB. 点头承认",
  "第三章-3": "A. 拒绝回答\nB. 告诉庄晓曼全部情况",
  "第三章-4": "A. 开枪射杀庄晓曼\nB. 叫住她套取情报",
  "第三章-5": "A. 你是地下工作者吗？\nB. 你为什么会在这里？",
  "第三章-6": "A. 都不理会\nB. 追上方敏\nC. 与庄晓曼跳舞",
  "第三章-7": "A. 你们打算制造谁死亡\nB. 会不会暴露我的身份？",
  "第三章-8": "A. 断然拒绝\nB. 点头答应\nC. 再考虑一下",
  "第三章-9": "A. 辱骂\nB. 非礼",
  "第三章-10": "A. 商贸团的人身安全遭到危害",
  "第三章-11": "A. 犯人必须和日本人有联系",
  "第三章-12": "A. 利用丁力犀\nB. 利用胡一彪",
  "第三章-13": "A. 能否帮我杀掉商贸团成员\nB. 有没有兴趣从商贸团身上捞一笔",
  "第三章-14": "A. 方敏\nB. 黄夫人\nC. 龙老板\nD. 黄老板",
  "第三章-15": "A. 不该听信胡队长，叫出黄夫人",
  "第三章-16": "A. 继续布置绑架计划"
};

function norm(t: string) {
  return t.replace(/\s/g, '');
}

function matchRule(t: string, rule: { match: RegExp[]; forbidIfMatch?: RegExp[] }) {
  if (rule.forbidIfMatch?.some((p) => p.test(t))) return false;
  return rule.match.some((p) => p.test(t));
}

function detectChapter3Choice(node: string, userText: string): string | null {
  const rules = CHAPTER3_CHOICES[node];
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
function detectChapter3ChoiceGlobal(userText: string): string | null {
  for (const node of CHAPTER3_NODES) {
    const id = detectChapter3Choice(node, userText);
    if (id) return id;
  }
  return null;
}

function getStat(v: MvuPayload | undefined): Record<string, unknown> | null {
  const raw = v?.stat_data;
  return _.isPlainObject(raw) ? (raw as Record<string, unknown>) : null;
}

function isChapter3Active(plot: Record<string, unknown> | undefined): boolean {
  if (!plot || plot.已死亡 === true) return false;
  if (plot.当前章节 !== '第三章') return false;
  const events = plot.已触发事件;
  if (!Array.isArray(events)) return false;
  return (events as string[]).includes('第二章-完成');
}

function injectChoiceFooter(stat: Record<string, unknown>, appliedChoiceId: string | null) {
  const plot = stat.剧情 as Record<string, unknown> | undefined;
  if (!plot || !isChapter3Active(plot)) return;

  try {
    uninjectPrompts([CHOICE_FOOTER_ID]);
  } catch {
    /* ignore */
  }

  if (plot.已死亡 === true) {
    const cp = String(plot.检查点 || '第三章-1');
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
    console.info('[隐形守护者·第三章写死] 生成前注入 BE branches', cp);
    return;
  }

  if (appliedChoiceId && CHAPTER3_APPLY[appliedChoiceId]?.be) return;

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
  console.info('[隐形守护者·第三章写死] 生成前注入 branches', node);
}

function injectChapter3Prewrite(choiceId: string) {
  const spec = CHAPTER3_APPLY[choiceId];
  if (!spec) return;
  const tag = spec.be ? `BE·${spec.ending}` : `通过→${spec.node}`;
  const action = spec.be
    ? `**同楼 BE「${spec.ending}」**；必须 \`<yxsh_be>\`【结局 · ${spec.ending}】+ \`<branches>\`（检查点 ${spec.checkpoint} 原作选项）。禁止续演主线。`
    : `**通过** → 节点 ${spec.node}；禁止本楼 BE、禁止跳关。`;
  const content = `[第三章写死·本楼已锁定·${choiceId}·${tag}]\n本楼 ${choiceId}。${action}\n叙事与 JSONPatch 照《第三章抉择全书-写死表》。`;
  injectPrompts(
    [
      {
        id: CHAPTER3_PREWRITE_ID,
        position: 'in_chat',
        depth: 0,
        role: 'system',
        content,
      },
    ],
    { once: true },
  );
  console.info('[隐形守护者·第三章写死] 生成前注入', tag, choiceId);
}

/** 用户发消息后、主模型生成前：预写 MVU + 注入本楼写死指令 */
function runChapter3PrewriteBeforeGenerate(userText: string, userMessageId?: number) {
  const trimmed = userText.trim();
  if (!trimmed) return;

  const chatVars = getVariables({ type: 'chat' });
  const stat = getStat(chatVars as MvuPayload);
  if (!stat) return;
  const plot = stat.剧情 as Record<string, unknown> | undefined;
  if (!isChapter3Active(plot)) return;

  try {
    uninjectPrompts([CHAPTER3_PREWRITE_ID, CHOICE_FOOTER_ID]);
  } catch {
    /* ignore */
  }

  const choiceId = detectChapter3ChoiceGlobal(trimmed);
  if (!choiceId) {
    injectChoiceFooter(stat, null);
    return;
  }

  const prepared = prepareStatForChoice(stat, choiceId);
  const fixed = applyChoice(prepared, choiceId);
  persistStatToChat(fixed, userMessageId);
  injectChapter3Prewrite(choiceId);
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

function chapter3PlotBaseline(): Record<string, unknown> {
  return {
    当前章节: '第三章',
    章节进度: 0,
    当前节点: '第三章-0',
    序章已完成: true,
    主线归属: '',
    第二章分歧: '自保',
    第五章分歧: '',
    结局分支: '',
    已死亡: false,
    检查点: '第三章-0',
    已触发事件: ['第二章-完成'],
    已收集线索: ['第二章-自保的感慨'],
  };
}

const CHAPTER3_FORK_NODE = '第三章-14';
const CHAPTER3_ZIBAO_CLUE = '第二章-自保的感慨';

function syncChapter3RouteArtifacts(plot: Record<string, unknown>) {
  const fork = String(plot.第二章分歧 ?? '');
  const clues = Array.isArray(plot.已收集线索) ? [...(plot.已收集线索 as string[])] : [];
  const events = Array.isArray(plot.已触发事件) ? [...(plot.已触发事件 as string[])] : [];
  const without = (arr: string[]) => arr.filter((x) => x !== CHAPTER3_ZIBAO_CLUE);
  if (fork === '自保') {
    plot.已收集线索 = uniqPush(clues, CHAPTER3_ZIBAO_CLUE);
    plot.已触发事件 = uniqPush(events, CHAPTER3_ZIBAO_CLUE);
  } else {
    plot.已收集线索 = without(clues);
    plot.已触发事件 = without(events);
  }
}

function resetPlotToCheckpoint(plot: Record<string, unknown>, checkpoint: string) {
  const preservedFork = String(plot.第二章分歧 ?? '');
  const preservedClues = Array.isArray(plot.已收集线索) ? [...(plot.已收集线索 as string[])] : [];
  const preservedEvents = Array.isArray(plot.已触发事件) ? [...(plot.已触发事件 as string[])] : [];
  const cpIdx = chapter3NodeIndex(checkpoint);
  const forkIdx = chapter3NodeIndex(CHAPTER3_FORK_NODE);

  Object.assign(plot, chapter3PlotBaseline());
  plot.当前节点 = checkpoint;
  plot.检查点 = checkpoint;
  plot.已死亡 = false;
  plot.结局分支 = '';
  plot.章节进度 = 0;
  plot.序章已完成 = true;
  plot.当前章节 = '第三章';
  plot.已收集线索 = preservedClues;
  plot.已触发事件 = preservedEvents;

  if (preservedFork) plot.第二章分歧 = preservedFork;
  if (cpIdx >= forkIdx && preservedFork) syncChapter3RouteArtifacts(plot);
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
  console.info('[隐形守护者·第三章写死] 已去重 UpdateVariable', messageId, blocks.length, '→ 1');
  return true;
}

function getBranchesLinesForPlot(plot: Record<string, unknown>): string | null {
  if (!isChapter3Active(plot)) return null;
  if (plot.已死亡 === true) {
    const cp = String(plot.检查点 || '第三章-1');
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
    '[隐形守护者·第三章写死] 已补全 branches',
    messageId,
    plot?.已死亡 ? plot.检查点 : plot?.当前节点,
  );
  return true;
}

function isStaleForChoice(plot: Record<string, unknown>, choiceId: string): boolean {
  const home = CHOICE_HOME_NODE[choiceId];
  const node = String(plot.当前节点 ?? '');
  const spec = CHAPTER3_APPLY[choiceId];
  if (!spec || !home) return false;

  if (plot.已死亡 === true && !spec.be) return true;
  if (
    home &&
    CHAPTER3_NODES.indexOf(node as (typeof CHAPTER3_NODES)[number]) >
      CHAPTER3_NODES.indexOf(home as (typeof CHAPTER3_NODES)[number])
  ) {
    return true;
  }
  return plotMismatch(plot, choiceId);
}

function plotMismatch(plot: Record<string, unknown>, choiceId: string): boolean {
  const spec = CHAPTER3_APPLY[choiceId];
  if (!spec) return false;
  if (spec.be) return plot.已死亡 !== true || plot.结局分支 !== spec.ending;
  if (choiceId === 'C3-16-A') {
    return plot.当前章节 !== '第四章' || plot.当前节点 !== '第四章-0';
  }
  if (choiceId === 'C3-14-B') {
    const fork = String(plot.第二章分歧 ?? '');
    const clues = plot.已收集线索 as string[] | undefined;
    const hasZibaoClue = Array.isArray(clues) && clues.includes('第二章-自保的感慨');
    if (fork !== '自保' || !hasZibaoClue) {
      return plot.已死亡 !== true || plot.结局分支 !== '生死归途';
    }
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
  const spec = CHAPTER3_APPLY[choiceId];
  if (!spec) return base;

  plot.已触发事件 = Array.isArray(plot.已触发事件) ? [...(plot.已触发事件 as string[])] : [];
  plot.已收集线索 = Array.isArray(plot.已收集线索) ? [...(plot.已收集线索 as string[])] : [];
  plot.已解锁死亡结局 = Array.isArray(plot.已解锁死亡结局) ? [...(plot.已解锁死亡结局 as string[])] : [];
  plot.章节进度 = (Number(plot.章节进度) || 0) + 1;

  if (choiceId === 'C3-16-A') {
    applyDeltas(base, spec.deltas);
    const zm = Number(_.get(base, '对user.庄晓曼.情感值')) || 0;
    const fork = String(plot.第二章分歧 ?? '');
    const clues = plot.已收集线索 as string[] | undefined;
    const hasZibaoClue = Array.isArray(clues) && clues.includes('第二章-自保的感慨');
    const mainOk = fork === '自保' && hasZibaoClue && zm >= 7;
    if (!mainOk) {
      plot.已死亡 = true;
      plot.结局分支 = hasZibaoClue && fork === '自保' && zm < 7 ? '信口雌黄' : '生死归途';
      plot.当前节点 = '第三章-16';
      plot.检查点 = '第三章-16';
      const unlockId = plot.结局分支 === '信口雌黄' ? 'BE-第三章-信口雌黄' : 'BE-第三章-生死归途';
      plot.已解锁死亡结局 = uniqPush(plot.已解锁死亡结局 as string[], unlockId);
      return base;
    }
    plot.当前章节 = '第四章';
    plot.当前节点 = '第四章-0';
    plot.检查点 = '第四章-0';
    plot.章节进度 = 0;
    plot.已死亡 = false;
    plot.结局分支 = '';
    plot.已触发事件 = uniqPush(plot.已触发事件 as string[], '第三章-完成');
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
    if (spec.requireZibaoForHuang) {
      const fork = String(plot.第二章分歧 ?? '');
      const clues = plot.已收集线索 as string[] | undefined;
      const hasZibaoClue = Array.isArray(clues) && clues.includes('第二章-自保的感慨');
      if (fork !== '自保' || !hasZibaoClue) {
        plot.已死亡 = true;
        plot.结局分支 = '生死归途';
        plot.当前节点 = '第三章-14';
        plot.检查点 = '第三章-14';
        plot.已解锁死亡结局 = uniqPush(plot.已解锁死亡结局 as string[], 'BE-第三章-生死归途');
        applyDeltas(base, spec.deltas);
        return base;
      }
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
  const home = CHOICE_HOME_NODE[choiceId] ?? '第三章-1';

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

function chapter3NodeIndex(nodeId: string): number {
  const i = CHAPTER3_NODES.indexOf(nodeId as (typeof CHAPTER3_NODES)[number]);
  return i < 0 ? -1 : i;
}

/** 禁止当前节点领先检查点、禁止无点选一次跳多格 */
function clampChapter3PlotAdvance(
  plot: Record<string, unknown>,
  before: Record<string, unknown> | undefined,
  choiceId: string | null,
) {
  const ni = chapter3NodeIndex(String(plot.当前节点 ?? ''));
  const ci = chapter3NodeIndex(String(plot.检查点 ?? ''));
  if (ni >= 0 && ci >= 0 && ni > ci) plot.当前节点 = plot.检查点;

  if (!choiceId && before) {
    const oi = chapter3NodeIndex(String(before.当前节点 ?? ''));
    if (ni >= 0 && oi >= 0 && ni > oi + 1) {
      plot.当前节点 = before.当前节点;
      const bci = chapter3NodeIndex(String(before.检查点 ?? ''));
      if (ci > bci) plot.检查点 = before.检查点 ?? before.当前节点;
    }
  }
}

export function enforceChapter3Write(newVariables: MvuPayload, old: MvuPayload): string[] {
  const stat = getStat(newVariables);
  if (!stat) return [];
  const plot = stat.剧情 as Record<string, unknown> | undefined;
  if (!isChapter3Active(plot)) return [];

  const userText = getLastUserText();
  const choiceId = userText.trim() ? detectChapter3ChoiceGlobal(userText) : null;
  const oldStat = getStat(old);
  const beforePlot = (oldStat?.剧情 ?? {}) as Record<string, unknown>;

  const sanitized = sanitizeStatData(stat);
  const p = (sanitized.剧情 ??= {}) as Record<string, unknown>;
  clampChapter3PlotAdvance(p, beforePlot, choiceId);

  if (!choiceId) {
    const fixes: string[] = [];
    const rel = rollbackRelationFromOld(sanitized, oldStat);
    if (rel) fixes.push(rel);
    const oldFork = beforePlot.第二章分歧;
    if (oldFork && p.第二章分歧 !== oldFork) {
      p.第二章分歧 = oldFork;
      syncChapter3RouteArtifacts(p);
      fixes.push('第三章：已回滚擅自修改的第二章分歧');
    }
    _.set(newVariables, 'stat_data', sanitized);
    const ni = chapter3NodeIndex(String(p.当前节点));
    const ci = chapter3NodeIndex(String(p.检查点));
    if (ni > ci) fixes.push('第三章：已回退超前节点至检查点');
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

  const msg = `第三章写死：${String(plot!.当前节点)}→${choiceId}（已清脏变量）`;
  console.warn('[隐形守护者·第三章写死]', msg, { userText: userText.slice(0, 80) });
  try {
    toastr?.warning?.(msg, '第三章选项写死');
  } catch {
    /* ignore */
  }
  return [msg];
}

function syncMessageVariablesFromChat() {
  const chatVars = getVariables({ type: 'chat' });
  if (!_.isPlainObject(chatVars?.stat_data)) return;
  const payload: MvuPayload = { stat_data: _.cloneDeep(chatVars.stat_data) };
  const fixes = enforceChapter3Write(payload, {});
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
      enforceChapter3Write(vars, {});
      replaceVariables(vars, { type: 'chat' });
      return;
    }
  }
  const fresh: MvuPayload = {
    stat_data: {
      剧情: chapter3PlotBaseline(),
    },
  };
  replaceVariables(fresh, { type: 'chat' });
  replaceVariables(fresh, { type: 'message', message_id: id });
}

$(() => {
  errorCatched(async () => {
    await waitGlobalInitialized('Mvu');

    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (variables, variables_before) => {
      enforceChapter3Write(variables, variables_before);
      const lastId = getLastMessageId();
      setTimeout(() => {
        dedupeUpdateVariableBlocks(lastId);
        ensureMessageBranchesBlock(lastId);
      }, 80);
    });

    eventOn(tavern_events.MESSAGE_SENT, (message_id) => {
      const [msg] = getChatMessages(message_id);
      if (!msg?.is_user) return;
      runChapter3PrewriteBeforeGenerate(String(msg.message ?? ''), message_id);
    });

    eventOn(tavern_events.GENERATION_AFTER_COMMANDS, (_type, _option, dry_run) => {
      if (dry_run) return;
      runChapter3PrewriteBeforeGenerate(getLastUserText());
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

    console.info('[隐形守护者] 第三章写死强制（二十七选+自动补 branches）已启用');
  })();
});

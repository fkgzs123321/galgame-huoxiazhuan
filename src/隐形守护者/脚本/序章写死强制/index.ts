/** 序章 12 选 MVU 强制（单文件 · 自动补 branches） */
type MvuPayload = { stat_data?: Record<string, unknown> };

const PROLOGUE_NODES = ['序章-1', '序章-2', '序章-3', '序章-4', '序章-5'] as const;

const CHOICE_HOME_NODE: Record<string, string> = {
  'P1-A': '序章-1',
  'P1-B': '序章-1',
  'P2-A': '序章-2',
  'P2-B': '序章-2',
  'P3-A': '序章-3',
  'P3-B': '序章-3',
  'P3-C': '序章-3',
  'P4-A': '序章-4',
  'P4-B': '序章-4',
  'P5-A': '序章-5',
  'P5-B': '序章-5',
  'P5-C': '序章-5',
};

const BRIEFING = [
  '序章-基地简报-纪律',
  '序章-基地简报-形势',
  '序章-基地简报-代号',
  '序章-基地简报-方敏安排',
];

const PROLOGUE_CHOICES: Record<string, { pass?: unknown; be?: unknown }> = {
  '序章-1': {
    pass: {
      id: 'P1-A',
      match: [/保持沉默/, /^A[.、\s]*保持沉默/, /选择A/, /选A/, /^A[.、\s]/],
      forbidIfMatch: [/另有隐情/, /不是我/, /辩白/, /听我解释/, /绝非我所为/, /老师不是我/],
    },
    be: [{ id: 'P1-B', match: [/老师不是我/, /另有隐情/, /听我辩白/, /绝非我所为/, /听我解释/, /^B[.、\s]/, /选择B/, /选B/] }],
  },
  '序章-2': {
    pass: {
      id: 'P2-A',
      match: [/都已经过去了/, /问那么多干嘛/, /^A[.、\s]*都已经/, /^A[.、\s]/],
      forbidIfMatch: [/不是我干的/, /请你相信我/, /保持沉默/],
    },
    be: [{ id: 'P2-B', match: [/不是我干的/, /请你相信我/, /^B[.、\s]/] }],
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
    pass: { id: 'P4-A', match: [/再呆一会儿/, /再等/, /^A[.、\s]*再呆/] },
    be: [{ id: 'P4-B', match: [/我还是回去吧/, /回去吧/, /^B[.、\s]/] }],
  },
  '序章-5': {
    pass: [
      { id: 'P5-C', match: [/入党申请书/, /取申请书/, /^C[.、\s]/] },
      { id: 'P5-A', match: [/逐一了解/, /^A[.、\s]*逐一/] },
    ],
    be: [{ id: 'P5-B', match: [/跳过了解/, /直接要任务/, /^B[.、\s]/] }],
  },
};

const PROLOGUE_APPLY: Record<
  string,
  {
    be: boolean;
    ending?: string;
    checkpoint: string;
    node: string;
    events?: string[];
    clues?: string[];
    unlock?: string;
    task?: string;
    deltas?: Record<string, number>;
  }
> = {
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
  'P5-A': { be: false, checkpoint: '序章-5', node: '序章-5' },
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
    events: ['序章-完成'],
    clues: ['入党申请书'],
    task: '打入武藤公馆，建立长期潜伏身份',
  },
};

/** 生成前注入（MESSAGE_SENT / GENERATION_AFTER_COMMANDS），让主模型本楼就知道写死/BE */
const PROLOGUE_PREWRITE_ID = 'yxsh-prologue-prewrite';
const CHOICE_FOOTER_ID = 'yxsh-prologue-choice-footer';

const PROLOGUE_CHOICE_FOOTER: Record<string, string> = {
  '序章-1': '**【请选择】**（仅 2 项）\nA. 保持沉默\nB. 老师不是我！一定另有隐情！',
  '序章-2': '**【请选择】**（仅 2 项）\nA. 都已经过去了，问那么多干嘛\nB. 不是我干的！请你相信我',
  '序章-3':
    '**【请选择】**（仅 3 项）\nA. 去图书馆看看书\nB. 回到旅馆好好休息\nC. 去酒馆喝酒，忘掉今天的烦心事',
  '序章-4': '**【请选择】**（仅 2 项）\nA. 再呆一会儿\nB. 我还是回去吧',
  '序章-5':
    '**【请选择】**\nA. 逐一了解\nB. 跳过了解，直接要任务\nC. 取入党申请书',
};

function formatBranches(optionLines: string): string {
  return `<branches>\n<details><summary>请选择</summary>\n${optionLines.trim()}\n</details>\n</branches>`;
}

const CHECKPOINT_CHOICE_LINES: Record<string, string> = {
  '序章-1': 'A. 保持沉默\nB. 老师不是我！一定另有隐情！',
  '序章-2': 'A. 都已经过去了，问那么多干嘛\nB. 不是我干的！请你相信我',
  '序章-3': 'A. 去图书馆看看书\nB. 回到旅馆好好休息\nC. 去酒馆喝酒，忘掉今天的烦心事',
  '序章-4': 'A. 再呆一会儿\nB. 我还是回去吧',
  '序章-5': 'A. 逐一了解\nB. 跳过了解，直接要任务\nC. 取入党申请书',
};

const PROLOGUE_PREWRITE_INJECT: Record<string, string> = {
  'P1-A': `本楼 **P1-A 保持沉默**。同楼写完方汉洲当众怒骂+赶人（须含「滚回去读书」类台词）→ 可提箱离弄堂，节点进序章-2。
禁止：辩解过关、本楼 BE、【结局·】标题、序章-3 三选一、图书馆接头。`,
  'P1-B': `本楼 **P1-B 辩解** → **同楼 BE「新的征程」**，本线已断。
叙事：辩解失控→方汉洲震怒/方敏惊退/邻居议论→被赶出弄堂→孤身夜街收束。
必须：\`<yxsh_be>\` 块写【结局 · 新的征程】+ 文末 \`<branches>\` 含序章-1 选项 A/B 原文。
禁止：写 P1-A 沉默过关链（赶人读书→提箱上街进序章-2）；禁止序章-2~5；禁止【请选择】去向；禁止图书馆/旅馆/酒馆/睡醒续玩；禁止「几个去向在脑海中成型」类开放式结尾。`,
  'P2-A': `本楼 **P2-A** → 同楼收束方敏追问后进入序章-3 三选一前奏，节点→序章-3。
禁止：本楼 BE、序章-4/5、图书馆接头。`,
  'P2-B': `本楼 **P2-B** → **同楼 BE「赤诚之道」**。
必须：\`<yxsh_be>\`【结局 · 赤诚之道】+ \`<branches>\` 序章-2 选项列表。
禁止：序章-3~5、【请选择】、图书馆/接头。`,
  'P3-A': `本楼 **P3-A 图书馆** → 同楼写到接头/等待，节点→序章-4（须有图书馆接头事件）。
禁止：本楼 BE、旅馆/酒馆线、序章-5 秘密基地（除非已走完 P4）。`,
  'P3-B': `本楼 **P3-B 旅馆** → **同楼 BE「好梦还乡」**。
必须：\`<yxsh_be>\`【结局 · 好梦还乡】+ \`<branches>\` 序章-3 选项列表。
禁止：睡醒去图书馆、序章-4/5、任何【请选择】。`,
  'P3-C': `本楼 **P3-C 酒馆** → **同楼 BE「匹夫之刃」**。
必须：\`<yxsh_be>\`【结局 · 匹夫之刃】+ \`<branches>\` 序章-3 选项列表。
禁止：图书馆/序章-4/5、【请选择】。`,
  'P4-A': `本楼 **P4-A** → 同楼图书馆等待后节点→序章-5。
禁止：本楼 BE、提前入党/第一章。`,
  'P4-B': `本楼 **P4-B** → **同楼 BE「随波逐流」**。
必须：\`<yxsh_be>\`【结局 · 随波逐流】+ \`<branches>\` 序章-4 选项列表。
禁止：序章-5/秘密基地、【请选择】。`,
  'P5-A': `本楼 **P5-A 逐一了解** → 同楼只追加一条基地简报，停留序章-5；勿跳第一章。
禁止：本楼 BE、一次写满四条简报。`,
  'P5-B': `本楼 **P5-B** → 同楼写任务失败/回退，仍留序章-5；非 BE。
禁止：进第一章、本楼【结局·】标题。`,
  'P5-C': `本楼 **P5-C** → 同楼完成入党申请书后序章通关→第一章-0。
禁止：中途 BE、回退序章-3 三选一。`,
};

function norm(t: string) {
  return t.replace(/\s/g, '');
}

function matchRule(t: string, rule: { match: RegExp[]; forbidIfMatch?: RegExp[] }) {
  if (rule.forbidIfMatch?.some((p) => p.test(t))) return false;
  return rule.match.some((p) => p.test(t));
}

function detectPrologueChoice(node: string, userText: string): string | null {
  const rules = PROLOGUE_CHOICES[node];
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

/** 按节点顺序匹配，避免「A. 保持沉默」在脏节点=序章-3 时被当成 P3-A */
function detectChoiceGlobal(userText: string): string | null {
  for (const node of PROLOGUE_NODES) {
    const id = detectPrologueChoice(node, userText);
    if (id) return id;
  }
  return null;
}

function getStat(v: MvuPayload | undefined): Record<string, unknown> | null {
  const raw = v?.stat_data;
  return _.isPlainObject(raw) ? (raw as Record<string, unknown>) : null;
}

function isPrologueActive(plot: Record<string, unknown> | undefined): boolean {
  if (!plot || plot.序章已完成 === true) return false;
  return plot.当前章节 === '序章' || String(plot.当前节点 ?? '').startsWith('序章');
}

function injectChoiceFooter(stat: Record<string, unknown>, appliedChoiceId: string | null) {
  const plot = stat.剧情 as Record<string, unknown> | undefined;
  if (!plot || !isPrologueActive(plot)) return;

  try {
    uninjectPrompts([CHOICE_FOOTER_ID]);
  } catch {
    /* ignore */
  }

  if (plot.已死亡 === true) {
    const cp = String(plot.检查点 || '序章-1');
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
    console.info('[隐形守护者·序章写死] 生成前注入 BE branches', cp);
    return;
  }

  if (appliedChoiceId && PROLOGUE_APPLY[appliedChoiceId]?.be) return;

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
  console.info('[隐形守护者·序章写死] 生成前注入 branches', node);
}

function injectProloguePrewrite(choiceId: string) {
  if (!PROLOGUE_PREWRITE_INJECT[choiceId]) return;
  const spec = PROLOGUE_APPLY[choiceId];
  const tag = spec.be ? `BE·${spec.ending}` : `通过→${spec.node}`;
  const content = `[序章写死·本楼已锁定·${choiceId}·${tag}]\n${PROLOGUE_PREWRITE_INJECT[choiceId]}`;
  injectPrompts(
    [
      {
        id: PROLOGUE_PREWRITE_ID,
        position: 'in_chat',
        depth: 0,
        role: 'system',
        content,
      },
    ],
    { once: true },
  );
  console.info('[隐形守护者·序章写死] 生成前注入', tag, choiceId);
}

/** 用户发消息后、主模型生成前：预写 MVU + 注入本楼写死指令 */
function runProloguePrewriteBeforeGenerate(userText: string, userMessageId?: number) {
  const trimmed = userText.trim();
  if (!trimmed) return;

  const chatVars = getVariables({ type: 'chat' });
  const stat = getStat(chatVars as MvuPayload);
  if (!stat) return;
  const plot = stat.剧情 as Record<string, unknown> | undefined;
  if (!isPrologueActive(plot)) return;

  try {
    uninjectPrompts([PROLOGUE_PREWRITE_ID, CHOICE_FOOTER_ID]);
  } catch {
    /* ignore */
  }

  const choiceId = detectChoiceGlobal(trimmed);
  if (!choiceId) {
    injectChoiceFooter(stat, null);
    return;
  }

  const prepared = prepareStatForChoice(sanitizeStatData(stat), choiceId);
  const fixed = sanitizeStatData(applyChoice(prepared, choiceId));
  persistStatToChat(fixed, userMessageId);
  injectProloguePrewrite(choiceId);
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

function prologuePlotBaseline(): Record<string, unknown> {
  return {
    当前章节: '序章',
    章节进度: 0,
    当前节点: '序章-1',
    序章已完成: false,
    主线归属: '',
    第二章分歧: '',
    第五章分歧: '',
    结局分支: '',
    已死亡: false,
    检查点: '序章-1',
    已触发事件: [],
    已收集线索: [],
  };
}

function resetPlotToCheckpoint(plot: Record<string, unknown>, checkpoint: string) {
  Object.assign(plot, prologuePlotBaseline());
  plot.当前节点 = checkpoint;
  plot.检查点 = checkpoint;
  plot.已死亡 = false;
  plot.结局分支 = '';
  plot.章节进度 = 0;
  plot.序章已完成 = false;
  plot.当前章节 = checkpoint.startsWith('第一章') ? '第一章' : '序章';
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
  console.info('[隐形守护者·序章写死] 已去重 UpdateVariable', messageId, blocks.length, '→ 1');
  return true;
}

function getBranchesLinesForPlot(plot: Record<string, unknown>): string | null {
  if (!isPrologueActive(plot)) return null;
  if (plot.已死亡 === true) {
    const cp = String(plot.检查点 || '序章-1');
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
    '[隐形守护者·序章写死] 已补全 branches',
    messageId,
    plot?.已死亡 ? plot.检查点 : plot?.当前节点,
  );
  return true;
}

function isStaleForChoice(plot: Record<string, unknown>, choiceId: string): boolean {
  const home = CHOICE_HOME_NODE[choiceId];
  const node = String(plot.当前节点 ?? '');
  const spec = PROLOGUE_APPLY[choiceId];
  if (!spec || !home) return false;

  if ((choiceId === 'P1-A' || choiceId === 'P1-B') && countUserTurns() <= 1) return true;
  if (plot.已死亡 === true && !spec.be) return true;
  if (choiceId === 'P1-A' || choiceId === 'P1-B') {
    if (node !== '序章-1' && node !== '序章-2') return true;
    if (plot.已死亡 === true) return true;
  }
  if (home && PROLOGUE_NODES.indexOf(node as (typeof PROLOGUE_NODES)[number]) > PROLOGUE_NODES.indexOf(home as (typeof PROLOGUE_NODES)[number])) {
    return true;
  }
  return plotMismatch(plot, choiceId);
}

function plotMismatch(plot: Record<string, unknown>, choiceId: string): boolean {
  const spec = PROLOGUE_APPLY[choiceId];
  if (!spec) return false;
  if (spec.be) return plot.已死亡 !== true || plot.结局分支 !== spec.ending;
  if (choiceId === 'P3-A') {
    const ev = plot.已触发事件 as string[] | undefined;
    return plot.当前节点 !== '序章-4' || !ev?.some((e) => String(e).includes('图书馆接头'));
  }
  if (choiceId === 'P1-A') return plot.当前节点 !== '序章-2' || plot.已死亡 === true;
  if (choiceId === 'P5-C') {
    const clues = plot.已收集线索 as string[] | undefined;
    const okBrief = BRIEFING.every((k) => clues?.includes(k));
    return !okBrief || plot.序章已完成 !== true || plot.当前节点 !== '第一章-0';
  }
  if (choiceId === 'P5-A' || choiceId === 'P5-B') return plot.当前节点 !== '序章-5';
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
  const spec = PROLOGUE_APPLY[choiceId];
  if (!spec) return base;

  plot.已触发事件 = Array.isArray(plot.已触发事件) ? [...(plot.已触发事件 as string[])] : [];
  plot.已收集线索 = Array.isArray(plot.已收集线索) ? [...(plot.已收集线索 as string[])] : [];
  plot.已解锁死亡结局 = Array.isArray(plot.已解锁死亡结局) ? [...(plot.已解锁死亡结局 as string[])] : [];
  plot.章节进度 = 0;

  if (choiceId === 'P5-A') {
    const clues = plot.已收集线索 as string[];
    const next = BRIEFING.find((k) => !clues.includes(k));
    if (next) plot.已收集线索 = uniqPush(clues, next);
    plot.当前节点 = '序章-5';
    plot.检查点 = '序章-5';
    return base;
  }

  if (choiceId === 'P5-C') {
    const clues = plot.已收集线索 as string[];
    if (!BRIEFING.every((k) => clues.includes(k))) {
      plot.当前节点 = '序章-5';
      plot.检查点 = '序章-5';
      return base;
    }
    plot.当前章节 = '第一章';
    plot.序章已完成 = true;
    plot.当前节点 = '第一章-0';
    plot.检查点 = '第一章-0';
    plot.章节进度 = 0;
    plot.已死亡 = false;
    plot.结局分支 = '';
    plot.已触发事件 = uniqPush(plot.已触发事件 as string[], '序章-完成');
    plot.已收集线索 = uniqPush(clues, '入党申请书');
    const org = (base.组织 ??= {}) as Record<string, unknown>;
    org.当前任务 = spec.task ?? org.当前任务;
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
  const home = CHOICE_HOME_NODE[choiceId] ?? '序章-1';

  if (choiceId === 'P1-A' || choiceId === 'P1-B') {
    const base = _.cloneDeep(stat);
    const p = (base.剧情 ??= {}) as Record<string, unknown>;
    const keepUnlock = Array.isArray(p.已解锁死亡结局) ? [...(p.已解锁死亡结局 as string[])] : [];
    Object.assign(p, prologuePlotBaseline());
    p.已解锁死亡结局 = keepUnlock;
    return base;
  }

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

/** 删除 schema 外字段；与第一章写死强制一致 */
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

function prologueNodeIndex(nodeId: string): number {
  const i = PROLOGUE_NODES.indexOf(nodeId as (typeof PROLOGUE_NODES)[number]);
  return i < 0 ? -1 : i;
}

function clampProloguePlotAdvance(
  plot: Record<string, unknown>,
  before: Record<string, unknown> | undefined,
  choiceId: string | null,
) {
  const ni = prologueNodeIndex(String(plot.当前节点 ?? ''));
  const ci = prologueNodeIndex(String(plot.检查点 ?? ''));
  if (ni >= 0 && ci >= 0 && ni > ci) plot.当前节点 = plot.检查点;

  if (!choiceId && before) {
    const oi = prologueNodeIndex(String(before.当前节点 ?? ''));
    if (ni >= 0 && oi >= 0 && ni > oi + 1) {
      plot.当前节点 = before.当前节点;
      const bci = prologueNodeIndex(String(before.检查点 ?? ''));
      if (ci > bci) plot.检查点 = before.检查点 ?? before.当前节点;
    }
  }
}

export function enforcePrologueWrite(newVariables: MvuPayload, old: MvuPayload): string[] {
  const stat = getStat(newVariables);
  if (!stat) return [];
  const plot = stat.剧情 as Record<string, unknown> | undefined;
  if (!plot || plot.序章已完成 === true) return [];
  if (plot.当前章节 !== '序章' && !String(plot.当前节点 ?? '').startsWith('序章')) return [];

  const userText = getLastUserText();
  const choiceId = userText.trim() ? detectChoiceGlobal(userText) : null;
  const oldStat = getStat(old);
  const beforePlot = (oldStat?.剧情 ?? {}) as Record<string, unknown>;

  const sanitized = sanitizeStatData(stat);
  const p = (sanitized.剧情 ??= {}) as Record<string, unknown>;
  clampProloguePlotAdvance(p, beforePlot, choiceId);

  if (!choiceId) {
    const fixes: string[] = [];
    const rel = rollbackRelationFromOld(sanitized, oldStat);
    if (rel) fixes.push(rel);
    _.set(newVariables, 'stat_data', sanitized);
    const ni = prologueNodeIndex(String(p.当前节点));
    const ci = prologueNodeIndex(String(p.检查点));
    if (ni > ci) fixes.push('序章：已回退超前节点至检查点');
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

  const msg = `序章写死：${String(p.当前节点)}→${choiceId}（已清脏变量）`;
  console.warn('[隐形守护者·序章写死]', msg, { userText: userText.slice(0, 80) });
  try {
    toastr?.warning?.(msg, '序章选项写死');
  } catch {
    /* ignore */
  }
  return [msg];
}

function syncMessageVariablesFromChat() {
  const chatVars = getVariables({ type: 'chat' });
  if (!_.isPlainObject(chatVars?.stat_data)) return;
  const payload: MvuPayload = { stat_data: _.cloneDeep(chatVars.stat_data) };
  const fixes = enforcePrologueWrite(payload, {});
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
      enforcePrologueWrite(vars, {});
      replaceVariables(vars, { type: 'chat' });
      return;
    }
  }
  const fresh: MvuPayload = {
    stat_data: {
      剧情: prologuePlotBaseline(),
    },
  };
  replaceVariables(fresh, { type: 'chat' });
  replaceVariables(fresh, { type: 'message', message_id: id });
}

$(() => {
  errorCatched(async () => {
    await waitGlobalInitialized('Mvu');

    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (variables, variables_before) => {
      enforcePrologueWrite(variables, variables_before);
      const lastId = getLastMessageId();
      setTimeout(() => {
        dedupeUpdateVariableBlocks(lastId);
        ensureMessageBranchesBlock(lastId);
      }, 80);
    });

    eventOn(tavern_events.MESSAGE_SENT, (message_id) => {
      const [msg] = getChatMessages(message_id);
      if (!msg?.is_user) return;
      runProloguePrewriteBeforeGenerate(String(msg.message ?? ''), message_id);
    });

    eventOn(tavern_events.GENERATION_AFTER_COMMANDS, (_type, _option, dry_run) => {
      if (dry_run) return;
      runProloguePrewriteBeforeGenerate(getLastUserText());
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

    console.info('[隐形守护者] 序章写死强制（12选+自动补 branches）已启用');
  })();
});

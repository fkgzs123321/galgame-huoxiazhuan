/** 第三章·生死途 · 唯一真相源（校验脚本与 MVU 强制共用） */
import {
  GATE_ZHUANG_EMOTION_CH3_MAIN,
  REL_EMOTION_MAX,
  REL_EMOTION_MIN,
} from './relation-scale.mjs';

export const ZIBAO_CLUE = '第二章-自保的感慨';

export const CHAPTER3_NODES = [
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
];

export const CHAPTER3_CHOICE_HOME = {
  'C3-0-A': '第三章-0',
  'C3-1-A': '第三章-1',
  'C3-1-B': '第三章-1',
  'C3-2-A': '第三章-2',
  'C3-2-B': '第三章-2',
  'C3-3-A': '第三章-3',
  'C3-3-B': '第三章-3',
  'C3-4-A': '第三章-4',
  'C3-4-B': '第三章-4',
  'C3-5-A': '第三章-5',
  'C3-6-A': '第三章-6',
  'C3-6-B': '第三章-6',
  'C3-6-C': '第三章-6',
  'C3-7-A': '第三章-7',
  'C3-8-A': '第三章-8',
  'C3-8-B': '第三章-8',
  'C3-8-C': '第三章-8',
  'C3-9-A': '第三章-9',
  'C3-9-B': '第三章-9',
  'C3-10-A': '第三章-10',
  'C3-11-A': '第三章-11',
  'C3-12-A': '第三章-12',
  'C3-12-B': '第三章-12',
  'C3-13-A': '第三章-13',
  'C3-13-B': '第三章-13',
  'C3-14-A': '第三章-14',
  'C3-14-B': '第三章-14',
  'C3-14-C': '第三章-14',
  'C3-14-D': '第三章-14',
  'C3-15-A': '第三章-15',
  'C3-16-A': '第三章-16',
};

export const CHAPTER3_CHOICES = {
  '第三章-0': {
    pass: {
      id: 'C3-0-A',
      match: [/第二号/, /有什么指示/, /指示吗/, /^A[.、\s]/],
    },
  },
  '第三章-1': {
    pass: [
      { id: 'C3-1-A', match: [/你也在跟踪/, /跟踪我/, /^A[.、\s]/] },
      { id: 'C3-1-B', match: [/找我有什么事/, /有什么事/, /^B[.、\s]/], forbidIfMatch: [/跟踪/] },
    ],
  },
  '第三章-2': {
    pass: [
      { id: 'C3-2-A', match: [/不置可否/, /^A[.、\s]/], forbidIfMatch: [/点头承认/] },
      { id: 'C3-2-B', match: [/点头承认/, /^B[.、\s]/] },
    ],
  },
  '第三章-3': {
    pass: [
      { id: 'C3-3-A', match: [/拒绝回答/, /^A[.、\s]/], forbidIfMatch: [/告诉庄/, /全部情况/] },
      { id: 'C3-3-B', match: [/告诉庄晓曼全部情况/, /告诉庄晓曼/, /全部情况/, /^B[.、\s]/] },
    ],
  },
  '第三章-4': {
    pass: { id: 'C3-4-B', match: [/叫住她套取情报/, /叫住她/, /套取情报/, /^B[.、\s]/] },
    be: [{ id: 'C3-4-A', match: [/开枪射杀庄晓曼/, /开枪射杀/, /射杀庄/, /^A[.、\s]/] }],
  },
  '第三章-5': {
    pass: {
      id: 'C3-5-A',
      match: [/地下工作者/, /你为什么会在这里/, /为什么会在这里/, /^A[.、\s]/, /^B[.、\s]/],
    },
  },
  '第三章-6': {
    pass: { id: 'C3-6-C', match: [/与庄晓曼跳舞/, /和庄晓曼跳舞/, /跳舞/, /^C[.、\s]/] },
    be: [
      { id: 'C3-6-A', match: [/都不理会/, /^A[.、\s]/] },
      { id: 'C3-6-B', match: [/追上方敏/, /^B[.、\s]/] },
    ],
  },
  '第三章-7': {
    pass: {
      id: 'C3-7-A',
      match: [
        /你们打算制造谁死亡/,
        /制造谁死亡/,
        /会不会暴露我的身份/,
        /暴露我的身份/,
        /^A[.、\s]/,
        /^B[.、\s]/,
      ],
    },
  },
  '第三章-8': {
    pass: { id: 'C3-8-C', match: [/再考虑一下/, /再考虑/, /^C[.、\s]/] },
    be: [
      { id: 'C3-8-A', match: [/断然拒绝/, /^A[.、\s]/] },
      { id: 'C3-8-B', match: [/点头答应/, /^B[.、\s]/], forbidIfMatch: [/再考虑/] },
    ],
  },
  '第三章-9': {
    be: [
      { id: 'C3-9-A', match: [/辱骂/, /^A[.、\s]/] },
      { id: 'C3-9-B', match: [/非礼/, /^B[.、\s]/] },
    ],
  },
  '第三章-10': {
    pass: {
      id: 'C3-10-A',
      match: [/商贸团的人身安全遭到危害/, /人身安全遭到危害/, /商贸团.*安全/, /^A[.、\s]/],
      forbidIfMatch: [/丁力犀/, /杀掉商贸团/, /方敏/, /黄夫人/],
    },
  },
  '第三章-11': {
    pass: {
      id: 'C3-11-A',
      match: [/犯人必须和日本人有联系/, /必须和日本人有联系/, /日本人.*联系/, /^A[.、\s]/],
    },
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
    be: [
      { id: 'C3-14-A', match: [/方敏/, /^A[.、\s]/], forbidIfMatch: [/黄夫人/] },
      { id: 'C3-14-C', match: [/龙老板/, /^C[.、\s]/] },
      { id: 'C3-14-D', match: [/黄老板/, /^D[.、\s]/] },
    ],
  },
  '第三章-15': {
    pass: {
      id: 'C3-15-A',
      match: [/不该听信胡队长/, /叫出黄夫人/, /听信胡队长/, /^A[.、\s]/],
    },
  },
  '第三章-16': {
    pass: { id: 'C3-16-A', match: [/交给胡一彪/, /布置妥当/, /勒索信/, /继续/, /^A[.、\s]/] },
  },
};

export const CHAPTER3_APPLY = {
  'C3-0-A': { be: false, checkpoint: '第三章-1', node: '第三章-1' },
  'C3-1-A': {
    be: false,
    checkpoint: '第三章-2',
    node: '第三章-2',
    deltas: { '对user.庄晓曼.情感值': -1 },
  },
  'C3-1-B': {
    be: false,
    checkpoint: '第三章-2',
    node: '第三章-2',
    deltas: { '对user.庄晓曼.情感值': 1 },
  },
  'C3-2-A': {
    be: false,
    checkpoint: '第三章-3',
    node: '第三章-3',
    deltas: { '对user.庄晓曼.情感值': -1 },
  },
  'C3-2-B': {
    be: false,
    checkpoint: '第三章-3',
    node: '第三章-3',
    deltas: { '对user.庄晓曼.情感值': 1 },
  },
  'C3-3-A': {
    be: false,
    checkpoint: '第三章-4',
    node: '第三章-4',
    deltas: { '对user.庄晓曼.情感值': -1 },
  },
  'C3-3-B': {
    be: false,
    checkpoint: '第三章-4',
    node: '第三章-4',
    deltas: { '对user.庄晓曼.情感值': 3 },
  },
  'C3-4-A': {
    be: true,
    ending: '蔷薇之刺',
    checkpoint: '第三章-4',
    node: '第三章-4',
    unlock: 'BE-第三章-蔷薇之刺',
  },
  'C3-4-B': { be: false, checkpoint: '第三章-5', node: '第三章-5' },
  'C3-5-A': { be: false, checkpoint: '第三章-6', node: '第三章-6' },
  'C3-6-A': {
    be: true,
    ending: '铁血锄奸',
    checkpoint: '第三章-6',
    node: '第三章-6',
    unlock: 'BE-第三章-铁血锄奸',
  },
  'C3-6-B': {
    be: true,
    ending: '刀下亡魂',
    checkpoint: '第三章-6',
    node: '第三章-6',
    unlock: 'BE-第三章-刀下亡魂',
  },
  'C3-6-C': { be: false, checkpoint: '第三章-7', node: '第三章-7' },
  'C3-7-A': { be: false, checkpoint: '第三章-8', node: '第三章-8' },
  'C3-8-A': {
    be: true,
    ending: '铁血锄奸',
    checkpoint: '第三章-8',
    node: '第三章-8',
    unlock: 'BE-第三章-铁血锄奸',
  },
  'C3-8-B': { be: false, checkpoint: '第三章-9', node: '第三章-9' },
  'C3-8-C': { be: false, checkpoint: '第三章-10', node: '第三章-10' },
  'C3-9-A': {
    be: true,
    ending: '香消玉损',
    checkpoint: '第三章-9',
    node: '第三章-9',
    unlock: 'BE-第三章-香消玉损',
  },
  'C3-9-B': {
    be: true,
    ending: '色中恶鬼',
    checkpoint: '第三章-9',
    node: '第三章-9',
    unlock: 'BE-第三章-色中恶鬼',
  },
  'C3-10-A': { be: false, checkpoint: '第三章-11', node: '第三章-11' },
  'C3-11-A': { be: false, checkpoint: '第三章-12', node: '第三章-12' },
  'C3-12-A': {
    be: true,
    ending: '引火烧身',
    checkpoint: '第三章-12',
    node: '第三章-12',
    unlock: 'BE-第三章-引火烧身',
  },
  'C3-12-B': { be: false, checkpoint: '第三章-13', node: '第三章-13' },
  'C3-13-A': {
    be: true,
    ending: '香消玉损',
    checkpoint: '第三章-13',
    node: '第三章-13',
    unlock: 'BE-第三章-香消玉损',
  },
  'C3-13-B': { be: false, checkpoint: '第三章-14', node: '第三章-14' },
  'C3-14-A': {
    be: true,
    ending: '香消玉损',
    checkpoint: '第三章-14',
    node: '第三章-14',
    unlock: 'BE-第三章-香消玉损',
  },
  'C3-14-B': {
    be: false,
    checkpoint: '第三章-15',
    node: '第三章-15',
    requireZibaoForHuang: true,
  },
  'C3-14-C': {
    be: true,
    ending: '香消玉损',
    checkpoint: '第三章-14',
    node: '第三章-14',
    unlock: 'BE-第三章-香消玉损',
  },
  'C3-14-D': {
    be: true,
    ending: '色中恶鬼',
    checkpoint: '第三章-14',
    node: '第三章-14',
    unlock: 'BE-第三章-色中恶鬼',
  },
  'C3-15-A': { be: false, checkpoint: '第三章-16', node: '第三章-16' },
  'C3-16-A': {
    be: false,
    checkpoint: '第四章-0',
    node: '第四章-0',
    chapter: '第四章',
    events: ['第三章-完成'],
    requireMainClear: true,
  },
};

export const CHAPTER3_CHECKPOINT_LINES = {
  '第三章-0': 'A. 第二号有什么指示吗？',
  '第三章-1': 'A. 你也在跟踪我吗？\nB. ……找我有什么事？',
  '第三章-2': 'A. 不置可否\nB. 点头承认',
  '第三章-3': 'A. 拒绝回答\nB. 告诉庄晓曼全部情况',
  '第三章-4': 'A. 开枪射杀庄晓曼\nB. 叫住她套取情报',
  '第三章-5': 'A. 你是地下工作者吗？\nB. 你为什么会在这里？',
  '第三章-6': 'A. 都不理会\nB. 追上方敏\nC. 与庄晓曼跳舞',
  '第三章-7': 'A. 你们打算制造谁死亡\nB. 会不会暴露我的身份？',
  '第三章-8': 'A. 断然拒绝\nB. 点头答应\nC. 再考虑一下',
  '第三章-9': 'A. 辱骂\nB. 非礼',
  '第三章-10': 'A. 商贸团的人身安全遭到危害',
  '第三章-11': 'A. 犯人必须和日本人有联系',
  '第三章-12': 'A. 利用丁力犀\nB. 利用胡一彪',
  '第三章-13': 'A. 能否帮我杀掉商贸团成员\nB. 有没有兴趣从商贸团身上捞一笔',
  '第三章-14': 'A. 方敏\nB. 黄夫人\nC. 龙老板\nD. 黄老板',
  '第三章-15': 'A. 不该听信胡队长，叫出黄夫人',
  '第三章-16': 'A. 继续布置绑架计划',
};

export const CHAPTER3_NODE_HINTS = {
  '第三章-0': '澳门商团·接头',
  '第三章-1': '庄晓曼试探',
  '第三章-2': '是否承认',
  '第三章-3': '是否交底',
  '第三章-4': '叫住或开枪',
  '第三章-5': '对接人儿子',
  '第三章-6': '舞会三选一',
  '第三章-7': '锄奸计划',
  '第三章-8': '杀方敏或万全',
  '第三章-9': '欺辱方敏',
  '第三章-10': '商贸团安全',
  '第三章-11': '犯人日本人',
  '第三章-12': '利用胡一彪',
  '第三章-13': '捞一笔',
  '第三章-14': '绑架对象',
  '第三章-15': '武藤追问',
  '第三章-16': '章末通关',
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

export function detectChapter3Choice(node, userText) {
  const rules = CHAPTER3_CHOICES[node];
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

export function detectChapter3ChoiceGlobal(userText) {
  for (const node of CHAPTER3_NODES) {
    const id = detectChapter3Choice(node, userText);
    if (id) return id;
  }
  return null;
}

/** 与 Zod 一致：自保线 + 自保感慨 + 庄情感≥7 */
export function isChapter3MainRouteClear(stat) {
  const plot = stat?.剧情;
  if (!plot || typeof plot !== 'object') return false;
  const clues = plot.已收集线索;
  const zm = Number(stat?.对user?.庄晓曼?.情感值) || 0;
  return (
    plot.第二章分歧 === '自保' &&
    Array.isArray(clues) &&
    clues.includes(ZIBAO_CLUE) &&
    zm >= GATE_ZHUANG_EMOTION_CH3_MAIN
  );
}

export function clampEmotionDelta(path, value) {
  const v = Math.round(Number(value) || 0);
  return Math.max(REL_EMOTION_MIN, Math.min(REL_EMOTION_MAX, v));
}

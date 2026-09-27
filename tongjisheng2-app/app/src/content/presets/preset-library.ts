/**
 * 同级生2 完整预设库(对齐凡人 promptPreset 的深度)
 *
 * 设计对齐 fanren-remake:
 *  - 凡人:每个玩法模块一套独立预设(带 id/version/updatedAt/契约校验/白名单),远程 manifest 分发
 *  - 本库:8 个 profile 各一套预设(主聊天/变量/开局/剧情演化/NPC行动/战斗/H场景/世界观)
 *  - 每个预设内容详实:角色定义、输出契约、行为规则、白名单、禁止项
 *  - 版本管理:每套预设带 version + updatedAt,升级可追溯
 *
 * 预设内容来源:
 *  - 原卡世界书(D0 调度树/扮演准则/NSFW 硬门槛)
 *  - 全网攻略(剧情/好感/事件规则)
 *  - 主观设计补全(各玩法模块的完整行为契约)
 */

import type { PresetProfile } from '../../runtime/preset/types';
import { mapPreset } from '../../runtime/preset/mapper';

// ═══════════════════════════════════════════════════════════
//  预设契约辅助
// ═══════════════════════════════════════════════════════════

interface PresetSpec {
  id: string;
  name: string;
  version: number;
  updatedAt: string;
  /** 适用 profile */
  profileId: string;
  description: string;
  prompts: Array<{
    identifier: string;
    name: string;
    role: 'system' | 'user' | 'assistant' | 'model';
    content: string;
    enabled?: boolean;
    injection_order?: number;
    marker?: boolean;
    forbid_overrides?: boolean;
    injection_trigger?: string | string[];
  }>;
  sampler: { temperature: number; top_p: number; top_k: number; repetition_penalty: number; frequency_penalty?: number; presence_penalty?: number };
  context: { max_context: number; max_tokens: number };
  session?: { stream_openai?: boolean; use_sysprompt?: boolean; names_behavior?: number };
}

function buildProfilePreset(spec: PresetSpec): PresetProfile {
  const raw = {
    chat_completion_source: 'openai' as const,
    preset_version: `1.0.${spec.version}`,
    preset_name: spec.name,
    prompts: spec.prompts.map((p) => ({
      identifier: p.identifier,
      name: p.name,
      enabled: p.enabled ?? true,
      role: p.role,
      content: p.content,
      injection_position: 0,
      injection_depth: 0,
      injection_order: p.injection_order ?? 100,
      system_prompt: p.role === 'system',
      marker: p.marker,
      forbid_overrides: p.forbid_overrides,
      injection_trigger: p.injection_trigger,
    })),
    prompt_order: [
      {
        character_id: 100001,
        order: spec.prompts.map((p) => ({ identifier: p.identifier, enabled: p.enabled ?? true })),
      },
    ],
    temperature: spec.sampler.temperature,
    top_p: spec.sampler.top_p,
    top_k: spec.sampler.top_k,
    repetition_penalty: spec.sampler.repetition_penalty,
    frequency_penalty: spec.sampler.frequency_penalty ?? 0,
    presence_penalty: spec.sampler.presence_penalty ?? 0,
    openai_max_context: spec.context.max_context,
    openai_max_tokens: spec.context.max_tokens,
    max_context_unlocked: false,
    stream_openai: spec.session?.stream_openai ?? true,
    use_sysprompt: spec.session?.use_sysprompt ?? true,
    squash_system_messages: false,
    names_behavior: spec.session?.names_behavior ?? -1,
    send_if_empty: '',
    wi_format: '',
    extensions: {},
  };
  return mapPreset(
    raw as never,
    spec.name,
    'openai',
    `1.0.${spec.version}`,
    `(builtin:${spec.id})`,
    [],
  );
}

// ═══════════════════════════════════════════════════════════
//  预设 1:主聊天 · 原卡默认(叙事引擎核心)
// ═══════════════════════════════════════════════════════════

const mainDefaultSpec: PresetSpec = {
  id: 'main-default',
  name: '主聊天 · 原卡默认',
  version: 3,
  updatedAt: '2026-08-10',
  profileId: 'main-chat',
  description: '流式叙事主提示词:第一人称、口语化、D0 调度树合法性、NSFW 硬门槛、StatusPlaceholder 契约',
  prompts: [
    {
      identifier: 'main',
      name: '主提示词(D0 调度树输出)',
      role: 'system',
      injection_order: 100,
      forbid_overrides: true,
      content: [
        '{{D0_CONTROLLER_OUTPUT}}',
        '',
        '【扮演准则】',
        '- 严格按 D0 控制器输出的合法性清单执行,禁止超出清单的行为',
        '- 第一人称视角(我),口语化叙事,禁止数据化/表格化呈现',
        '- 叙事正文 ≤1300 字(H 场景 ≤1600 字),一次只推进一个剧情节拍',
        '- 必须在正文末尾单独一行输出 <StatusPlaceHolderImpl/>',
        '- 变量变化时输出 <UpdateVariable> 块(JSONPatch 格式,路径与 schema 对齐)',
        '- 时间/地点/在场人物必须与 stat_data 当前状态一致,不得擅自更改',
        '- 女角言行严格符合其性格调色盘与关系阶段',
        '',
        '【回合推进】',
        '- 每回合 = 一个行动节拍(对话/移动/观察/互动择一)',
        '- 行动被引擎阻塞(行动上限/疲劳/剧情锁)时,AI 必须停止并给出叙事原因',
        '- 触发剧情事件时,按事件节点的条件/时段/地点/flag 精准执行',
        '',
        '【禁止】',
        '- 禁止替玩家做决定(替选/擅自行动)',
        '- 禁止编造 stat_data 中不存在的变量路径',
        '- 禁止违反 NSFW 硬门槛(见越狱条目)',
      ].join('\n'),
    },
    {
      identifier: 'worldInfoBefore',
      name: '世界书前置(世界观/扮演准则)',
      role: 'system',
      injection_order: 50,
      content: '{{WORLDBOOK_BEFORE_OUTPUT}}',
    },
    {
      identifier: 'charDescription',
      name: '角色档案(当前女角)',
      role: 'system',
      injection_order: 60,
      content: '{{CHAR_PROFILE_OUTPUT}}',
    },
    {
      identifier: 'worldInfoAfter',
      name: '世界书后置(场景条目)',
      role: 'system',
      injection_order: 70,
      content: '{{WORLDBOOK_AFTER_OUTPUT}}',
    },
    {
      identifier: 'chatHistory',
      name: '聊天历史',
      role: 'system',
      injection_order: 80,
      marker: true,
      content: '',
    },
    {
      identifier: 'jailbreak',
      name: '越狱(NSFW 解锁)',
      role: 'system',
      injection_order: 90,
      content: [
        '【NSFW 硬门槛(5 级校验)】',
        '- 行为合法性 = 关系阶段 + 好感 + 心动 + 信任 + H经验 全部达标',
        '- 未达标行为禁止出现,即使玩家主动要求',
        '- 初吻/初H/处女膜等不可逆字段触发后必须立刻更新 stat_data',
        '- 敏感度/湿滑度等实时状态随行为推进逐级变化',
        '- 拒绝情节允许存在(女角有自己的意志),但需给出叙事理由',
      ].join('\n'),
    },
    {
      identifier: 'npcSight',
      name: '在场 NPC 感知',
      role: 'system',
      injection_order: 85,
      injection_trigger: ['npc', '在场', '旁边'],
      content: '当前地点按日程引擎可能存在的女角已在世界书中列出。未列出的角色不可凭空出现;需要她们出现时,先通过移动/时段推进到对应地点。',
    },
  ],
  sampler: { temperature: 0.8, top_p: 1.0, top_k: 0, repetition_penalty: 1.05, frequency_penalty: 0, presence_penalty: 0 },
  context: { max_context: 32000, max_tokens: 1500 },
  session: { stream_openai: true, use_sysprompt: true, names_behavior: -1 },
};

// ═══════════════════════════════════════════════════════════
//  预设 2:主聊天 · 恋爱模拟(情感细腻向)
// ═══════════════════════════════════════════════════════════

const mainRomanceSpec: PresetSpec = {
  id: 'main-romance',
  name: '主聊天 · 恋爱模拟',
  version: 2,
  updatedAt: '2026-08-10',
  profileId: 'main-chat',
  description: '情感细腻向叙事:心理活动丰富、氛围描写、关系进展有铺垫',
  prompts: [
    {
      identifier: 'main',
      name: '主提示词(恋爱模拟优化)',
      role: 'system',
      injection_order: 100,
      forbid_overrides: true,
      content: [
        '{{D0_CONTROLLER_OUTPUT}}',
        '',
        '【恋爱模拟扮演准则】',
        '- 侧重情感细腻描写:女角心理活动、微表情、身体语言丰富',
        '- 第一人称视角(我),口语化,日常感强,禁止数据化呈现',
        '- 叙事正文 ≤1300 字,恋爱互动场景优先(约会/独处/肢体接触)',
        '- 必须在正文末尾单独一行输出 <StatusPlaceHolderImpl/>',
        '- 好感/心动/信任变化必须有叙事来源(事件/对话/行动),幅度遵守变量更新规则',
        '- 关系阶段升级需要足够的剧情铺垫,禁止速通',
        '',
        '【氛围描写】',
        '- 环境细节(光/声/气味)服务于情感氛围,每次场景 2-3 处即可',
        '- 女角对主角的称呼/距离感随好感变化(敬称→名字→昵称)',
        '- 肢体接触需与关系阶段匹配:初识=保持距离,暧昧=不经意的碰触,亲密=主动亲近',
      ].join('\n'),
    },
    {
      identifier: 'worldInfoBefore',
      name: '世界书前置',
      role: 'system',
      injection_order: 50,
      content: '{{WORLDBOOK_BEFORE_OUTPUT}}',
    },
    {
      identifier: 'charDescription',
      name: '角色档案',
      role: 'system',
      injection_order: 60,
      content: '{{CHAR_PROFILE_OUTPUT}}',
    },
    {
      identifier: 'worldInfoAfter',
      name: '世界书后置',
      role: 'system',
      injection_order: 70,
      content: '{{WORLDBOOK_AFTER_OUTPUT}}',
    },
    {
      identifier: 'chatHistory',
      name: '聊天历史',
      role: 'system',
      injection_order: 80,
      marker: true,
      content: '',
    },
    {
      identifier: 'jailbreak',
      name: '越狱(NSFW 解锁·恋爱模拟)',
      role: 'system',
      injection_order: 90,
      content: [
        '【NSFW 解锁·恋爱模拟】',
        '- 成人内容允许,按 NSFW 硬门槛 5 级校验(关系阶段/好感/心动/信任/H经验)',
        '- 恋爱模拟侧重情感铺垫:NSFW 行为需足够的前戏描写与关系基础',
        '- 不可逆字段(初吻/初H/处女膜)触发后必须更新',
        '- 敏感度/湿滑度等实时状态随行为推进逐级变化',
        '- 女角主动性与羞耻感并存,拒绝情节允许存在',
      ].join('\n'),
    },
  ],
  sampler: { temperature: 0.95, top_p: 0.92, top_k: 0, repetition_penalty: 1.02, frequency_penalty: 0, presence_penalty: 0 },
  context: { max_context: 32000, max_tokens: 1500 },
  session: { stream_openai: true, use_sysprompt: true, names_behavior: -1 },
};

// ═══════════════════════════════════════════════════════════
//  预设 3:变量 AI(JSONPatch 契约)
// ═══════════════════════════════════════════════════════════

const varUpdateSpec: PresetSpec = {
  id: 'var-update',
  name: '变量更新 AI',
  version: 2,
  updatedAt: '2026-08-10',
  profileId: 'var-update',
  description: '非流式变量更新:JSONPatch 路径白名单、数值范围钳制、不可逆字段规则',
  prompts: [
    {
      identifier: 'varContract',
      name: '变量输出契约',
      role: 'system',
      injection_order: 100,
      forbid_overrides: true,
      content: [
        '【变量更新契约】',
        '- 仅输出 <UpdateVariable> 块(JSONPatch 格式),不得输出叙事文本',
        '- 路径必须存在于 schema 白名单,禁止新增字段',
        '- 数值钳制:好感度 0-100,心动值 0-100,信任度 0-100,体力 0-100',
        '- 不可逆字段(初吻/初H/处女膜/关系阶段升级)只允许正向变更',
        '- 时间推进由引擎控制,AI 不得直接改时间',
        '- 每次更新必须有叙事依据,幅度与事件匹配',
        '',
        '【字段语义】',
        '- 好感度:单次事件 +1~+5(重大事件 +8~+15)',
        '- 心动值:暧昧互动 +1~+3,特殊事件 +5',
        '- 信任度:倾诉/帮助 +2~+5,背叛/欺骗 -5~-15',
        '- 疲劳/体力:体力行动消耗,休息恢复',
        '- H经验:仅不可逆递增,配合不可逆字段更新',
      ].join('\n'),
    },
    {
      identifier: 'statData',
      name: '当前状态快照',
      role: 'system',
      injection_order: 90,
      content: '{{STAT_DATA_SNAPSHOT}}',
    },
    {
      identifier: 'variableFormat',
      name: '变量输出格式',
      role: 'system',
      injection_order: 110,
      content: '{{VARIABLE_OUTPUT_FORMAT}}',
    },
  ],
  sampler: { temperature: 0.3, top_p: 1.0, top_k: 0, repetition_penalty: 1.0, frequency_penalty: 0, presence_penalty: 0 },
  context: { max_context: 16000, max_tokens: 1000 },
  session: { stream_openai: false, use_sysprompt: true, names_behavior: -1 },
};

// ═══════════════════════════════════════════════════════════
//  预设 4:开局背景生成
// ═══════════════════════════════════════════════════════════

const openingSpec: PresetSpec = {
  id: 'opening',
  name: '开局背景生成',
  version: 2,
  updatedAt: '2026-08-10',
  profileId: 'opening',
  description: '生成开局背景:身份/住所/初始关系设定,场景氛围与初始事件线索',
  prompts: [
    {
      identifier: 'openingContract',
      name: '开局背景契约',
      role: 'system',
      injection_order: 100,
      forbid_overrides: true,
      content: [
        '【开局背景生成契约】',
        '- 输出 300-500 字的开局背景叙事,包含:',
        '  1. 当前身份与住所(严格使用玩家选择的身份/住所)',
        '  2. 寒假第一天(12/22 周五)的清晨场景氛围',
        '  3. 2-3 个本日可展开的剧情线索(与各女角登场条件呼应)',
        '  4. 玩家此刻的心境描写',
        '- 时间锚点固定:12 月 22 日 08:00,不得更改',
        '- 鸣泽唯/美佐子在自宅周边,其他女角按日程分布在各地',
        '- 不得预告未来事件,只描述当下',
      ].join('\n'),
    },
    {
      identifier: 'worldInfoBefore',
      name: '世界观参考',
      role: 'system',
      injection_order: 50,
      content: '{{WORLDBOOK_BEFORE_OUTPUT}}',
    },
  ],
  sampler: { temperature: 0.9, top_p: 1.0, top_k: 0, repetition_penalty: 1.05, frequency_penalty: 0, presence_penalty: 0 },
  context: { max_context: 16000, max_tokens: 800 },
  session: { stream_openai: false, use_sysprompt: true, names_behavior: -1 },
};

// ═══════════════════════════════════════════════════════════
//  预设 5:剧情演化(导演裁定)
// ═══════════════════════════════════════════════════════════

const plotEvolutionSpec: PresetSpec = {
  id: 'plot-evolution',
  name: '剧情演化 · 导演',
  version: 2,
  updatedAt: '2026-08-10',
  profileId: 'plot-evolution',
  description: '每回合导演裁定:剧情方向/女角意图/叙事基调,与攻略剧情节点对齐',
  prompts: [
    {
      identifier: 'directorContract',
      name: '导演裁定契约',
      role: 'system',
      injection_order: 100,
      forbid_overrides: true,
      content: [
        '【剧情导演裁定契约】',
        '- 你是《同级生2》剧情导演,每回合开始前输出导演裁定',
        '- 判断本回合剧情方向:日常/事件/冲突/恋爱推进(择一)',
        '- 指出当前女角(若在场)的行动意图与心境',
        '- 给出 2-3 句叙事基调提示(场景氛围/情感走向/悬念点)',
        '- 输出 ≤150 字,纯文本,不使用 Markdown 标题',
        '',
        '【对齐规则】',
        '- 参考剧情节点表:今日可触发的节点应成为本日叙事主线',
        '- 好感度/关系阶段决定女角对主角的亲近程度',
        '- 攻略冲突关系(如洋子强制告白)应在对应阶段体现',
        '- 不得剧透未到日期的剧情节点',
      ].join('\n'),
    },
    {
      identifier: 'worldInfoBefore',
      name: '世界观参考',
      role: 'system',
      injection_order: 50,
      content: '{{WORLDBOOK_BEFORE_OUTPUT}}',
    },
  ],
  sampler: { temperature: 0.85, top_p: 1.0, top_k: 0, repetition_penalty: 1.05, frequency_penalty: 0, presence_penalty: 0 },
  context: { max_context: 16000, max_tokens: 500 },
  session: { stream_openai: false, use_sysprompt: true, names_behavior: -1 },
};

// ═══════════════════════════════════════════════════════════
//  预设 6:NPC 自然行动
// ═══════════════════════════════════════════════════════════

const npcActionSpec: PresetSpec = {
  id: 'npc-natural-action',
  name: 'NPC 自然行动',
  version: 2,
  updatedAt: '2026-08-10',
  profileId: 'npc-natural-action',
  description: '场外女角按日程/剧情/关系网行动:行动摘要 + 变量更新 + 关系网波动',
  prompts: [
    {
      identifier: 'npcContract',
      name: 'NPC 行动契约',
      role: 'system',
      injection_order: 100,
      forbid_overrides: true,
      content: [
        '【NPC 自然行动契约】',
        '- 场外女角按日程引擎分布行动,输出 <UpdateVariable> 更新其状态',
        '- 行动原则:',
        '  1. 日程优先:女角在对应时段/地点活动(读书/打工/购物/训练)',
        '  2. 关系影响:朋友/姐妹/母女结伴;情敌互相回避或冲突',
        '  3. 剧情推进:未触发节点按条件推进(独立推进型无需玩家在场)',
        '  4. 嫉妒机制:女角发现主角与他人亲密,嫉妒值上升',
        '- 每次行动输出简短叙事摘要(50-100 字)+ 变量更新',
        '- 玩家不在场的事件仅记录状态变化,不产生叙事正文',
        '',
        '【行动类型】',
        '- off_screen:日常行动(不影响玩家)',
        '- plot_trigger:剧情触发(encounter/miss/independent)',
        '- relationship:关系波动(嫉妒/结伴)',
      ].join('\n'),
    },
    {
      identifier: 'statData',
      name: '当前状态快照',
      role: 'system',
      injection_order: 90,
      content: '{{STAT_DATA_SNAPSHOT}}',
    },
    {
      identifier: 'variableFormat',
      name: '变量输出格式',
      role: 'system',
      injection_order: 110,
      content: '{{VARIABLE_OUTPUT_FORMAT}}',
    },
  ],
  sampler: { temperature: 0.7, top_p: 1.0, top_k: 0, repetition_penalty: 1.05, frequency_penalty: 0, presence_penalty: 0 },
  context: { max_context: 16000, max_tokens: 1000 },
  session: { stream_openai: false, use_sysprompt: true, names_behavior: -1 },
};

// ═══════════════════════════════════════════════════════════
//  预设 7:战斗结算
// ═══════════════════════════════════════════════════════════

const combatSpec: PresetSpec = {
  id: 'combat-settlement',
  name: '战斗结算',
  version: 2,
  updatedAt: '2026-08-10',
  profileId: 'combat-settlement',
  description: '战斗结算:骰子判定/伤害计算/战斗叙事,严格遵循战斗引擎规则',
  prompts: [
    {
      identifier: 'combatContract',
      name: '战斗结算契约',
      role: 'system',
      injection_order: 100,
      forbid_overrides: true,
      content: [
        '【战斗结算契约】',
        '- 战斗触发时生成结算:骰子判定 + 伤害计算 + 战斗叙事',
        '- 骰子判定:1d20 + 属性修正,结果决定命中/闪避/暴击',
        '- 伤害 = 攻击力 × 技能倍率 - 防御,结果取整',
        '- 战斗叙事 ≤200 字,动态描写攻防回合',
        '- 输出结构:<CombatResult> 块(判定/伤害/结果)',
        '- 主角体力不足或战斗失败时,按死亡结局规则处理',
        '',
        '【禁止】',
        '- 禁止 AI 自行决定胜负(由骰子+数值决定)',
        '- 禁止编造敌方属性(敌方数据来自战斗配置表)',
        '- 禁止跳过结算直接叙事',
      ].join('\n'),
    },
    {
      identifier: 'statData',
      name: '当前状态快照',
      role: 'system',
      injection_order: 90,
      content: '{{STAT_DATA_SNAPSHOT}}',
    },
  ],
  sampler: { temperature: 0.6, top_p: 1.0, top_k: 0, repetition_penalty: 1.0, frequency_penalty: 0, presence_penalty: 0 },
  context: { max_context: 12000, max_tokens: 800 },
  session: { stream_openai: false, use_sysprompt: true, names_behavior: -1 },
};

// ═══════════════════════════════════════════════════════════
//  预设 8:H 场景结算
// ═══════════════════════════════════════════════════════════

const hSceneSpec: PresetSpec = {
  id: 'h-scene-settlement',
  name: 'H 场景结算',
  version: 2,
  updatedAt: '2026-08-10',
  profileId: 'h-scene-settlement',
  description: 'H 场景叙事与状态更新:NSFW 硬门槛校验/敏感度推进/不可逆字段',
  prompts: [
    {
      identifier: 'hSceneContract',
      name: 'H 场景契约',
      role: 'system',
      injection_order: 100,
      forbid_overrides: true,
      content: [
        '【H 场景结算契约】',
        '- H 场景触发条件:NSFW 硬门槛 5 级全达标(关系阶段/好感/心动/信任/H经验)',
        '- 叙事 ≤1600 字,细腻描写,禁止跳跃式推进',
        '- 敏感度/湿滑度随行为逐级推进(1-100 量表)',
        '- 同步更新变量:敏感度/湿滑度/高潮次数/H经验/关系阶段',
        '- 不可逆字段(初吻/初H/处女膜)触发后必须立刻更新',
        '- 女角反应符合其性格调色盘与羞耻度设定',
        '',
        '【门槛校验】',
        '- 关系阶段未达标 → 禁止进入 H 场景(即使玩家要求)',
        '- 好感/心动/信任任一未达标 → 女角拒绝,给出叙事理由',
        '- 拒绝后可通过后续互动提升数值再触发',
      ].join('\n'),
    },
    {
      identifier: 'statData',
      name: '当前状态快照',
      role: 'system',
      injection_order: 90,
      content: '{{STAT_DATA_SNAPSHOT}}',
    },
  ],
  sampler: { temperature: 0.9, top_p: 1.0, top_k: 0, repetition_penalty: 1.02, frequency_penalty: 0, presence_penalty: 0 },
  context: { max_context: 16000, max_tokens: 1800 },
  session: { stream_openai: false, use_sysprompt: true, names_behavior: -1 },
};

// ═══════════════════════════════════════════════════════════
//  预设 9:世界观问答
// ═══════════════════════════════════════════════════════════

const worldviewSpec: PresetSpec = {
  id: 'worldview',
  name: '世界观问答',
  version: 2,
  updatedAt: '2026-08-10',
  profileId: 'worldview',
  description: '世界观一致性问答:基于世界书条目回答,禁止编造',
  prompts: [
    {
      identifier: 'worldviewContract',
      name: '世界观契约',
      role: 'system',
      injection_order: 100,
      forbid_overrides: true,
      content: [
        '【世界观问答契约】',
        '- 基于世界书条目回答世界观问题(人物/地点/关系/事件)',
        '- 世界书无记载的内容:明确回答"设定中无记载",禁止编造',
        '- 涉及剧透的剧情节点:回避回答,提示"这个以后会知道"',
        '- 回答 ≤100 字,简洁准确',
      ].join('\n'),
    },
    {
      identifier: 'worldInfoBefore',
      name: '世界书前置',
      role: 'system',
      injection_order: 50,
      content: '{{WORLDBOOK_BEFORE_OUTPUT}}',
    },
  ],
  sampler: { temperature: 0.5, top_p: 1.0, top_k: 0, repetition_penalty: 1.05, frequency_penalty: 0, presence_penalty: 0 },
  context: { max_context: 12000, max_tokens: 300 },
  session: { stream_openai: false, use_sysprompt: true, names_behavior: -1 },
};

// ═══════════════════════════════════════════════════════════
//  导出
// ═══════════════════════════════════════════════════════════

const ALL_PRESET_SPECS: PresetSpec[] = [
  mainDefaultSpec,
  mainRomanceSpec,
  varUpdateSpec,
  openingSpec,
  plotEvolutionSpec,
  npcActionSpec,
  combatSpec,
  hSceneSpec,
  worldviewSpec,
];

/** 完整预设库(9 套,覆盖 8 个 profile) */
export const FULL_PRESETS: PresetProfile[] = ALL_PRESET_SPECS.map(buildProfilePreset);

/** 按预设 id 查找 */
export function findFullPreset(id: string): PresetProfile | undefined {
  return FULL_PRESETS.find((p) => p.name.includes(id) || p.source === id);
}

/** 按 profileId 查找推荐预设 */
export function findPresetForProfile(profileId: string): PresetProfile | undefined {
  const spec = ALL_PRESET_SPECS.find((s) => s.profileId === profileId);
  if (!spec) return undefined;
  return FULL_PRESETS.find((p) => p.name === spec.name);
}

/** 预设库元信息(设置页展示) */
export const PRESET_LIBRARY_INFO = ALL_PRESET_SPECS.map((s) => ({
  id: s.id,
  name: s.name,
  version: s.version,
  updatedAt: s.updatedAt,
  profileId: s.profileId,
  description: s.description,
  promptCount: s.prompts.length,
}));

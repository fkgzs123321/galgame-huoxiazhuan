/**
 * 8AI Profile(步骤6)
 *
 * 阶段1 实现 2 个:
 *  - main-chat(主聊天AI):流式输出叙事正文 + <StatusPlaceHolderImpl/>,不输出 <UpdateVariable>
 *  - var-update(变量AI):非流式输出 <UpdateVariable> + <UpdateTable>,不输出叙事正文
 *
 * 阶段2-3 扩展:
 *  - opening(开局AI):身份未选择时触发,生成开场叙事
 *  - plot-evolution(剧情演化AI):关键节点触发,推进剧情线
 *  - npc-natural-action(NPC自然行动AI):场外女角按日程/剧情/关系网行动
 *  - combat-settlement(战斗结算AI):战斗触发,生成战斗结算页
 *  - h-scene-settlement(H场景结算AI):H场景触发,生成H结算页+CG
 *  - worldview(世界观AI):世界观一致性维护
 *
 * 每个 Profile 包含:
 *  - id/名称/描述
 *  - 模型端点(OpenAI 兼容 baseURL)
 *  - API Key(本地存 IndexedDB,不上传)
 *  - 模型名(如 deepseek-chat / qwen-plus / moonshot-v1-8k)
 *  - 绑定的预设(可同可异)
 *  - Prompt 组装策略(系统条目/角色档案/场景条目/历史/Memory 摘要)
 *  - 输出协议(期望的输出格式)
 *  - 上下文预算(max_context/max_tokens,可被预设覆盖)
 *  - 流式开关
 *  - 超时/重试配置
 */

import type { PresetProfile } from '../runtime/preset/types';

// ───────────────────────────────────────────────────────────
//  类型定义
// ───────────────────────────────────────────────────────────

export type AiProfileId =
  | 'main-chat'
  | 'var-update'
  | 'opening'
  | 'plot-evolution'
  | 'npc-natural-action'
  | 'combat-settlement'
  | 'h-scene-settlement'
  | 'worldview';

export type AiRole = 'main-chat' | 'var-update' | 'trigger';

/** 输出协议 */
export interface OutputProtocol {
  /** 期望输出格式描述 */
  format: string;
  /** 是否流式 */
  stream: boolean;
  /** 是否输出 <UpdateVariable> */
  outputsUpdateVariable: boolean;
  /** 是否输出 <UpdateTable> */
  outputsUpdateTable: boolean;
  /** 是否输出叙事正文 */
  outputsNarrative: boolean;
  /** 是否输出 <StatusPlaceHolderImpl/> */
  outputsStatusPlaceholder: boolean;
}

/** Prompt 组装策略 */
export interface PromptAssemblyStrategy {
  /** 是否包含 D0 控制器输出 */
  includeD0Controller: boolean;
  /** 是否包含世界书前置 */
  includeWorldbookBefore: boolean;
  /** 是否包含世界书后置 */
  includeWorldbookAfter: boolean;
  /** 是否包含角色档案 */
  includeCharProfile: boolean;
  /** 是否包含聊天历史 */
  includeChatHistory: boolean;
  /** 是否包含 Memory 摘要 */
  includeMemorySummary: boolean;
  /** 是否包含变量输出格式 */
  includeVariableOutputFormat: boolean;
  /** 是否包含当前 stat_data 快照 */
  includeStatDataSnapshot: boolean;
  /** 世界书条目前缀过滤([mvu_plot]/[mvu_update]/无前缀) */
  worldbookPrefixFilter: 'mvu_plot' | 'mvu_update' | 'both' | 'none';
}

/** 8AI Profile */
export interface AiProfile {
  id: AiProfileId;
  name: string;
  description: string;
  role: AiRole;
  /** 是否在阶段1启用 */
  enabledInStage1: boolean;
  /** 模型端点配置 */
  endpoint: AiEndpoint;
  /** Prompt 组装策略 */
  promptStrategy: PromptAssemblyStrategy;
  /** 输出协议 */
  outputProtocol: OutputProtocol;
  /** 默认上下文预算(可被预设覆盖) */
  defaultContextBudget: {
    maxContext: number;
    maxTokens: number;
  };
  /** 超时(ms) */
  timeoutMs: number;
  /** 重试次数 */
  maxRetries: number;
}

/** 模型端点配置 */
export interface AiEndpoint {
  /** OpenAI 兼容 baseURL,如 https://api.deepseek.com/v1 */
  baseURL: string;
  /** API Key(本地存 IndexedDB,不上传) */
  apiKey: string;
  /** 模型名,如 deepseek-chat */
  model: string;
  /** 绑定的预设 id(从已导入/内置预设中选择) */
  presetId?: string;
  /** 绑定的预设(运行时解析,从 presetId 加载) */
  preset?: PresetProfile;
}

// ───────────────────────────────────────────────────────────
//  阶段1 默认 Profile
// ───────────────────────────────────────────────────────────

/** 主聊天AI:流式输出叙事正文 */
export const mainChatProfile: AiProfile = {
  id: 'main-chat',
  name: '主聊天AI',
  description:
    '流式输出叙事正文(≤1300字,第一人称,口语化)+ <StatusPlaceHolderImpl/>。不输出 <UpdateVariable>。接收 [mvu_plot] 前缀条目 + 无前缀条目。',
  role: 'main-chat',
  enabledInStage1: true,
  endpoint: {
    baseURL: '',
    apiKey: '',
    model: '',
  },
  promptStrategy: {
    includeD0Controller: true,
    includeWorldbookBefore: true,
    includeWorldbookAfter: true,
    includeCharProfile: true,
    includeChatHistory: true,
    includeMemorySummary: true,
    includeVariableOutputFormat: false,
    includeStatDataSnapshot: false,
    worldbookPrefixFilter: 'mvu_plot',
  },
  outputProtocol: {
    format: '叙事正文 + <StatusPlaceHolderImpl/>',
    stream: true,
    outputsUpdateVariable: false,
    outputsUpdateTable: false,
    outputsNarrative: true,
    outputsStatusPlaceholder: true,
  },
  defaultContextBudget: {
    maxContext: 32000,
    maxTokens: 1500,
  },
  timeoutMs: 60_000,
  maxRetries: 3,
};

/** 变量AI:非流式输出变量更新 */
export const varUpdateProfile: AiProfile = {
  id: 'var-update',
  name: '变量AI',
  description:
    '非流式输出 <UpdateVariable>(Analysis + JSONPatch) + <UpdateTable>(SQL)。不输出叙事正文。接收 [mvu_update] 前缀条目 + 无前缀条目 + 当前 stat_data 快照。',
  role: 'var-update',
  enabledInStage1: true,
  endpoint: {
    baseURL: '',
    apiKey: '',
    model: '',
  },
  promptStrategy: {
    includeD0Controller: false,
    includeWorldbookBefore: true,
    includeWorldbookAfter: false,
    includeCharProfile: false,
    includeChatHistory: true,
    includeMemorySummary: false,
    includeVariableOutputFormat: true,
    includeStatDataSnapshot: true,
    worldbookPrefixFilter: 'mvu_update',
  },
  outputProtocol: {
    format: '<UpdateVariable><Analysis>...</Analysis><JSONPatch>[...]</JSONPatch></UpdateVariable><UpdateTable>SQL</UpdateTable>',
    stream: false,
    outputsUpdateVariable: true,
    outputsUpdateTable: true,
    outputsNarrative: false,
    outputsStatusPlaceholder: false,
  },
  defaultContextBudget: {
    maxContext: 32000,
    maxTokens: 2000,
  },
  timeoutMs: 90_000,
  maxRetries: 3,
};

// ───────────────────────────────────────────────────────────
//  阶段3 触发型 Profile(阶段3 启用)
// ───────────────────────────────────────────────────────────

export const openingProfile: AiProfile = {
  id: 'opening',
  name: '开局AI',
  description: '身份未选择/新开局时触发,生成开场叙事(如美佐子叫起床场景)。',
  role: 'trigger',
  enabledInStage1: false,
  endpoint: { baseURL: '', apiKey: '', model: '' },
  promptStrategy: {
    includeD0Controller: true,
    includeWorldbookBefore: true,
    includeWorldbookAfter: false,
    includeCharProfile: true,
    includeChatHistory: false,
    includeMemorySummary: false,
    includeVariableOutputFormat: false,
    includeStatDataSnapshot: true,
    worldbookPrefixFilter: 'both',
  },
  outputProtocol: {
    format: '开场叙事 + <StatusPlaceHolderImpl/>',
    stream: true,
    outputsUpdateVariable: false,
    outputsUpdateTable: false,
    outputsNarrative: true,
    outputsStatusPlaceholder: true,
  },
  defaultContextBudget: { maxContext: 32000, maxTokens: 1500 },
  timeoutMs: 60_000,
  maxRetries: 3,
};

export const plotEvolutionProfile: AiProfile = {
  id: 'plot-evolution',
  name: '剧情演化AI',
  description: '关键节点触发,推进剧情线(如樱子死讯、西寺阴谋、美纪双身份揭示)。',
  role: 'trigger',
  enabledInStage1: false,
  endpoint: { baseURL: '', apiKey: '', model: '' },
  promptStrategy: {
    includeD0Controller: true,
    includeWorldbookBefore: true,
    includeWorldbookAfter: true,
    includeCharProfile: true,
    includeChatHistory: true,
    includeMemorySummary: true,
    includeVariableOutputFormat: false,
    includeStatDataSnapshot: true,
    worldbookPrefixFilter: 'both',
  },
  outputProtocol: {
    format: '剧情推进叙事 + <StatusPlaceHolderImpl/>',
    stream: true,
    outputsUpdateVariable: false,
    outputsUpdateTable: false,
    outputsNarrative: true,
    outputsStatusPlaceholder: true,
  },
  defaultContextBudget: { maxContext: 32000, maxTokens: 2000 },
  timeoutMs: 60_000,
  maxRetries: 3,
};

export const npcNaturalActionProfile: AiProfile = {
  id: 'npc-natural-action',
  name: 'NPC自然行动AI',
  description: '场外女角按日程/剧情/关系网行动,玩家可听说/遭遇/错过。',
  role: 'trigger',
  enabledInStage1: false,
  endpoint: { baseURL: '', apiKey: '', model: '' },
  promptStrategy: {
    includeD0Controller: false,
    includeWorldbookBefore: true,
    includeWorldbookAfter: false,
    includeCharProfile: true,
    includeChatHistory: false,
    includeMemorySummary: false,
    includeVariableOutputFormat: true,
    includeStatDataSnapshot: true,
    worldbookPrefixFilter: 'mvu_update',
  },
  outputProtocol: {
    format: '<UpdateVariable>(NPC行动) + <UpdateTable>(NPC表更新)',
    stream: false,
    outputsUpdateVariable: true,
    outputsUpdateTable: true,
    outputsNarrative: false,
    outputsStatusPlaceholder: false,
  },
  defaultContextBudget: { maxContext: 16000, maxTokens: 1000 },
  timeoutMs: 60_000,
  maxRetries: 2,
};

export const combatSettlementProfile: AiProfile = {
  id: 'combat-settlement',
  name: '战斗结算AI',
  description: '战斗触发,生成战斗结算页+骰子判定+伤害计算。',
  role: 'trigger',
  enabledInStage1: false,
  endpoint: { baseURL: '', apiKey: '', model: '' },
  promptStrategy: {
    includeD0Controller: true,
    includeWorldbookBefore: true,
    includeWorldbookAfter: false,
    includeCharProfile: true,
    includeChatHistory: true,
    includeMemorySummary: false,
    includeVariableOutputFormat: true,
    includeStatDataSnapshot: true,
    worldbookPrefixFilter: 'both',
  },
  outputProtocol: {
    format: '战斗结算页(骰子/伤害/结果) + <UpdateVariable>',
    stream: false,
    outputsUpdateVariable: true,
    outputsUpdateTable: false,
    outputsNarrative: true,
    outputsStatusPlaceholder: false,
  },
  defaultContextBudget: { maxContext: 32000, maxTokens: 2000 },
  timeoutMs: 60_000,
  maxRetries: 3,
};

export const hSceneSettlementProfile: AiProfile = {
  id: 'h-scene-settlement',
  name: 'H场景结算AI',
  description: 'H场景触发,生成H结算页+CG触发+身体状态变化。',
  role: 'trigger',
  enabledInStage1: false,
  endpoint: { baseURL: '', apiKey: '', model: '' },
  promptStrategy: {
    includeD0Controller: true,
    includeWorldbookBefore: true,
    includeWorldbookAfter: false,
    includeCharProfile: true,
    includeChatHistory: true,
    includeMemorySummary: false,
    includeVariableOutputFormat: true,
    includeStatDataSnapshot: true,
    worldbookPrefixFilter: 'both',
  },
  outputProtocol: {
    format: 'H结算页(CG/身体状态/敏感度) + <UpdateVariable>',
    stream: false,
    outputsUpdateVariable: true,
    outputsUpdateTable: true,
    outputsNarrative: true,
    outputsStatusPlaceholder: false,
  },
  defaultContextBudget: { maxContext: 32000, maxTokens: 2500 },
  timeoutMs: 90_000,
  maxRetries: 3,
};

export const worldviewProfile: AiProfile = {
  id: 'worldview',
  name: '世界观AI',
  description: '世界观一致性维护(地理/时代/设定/法律/道德)。',
  role: 'trigger',
  enabledInStage1: false,
  endpoint: { baseURL: '', apiKey: '', model: '' },
  promptStrategy: {
    includeD0Controller: false,
    includeWorldbookBefore: true,
    includeWorldbookAfter: false,
    includeCharProfile: false,
    includeChatHistory: false,
    includeMemorySummary: false,
    includeVariableOutputFormat: false,
    includeStatDataSnapshot: false,
    worldbookPrefixFilter: 'none',
  },
  outputProtocol: {
    format: '世界观一致性审查报告',
    stream: false,
    outputsUpdateVariable: false,
    outputsUpdateTable: false,
    outputsNarrative: true,
    outputsStatusPlaceholder: false,
  },
  defaultContextBudget: { maxContext: 16000, maxTokens: 1000 },
  timeoutMs: 60_000,
  maxRetries: 2,
};

// ───────────────────────────────────────────────────────────
//  Profile 注册表
// ───────────────────────────────────────────────────────────

export const ALL_AI_PROFILES: AiProfile[] = [
  mainChatProfile,
  varUpdateProfile,
  openingProfile,
  plotEvolutionProfile,
  npcNaturalActionProfile,
  combatSettlementProfile,
  hSceneSettlementProfile,
  worldviewProfile,
];

/** 阶段1 启用的 Profile */
export const STAGE1_PROFILES: AiProfile[] = ALL_AI_PROFILES.filter((p) => p.enabledInStage1);

/** 阶段3 启用的 Profile(全部 8 个) */
export const STAGE3_PROFILES: AiProfile[] = ALL_AI_PROFILES;

/** 触发型 AI Profile(非主聊天/变量) */
export const TRIGGER_PROFILES: AiProfile[] = ALL_AI_PROFILES.filter((p) => p.role === 'trigger');

/** 按 id 查找 Profile */
export function findProfile(id: AiProfileId): AiProfile | undefined {
  return ALL_AI_PROFILES.find((p) => p.id === id);
}

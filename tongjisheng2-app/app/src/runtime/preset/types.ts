/**
 * 预设类型定义(步骤6)
 *
 * 职责:
 *  - 定义 ST 预设 JSON 原始格式(StPresetRaw)
 *  - 定义应用内部 PresetProfile(经过映射器转换后的统一格式)
 *  - 定义 ST 内置标识符枚举(StIdentifier)
 *  - 定义 sampler/上下文/会话/extensions 字段类型
 *
 * 参考:
 *  - stage-roadmap.md 步骤6 预设导入器/映射器要求
 *  - SillyTavern ChatCompletion 预设格式(prompts/prompt_order/sampler/上下文/会话/extensions)
 */

// ───────────────────────────────────────────────────────────
//  ST 内置标识符(SillyTavern 预定义的 prompt identifier)
// ───────────────────────────────────────────────────────────

export const ST_BUILTIN_IDENTIFIERS = [
  'main',
  'nsfw',
  'charDescription',
  'charPersonality',
  'scenario',
  'dialogueExamples',
  'chatHistory',
  'worldInfoBefore',
  'worldInfoAfter',
  'personaDescription',
  'enhanceDefinitions',
  'jailbreak',
  'agentSystemPrompt',
  'agentResults',
] as const;

export type StBuiltinIdentifier = (typeof ST_BUILTIN_IDENTIFIERS)[number];

export function isStBuiltinIdentifier(id: string): id is StBuiltinIdentifier {
  return (ST_BUILTIN_IDENTIFIERS as readonly string[]).includes(id);
}

// ───────────────────────────────────────────────────────────
//  ST 预设原始格式(StPresetRaw)
// ───────────────────────────────────────────────────────────

/** ST prompts[] 单条条目 */
export interface StPromptEntry {
  identifier: string;
  name?: string;
  enabled?: boolean;
  role?: 'system' | 'user' | 'assistant' | 'model';
  content?: string;
  injection_position?: number;
  injection_depth?: number;
  injection_order?: number;
  system_prompt?: boolean;
  marker?: boolean;
  forbid_overrides?: boolean;
  /** 注入触发器(对齐凡人 presetTypes:关键字触发注入) */
  injection_trigger?: string | string[];
  // 扩展字段(部分预设会有)
  provider?: string;
  settings?: Record<string, unknown>;
}

/** ST prompt_order 单条(引用 prompts[] 中的 identifier) */
export interface StPromptOrderEntry {
  identifier: string;
  enabled: boolean;
}

/** ST prompt_order 按角色分组 */
export interface StPromptOrderGroup {
  character_id?: number | string;
  order: StPromptOrderEntry[];
}

/** ST sampler 参数(temperature/top_p 等) */
export interface StSampler {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  top_a?: number;
  min_p?: number;
  repetition_penalty?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
  reasoning_effort?: 'low' | 'medium' | 'high';
  verbosity?: number;
  // 其他 sampler 字段(宽松保留)
  [key: string]: unknown;
}

/** ST 上下文预算配置 */
export interface StContextConfig {
  openai_max_context?: number;
  openai_max_tokens?: number;
  max_context_unlocked?: boolean;
  // 其他上下文字段
  [key: string]: unknown;
}

/** ST 会话控制配置 */
export interface StSessionConfig {
  stream_openai?: boolean;
  use_sysprompt?: boolean;
  squash_system_messages?: boolean;
  assistant_prefill?: string;
  continue_postfix?: string;
  new_chat_prefix?: string;
  new_first_chat_prefix?: string;
  names_behavior?: number;
  send_if_empty?: string;
  wi_format?: string;
  // 其他会话字段
  [key: string]: unknown;
}

/** ST extensions(扩展数据) */
export interface StExtensions {
  bias_preset_selected?: string;
  [key: string]: unknown;
}

/** ST 预设 JSON 顶层结构(ChatCompletion 格式) */
export interface StPresetRaw {
  // 版本/元数据
  chat_completion_source?: 'openai' | 'claude' | 'windowai' | 'scale' | 'cohere' | 'makersuite';
  preset_version?: string;
  preset_name?: string;
  // prompts 数组(核心)
  prompts?: StPromptEntry[];
  // prompt_order 数组(顺序控制)
  prompt_order?: StPromptOrderGroup[];
  // sampler 参数
  temperature?: number;
  top_p?: number;
  top_k?: number;
  top_a?: number;
  min_p?: number;
  repetition_penalty?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
  reasoning_effort?: 'low' | 'medium' | 'high';
  verbosity?: number;
  // 上下文预算
  openai_max_context?: number;
  openai_max_tokens?: number;
  max_context_unlocked?: boolean;
  // 会话控制
  stream_openai?: boolean;
  use_sysprompt?: boolean;
  squash_system_messages?: boolean;
  assistant_prefill?: string;
  continue_postfix?: string;
  new_chat_prefix?: string;
  new_first_chat_prefix?: string;
  names_behavior?: number;
  send_if_empty?: string;
  wi_format?: string;
  // 扩展
  extensions?: StExtensions;
  // 其他未列字段(宽松保留,避免丢数据)
  [key: string]: unknown;
}

// ───────────────────────────────────────────────────────────
//  应用内部 PresetProfile(映射器输出)
// ───────────────────────────────────────────────────────────

/** 应用内 prompt 条目(映射自 ST prompts[] + prompt_order) */
export interface PresetPromptEntry {
  /** ST identifier(可能是内置或自定义) */
  identifier: string;
  /** 显示名 */
  name: string;
  /** 是否启用 */
  enabled: boolean;
  /** 角色 */
  role: 'system' | 'user' | 'assistant';
  /** 内容(含宏 {{user}}/{{char}}/{{getvar}} 等,运行时展开) */
  content: string;
  /** 注入位置(0=相对当前位置,1=聊天末尾,2=绝对深度) */
  injectionPosition: number;
  /** 注入深度(仅 injectionPosition=2 时生效) */
  injectionDepth: number;
  /** 注入顺序(同位置同深度时排序) */
  injectionOrder: number;
  /** 是否是系统提示词(不参与角色扮演) */
  isSystemPrompt: boolean;
  /** 是否是标记位(如 {{chatHistory}}) */
  isMarker: boolean;
  /** 是否禁止覆盖 */
  forbidOverrides: boolean;
  /** 是否 ST 内置标识符 */
  isBuiltin: boolean;
  /** 内置槽位(仅 isBuiltin=true 时) */
  builtinSlot?: StBuiltinIdentifier;
}

/** 应用内 sampler 参数 */
export interface PresetSampler {
  temperature: number;
  topP: number;
  topK: number;
  topA: number;
  minP: number;
  repetitionPenalty: number;
  frequencyPenalty: number;
  presencePenalty: number;
  seed?: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
  verbosity?: number;
}

/** 应用内上下文预算 */
export interface PresetContextBudget {
  maxContext: number;
  maxTokens: number;
  maxContextUnlocked: boolean;
}

/** 应用内会话控制 */
export interface PresetSession {
  stream: boolean;
  useSystemPrompt: boolean;
  squashSystemMessages: boolean;
  assistantPrefill: string;
  continuePostfix: string;
  newChatPrefix: string;
  newFirstChatPrefix: string;
  namesBehavior: number;
  sendIfEmpty: string;
  wiFormat: string;
}

/** 应用内扩展数据 */
export interface PresetExtensions {
  biasPresetSelected?: string;
  raw: Record<string, unknown>;
}

/** 应用内 PresetProfile(映射器输出) */
export interface PresetProfile {
  /** 预设名(来自 ST preset_name 或文件名) */
  name: string;
  /** 来源(preset_name 字段或文件名,用于 trace) */
  source: string;
  /** ST preset_version(用于兼容性判断) */
  version: string;
  /** ST chat_completion_source(用于兼容性判断) */
  sourceType: string;
  /** prompts 列表(已按 prompt_order 排序) */
  prompts: PresetPromptEntry[];
  /** sampler 参数 */
  sampler: PresetSampler;
  /** 上下文预算 */
  context: PresetContextBudget;
  /** 会话控制 */
  session: PresetSession;
  /** 扩展数据 */
  extensions: PresetExtensions;
  /** 导入时间戳 */
  importedAt: number;
  /** 原始 ST 预设(保留,供高级用户/调试查看) */
  raw: StPresetRaw;
  /** 导入警告(字段缺失/版本不支持等,不阻塞) */
  warnings: string[];
}

// ───────────────────────────────────────────────────────────
//  导入结果
// ───────────────────────────────────────────────────────────

export interface PresetImportResult {
  ok: boolean;
  profile?: PresetProfile;
  errors: string[];
  warnings: string[];
}

// ───────────────────────────────────────────────────────────
//  冲突处理策略
// ───────────────────────────────────────────────────────────

export type ConflictStrategy = 'builtin-wins' | 'preset-wins' | 'merge';

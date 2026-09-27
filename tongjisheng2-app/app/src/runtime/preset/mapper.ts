/**
 * 预设映射器(步骤6)
 *
 * 职责:
 *  - ST 字段 → 应用内部 PresetProfile
 *  - ST 内置标识符(main/nsfw/charDescription/...)→ 应用对应槽位
 *  - 自定义命名标识符(prism-style-depth2/hulu-style-* 等)→ 自定义条目槽位
 *  - prompts[](identifier/name/enabled/role/content/injection_position/injection_depth/injection_order/system_prompt/marker/forbid_overrides)→ 条目完整映射
 *  - sampler(temperature/top_p/top_k/top_a/min_p/repetition_penalty/frequency_penalty/presence_penalty/seed/reasoning_effort/verbosity)→ Gateway 参数
 *  - 上下文(openai_max_context / openai_max_tokens / max_context_unlocked)→ 预算
 *  - 会话(stream_openai / use_sysprompt / squash_system_messages / assistant_prefill /
 *    continue_postfix / new_chat_prefix / new_first_chat_prefix /
 *    names_behavior / send_if_empty / wi_format)→ 会话控制
 *  - extensions(bias_preset_selected 等)→ 扩展数据
 *  - 冲突处理(内置优先/预设优先/合并,默认合并)
 *
 * 参考:
 *  - stage-roadmap.md 步骤6 预设映射器要求
 */

import type {
  StPresetRaw,
  StPromptEntry,
  StPromptOrderEntry,
  PresetProfile,
  PresetPromptEntry,
  PresetSampler,
  PresetContextBudget,
  PresetSession,
  PresetExtensions,
  StBuiltinIdentifier,
} from './types';
import { isStBuiltinIdentifier } from './types';

// ───────────────────────────────────────────────────────────
//  默认值
// ───────────────────────────────────────────────────────────

const DEFAULT_SAMPLER: PresetSampler = {
  temperature: 0.8,
  topP: 1.0,
  topK: 0,
  topA: 0,
  minP: 0,
  repetitionPenalty: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

const DEFAULT_CONTEXT: PresetContextBudget = {
  maxContext: 32000,
  maxTokens: 1500,
  maxContextUnlocked: false,
};

const DEFAULT_SESSION: PresetSession = {
  stream: true,
  useSystemPrompt: true,
  squashSystemMessages: false,
  assistantPrefill: '',
  continuePostfix: '',
  newChatPrefix: '',
  newFirstChatPrefix: '',
  namesBehavior: -1,
  sendIfEmpty: '',
  wiFormat: '',
};

// ───────────────────────────────────────────────────────────
//  映射器主入口
// ───────────────────────────────────────────────────────────

/**
 * 把 StPresetRaw 映射为 PresetProfile
 *
 * @param raw ST 预设原始对象
 * @param name 预设名(已由导入器推导)
 * @param sourceType chat_completion_source
 * @param version preset_version
 * @param fileName 原始文件名(用于 trace)
 * @param warnings 警告数组(累积,不阻塞)
 */
export function mapPreset(
  raw: StPresetRaw,
  name: string,
  sourceType: string,
  version: string,
  fileName: string | undefined,
  warnings: string[],
): PresetProfile {
  // 1. 构建 prompts[] 映射(identifier → StPromptEntry)
  const promptsMap = new Map<string, StPromptEntry>();
  if (Array.isArray(raw.prompts)) {
    for (const p of raw.prompts) {
      if (p && typeof p.identifier === 'string') {
        promptsMap.set(p.identifier, p);
      }
    }
  }

  // 2. 解析 prompt_order(优先取 character_id=100001 的通用组,否则取第一个组)
  let orderEntries: StPromptOrderEntry[] = [];
  if (Array.isArray(raw.prompt_order) && raw.prompt_order.length > 0) {
    // 优先找通用组(character_id=100001 或 undefined)
    const genericGroup =
      raw.prompt_order.find(
        (g) => g && (g.character_id === 100001 || g.character_id === undefined),
      ) ?? raw.prompt_order[0];
    if (genericGroup && Array.isArray(genericGroup.order)) {
      orderEntries = genericGroup.order;
    }
  }

  // 3. 映射 prompts(按 prompt_order 顺序;若 prompt_order 为空,按 prompts 数组顺序)
  const prompts: PresetPromptEntry[] = [];
  if (orderEntries.length > 0) {
    // 按 prompt_order 顺序映射
    for (const ord of orderEntries) {
      if (!ord || typeof ord.identifier !== 'string') continue;
      const p = promptsMap.get(ord.identifier);
      if (!p) {
        // prompt_order 引用了不存在的 identifier,降级(记警告)
        warnings.push(`prompt_order 引用了不存在的 identifier: ${ord.identifier}`);
        continue;
      }
      // prompt_order 的 enabled 优先于 prompts[] 中的 enabled
      prompts.push(mapPromptEntry(p, ord.enabled));
    }
    // 补充 prompt_order 中未包含的 prompts[](避免丢数据)
    for (const p of promptsMap.values()) {
      if (!orderEntries.some((o) => o.identifier === p.identifier)) {
        warnings.push(`prompts[] 中有条目未出现在 prompt_order: ${p.identifier}(按默认顺序追加)`);
        prompts.push(mapPromptEntry(p, p.enabled ?? true));
      }
    }
  } else {
    // 无 prompt_order,按 prompts 数组顺序映射
    for (const p of promptsMap.values()) {
      prompts.push(mapPromptEntry(p, p.enabled ?? true));
    }
  }

  // 4. 映射 sampler
  const sampler = mapSampler(raw);

  // 5. 映射上下文预算
  const context = mapContext(raw);

  // 6. 映射会话控制
  const session = mapSession(raw);

  // 7. 映射扩展数据
  const extensions = mapExtensions(raw);

  return {
    name,
    source: fileName ?? name,
    version,
    sourceType,
    prompts,
    sampler,
    context,
    session,
    extensions,
    importedAt: Date.now(),
    raw,
    warnings,
  };
}

// ───────────────────────────────────────────────────────────
//  子映射器
// ───────────────────────────────────────────────────────────

/** 映射单条 prompt */
function mapPromptEntry(p: StPromptEntry, enabled: boolean): PresetPromptEntry {
  const identifier = p.identifier;
  const isBuiltin = isStBuiltinIdentifier(identifier);
  return {
    identifier,
    name: typeof p.name === 'string' ? p.name : identifier,
    enabled,
    role: p.role === 'user' ? 'user' : p.role === 'assistant' ? 'assistant' : 'system',
    content: typeof p.content === 'string' ? p.content : '',
    injectionPosition: typeof p.injection_position === 'number' ? p.injection_position : 0,
    injectionDepth: typeof p.injection_depth === 'number' ? p.injection_depth : 0,
    injectionOrder: typeof p.injection_order === 'number' ? p.injection_order : 0,
    isSystemPrompt: p.system_prompt === true,
    isMarker: p.marker === true,
    forbidOverrides: p.forbid_overrides === true,
    isBuiltin,
    builtinSlot: isBuiltin ? (identifier as StBuiltinIdentifier) : undefined,
  };
}

/** 映射 sampler 参数 */
function mapSampler(raw: StPresetRaw): PresetSampler {
  return {
    temperature: numOr(raw.temperature, DEFAULT_SAMPLER.temperature),
    topP: numOr(raw.top_p, DEFAULT_SAMPLER.topP),
    topK: numOr(raw.top_k, DEFAULT_SAMPLER.topK),
    topA: numOr(raw.top_a, DEFAULT_SAMPLER.topA),
    minP: numOr(raw.min_p, DEFAULT_SAMPLER.minP),
    repetitionPenalty: numOr(raw.repetition_penalty, DEFAULT_SAMPLER.repetitionPenalty),
    frequencyPenalty: numOr(raw.frequency_penalty, DEFAULT_SAMPLER.frequencyPenalty),
    presencePenalty: numOr(raw.presence_penalty, DEFAULT_SAMPLER.presencePenalty),
    seed: typeof raw.seed === 'number' ? raw.seed : undefined,
    reasoningEffort: raw.reasoning_effort,
    verbosity: typeof raw.verbosity === 'number' ? raw.verbosity : undefined,
  };
}

/** 映射上下文预算 */
function mapContext(raw: StPresetRaw): PresetContextBudget {
  return {
    maxContext: numOr(raw.openai_max_context, DEFAULT_CONTEXT.maxContext),
    maxTokens: numOr(raw.openai_max_tokens, DEFAULT_CONTEXT.maxTokens),
    maxContextUnlocked: raw.max_context_unlocked === true,
  };
}

/** 映射会话控制 */
function mapSession(raw: StPresetRaw): PresetSession {
  return {
    stream: raw.stream_openai !== false, // 默认 true
    useSystemPrompt: raw.use_sysprompt !== false, // 默认 true
    squashSystemMessages: raw.squash_system_messages === true,
    assistantPrefill: strOr(raw.assistant_prefill, DEFAULT_SESSION.assistantPrefill),
    continuePostfix: strOr(raw.continue_postfix, DEFAULT_SESSION.continuePostfix),
    newChatPrefix: strOr(raw.new_chat_prefix, DEFAULT_SESSION.newChatPrefix),
    newFirstChatPrefix: strOr(raw.new_first_chat_prefix, DEFAULT_SESSION.newFirstChatPrefix),
    namesBehavior: numOr(raw.names_behavior, DEFAULT_SESSION.namesBehavior),
    sendIfEmpty: strOr(raw.send_if_empty, DEFAULT_SESSION.sendIfEmpty),
    wiFormat: strOr(raw.wi_format, DEFAULT_SESSION.wiFormat),
  };
}

/** 映射扩展数据 */
function mapExtensions(raw: StPresetRaw): PresetExtensions {
  const ext = raw.extensions ?? {};
  return {
    biasPresetSelected:
      typeof ext.bias_preset_selected === 'string' ? ext.bias_preset_selected : undefined,
    raw: ext,
  };
}

// ───────────────────────────────────────────────────────────
//  辅助
// ───────────────────────────────────────────────────────────

function numOr(v: unknown, def: number): number {
  return typeof v === 'number' && !Number.isNaN(v) ? v : def;
}

function strOr(v: unknown, def: string): string {
  return typeof v === 'string' ? v : def;
}

// ───────────────────────────────────────────────────────────
//  冲突处理(阶段1 默认 merge)
// ───────────────────────────────────────────────────────────

/**
 * 合并两个 PresetProfile(冲突时按 strategy 处理)
 *  - builtin-wins:内置预设优先
 *  - preset-wins:导入预设优先
 *  - merge:同 identifier 取导入预设,新增的追加(默认)
 */
export function mergePresets(
  builtin: PresetProfile,
  imported: PresetProfile,
  strategy: 'builtin-wins' | 'preset-wins' | 'merge' = 'merge',
): PresetProfile {
  if (strategy === 'preset-wins') return imported;
  if (strategy === 'builtin-wins') return builtin;

  // merge:同 identifier 取导入预设,新增的追加
  const merged = new Map<string, PresetPromptEntry>();
  for (const p of builtin.prompts) merged.set(p.identifier, p);
  for (const p of imported.prompts) merged.set(p.identifier, p);

  return {
    ...imported,
    name: `${builtin.name}+${imported.name}`,
    prompts: Array.from(merged.values()),
    sampler: imported.sampler,
    context: imported.context,
    session: imported.session,
    extensions: imported.extensions,
    warnings: [...builtin.warnings, ...imported.warnings],
  };
}

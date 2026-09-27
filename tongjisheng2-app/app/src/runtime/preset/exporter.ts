/**
 * 预设导出器(阶段3 步骤9)
 *
 * 职责:
 *  - 把应用内 PresetProfile 反向映射为 ST ChatCompletion 预设 JSON(StPresetRaw)
 *  - 生成可下载的 JSON Blob/文件
 *  - 字段对齐 SillyTavern 导入格式,确保导出后可再次导入
 *
 * 反向映射规则(与 mapper.ts 对称):
 *  - PresetPromptEntry → StPromptEntry(identifier/name/enabled/role/content/injection_*相关字段/system_prompt/marker/forbid_overrides)
 *  - prompts 数组 + 排序信息 → prompt_order(character_id=100001 的 order 数组)
 *  - PresetSampler → 顶层 sampler 字段(temperature/top_p 等)
 *  - PresetContextBudget → openai_max_context / openai_max_tokens / max_context_unlocked
 *  - PresetSession → stream_openai / use_sysprompt 等
 *  - PresetExtensions → extensions
 *
 * 参考:
 *  - stage-roadmap.md 步骤9 预设导出器要求
 *  - mapper.ts 正向映射规则
 */

import type {
  PresetProfile,
  PresetPromptEntry,
  StPresetRaw,
  StPromptEntry,
  StPromptOrderEntry,
  StPromptOrderGroup,
} from './types';

// ───────────────────────────────────────────────────────────
//  反向映射:PresetProfile → StPresetRaw
// ───────────────────────────────────────────────────────────

/**
 * 把 PresetProfile 反向映射为 StPresetRaw
 *  - 保留原始 raw 字段(如有),覆盖被编辑过的字段
 *  - prompts 按当前顺序生成 prompt_order
 *  - sampler/context/session/extensions 全量回写
 */
export function exportPreset(profile: PresetProfile): StPresetRaw {
  // 1. 映射 prompts[]
  const prompts: StPromptEntry[] = profile.prompts.map(mapPromptEntryToRaw);

  // 2. 生成 prompt_order(通用组 character_id=100001)
  const orderEntries: StPromptOrderEntry[] = profile.prompts.map((p) => ({
    identifier: p.identifier,
    enabled: p.enabled,
  }));
  const promptOrder: StPromptOrderGroup[] = [
    {
      character_id: 100001,
      order: orderEntries,
    },
  ];

  // 3. 顶层 sampler 字段
  const s = profile.sampler;
  const c = profile.context;
  const sess = profile.session;
  const ext = profile.extensions;

  // 4. 合并原始 raw(保留未知字段,避免丢数据)+ 覆盖已编辑字段
  const raw: StPresetRaw = {
    ...(profile.raw ?? {}),
    chat_completion_source: (profile.sourceType || 'openai') as StPresetRaw['chat_completion_source'],
    preset_version: profile.version || '1.0.0',
    preset_name: profile.name,
    prompts,
    prompt_order: promptOrder,
    // sampler
    temperature: s.temperature,
    top_p: s.topP,
    top_k: s.topK,
    top_a: s.topA,
    min_p: s.minP,
    repetition_penalty: s.repetitionPenalty,
    frequency_penalty: s.frequencyPenalty,
    presence_penalty: s.presencePenalty,
    seed: s.seed,
    reasoning_effort: s.reasoningEffort,
    verbosity: s.verbosity,
    // 上下文
    openai_max_context: c.maxContext,
    openai_max_tokens: c.maxTokens,
    max_context_unlocked: c.maxContextUnlocked,
    // 会话
    stream_openai: sess.stream,
    use_sysprompt: sess.useSystemPrompt,
    squash_system_messages: sess.squashSystemMessages,
    assistant_prefill: sess.assistantPrefill,
    continue_postfix: sess.continuePostfix,
    new_chat_prefix: sess.newChatPrefix,
    new_first_chat_prefix: sess.newFirstChatPrefix,
    names_behavior: sess.namesBehavior,
    send_if_empty: sess.sendIfEmpty,
    wi_format: sess.wiFormat,
    // 扩展
    extensions: {
      ...(ext?.raw ?? {}),
      bias_preset_selected: ext?.biasPresetSelected,
    },
  };

  // 清理 undefined 值(避免 JSON 中出现 undefined)
  return cleanUndefined(raw);
}

// ───────────────────────────────────────────────────────────
//  子映射器
// ───────────────────────────────────────────────────────────

/** 单条 prompt 反向映射 */
function mapPromptEntryToRaw(p: PresetPromptEntry): StPromptEntry {
  const entry: StPromptEntry = {
    identifier: p.identifier,
    name: p.name,
    enabled: p.enabled,
    role: p.role,
    content: p.content,
    injection_position: p.injectionPosition,
    injection_depth: p.injectionDepth,
    injection_order: p.injectionOrder,
    system_prompt: p.isSystemPrompt,
    marker: p.isMarker,
    forbid_overrides: p.forbidOverrides,
  };
  return cleanUndefined(entry) as StPromptEntry;
}

// ───────────────────────────────────────────────────────────
//  JSON 序列化 + 下载
// ───────────────────────────────────────────────────────────

/**
 * 把 PresetProfile 序列化为 ST 预设 JSON 字符串
 *  - 2 空格缩进,确保可读性
 *  - 不含 undefined 字段
 */
export function serializePreset(profile: PresetProfile): string {
  const raw = exportPreset(profile);
  return JSON.stringify(raw, null, 2);
}

/**
 * 触发浏览器下载预设 JSON 文件
 *  - 文件名:{presetName}.json
 *  - 兼容全角特殊字符(保留原名)
 */
export function downloadPreset(profile: PresetProfile): void {
  const json = serializePreset(profile);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // 文件名:用 preset_name,清理不合法文件字符
  const safeName = profile.name.replace(/[<>:"/\\|?*]/g, '_').trim() || 'preset';
  a.download = `${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 释放 URL
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ───────────────────────────────────────────────────────────
//  辅助
// ───────────────────────────────────────────────────────────

/** 递归清理对象中的 undefined 字段(不删除 null/0/false) */
function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v === undefined) continue;
    result[k] = typeof v === 'object' && v !== null ? cleanUndefined(v) : v;
  }
  return result as T;
}

// ───────────────────────────────────────────────────────────
//  预设克隆 + 编辑辅助
// ───────────────────────────────────────────────────────────

/**
 * 深拷贝 PresetProfile(用于编辑时保留原版)
 *  - 重置 name 为 "{原名} (副本)"
 *  - 重置 importedAt
 *  - 清空 warnings
 */
export function clonePresetForEdit(profile: PresetProfile): PresetProfile {
  const cloned: PresetProfile = JSON.parse(JSON.stringify(profile));
  cloned.name = `${profile.name} (副本)`;
  cloned.importedAt = Date.now();
  cloned.warnings = [];
  return cloned;
}

/**
 * 校验编辑后的 PresetProfile 完整性
 *  - prompts 至少 1 条
 *  - 每条 prompt 必须有 identifier(非空字符串)
 *  - sampler 数值在合理范围
 *  - context 数值合理
 */
export function validateEditedPreset(profile: PresetProfile): {
  ok: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (profile.prompts.length === 0) {
    errors.push('prompts 不能为空');
  }

  const identifiers = new Set<string>();
  for (let i = 0; i < profile.prompts.length; i++) {
    const p = profile.prompts[i];
    if (!p.identifier || typeof p.identifier !== 'string') {
      errors.push(`prompts[${i}].identifier 缺失`);
      continue;
    }
    if (identifiers.has(p.identifier)) {
      warnings.push(`prompts[${i}].identifier 重复: ${p.identifier}`);
    }
    identifiers.add(p.identifier);
    if (!p.name) {
      warnings.push(`prompts[${i}].name 为空,将使用 identifier`);
    }
  }

  const s = profile.sampler;
  if (s.temperature < 0 || s.temperature > 2) {
    warnings.push(`sampler.temperature=${s.temperature} 超出常规范围 [0, 2]`);
  }
  if (s.topP < 0 || s.topP > 1) {
    warnings.push(`sampler.top_p=${s.topP} 超出常规范围 [0, 1]`);
  }
  if (s.repetitionPenalty < 0.5 || s.repetitionPenalty > 2) {
    warnings.push(`sampler.repetition_penalty=${s.repetitionPenalty} 超出常规范围 [0.5, 2]`);
  }

  const c = profile.context;
  if (c.maxContext < 1000) {
    errors.push(`context.maxContext=${c.maxContext} 过小(最小 1000)`);
  }
  if (c.maxTokens < 100) {
    errors.push(`context.maxTokens=${c.maxTokens} 过小(最小 100)`);
  }
  if (c.maxTokens >= c.maxContext) {
    warnings.push(`context.maxTokens(${c.maxTokens}) >= context.maxContext(${c.maxContext}),回复可能挤占上下文`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * 内置预设模板库(步骤6)
 *
 * 提供 2 个内置预设:
 *  - 原卡默认:基于原卡 D0 调度树 + 扮演准则 + MVU 格式,使用 ST 内置标识符
 *  - 恋爱模拟:优化 Sampler(更高 temperature/更低 repetition_penalty),适合 RP
 *
 * 内置预设直接生成 PresetProfile 对象(不经过 importer,因为不是从 ST JSON 导入)
 * 但仍使用 StPresetRaw 兼容格式,便于统一处理
 *
 * 宏支持:content 中可含 {{user}}/{{char}}/{{getvar::xxx}} 等,由 Prompt 组装器运行时展开
 * 占位符:{{D0_CONTROLLER_OUTPUT}} 由 Prompt 组装器替换为 EJS 渲染结果
 *        {{STATUS_BAR_VARIABLES}} 由 Prompt 组装器替换为 MVU 变量列表
 *        {{VARIABLE_OUTPUT_FORMAT}} 由 Prompt 组装器替换为变量输出格式
 */

import type { PresetProfile, StPresetRaw } from '../../runtime/preset/types';

// ───────────────────────────────────────────────────────────
//  共享:构建 StPresetRaw
// ───────────────────────────────────────────────────────────

function buildRaw(
  name: string,
  prompts: Array<{
    identifier: string;
    name: string;
    enabled: boolean;
    role: 'system' | 'user' | 'assistant';
    content: string;
    injection_position?: number;
    injection_depth?: number;
    injection_order?: number;
    system_prompt?: boolean;
    marker?: boolean;
  }>,
  sampler: {
    temperature: number;
    top_p: number;
    top_k: number;
    repetition_penalty: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    seed?: number;
  },
  context: { max_context: number; max_tokens: number },
  session?: Partial<{
    stream_openai: boolean;
    use_sysprompt: boolean;
    names_behavior: number;
    send_if_empty: string;
    wi_format: string;
  }>,
): StPresetRaw {
  return {
    chat_completion_source: 'openai',
    preset_version: '1.0.0',
    preset_name: name,
    prompts,
    prompt_order: [
      {
        character_id: 100001,
        order: prompts.map((p) => ({ identifier: p.identifier, enabled: p.enabled })),
      },
    ],
    temperature: sampler.temperature,
    top_p: sampler.top_p,
    top_k: sampler.top_k,
    repetition_penalty: sampler.repetition_penalty,
    frequency_penalty: sampler.frequency_penalty ?? 0,
    presence_penalty: sampler.presence_penalty ?? 0,
    seed: sampler.seed,
    openai_max_context: context.max_context,
    openai_max_tokens: context.max_tokens,
    max_context_unlocked: false,
    stream_openai: session?.stream_openai ?? true,
    use_sysprompt: session?.use_sysprompt ?? true,
    squash_system_messages: false,
    names_behavior: session?.names_behavior ?? -1,
    send_if_empty: session?.send_if_empty ?? '',
    wi_format: session?.wi_format ?? '',
    extensions: {},
  };
}

// ───────────────────────────────────────────────────────────
//  内置预设 1:原卡默认
// ───────────────────────────────────────────────────────────

const originalDefaultRaw = buildRaw(
  '原卡默认',
  [
    {
      identifier: 'main',
      name: '主提示词(D0调度树输出)',
      enabled: true,
      role: 'system',
      content:
        '{{D0_CONTROLLER_OUTPUT}}\n\n' +
        '【扮演准则】\n' +
        '- 严格按 D0 控制器输出的合法性清单执行\n' +
        '- 第一人称视角(我),口语化,禁止数据化呈现\n' +
        '- 叙事正文 ≤1300 字(H场景 ≤1600 字)\n' +
        '- 必须在正文末尾单独一行输出 <StatusPlaceHolderImpl/>\n' +
        '- 变量变化时输出 <UpdateVariable> 块(JSONPatch 格式)',
      injection_position: 0,
      injection_order: 100,
    },
    {
      identifier: 'worldInfoBefore',
      name: '世界书前置(世界观/扮演准则)',
      enabled: true,
      role: 'system',
      content: '{{WORLDBOOK_BEFORE_OUTPUT}}',
      injection_position: 0,
      injection_order: 50,
    },
    {
      identifier: 'charDescription',
      name: '角色档案(当前女角)',
      enabled: true,
      role: 'system',
      content: '{{CHAR_PROFILE_OUTPUT}}',
      injection_position: 0,
      injection_order: 60,
    },
    {
      identifier: 'worldInfoAfter',
      name: '世界书后置(场景条目)',
      enabled: true,
      role: 'system',
      content: '{{WORLDBOOK_AFTER_OUTPUT}}',
      injection_position: 0,
      injection_order: 70,
    },
    {
      identifier: 'chatHistory',
      name: '聊天历史',
      enabled: true,
      role: 'system',
      content: '',
      marker: true,
      injection_position: 0,
      injection_order: 80,
    },
    {
      identifier: 'jailbreak',
      name: '越狱(NSFW 解锁)',
      enabled: true,
      role: 'system',
      content:
        '【NSFW 解锁】\n' +
        '- 成人内容允许,按 NSFW 硬门槛 5 级校验\n' +
        '- 关系阶段/好感/心动/信任/H经验 门槛必须满足\n' +
        '- 不满足时禁止触发对应 NSFW 行为\n' +
        '- 不可逆字段(初吻/初H/处女膜)触发后必须更新',
      injection_position: 0,
      injection_order: 90,
    },
    {
      identifier: 'enhanceDefinitions',
      name: '变量输出格式(额外模型)',
      enabled: true,
      role: 'system',
      content: '{{VARIABLE_OUTPUT_FORMAT}}',
      injection_position: 0,
      injection_order: 110,
    },
  ],
  { temperature: 0.8, top_p: 1.0, top_k: 0, repetition_penalty: 1.05 },
  { max_context: 32000, max_tokens: 1500 },
  { stream_openai: true, use_sysprompt: true, names_behavior: -1 },
);

// ───────────────────────────────────────────────────────────
//  内置预设 2:恋爱模拟
// ───────────────────────────────────────────────────────────

const romanceSimRaw = buildRaw(
  '恋爱模拟',
  [
    {
      identifier: 'main',
      name: '主提示词(恋爱模拟优化)',
      enabled: true,
      role: 'system',
      content:
        '{{D0_CONTROLLER_OUTPUT}}\n\n' +
        '【恋爱模拟扮演准则】\n' +
        '- 侧重情感细腻描写,女角心理活动丰富\n' +
        '- 第一人称视角(我),口语化,日常感强\n' +
        '- 叙事正文 ≤1300 字,恋爱互动场景优先\n' +
        '- 必须在正文末尾单独一行输出 <StatusPlaceHolderImpl/>\n' +
        '- 变量变化时输出 <UpdateVariable> 块\n' +
        '- 好感/心动/信任变化需有叙事来源,幅度遵守变量更新规则',
      injection_position: 0,
      injection_order: 100,
    },
    {
      identifier: 'worldInfoBefore',
      name: '世界书前置',
      enabled: true,
      role: 'system',
      content: '{{WORLDBOOK_BEFORE_OUTPUT}}',
      injection_position: 0,
      injection_order: 50,
    },
    {
      identifier: 'charDescription',
      name: '角色档案',
      enabled: true,
      role: 'system',
      content: '{{CHAR_PROFILE_OUTPUT}}',
      injection_position: 0,
      injection_order: 60,
    },
    {
      identifier: 'worldInfoAfter',
      name: '世界书后置',
      enabled: true,
      role: 'system',
      content: '{{WORLDBOOK_AFTER_OUTPUT}}',
      injection_position: 0,
      injection_order: 70,
    },
    {
      identifier: 'chatHistory',
      name: '聊天历史',
      enabled: true,
      role: 'system',
      content: '',
      marker: true,
      injection_position: 0,
      injection_order: 80,
    },
    {
      identifier: 'jailbreak',
      name: '越狱(NSFW 解锁)',
      enabled: true,
      role: 'system',
      content:
        '【NSFW 解锁·恋爱模拟】\n' +
        '- 成人内容允许,按 NSFW 硬门槛校验\n' +
        '- 恋爱模拟侧重情感铺垫,NSFW 行为需关系阶段达标\n' +
        '- 不可逆字段触发后必须更新',
      injection_position: 0,
      injection_order: 90,
    },
    {
      identifier: 'enhanceDefinitions',
      name: '变量输出格式',
      enabled: true,
      role: 'system',
      content: '{{VARIABLE_OUTPUT_FORMAT}}',
      injection_position: 0,
      injection_order: 110,
    },
  ],
  // 恋爱模拟:更高 temperature(更感性),更低 repetition_penalty(更自然),top_p 略低(更聚焦)
  { temperature: 0.95, top_p: 0.92, top_k: 0, repetition_penalty: 1.02 },
  { max_context: 32000, max_tokens: 1500 },
  { stream_openai: true, use_sysprompt: true, names_behavior: -1 },
);

// ───────────────────────────────────────────────────────────
//  导出 PresetProfile(经 mapper 转换)
// ───────────────────────────────────────────────────────────

import { mapPreset } from '../../runtime/preset/mapper';

function toProfile(raw: StPresetRaw, warnings: string[] = []): PresetProfile {
  return mapPreset(
    raw,
    raw.preset_name ?? 'unknown',
    raw.chat_completion_source ?? 'openai',
    raw.preset_version ?? '',
    `(builtin)${raw.preset_name}`,
    warnings,
  );
}

export const builtinOriginalDefault: PresetProfile = toProfile(originalDefaultRaw);
export const builtinRomanceSim: PresetProfile = toProfile(romanceSimRaw);

/** 内置预设列表 */
export const BUILTIN_PRESETS: PresetProfile[] = [builtinOriginalDefault, builtinRomanceSim];

/** 按名称查找内置预设 */
export function findBuiltinPreset(name: string): PresetProfile | undefined {
  return BUILTIN_PRESETS.find((p) => p.name === name);
}

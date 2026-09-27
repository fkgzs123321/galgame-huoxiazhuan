/**
 * promptTypes · 提示词类型契约
 * 对齐 fanren-remake 的 presetTypes:预设/提示词的 SSOT 类型。
 * 所有类型直接再导出自 runtime/preset/types(实现仍在 runtime,避免破坏现有引用)。
 */
export type {
  PresetProfile,
  PresetPromptEntry,
  PresetSampler,
  PresetContextBudget,
  PresetSession,
  PresetExtensions,
  PresetImportResult,
  StPresetRaw,
  StPromptEntry,
  StSampler,
  ConflictStrategy,
} from '@runtime/preset/types';
export {
  ST_BUILTIN_IDENTIFIERS,
  isStBuiltinIdentifier,
} from '@runtime/preset/types';
export type { StBuiltinIdentifier } from '@runtime/preset/types';

/**
 * presetAssembler · 预设组装器
 * 对齐 fanren-remake 的 presetAssembler:
 *  - 内置预设查找
 *  - 预设名 → PresetProfile 解析(内置优先,导入兜底)
 *  - 预设缓存(内存级)
 */
import { BUILTIN_PRESETS, findBuiltinPreset } from '@content/presets/builtin-presets';
import type { PresetProfile } from './promptTypes';

/** 内存缓存:预设名 → PresetProfile */
const presetCache = new Map<string, PresetProfile>();

/** 内置预设列表(只读快照) */
export function listBuiltinPresets(): PresetProfile[] {
  return BUILTIN_PRESETS;
}

/** 按名称解析预设(内置优先;导入预设需调用方提供) */
export async function resolvePresetByName(
  name: string,
  options?: { imported?: PresetProfile[] },
): Promise<PresetProfile | undefined> {
  // 1. 缓存命中
  const cached = presetCache.get(name);
  if (cached) return cached;
  // 2. 内置
  const builtin = findBuiltinPreset(name);
  if (builtin) {
    presetCache.set(name, builtin);
    return builtin;
  }
  // 3. 导入列表
  const imported = options?.imported?.find((p) => p.name === name);
  if (imported) {
    presetCache.set(name, imported);
    return imported;
  }
  // 4. 从 IndexedDB 加载导入预设(轻量)
  try {
    const { loadPreset } = await import('@runtime/preset');
    const stored = await loadPreset(name);
    if (stored) {
      presetCache.set(name, stored);
      return stored;
    }
  } catch {
    // 忽略读取失败
  }
  return undefined;
}

/** 清空缓存(预设变更后调用) */
export function clearPresetCache(): void {
  presetCache.clear();
}

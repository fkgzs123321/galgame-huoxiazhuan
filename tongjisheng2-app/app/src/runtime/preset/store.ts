/**
 * 预设存储(步骤6)
 *
 * 职责:
 *  - 用 IndexedDB KV 存储导入的 PresetProfile
 *  - 支持加载/保存/列出/删除预设
 *  - 内置预设(原卡默认/恋爱模拟)由 src/content/presets/ 提供,不入库
 *
 * KV key 设计:
 *  - 预设列表索引: __preset_index__ → Array<{ id, name, source, importedAt }>
 *  - 单个预设: __preset_${id}__ → PresetProfile
 */

import type { PresetProfile } from './types';
import * as idb from '../../db/indexeddb';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

export interface PresetIndexEntry {
  id: string;
  name: string;
  source: string;
  importedAt: number;
  promptCount: number;
}

const INDEX_KEY = '__preset_index__';
const presetKey = (id: string) => `__preset_${id}__`;

// ───────────────────────────────────────────────────────────
//  存储操作
// ───────────────────────────────────────────────────────────

/** 列出所有已导入预设 */
export async function listPresets(): Promise<PresetIndexEntry[]> {
  const idx = await idb.kvGet<PresetIndexEntry[]>(INDEX_KEY);
  return Array.isArray(idx) ? idx : [];
}

/** 加载单个预设(完整 PresetProfile) */
export async function loadPreset(id: string): Promise<PresetProfile | null> {
  return (await idb.kvGet<PresetProfile>(presetKey(id))) ?? null;
}

/** 保存预设(返回 id) */
export async function savePreset(profile: PresetProfile): Promise<string> {
  // 生成 id(用 name + importedAt,避免重复)
  const id = `${profile.name.replace(/\s+/g, '_')}_${profile.importedAt}`;
  await idb.kvSet(presetKey(id), profile);

  // 更新索引
  const idx = await listPresets();
  const entry: PresetIndexEntry = {
    id,
    name: profile.name,
    source: profile.source,
    importedAt: profile.importedAt,
    promptCount: profile.prompts.length,
  };
  // 去重(同 id 覆盖)
  const filtered = idx.filter((e) => e.id !== id);
  filtered.push(entry);
  filtered.sort((a, b) => b.importedAt - a.importedAt);
  await idb.kvSet(INDEX_KEY, filtered);

  return id;
}

/** 删除预设 */
export async function deletePreset(id: string): Promise<void> {
  await idb.kvDelete(presetKey(id));
  const idx = await listPresets();
  const filtered = idx.filter((e) => e.id !== id);
  await idb.kvSet(INDEX_KEY, filtered);
}

/** 清空所有已导入预设 */
export async function clearAllPresets(): Promise<void> {
  const idx = await listPresets();
  for (const e of idx) {
    await idb.kvDelete(presetKey(e.id));
  }
  await idb.kvDelete(INDEX_KEY);
}

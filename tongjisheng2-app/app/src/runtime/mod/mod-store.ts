/**
 * MOD 存储层(阶段4 创意工坊)
 *
 * 职责:
 *  - MOD 清单的 IndexedDB 持久化
 *  - MOD 内容数据的存储与读取
 *  - MOD 启用状态管理
 *  - 加载顺序管理
 *
 * 存储结构(kv store):
 *  - mod:list                → InstalledMod[] (已安装 MOD 列表)
 *  - mod:content:{modId}:{entryId} → 内容数据
 *  - mod:enabled:{modId}     → boolean (启用状态,冗余字段便于查询)
 */

import * as idb from '../../db/indexeddb';
import {
  MOD_LIST_KV_KEY,
  MOD_CONTENT_KV_PREFIX,
  MOD_ENABLED_PREFIX,
  type InstalledMod,
  type ModManifest,
  type ModContentEntry,
} from './mod-types';

// ───────────────────────────────────────────────────────────
//  MOD 列表管理
// ───────────────────────────────────────────────────────────

/** 获取已安装 MOD 列表 */
export async function getInstalledMods(): Promise<InstalledMod[]> {
  const list = await idb.kvGet<InstalledMod[]>(MOD_LIST_KV_KEY);
  return list ?? [];
}

/** 保存已安装 MOD 列表 */
async function saveInstalledMods(list: InstalledMod[]): Promise<void> {
  await idb.kvSet(MOD_LIST_KV_KEY, list);
}

/** 按 ID 查找已安装 MOD */
export async function findInstalledMod(modId: string): Promise<InstalledMod | null> {
  const list = await getInstalledMods();
  return list.find((m) => m.manifest.id === modId) ?? null;
}

/** 获取下一个加载顺序号 */
async function getNextLoadOrder(): Promise<number> {
  const list = await getInstalledMods();
  if (list.length === 0) return 0;
  return Math.max(...list.map((m) => m.loadOrder)) + 1;
}

// ───────────────────────────────────────────────────────────
//  MOD 安装/卸载
// ───────────────────────────────────────────────────────────

/**
 * 安装 MOD(写入清单 + 内容数据)
 *  - 若 MOD ID 已存在,更新清单和内容(覆盖)
 *  - 新 MOD 分配下一个加载顺序号
 */
export async function installMod(
  manifest: ModManifest,
  contents: Record<string, unknown>,
): Promise<InstalledMod> {
  console.log('[installMod] start', { modId: manifest.id, contentEntries: manifest.contents.length });
  const existing = await findInstalledMod(manifest.id);
  const loadOrder = existing?.loadOrder ?? (await getNextLoadOrder());
  console.log('[installMod] existing?', !!existing, 'loadOrder=', loadOrder);

  const installed: InstalledMod = {
    manifest,
    enabled: existing?.enabled ?? true,
    installedAt: existing?.installedAt ?? Date.now(),
    loadOrder,
  };

  // 写入内容数据
  for (const entry of manifest.contents) {
    const data = contents[entry.entryId];
    if (data !== undefined) {
      await setModContent(manifest.id, entry.entryId, data);
      console.log('[installMod] content written', { entryId: entry.entryId });
    }
  }

  // 更新清单列表
  const list = await getInstalledMods();
  console.log('[installMod] current list before update', { count: list.length });
  const idx = list.findIndex((m) => m.manifest.id === manifest.id);
  if (idx >= 0) {
    list[idx] = installed;
    console.log('[installMod] replacing existing entry at idx', idx);
  } else {
    list.push(installed);
    console.log('[installMod] pushing new entry, list now has', list.length);
  }
  await saveInstalledMods(list);
  console.log('[installMod] list saved');

  // 写入启用状态(冗余)
  await idb.kvSet(MOD_ENABLED_PREFIX + manifest.id, installed.enabled);
  console.log('[installMod] done', { modId: manifest.id });

  return installed;
}

/** 卸载 MOD(删除清单 + 内容数据) */
export async function uninstallMod(modId: string): Promise<void> {
  const mod = await findInstalledMod(modId);
  if (!mod) return;

  // 删除内容数据
  for (const entry of mod.manifest.contents) {
    await idb.kvDelete(MOD_CONTENT_KV_PREFIX + modId + ':' + entry.entryId);
  }

  // 删除启用状态
  await idb.kvDelete(MOD_ENABLED_PREFIX + modId);

  // 从清单列表移除
  const list = await getInstalledMods();
  const filtered = list.filter((m) => m.manifest.id !== modId);
  await saveInstalledMods(filtered);
}

// ───────────────────────────────────────────────────────────
//  MOD 启用/禁用
// ───────────────────────────────────────────────────────────

/** 启用/禁用 MOD */
export async function setModEnabled(modId: string, enabled: boolean): Promise<void> {
  const list = await getInstalledMods();
  const idx = list.findIndex((m) => m.manifest.id === modId);
  if (idx < 0) return;
  list[idx].enabled = enabled;
  await saveInstalledMods(list);
  await idb.kvSet(MOD_ENABLED_PREFIX + modId, enabled);
}

/** 查询 MOD 是否启用 */
export async function isModEnabled(modId: string): Promise<boolean> {
  const mod = await findInstalledMod(modId);
  return mod?.enabled ?? false;
}

// ───────────────────────────────────────────────────────────
//  MOD 内容数据读写
// ───────────────────────────────────────────────────────────

/** 写入 MOD 内容数据 */
export async function setModContent(
  modId: string,
  entryId: string,
  data: unknown,
): Promise<void> {
  await idb.kvSet(MOD_CONTENT_KV_PREFIX + modId + ':' + entryId, data);
}

/** 读取 MOD 内容数据 */
export async function getModContent<T = unknown>(
  modId: string,
  entryId: string,
): Promise<T | null> {
  return idb.kvGet<T>(MOD_CONTENT_KV_PREFIX + modId + ':' + entryId);
}

/** 读取 MOD 所有内容数据 */
export async function getModAllContents(
  modId: string,
  entries: ModContentEntry[],
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  for (const entry of entries) {
    const data = await getModContent(modId, entry.entryId);
    if (data !== null) {
      result[entry.entryId] = data;
    }
  }
  return result;
}

// ───────────────────────────────────────────────────────────
//  加载顺序管理
// ───────────────────────────────────────────────────────────

/** 调整 MOD 加载顺序 */
export async function setModLoadOrder(modId: string, order: number): Promise<void> {
  const list = await getInstalledMods();
  const idx = list.findIndex((m) => m.manifest.id === modId);
  if (idx < 0) return;
  list[idx].loadOrder = order;
  list.sort((a, b) => a.loadOrder - b.loadOrder);
  // 重新编号
  list.forEach((m, i) => (m.loadOrder = i));
  await saveInstalledMods(list);
}

/** 上移 MOD(加载顺序提前) */
export async function moveModUp(modId: string): Promise<void> {
  const list = await getInstalledMods();
  list.sort((a, b) => a.loadOrder - b.loadOrder);
  const idx = list.findIndex((m) => m.manifest.id === modId);
  if (idx <= 0) return;
  // 交换
  const tmp = list[idx].loadOrder;
  list[idx].loadOrder = list[idx - 1].loadOrder;
  list[idx - 1].loadOrder = tmp;
  await saveInstalledMods(list);
}

/** 下移 MOD(加载顺序延后) */
export async function moveModDown(modId: string): Promise<void> {
  const list = await getInstalledMods();
  list.sort((a, b) => a.loadOrder - b.loadOrder);
  const idx = list.findIndex((m) => m.manifest.id === modId);
  if (idx < 0 || idx >= list.length - 1) return;
  // 交换
  const tmp = list[idx].loadOrder;
  list[idx].loadOrder = list[idx + 1].loadOrder;
  list[idx + 1].loadOrder = tmp;
  await saveInstalledMods(list);
}

// ───────────────────────────────────────────────────────────
//  查询
// ───────────────────────────────────────────────────────────

/** 获取已启用的 MOD 列表(按加载顺序) */
export async function getEnabledMods(): Promise<InstalledMod[]> {
  const list = await getInstalledMods();
  return list
    .filter((m) => m.enabled)
    .sort((a, b) => a.loadOrder - b.loadOrder);
}

/** 获取 MOD 统计信息 */
export async function getModStats(): Promise<{
  total: number;
  enabled: number;
  disabled: number;
  totalContents: number;
}> {
  const list = await getInstalledMods();
  const enabled = list.filter((m) => m.enabled).length;
  const totalContents = list.reduce((sum, m) => sum + m.manifest.contents.length, 0);
  return {
    total: list.length,
    enabled,
    disabled: list.length - enabled,
    totalContents,
  };
}

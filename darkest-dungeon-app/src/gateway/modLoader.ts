// ============================================================
// Mod 加载器 — 扫描 public/mods 目录、加载并合并 Mod 数据
// ============================================================
// Mod 结构约定：public/mods/<mod-id>/ 下放置
//   mod.json      — Mod 元数据（必需）
//   heroes.json   — 额外英雄（可选）
//   monsters.json — 额外怪物（可选）
//   trinkets.json — 额外饰品（可选）
//   provisions.json — 额外补给品（可选）
// ============================================================

import type { ModInfo, ModData, HeroData, MonsterData, TrinketData } from '@/types';

const MODS_BASE = '/mods';

// 尝试 fetch 一个 JSON 文件，失败返回 null（忽略错误，不阻塞）
async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// 扫描 public/mods 目录下所有 Mod（每个子目录即为一个 Mod）
export async function scanMods(): Promise<ModInfo[]> {
  // 由于没有目录列表 API，我们无法枚举 public/mods 下的子目录。
  // 为此约定一个 manifest：public/mods/manifest.json 列出所有 Mod 的 id。
  // 若 manifest 不存在，则返回空数组（不影响正常游戏）。
  const manifest = await fetchJson<{ mods: string[] }>(`${MODS_BASE}/manifest.json`);
  if (!manifest || !Array.isArray(manifest.mods)) return [];

  const mods: ModInfo[] = [];
  for (const id of manifest.mods) {
    if (typeof id !== 'string' || !id) continue;
    const meta = await fetchJson<{
      id?: string;
      name?: string;
      version?: string;
      description?: string;
      author?: string;
    }>(`${MODS_BASE}/${id}/mod.json`);
    if (!meta) continue; // 缺 mod.json 的目录不视为 Mod
    mods.push({
      id: meta.id || id,
      name: meta.name || id,
      version: meta.version || '1.0.0',
      description: meta.description || '',
      author: meta.author || '',
      enabled: false,
      path: id,
    });
  }
  return mods;
}

// 加载单个 Mod 的数据（各 JSON 文件可选）
export async function loadModData(mod: ModInfo): Promise<ModData> {
  const base = `${MODS_BASE}/${mod.path}`;
  const data: ModData = {};

  const heroes = await fetchJson<Record<string, unknown>[]>(`${base}/heroes.json`);
  if (heroes) data.heroes = heroes;

  const monsters = await fetchJson<Record<string, unknown>[]>(`${base}/monsters.json`);
  if (monsters) data.monsters = monsters;

  const trinkets = await fetchJson<{ entries: unknown[]; rarities: unknown[] }>(`${base}/trinkets.json`);
  if (trinkets) data.trinkets = trinkets;

  const provisions = await fetchJson<ModData['provisions']>(`${base}/provisions.json`);
  if (provisions) data.provisions = provisions;

  const curios = await fetchJson<Record<string, unknown>[]>(`${base}/curios.json`);
  if (curios) data.curios = curios;

  return data;
}

// ---- 按 id 合并（同 id 覆盖，新 id 追加） ----

function getItemId(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null;
  const id = (item as Record<string, unknown>).id;
  return typeof id === 'string' ? id : null;
}

// 合并英雄数据
export function mergeHeroes(base: unknown[], extra: unknown[]): unknown[] {
  const byId = new Map<string, unknown>();
  for (const item of base) {
    const id = getItemId(item);
    if (id) byId.set(id, item);
  }
  for (const item of extra) {
    const id = getItemId(item);
    if (id) byId.set(id, item); // 同 id 覆盖基础数据
  }
  return [...byId.values()].filter((x) => x != null);
}

// 合并怪物数据
export function mergeMonsters(base: unknown[], extra: unknown[]): unknown[] {
  const byId = new Map<string, unknown>();
  for (const item of base) {
    const id = getItemId(item);
    if (id) byId.set(id, item);
  }
  for (const item of extra) {
    const id = getItemId(item);
    if (id) byId.set(id, item);
  }
  return [...byId.values()].filter((x) => x != null);
}

// 合并饰品数据（entries 与 rarities 分别按 id 合并）
export function mergeTrinkets(base: TrinketData, extra: TrinketData): TrinketData {
  const entries = mergeHeroes(base.entries, extra.entries) as TrinketData['entries'];
  const rarities = mergeHeroes(base.rarities ?? [], extra.rarities ?? []) as TrinketData['rarities'];
  return { entries, rarities };
}

export interface BaseDatasets {
  heroes: HeroData[] | unknown[];
  monsters: MonsterData[] | unknown[];
  trinkets: TrinketData;
}

// 将多个启用的 Mod 数据合并为一份，供 mergeModData 使用
export function collectEnabledModData(mods: ModData[]): ModData {
  const merged: ModData = {};
  const arrays: Exclude<keyof ModData, 'trinkets' | 'provisions'>[] = ['heroes', 'monsters', 'curios', 'regions', 'quests', 'skills'];
  for (const key of arrays) {
    const collected: Record<string, unknown>[] = [];
    for (const m of mods) {
      const part = m[key];
      if (Array.isArray(part)) collected.push(...(part as Record<string, unknown>[]));
    }
    if (collected.length > 0) merged[key] = collected;
  }

  // 饰品
  const trinketEntries: unknown[] = [];
  const trinketRarities: unknown[] = [];
  for (const m of mods) {
    const t = m.trinkets;
    if (t?.entries) trinketEntries.push(...t.entries);
    if (t?.rarities) trinketRarities.push(...t.rarities);
  }
  if (trinketEntries.length > 0 || trinketRarities.length > 0) {
    merged.trinkets = { entries: trinketEntries, rarities: trinketRarities };
  }

  // 补给品
  const provisions: NonNullable<ModData['provisions']> = [];
  for (const m of mods) {
    if (Array.isArray(m.provisions)) provisions.push(...m.provisions);
  }
  if (provisions.length > 0) merged.provisions = provisions;

  return merged;
}

// 将 Mod 数据合并到主数据
export function mergeModData(base: BaseDatasets, mods: ModData[]): BaseDatasets {
  const data = collectEnabledModData(mods);

  const heroes = data.heroes?.length
    ? (mergeHeroes(base.heroes as unknown[], data.heroes) as HeroData[])
    : (base.heroes as HeroData[]);

  const monsters = data.monsters?.length
    ? (mergeMonsters(base.monsters as unknown[], data.monsters) as MonsterData[])
    : (base.monsters as MonsterData[]);

  const trinkets = data.trinkets
    ? mergeTrinkets(base.trinkets, data.trinkets as TrinketData)
    : base.trinkets;

  return { heroes, monsters, trinkets };
}
// 文本表查询 — 从 localization_en.json 查找键（供调试/图鉴使用）
import type { HeroData } from '@/types';

let cache: Record<string, Record<string, string>> | null = null;

export async function loadStringTable(): Promise<Record<string, Record<string, string>>> {
  if (cache) return cache;
  try {
    const data = await import('@/data/dd-db/localization_en.json');
    cache = (data.default as { tables: Record<string, Record<string, string>> }).tables;
  } catch {
    cache = {};
  }
  return cache;
}

// 查询单个键：lookup('heroes', 'hero_class_name_crusader')
export function lookup(table: string, key: string): string | undefined {
  return cache?.[table]?.[key];
}

// 英雄类名（localization 表为韩语版时返回 undefined → 回退 heroNameMap）
export async function getHeroClassNames(): Promise<Record<string, string>> {
  const tables = await loadStringTable();
  const heroes = tables.heroes ?? {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(heroes)) {
    const m = k.match(/^hero_class_name_(\w+)$/);
    if (m) out[m[1]] = v;
  }
  return out;
}

// 从英雄数据派生显示名（优先 heroNameMap，localization 兜底）
export function displayHeroName(hero: HeroData, heroNameMap: Record<string, string>): string {
  return heroNameMap[hero.id] ?? hero.name ?? hero.id;
}

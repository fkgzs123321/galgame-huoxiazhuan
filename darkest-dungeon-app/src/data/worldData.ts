// 世界观/人物志/预设池 数据加载器（原著指导与剧情演化共用）
import type { WorldLore, HeroProfile } from '@/types';

export type { WorldLore, HeroProfile };

let loreCache: WorldLore | null = null;
let profilesCache: HeroProfile[] | null = null;
let presetsCache: Record<string, unknown> | null = null;

export async function loadWorldLore(): Promise<WorldLore | null> {
  if (loreCache) return loreCache;
  try {
    const data = await import('@/data/dd-db/world_lore.json');
    loreCache = data.default as WorldLore;
  } catch {
    loreCache = null;
  }
  return loreCache;
}

export async function loadHeroProfiles(): Promise<HeroProfile[]> {
  if (profilesCache) return profilesCache;
  try {
    const data = await import('@/data/dd-db/hero_profiles.json');
    profilesCache = (data.default as { heroes: HeroProfile[] }).heroes;
  } catch {
    profilesCache = [];
  }
  return profilesCache;
}

export async function loadPromptPresets(): Promise<Record<string, unknown> | null> {
  if (presetsCache) return presetsCache;
  try {
    const data = await import('@/data/dd-db/prompt_presets.json');
    presetsCache = data.default as Record<string, unknown>;
  } catch {
    presetsCache = null;
  }
  return presetsCache;
}

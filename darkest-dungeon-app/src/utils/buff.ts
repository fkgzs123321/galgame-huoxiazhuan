// 效果映射 — 从 effects.json 查询效果定义并计算数值（战斗叙事/图鉴用）
export interface EffectDef {
  name?: string;
  target?: string;
  chance?: number | string;
  duration?: number;
  heal?: number | string;
  bleed?: number;
  blight?: number;
  stun?: number | string;
  pull?: number | string;
  push?: number | string;
  move?: number | string;
  mark?: boolean | string;
  buff?: number | string;
  debuff?: number | string;
  riposte?: number | string;
  combat_stat_buff?: number | string;
  [key: string]: unknown;
}

let effectsCache: Record<string, EffectDef> | null = null;

export async function loadEffectsMap(): Promise<Record<string, EffectDef>> {
  if (effectsCache) return effectsCache;
  try {
    const data = await import('@/data/dd-db/effects.json');
    const d = data.default as { base: EffectDef[]; mode: EffectDef[]; dd: EffectDef[] };
    const map: Record<string, EffectDef> = {};
    for (const list of [d.base, d.mode, d.dd]) {
      for (const e of list) {
        if (e.name && !map[e.name]) map[e.name] = e;
      }
    }
    effectsCache = map;
  } catch {
    effectsCache = {};
  }
  return effectsCache;
}

export function getEffect(name: string): EffectDef | undefined {
  return effectsCache?.[name];
}

// 效果 → 人类可读描述（战斗日志用）
export function describeEffect(e: EffectDef): string {
  const parts: string[] = [];
  if (e.chance !== undefined && e.chance !== 1) {
    parts.push(`${Math.round((e.chance as number) * 100)}% 概率`);
  }
  if (e.bleed) parts.push(`流血 ${e.bleed} 点/回合 ×${e.duration ?? 1}`);
  if (e.blight) parts.push(`腐蚀 ${e.blight} 点/回合 ×${e.duration ?? 1}`);
  if (e.stun) parts.push(`眩晕`);
  if (e.heal) parts.push(`治疗 ${e.heal}`);
  if (e.pull) parts.push(`拉拽 ${e.pull} 位`);
  if (e.push) parts.push(`击退 ${e.push} 位`);
  if (e.move) parts.push(`位移`);
  if (e.mark) parts.push(`标记`);
  if (e.buff || e.combat_stat_buff) parts.push(`增益 ×${e.duration ?? 1} 回合`);
  if (e.debuff) parts.push(`减益 ×${e.duration ?? 1} 回合`);
  if (e.riposte) parts.push(`反击 ×${e.duration ?? 1} 回合`);
  return parts.length ? parts.join('，') : e.name ?? '未知效果';
}

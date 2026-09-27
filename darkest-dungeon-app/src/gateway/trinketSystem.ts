// 饰品系统 v2 — 数据缓存 / 名称 / 稀有度 / 价格 / Buff 解析与计算
// 数据源: dd-db/trinkets.json（490 件）；名称走 trinketZh 词根翻译兜底

import type { TrinketEntry } from '@/types';
import { trinketZh } from '@/data/zhNames';

// 饰品 Buff（标准化结构，供战斗与界面使用）
export interface TrinketBuff {
  stat: string;          // dmg/prot/dodge/crit/spd/max_hp/atk/stress_resist/...
  amount: number;        // 数值（isPercentage 时表示百分点）
  isPercentage: boolean;
}

// ---- 数据缓存 ----
let trinketsCache: TrinketEntry[] = [];
let trinketMap: Map<string, TrinketEntry> | null = null;

export function setTrinketDataCache(data: { entries: TrinketEntry[] }): void {
  trinketsCache = data.entries ?? [];
  trinketMap = new Map(trinketsCache.map((t) => [t.id, t]));
}

export function getTrinketEntryById(id: string): TrinketEntry | undefined {
  return trinketMap?.get(id);
}

export function pickRandomTrinket(): TrinketEntry | null {
  if (trinketsCache.length === 0) return null;
  return trinketsCache[Math.floor(Math.random() * trinketsCache.length)];
}

// ---- 名称 / 稀有度 / 价格 ----

// 常见饰品中文名（优先于词根兜底）
const trinketNameMap: Record<string, string> = {
  crow_wingfeather: '乌鸦翼羽',
  moon_diamond: '月之钻石',
  sun_cloak: '太阳斗篷',
  ancestor_signet_ring: '先祖印戒',
  ancestor_paint: '先祖颜料',
  ancestor_candle: '先祖烛台',
  ancestor_pistol: '先祖手枪',
  ancestor_scroll: '先祖卷轴',
  ancestor_bottle: '先祖药瓶',
  ancestor_map: '先祖地图',
  ancestor_pen: '先祖之笔',
  ancestor_mustache_cream: '先祖须膏',
  ancestor_coat: '先祖外套',
  ancestor_tentacle_idol: '先祖触手神像',
  ancestor_handkerchief: '先祖手帕',
  ancestor_hero_ring: '先祖英豪之戒',
  ancestor_torch: '先祖火把',
  ancestor_gunpowder: '先祖火药',
  ancestor_great_coat: '先祖大衣',
  ancestor_key: '先祖钥匙',
  ancestor_lantern: '先祖提灯',
  ancestor_flag: '先祖旗帜',
  sacred_scroll: '圣卷轴',
  holy_water: '圣水',
  purification_chalice: '净化圣杯',
  cleansing_crystal: '净化水晶',
  "martyr's_seal": '殉道者之印',
};

export function getTrinketName(trinketId: string): string {
  const entry = getTrinketEntryById(trinketId);
  if (entry?.name) return entry.name as string;
  return trinketNameMap[trinketId] ?? trinketZh(trinketId);
}

const RARITY_ZH: Record<string, string> = {
  very_common: '常见',
  common: '普通',
  uncommon: '罕见',
  rare: '稀有',
  very_rare: '极稀有',
  ancestor: '先祖',
  crimson: '猩红',
  trophy: '战利品',
  crow: '乌鸦',
  very_rare_cc: '庭院极稀有',
  region_specific: '区域限定',
};

export function getRarityName(rarity: string): string {
  return RARITY_ZH[rarity] ?? rarity.replace(/_/g, ' ');
}

// 出售价：基础价 35%，至少 1
export function getSellPrice(trinket: TrinketEntry): number {
  const price = Number(trinket.price) || 0;
  return Math.max(1, Math.floor(price * 0.35));
}

// 职业需求（兼容 snake_case / camelCase 数据）
export function getTrinketClassRequirements(trinket: TrinketEntry): string[] {
  const raw = trinket.heroClassRequirements ?? trinket.hero_class_requirements ?? [];
  return Array.isArray(raw) ? raw.map(String) : [];
}

// ---- Buff 解析 ----

const STAT_ALIAS: Record<string, string> = {
  attack: 'atk', accuracy: 'atk', acc: 'atk',
  ranged_damage: 'dmg', melee_damage: 'dmg', damage: 'dmg', dmg: 'dmg',
  protection: 'prot', prot: 'prot',
  dodge: 'dodge', speed: 'spd', spd: 'spd', crit: 'crit', crit_chance: 'crit',
  max_hp: 'max_hp', hp: 'max_hp', maxhp: 'max_hp',
  stress_resist: 'stress_resist', stun_resist: 'stun_resist',
  bleed_resist: 'bleed_resist', poison_resist: 'poison_resist',
  blight_resist: 'poison_resist', move_resist: 'move_resist',
  debuff_resist: 'debuff_resist', disease_resist: 'disease_resist',
  deathblow_resist: 'deathblow_resist', trap_resist: 'trap_resist',
  healing: 'healing', stress_heal: 'stress_heal',
  scouting: 'scouting', food: 'food', torch: 'torch',
};

// 解析单个 buff 表达式（支持 "DMG +10%" / "MAX HP +20" / "+5 DODGE" / "10% PROT"）
export function parseTrinketBuffs(raw: unknown): TrinketBuff[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: TrinketBuff[] = [];
  for (const item of list) {
    if (typeof item !== 'string' || !item.trim()) continue;
    const buff = parseBuffExpression(item);
    if (buff) out.push(buff);
  }
  return out;
}

function parseBuffExpression(expr: string): TrinketBuff | null {
  const s = expr.trim();
  // 模式1: "STAT ±N%" 或 "STAT +N"
  let m = s.match(/^([A-Za-z_ ]+?)\s*([+-]?\d+(?:\.\d+)?)\s*(%)?\s*$/);
  if (m) {
    const stat = normalizeStat(m[1].trim());
    if (!stat) return null;
    return { stat, amount: parseFloat(m[2]), isPercentage: !!m[3] };
  }
  // 模式2: "+N% STAT" 或 "N STAT"
  m = s.match(/^([+-]?\d+(?:\.\d+)?)\s*(%)?\s*([A-Za-z_ ]+)$/);
  if (m) {
    const stat = normalizeStat(m[3].trim());
    if (!stat) return null;
    return { stat: normalizeStat(m[3].trim()) ?? 'atk', amount: parseFloat(m[1]), isPercentage: !!m[2] };
  }
  // 模式3: "STAT N"（如 "SPD 2"）
  m = s.match(/^([A-Za-z_ ]+?)\s+(\d+(?:\.\d+)?)$/);
  if (m) {
    const stat = normalizeStat(m[1].trim());
    if (!stat) return null;
    return { stat, amount: parseFloat(m[2]), isPercentage: false };
  }
  return null;
}

function normalizeStat(stat: string): string | null {
  const key = stat.toLowerCase().replace(/[^a-z_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return STAT_ALIAS[key] ?? (key.includes('resist') ? `${key}` : key);
}

// Buff 显示文本（中文）
export function formatBuff(buff: TrinketBuff): string {
  const statName: Record<string, string> = {
    atk: '命中', dmg: '伤害', prot: '防护', dodge: '闪避', spd: '速度',
    crit: '暴击', max_hp: '生命上限', stress_resist: '压力抗性',
    stun_resist: '眩晕抗性', bleed_resist: '流血抗性', poison_resist: '腐蚀抗性',
    move_resist: '位移抗性', debuff_resist: '减益抗性', disease_resist: '疾病抗性',
    deathblow_resist: '死亡一击抗性', trap_resist: '陷阱抗性',
    healing: '治疗', stress_heal: '减压', scouting: '侦察', food: '食物', torch: '火把',
  };
  const sign = buff.amount >= 0 ? '+' : '';
  const suffix = buff.isPercentage ? '%' : '';
  return `${statName[buff.stat] ?? buff.stat} ${sign}${buff.amount}${suffix}`;
}

// ---- 战斗计算 ----

// 计算英雄两个饰品的总 Buff（供 combatEngine.heroToCombatant 使用）
export function calculateHeroBuffs(trinket1: string | null | undefined, trinket2: string | null | undefined): TrinketBuff[] {
  const out: TrinketBuff[] = [];
  for (const id of [trinket1, trinket2]) {
    if (!id) continue;
    const entry = getTrinketEntryById(id);
    if (!entry) continue;
    const buffs = parseTrinketBuffs(entry.buffs);
    for (const b of buffs) out.push(b);
  }
  return out;
}

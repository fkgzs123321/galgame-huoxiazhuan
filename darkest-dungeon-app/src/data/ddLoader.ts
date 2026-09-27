// DD 数据库加载器 v2 — 动态加载提取的 JSON 数据
import type { HeroData, MonsterData, TrinketData, DistrictBuilding, TownBuildingData, HeroSkillEntry } from '@/types';
import { mergeModData } from '@/gateway/modLoader';
import { useModStore } from '@/stores/modStore';
import { crimsonMonsters } from '@/data/crimsonMonsters';
import { wordZh } from '@/data/zhNames';

let heroesCache: HeroData[] | null = null;
let monstersCache: MonsterData[] | null = null;
let trinketsCache: TrinketData | null = null;
let buildingsCache: Record<string, TownBuildingData> | null = null;
let districtsCache: DistrictBuilding[] | null = null;

// 记录已合并的 Mod 状态（启用列表），当 Mod 变更时清空缓存重新加载
let mergedModSignature = '';

// 计算当前启用 Mod 的唯一签名（用于缓存失效判断）
function getModSignature(): string {
  const activeMods = useModStore.getState().activeMods;
  return activeMods.slice().sort().join(',');
}

// 若 Mod 启用状态变更，清空受影响的数据缓存
function checkModChanged(): void {
  const sig = getModSignature();
  if (sig !== mergedModSignature) {
    mergedModSignature = sig;
    heroesCache = null;
    monstersCache = null;
    trinketsCache = null;
  }
}

// 静态 fallback 数据 — 当 JSON 数据库尚未生成时使用
const fallbackHeroes: HeroData[] = [
  {
    id: 'crusader',
    name: '十字军',
    resistances: { stun: 0.4, move: 0.4, bleed: 0.3, poison: 0.3, disease: 0.3, debuff: 0.3, death_blow: 0.67, trap: 0.1 },
    skills: [
      { id: 'smite', level: 0, type: 'melee', atk: 0.85, dmg: 0, crit: 0, launch: 21, target: '12', effects: ['Unholy Killer 1'] },
      { id: 'smite', level: 1, type: 'melee', atk: 0.90, dmg: 0, crit: 0.01, launch: 21, target: '12', effects: ['Unholy Killer 2'] },
      { id: 'smite', level: 2, type: 'melee', atk: 0.95, dmg: 0, crit: 0.02, launch: 21, target: '12', effects: ['Unholy Killer 3'] },
      { id: 'smite', level: 3, type: 'melee', atk: 1.0, dmg: 0, crit: 0.03, launch: 21, target: '12', effects: ['Unholy Killer 4'] },
      { id: 'smite', level: 4, type: 'melee', atk: 1.05, dmg: 0, crit: 0.04, launch: 21, target: '12', effects: ['Unholy Killer 5'] },
      { id: 'stunning_blow', level: 0, type: 'melee', atk: 0.90, dmg: -0.5, crit: 0, launch: 21, target: '12', effects: ['Stun 1'] },
      { id: 'holy_lance', level: 0, type: 'melee', atk: 0.85, dmg: 0, crit: 0.065, launch: 34, target: '234', effects: ['Unholy Killer 1'] },
      { id: 'battle_heal', level: 0, type: 'melee', launch: 1234, target: '@1234' },
      { id: 'inspiring_cry', level: 0, type: 'melee', launch: 1234, target: '@1234', effects: ['Crusader HealStress 1', 'Crusader Light 1'] },
      { id: 'bulwark_of_faith', level: 0, type: 'melee', atk: 0, dmg: 0, crit: 0, launch: 21, effects: ['Crusader Bulwark 1'] },
      { id: 'zealous_accusation', level: 0, type: 'ranged', atk: 0.85, dmg: -0.4, crit: -0.04, launch: 21, target: '~12' },
    ],
    weapons: [
      { name: 'crusader_weapon_0', atk: 0, dmg_min: 6, dmg_max: 12, crit: 0.03, spd: 1 },
      { name: 'crusader_weapon_1', atk: 0, dmg_min: 7, dmg_max: 14, crit: 0.04, spd: 1 },
      { name: 'crusader_weapon_2', atk: 0, dmg_min: 8, dmg_max: 16, crit: 0.05, spd: 2 },
      { name: 'crusader_weapon_3', atk: 0, dmg_min: 9, dmg_max: 17, crit: 0.06, spd: 2 },
      { name: 'crusader_weapon_4', atk: 0, dmg_min: 10, dmg_max: 19, crit: 0.07, spd: 3 },
    ],
    armour: [
      { name: 'crusader_armour_0', def: 0.05, prot: 0, hp: 33, spd: 0 },
      { name: 'crusader_armour_1', def: 0.10, prot: 0, hp: 40, spd: 0 },
      { name: 'crusader_armour_2', def: 0.15, prot: 0, hp: 47, spd: 0 },
      { name: 'crusader_armour_3', def: 0.20, prot: 0, hp: 54, spd: 0 },
      { name: 'crusader_armour_4', def: 0.25, prot: 0, hp: 61, spd: 0 },
    ],
    tags: ['heavy', 'religious'],
    maxHp: [33, 40, 47, 54, 61],
    dodge: [0.05, 0.10, 0.15, 0.20, 0.25],
    crit: [0.03, 0.04, 0.05, 0.06, 0.07],
    dmg: [{ min: 6, max: 12 }, { min: 7, max: 14 }, { min: 8, max: 16 }, { min: 9, max: 17 }, { min: 10, max: 19 }],
    spd: [1, 1, 2, 2, 3],
    camping_skills: [{ id: 'encourage' }, { id: 'treat_injury' }, { id: 'pep_talk' }],
  },
  {
    id: 'highwayman',
    name: '匪徒',
    resistances: { stun: 0.3, move: 0.2, bleed: 0.2, poison: 0.2, disease: 0.2, debuff: 0.2, death_blow: 0.67, trap: 0.1 },
    skills: [
      { id: 'wicked_slice', level: 0, type: 'melee', atk: 0.85, dmg: 0, crit: 0.05, launch: 21, target: '12' },
      { id: 'pistol_shot', level: 0, type: 'ranged', atk: 0.85, dmg: 0, crit: 0.05, launch: 1234, target: '~123' },
      { id: 'point_blank_shot', level: 0, type: 'ranged', atk: 0.85, dmg: 0.5, crit: 0.05, launch: 1, target: '1' },
      { id: 'open_vein', level: 0, type: 'melee', atk: 0.85, dmg: -0.3, crit: 0.0, launch: 21, target: '12', effects: ['Bleed 1'] },
      { id: 'grape_shot_blast', level: 0, type: 'ranged', atk: 0.85, dmg: -0.5, crit: 0.0, launch: 1234, target: '~123' },
      { id: 'dueling_advance', level: 0, type: 'melee', atk: 0.85, dmg: -0.2, crit: 0.0, launch: 34, target: '234' },
      { id: 'tracking_shot', level: 0, type: 'ranged', atk: 0.85, dmg: 0, crit: 0.05, launch: 34, target: '34' },
    ],
    weapons: [
      { name: 'highwayman_weapon_0', atk: 0, dmg_min: 5, dmg_max: 10, crit: 0.05, spd: 2 },
      { name: 'highwayman_weapon_1', atk: 0, dmg_min: 6, dmg_max: 12, crit: 0.06, spd: 3 },
      { name: 'highwayman_weapon_2', atk: 0, dmg_min: 7, dmg_max: 14, crit: 0.07, spd: 3 },
      { name: 'highwayman_weapon_3', atk: 0, dmg_min: 8, dmg_max: 16, crit: 0.08, spd: 4 },
      { name: 'highwayman_weapon_4', atk: 0, dmg_min: 9, dmg_max: 18, crit: 0.09, spd: 5 },
    ],
    armour: [
      { name: 'highwayman_armour_0', def: 0.10, prot: 0, hp: 23, spd: 0 },
      { name: 'highwayman_armour_1', def: 0.15, prot: 0, hp: 28, spd: 0 },
      { name: 'highwayman_armour_2', def: 0.20, prot: 0, hp: 33, spd: 0 },
      { name: 'highwayman_armour_3', def: 0.25, prot: 0, hp: 38, spd: 0 },
      { name: 'highwayman_armour_4', def: 0.30, prot: 0, hp: 43, spd: 0 },
    ],
    tags: [],
    maxHp: [23, 28, 33, 38, 43],
    dodge: [0.10, 0.15, 0.20, 0.25, 0.30],
    crit: [0.05, 0.06, 0.07, 0.08, 0.09],
    dmg: [{ min: 5, max: 10 }, { min: 6, max: 12 }, { min: 7, max: 14 }, { min: 8, max: 16 }, { min: 9, max: 18 }],
    spd: [2, 3, 3, 4, 5],
    camping_skills: [{ id: 'encourage' }, { id: 'clean_guns' }, { id: 'bandit_sense' }],
  },
  {
    id: 'vestal',
    name: '修女',
    resistances: { stun: 0.4, move: 0.2, bleed: 0.2, poison: 0.2, disease: 0.2, debuff: 0.2, death_blow: 0.67, trap: 0.1 },
    skills: [
      { id: 'mace_bash', level: 0, type: 'melee', atk: 0.85, dmg: 0, crit: 0, launch: 21, target: '12' },
      { id: 'judgment', level: 0, type: 'ranged', atk: 0.85, dmg: -0.3, crit: 0, launch: 21, target: '~123' },
      { id: 'divine_grace', level: 0, type: 'melee', launch: 1234, target: '@1' },
      { id: 'divine_comfort', level: 0, type: 'melee', launch: 1234, target: '@1234' },
      { id: 'dazzling_light', level: 0, type: 'melee', atk: 0.85, dmg: -0.5, crit: 0, launch: 21, target: '12', effects: ['Stun 1'] },
      { id: 'illumination', level: 0, type: 'ranged', atk: 0.85, dmg: -0.5, crit: 0, launch: 21, target: '~12' },
      { id: 'hand_of_light', level: 0, type: 'melee', atk: 0.85, dmg: -0.2, crit: 0, launch: 21, target: '12' },
    ],
    weapons: [
      { name: 'vestal_weapon_0', atk: 0, dmg_min: 4, dmg_max: 8, crit: 0.0, spd: 0 },
      { name: 'vestal_weapon_1', atk: 0, dmg_min: 5, dmg_max: 9, crit: 0.01, spd: 0 },
      { name: 'vestal_weapon_2', atk: 0, dmg_min: 5, dmg_max: 10, crit: 0.02, spd: 1 },
      { name: 'vestal_weapon_3', atk: 0, dmg_min: 6, dmg_max: 11, crit: 0.03, spd: 1 },
      { name: 'vestal_weapon_4', atk: 0, dmg_min: 7, dmg_max: 12, crit: 0.04, spd: 2 },
    ],
    armour: [
      { name: 'vestal_armour_0', def: 0.0, prot: 0, hp: 22, spd: 0 },
      { name: 'vestal_armour_1', def: 0.05, prot: 0, hp: 27, spd: 0 },
      { name: 'vestal_armour_2', def: 0.10, prot: 0, hp: 32, spd: 0 },
      { name: 'vestal_armour_3', def: 0.15, prot: 0, hp: 37, spd: 0 },
      { name: 'vestal_armour_4', def: 0.20, prot: 0, hp: 42, spd: 0 },
    ],
    tags: ['religious'],
    maxHp: [22, 27, 32, 37, 42],
    dodge: [0.0, 0.05, 0.10, 0.15, 0.20],
    crit: [0.0, 0.01, 0.02, 0.03, 0.04],
    dmg: [{ min: 4, max: 8 }, { min: 5, max: 9 }, { min: 5, max: 10 }, { min: 6, max: 11 }, { min: 7, max: 12 }],
    spd: [0, 0, 1, 1, 2],
    camping_skills: [{ id: 'encourage' }, { id: 'prayer' }, { id: 'share_knowledge' }],
  },
  {
    id: 'plague_doctor',
    name: '瘟疫医生',
    resistances: { stun: 0.4, move: 0.2, bleed: 0.2, poison: 0.3, disease: 0.3, debuff: 0.2, death_blow: 0.67, trap: 0.1 },
    skills: [
      { id: 'noxious_blast', level: 0, type: 'ranged', atk: 0.85, dmg: -0.5, crit: 0, launch: 21, target: '~12', effects: ['Blight 1'] },
      { id: 'plague_grenade', level: 0, type: 'ranged', atk: 0.85, dmg: -0.6, crit: 0, launch: 21, target: '~1234', effects: ['Blight 1'] },
      { id: 'blinding_gas', level: 0, type: 'ranged', atk: 0.85, dmg: -0.7, crit: 0, launch: 34, target: '~34', effects: ['Stun 2'] },
      { id: 'battle_bandage', level: 0, type: 'melee', launch: 1234, target: '@1234' },
      { id: 'disorienting_blast', level: 0, type: 'melee', atk: 0.85, dmg: -0.6, crit: 0, launch: 21, target: '~123', effects: ['Stun 1'] },
      { id: 'emboldening_vapours', level: 0, type: 'ranged', atk: 0, dmg: 0, crit: 0, launch: 1234, target: '@1234' },
      { id: 'incision', level: 0, type: 'melee', atk: 0.85, dmg: -0.2, crit: 0, launch: 21, target: '12', effects: ['Bleed 1'] },
    ],
    weapons: [
      { name: 'plague_doctor_weapon_0', atk: 0, dmg_min: 4, dmg_max: 8, crit: 0.0, spd: 1 },
      { name: 'plague_doctor_weapon_1', atk: 0, dmg_min: 5, dmg_max: 9, crit: 0.01, spd: 1 },
      { name: 'plague_doctor_weapon_2', atk: 0, dmg_min: 5, dmg_max: 10, crit: 0.02, spd: 2 },
      { name: 'plague_doctor_weapon_3', atk: 0, dmg_min: 6, dmg_max: 11, crit: 0.03, spd: 2 },
      { name: 'plague_doctor_weapon_4', atk: 0, dmg_min: 7, dmg_max: 12, crit: 0.04, spd: 3 },
    ],
    armour: [
      { name: 'plague_doctor_armour_0', def: 0.05, prot: 0, hp: 22, spd: 0 },
      { name: 'plague_doctor_armour_1', def: 0.10, prot: 0, hp: 26, spd: 0 },
      { name: 'plague_doctor_armour_2', def: 0.15, prot: 0, hp: 30, spd: 0 },
      { name: 'plague_doctor_armour_3', def: 0.20, prot: 0, hp: 34, spd: 0 },
      { name: 'plague_doctor_armour_4', def: 0.25, prot: 0, hp: 38, spd: 0 },
    ],
    tags: [],
    maxHp: [22, 26, 30, 34, 38],
    dodge: [0.05, 0.10, 0.15, 0.20, 0.25],
    crit: [0.0, 0.01, 0.02, 0.03, 0.04],
    dmg: [{ min: 4, max: 8 }, { min: 5, max: 9 }, { min: 5, max: 10 }, { min: 6, max: 11 }, { min: 7, max: 12 }],
    spd: [1, 1, 2, 2, 3],
    camping_skills: [{ id: 'encourage' }, { id: 'experimental_vapours' }, { id: 'leeches' }],
  },
];

export async function loadHeroes(): Promise<HeroData[]> {
  checkModChanged();
  if (heroesCache) return heroesCache;

  try {
    const data = await import('@/data/dd-db/heroes.json');
    heroesCache = data.default as HeroData[];
  } catch {
    console.warn('[DD] 使用 fallback 英雄数据（请运行 npm run extract-data 生成完整数据库）');
    heroesCache = fallbackHeroes;
  }

  // 合并启用的 Mod 英雄数据
  applyModDataToHeroes();
  return heroesCache;
}

// 将启用 Mod 的英雄数据合并到缓存（安全：同 id 覆盖，新 id 追加）
function applyModDataToHeroes(): void {
  const modData = useModStore.getState().getModData();
  if (!heroesCache || !modData.heroes?.length) return;
  const merged = mergeModData(
    { heroes: heroesCache, monsters: [], trinkets: { entries: [], rarities: [] } },
    [modData]
  );
  heroesCache = merged.heroes as HeroData[];
}

export async function loadMonsters(): Promise<MonsterData[]> {
  checkModChanged();
  if (monstersCache) return monstersCache;
  try {
    const data = await import('@/data/dd-db/monsters.json');
    monstersCache = data.default as MonsterData[];
  } catch {
    return [];
  }

  // 合并启用的 Mod 怪物数据
  const modData = useModStore.getState().getModData();
  if (modData.monsters?.length) {
    const merged = mergeModData(
      { heroes: [], monsters: monstersCache, trinkets: { entries: [], rarities: [] } },
      [modData]
    );
    monstersCache = merged.monsters as MonsterData[];
  }

  // 合并 DLC 补充怪物（绯红庭院，数据缺失时的手写补充）
  const crimsonIds = new Set(monstersCache.map((m) => m.id));
  const extra = crimsonMonsters.filter((m) => !crimsonIds.has(m.id));
  if (extra.length > 0) {
    monstersCache = [...monstersCache, ...extra];
  }
  return monstersCache;
}

export async function loadTrinkets(): Promise<TrinketData> {
  checkModChanged();
  if (trinketsCache) return trinketsCache;
  try {
    const data = await import('@/data/dd-db/trinkets.json');
    trinketsCache = data.default as unknown as TrinketData;
  } catch {
    return { entries: [], rarities: [] };
  }

  // 合并启用的 Mod 饰品数据
  const modData = useModStore.getState().getModData();
  if (modData.trinkets) {
    const merged = mergeModData(
      { heroes: [], monsters: [], trinkets: trinketsCache },
      [modData]
    );
    trinketsCache = merged.trinkets;
  }
  return trinketsCache;
}

export async function loadBuildings(): Promise<Record<string, TownBuildingData>> {
  if (buildingsCache) return buildingsCache;
  try {
    const data = await import('@/data/dd-db/buildings.json');
    buildingsCache = data.default as unknown as Record<string, TownBuildingData>;
    return buildingsCache;
  } catch {
    return {};
  }
}

export async function loadDistricts(): Promise<DistrictBuilding[]> {
  if (districtsCache) return districtsCache;
  try {
    const data = await import('@/data/dd-db/districts.json');
    districtsCache = data.default as unknown as DistrictBuilding[];
    return districtsCache;
  } catch {
    return [];
  }
}

// 英雄中文名映射
export const heroNameMap: Record<string, string> = {
  crusader: '十字军',
  highwayman: '匪徒',
  vestal: '修女',
  plague_doctor: '瘟疫医生',
  hellion: '蛮族女',
  leper: '麻风',
  bounty_hunter: '赏金猎人',
  occultist: '秘术师',
  grave_robber: '盗墓贼',
  jester: '小丑',
  arbalest: '弩手',
  antiquarian: '古董商',
  abomination: '憎恶',
  flagellant: '苦修者',
  houndmaster: '猎犬大师',
  shieldbreaker: '破盾者',
  man_at_arms: '武装大师',
};

export function getHeroName(classId: string): string {
  return heroNameMap[classId] || classId;
}

// 获取英雄的唯一技能列表（去重）
export function getUniqueSkills(hero: HeroData): string[] {
  const skillIds = new Set<string>();
  for (const skill of hero.skills) {
    if (!skill.is_move && skill.id !== 'move') {
      skillIds.add(skill.id);
    }
  }
  return [...skillIds];
}

// 获取技能详情（最高等级数据）
export function getSkillDetails(hero: HeroData, skillId: string): HeroSkillEntry | null {
  const entries = hero.skills.filter(s => s.id === skillId && !s.is_move);
  if (entries.length === 0) return null;
  // 返回最高等级
  return entries.reduce((max, curr) => (curr.level > max.level ? curr : max));
}

// 技能名称映射（常用技能中文化）
export const skillNameMap: Record<string, string> = {
  smite: '重击',
  stunning_blow: '震撼一击',
  holy_lance: '圣枪',
  battle_heal: '战斗治疗',
  bulwark_of_faith: '信仰壁垒',
  inspiring_cry: '鼓舞呐喊',
  zealous_accusation: '狂热控诉',
  wicked_slice: '邪恶切割',
  pistol_shot: '手枪射击',
  point_blank_shot: '零距离射击',
  open_vein: '割裂静脉',
  grape_shot_blast: '散弹轰击',
  dueling_advance: '决斗前进',
  tracking_shot: '追踪射击',
  mace_bash: '钉锤猛击',
  judgment: '审判',
  divine_grace: '神圣恩典',
  divine_comfort: '神圣抚慰',
  dazzling_light: '耀眼之光',
  illumination: '照明术',
  hand_of_light: '光明之手',
  noxious_blast: '毒气轰击',
  plague_grenade: '瘟疫手雷',
  blinding_gas: '致盲毒气',
  battle_bandage: '战斗绷带',
  disorienting_blast: '混乱爆破',
  emboldening_vapours: '鼓舞蒸汽',
  incision: '切割术',
};

export function getSkillName(skillId: string): string {
  if (skillNameMap[skillId]) return skillNameMap[skillId];
  return wordZh(skillId);
}

// ============================================================
// 营地技能中文名映射
// ============================================================
export const campSkillNameMap: Record<string, string> = {
  wound_care: '包扎伤口',
  bandage: '包扎绷带',
  whetstone: '磨刀石',
  scout: '侦察',
  meditate: '冥想',
  pray: '祈祷',
  vigil: '守夜',
  stall: '拖延',
  encourage: '鼓舞',
  terrify: '威慑',
  drum: '战鼓',
  mock: '嘲弄',
  inspire: '激励',
  protect: '守护',
  treat: '治疗',
  treat_injury: '处理伤势',
  massage: '按摩',
  sharpening: '磨砺武器',
  rest: '休整',
  plan: '制定计划',
  self_reflection: '自我反思',
  whip: '鞭挞',
  hound_training: '猎犬训练',
  dark_ritual: '黑暗仪式',
  perform: '演奏',
  dig: '挖掘',
  bandit_sense: '强盗直觉',
  prayer: '虔诚祷告',
  share_knowledge: '分享知识',
  experimental_vapours: '实验蒸汽',
  leeches: '水蛭疗法',
  clean_guns: '清洁武器',
  pep_talk: '打气',
};

export function getCampSkillName(campSkillId: string): string {
  return campSkillNameMap[campSkillId] || campSkillId.replace(/_/g, ' ');
}

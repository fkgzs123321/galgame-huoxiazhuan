// ============================================================
// 城镇建筑状态管理 — Zustand Store
// 管理7个城镇建筑的运行时状态、商品库存和操作逻辑
// ============================================================
import { create } from 'zustand';
import { useGameStore } from './gameStore';
import { THE_BLOOD_ITEM } from '@/gateway/crimsonSystem';
import { runGameCommand } from '@/gateway/kernel/runtimeBridge';
import { wordZh } from '@/data/zhNames';
import type { BuildingId, BuildingState, HeroInstance, ProvisionItem, TrinketEntry } from '@/types';

// ---- 建筑解锁条件 ----

export function isBuildingUnlocked(id: BuildingId, questsFinished: number): boolean {
  switch (id) {
    case 'stagecoach':
    case 'nomad_wagon':
    case 'mod_manager':
      return true;
    case 'tavern':
    case 'abbey':
      return questsFinished >= 2;
    case 'blacksmith':
    case 'guild':
      return questsFinished >= 3;
    case 'sanitarium':
      return questsFinished >= 4;
    case 'sanctum':
      return questsFinished >= 5;
    default:
      return false;
  }
}

export const BUILDING_INFO: Record<BuildingId, { name: string; icon: string; unlockText: string }> = {
  stagecoach: { name: '驿站', icon: '◈', unlockText: '始终可用' },
  nomad_wagon: { name: '游商', icon: '△', unlockText: '始终可用' },
  tavern: { name: '酒馆', icon: '⊄', unlockText: '完成 2 个任务' },
  abbey: { name: '修道院', icon: '✚', unlockText: '完成 2 个任务' },
  blacksmith: { name: '铁匠', icon: '⚒', unlockText: '完成 3 个任务' },
  guild: { name: '公会', icon: '▤', unlockText: '完成 3 个任务' },
  sanitarium: { name: '疗养院', icon: '⚕', unlockText: '完成 4 个任务' },
  mod_manager: { name: 'Mod', icon: '❖', unlockText: '始终可用' },
  sanctum: { name: '疫医帐篷', icon: '❥', unlockText: '完成 5 个任务' },
};

// ---- 英雄职业基础数据（用于随机生成） ----

const HERO_CLASS_DATA: { id: string; baseHp: number }[] = [
  { id: 'crusader', baseHp: 33 },
  { id: 'highwayman', baseHp: 23 },
  { id: 'vestal', baseHp: 22 },
  { id: 'plague_doctor', baseHp: 22 },
  { id: 'hellion', baseHp: 26 },
  { id: 'leper', baseHp: 35 },
  { id: 'bounty_hunter', baseHp: 27 },
  { id: 'occultist', baseHp: 19 },
  { id: 'grave_robber', baseHp: 20 },
  { id: 'jester', baseHp: 19 },
  { id: 'arbalest', baseHp: 20 },
  { id: 'antiquarian', baseHp: 17 },
  { id: 'abomination', baseHp: 25 },
  { id: 'flagellant', baseHp: 26 },
  { id: 'houndmaster', baseHp: 22 },
];

// 各职业默认技能（前4个）
const DEFAULT_SKILLS: Record<string, string[]> = {
  crusader: ['smite', 'stunning_blow', 'holy_lance', 'battle_heal'],
  highwayman: ['wicked_slice', 'pistol_shot', 'point_blank_shot', 'open_vein'],
  vestal: ['mace_bash', 'divine_grace', 'divine_comfort', 'dazzling_light'],
  plague_doctor: ['noxious_blast', 'plague_grenade', 'blinding_gas', 'battle_bandage'],
  hellion: ['wicked_hack', 'barbaric_yawp', 'if_it_bleeds', 'iron_swans'],
  leper: ['chop', 'hew', 'standfast', 'purge'],
  bounty_hunter: 'collect_bounty,mark_target,come_hither,finish_him'.split(','),
  occultist: ['wyrd_reconstruction', 'daggers', 'weakening_curse', 'vulnerability_hex'],
  grave_robber: ['pickaxe_stab', 'poison_dart', 'dagger_dash', 'thrown_dagger'],
  jester: ['slice_off', 'harvest', 'solo', 'battle_ballad'],
  arbalest: ['crossbow', 'marked_bolt', 'blindfire', 'field_dressing'],
  antiquarian: ['nervous_stab', 'pickaxe_stab', 'festering_vapours', 'invigorating_vapours'],
  abomination: ['transform', 'manacles', 'vomit', 'absolution'],
  flagellant: ['punish', 'rain_of_blood', 'endure', 'reclaim'],
  houndmaster: ['hounds_harry', 'hound_rush', 'guard_dog', 'lick_wounds'],
};

// 随机名字池
const NAME_POOL = [
  '雷诺尔德', '迪斯马', '朱妮娅', '帕拉修斯', '奥黛丽', '波尔多', '萨拉', '艾登',
  '格雷格', '伊莎贝拉', '马库斯', '莉莉安', '亨利克', '维多利亚', '塞巴斯蒂安',
  '罗莎琳德', '尼古拉斯', '埃莉诺', '弗雷德里克', '比阿特丽斯', '康斯坦丁', '海伦娜',
  '阿尔伯特', '凯瑟琳', '蒂博尔', '玛蒂尔达', '奥利弗', '佩内洛普', '鲁伯特', '西尔维娅',
  '巴托洛缪', '阿德莱德', '加斯顿', '克蕾芒丝', '罗德里克', '布兰奇', '西奥多', '吉纳维芙',
];

// 怪癖池
const QUIRK_POOL: { id: string; name: string; positive: boolean }[] = [
  { id: 'clotter', name: '凝血体质', positive: true },
  { id: 'hammer_hands', name: '铁锤之手', positive: true },
  { id: 'hard_skinned', name: '坚韧皮肤', positive: true },
  { id: 'eagle_eye', name: '鹰眼', positive: true },
  { id: 'quick_draw', name: '反应敏捷', positive: true },
  { id: 'natural_swing', name: '天生好手', positive: true },
  { id: 'precise_striker', name: '精准打击', positive: true },
  { id: 'sturdy', name: '体格健壮', positive: true },
  { id: 'unyielding', name: '不屈意志', positive: true },
  { id: 'warrior_of_light', name: '光明战士', positive: true },
  { id: 'nervous', name: '神经质', positive: false },
  { id: 'slow_draw', name: '反应迟钝', positive: false },
  { id: 'clumsy', name: '笨拙', positive: false },
  { id: 'fragile', name: '脆弱体质', positive: false },
  { id: 'greedy', name: '贪婪', positive: false },
  { id: 'cowardly', name: '胆怯', positive: false },
  { id: 'night_blind', name: '夜盲', positive: false },
  { id: 'thin_blooded', name: '血液稀薄', positive: false },
  { id: 'weak_willed', name: '意志薄弱', positive: false },
  { id: 'tunnel_vision', name: '管状视野', positive: false },
];

// 疾病池
const DISEASE_POOL: { id: string; name: string }[] = [
  { id: 'syphilis', name: '梅毒' },
  { id: 'plague', name: '瘟疫' },
  { id: 'cough', name: '咳嗽' },
  { id: 'fever', name: '发热' },
  { id: 'rabies', name: '狂犬病' },
  { id: 'tetanus', name: '破伤风' },
  { id: 'leprosy', name: '麻风病' },
];

// 饰品定义池（用于游商随机上架）
// 使用真实饰品 ID 与 buffs，与 trinkets.json 数据库一致
interface TrinketDef {
  id: string;
  name: string;
  rarity: string;
  price: number;
  desc: string;
  buffs: string[];
}

const TRINKET_POOL: TrinketDef[] = [
  // 粗劣（低价基础饰品）
  { id: 'damage_stone', name: '伤害之石', rarity: 'common', price: 7500, desc: '+10% 伤害, -10 闪避', buffs: ['TRINKET_DMGL_B1', 'TRINKET_DMGH_B1', 'TRINKET_DEF_D2'] },
  { id: 'dodge_stone', name: '闪避之石', rarity: 'very_common', price: 5000, desc: '+5 闪避, -1 速度', buffs: ['TRINKET_DEF_B1', 'TRINKET_SPD_D1'] },
  { id: 'critical_stone', name: '暴击之石', rarity: 'very_common', price: 5000, desc: '+2% 暴击, -1 速度', buffs: ['TRINKET_CRIT_B1', 'TRINKET_SPD_D1'] },
  { id: 'protection_stone', name: '防护之石', rarity: 'very_common', price: 5000, desc: '+5% 防护, -1 速度', buffs: ['TRINKET_PROT_B1', 'TRINKET_SPD_D1'] },
  { id: 'health_stone', name: '生命之石', rarity: 'very_common', price: 5000, desc: '+5 最大生命, -1 速度', buffs: ['TRINKET_MAXHP_B1', 'TRINKET_SPD_D1'] },
  { id: 'speed_stone', name: '速度之石', rarity: 'common', price: 7500, desc: '+1 速度', buffs: ['TRINKET_SPD_B1'] },
  { id: 'accuracy_stone', name: '精准之石', rarity: 'very_common', price: 5000, desc: '+5 精准, -1 速度', buffs: ['TRINKET_ACC_B1', 'TRINKET_SPD_D1'] },
  // 普通
  { id: 'bleeding_pendant', name: '流血吊坠', rarity: 'common', price: 7500, desc: '+10% 流血抗性', buffs: ['TB_BLEEDRESIST_B_2'] },
  { id: 'dazzling_charm', name: '耀眼护符', rarity: 'common', price: 7500, desc: '+10 闪避', buffs: ['TB_DOD_B_2'] },
  { id: 'reckless_charm', name: '鲁莽护符', rarity: 'common', price: 7500, desc: '+15% 伤害, -10 闪避', buffs: ['TB_DMG_B_3', 'TB_DOD_D_2'] },
  { id: 'warriors_bracer', name: '战士护腕', rarity: 'common', price: 7500, desc: '+10% 伤害', buffs: ['TB_DMG_B_2'] },
  { id: 'warriors_cap', name: '战士帽', rarity: 'common', price: 7500, desc: '+5% 防护', buffs: ['TB_PROT_B_1'] },
  // 罕见
  { id: 'steady_bracer', name: '稳固护腕', rarity: 'uncommon', price: 10000, desc: '+10% 伤害, +5 精准', buffs: ['TB_DMG_B_2', 'TB_ACC_B_1'] },
  { id: 'swift_cloak', name: '疾风斗篷', rarity: 'uncommon', price: 10000, desc: '+10 闪避, +2 速度', buffs: ['TB_DOD_B_2', 'TB_SPD_B_2'] },
  { id: 'life_crystal', name: '生命水晶', rarity: 'uncommon', price: 10000, desc: '+10 最大生命', buffs: ['TB_MAXHP_B_2'] },
  { id: 'calming_crystal', name: '镇定水晶', rarity: 'uncommon', price: 10000, desc: '+10% 压力抗性', buffs: ['TB_STRESSRESIST_B_2'] },
  { id: 'camouflage_cloak', name: '伪装斗篷', rarity: 'uncommon', price: 10000, desc: '+15 闪避', buffs: ['TB_DOD_B_3'] },
  { id: 'solar_bracer', name: '烈日护腕', rarity: 'uncommon', price: 10000, desc: '+10% 伤害, +5% 防护', buffs: ['TB_DMG_B_2', 'TB_PROT_B_1'] },
  { id: 'dark_bracer', name: '黑暗护腕', rarity: 'uncommon', price: 10000, desc: '+15% 伤害, -5 精准', buffs: ['TB_DMG_B_3', 'TB_ACC_D_1'] },
  { id: 'stun_amulet', name: '眩晕护身符', rarity: 'uncommon', price: 10000, desc: '+15% 眩晕抗性', buffs: ['TB_STUNRESIST_B_3'] },
  // 稀有
  { id: 'focus_ring', name: '专注之戒', rarity: 'very_rare', price: 25000, desc: '+10 精准, +4% 暴击, -15 闪避', buffs: ['TRINKET_focus_ring_ACC_BUFF', 'TRINKET_focus_ring_CRIT_BUFF', 'TRINKET_DEF_D3'] },
  { id: 'berserk_charm', name: '狂战护符', rarity: 'rare', price: 15000, desc: '+15% 伤害, -3% 暴击', buffs: ['TB_DMG_B_3', 'TB_CRIT_D_1'] },
  { id: 'quick_draw_charm', name: '快拔护符', rarity: 'rare', price: 15000, desc: '+2 速度, +5 精准', buffs: ['TB_SPD_B_2', 'TB_ACC_B_1'] },
  { id: 'sun_ring', name: '烈日之戒', rarity: 'rare', price: 15000, desc: '+5% 伤害(光照), +5 精准(光照)', buffs: ['TRINKET_lightabove_DMGL_B1', 'TRINKET_lightabove_DMGH_B1', 'TRINKET_lightabove_ACC_B1'] },
  { id: 'moon_ring', name: '月光之戒', rarity: 'rare', price: 15000, desc: '+5% 伤害(黑暗), +10 精准(黑暗)', buffs: ['TRINKET_lightbelow_DMGL_B1', 'TRINKET_lightbelow_DMGH_B1', 'TRINKET_lightbelow_ACC_B2'] },
  { id: 'feather_crystal', name: '羽毛水晶', rarity: 'rare', price: 15000, desc: '+15 闪避, +1 速度', buffs: ['TB_DOD_B_3', 'TB_SPD_B_1'] },
  { id: 'recovery_charm', name: '复苏护符', rarity: 'rare', price: 15000, desc: '+10% 压力抗性, +5 最大生命', buffs: ['TB_STRESSRESIST_B_2', 'TB_MAXHP_B_1'] },
  // 非常稀有
  { id: 'tough_ring', name: '坚韧之戒', rarity: 'very_rare', price: 25000, desc: '+10% 防护, +10 最大生命, -10% 伤害', buffs: ['TRINKET_tough_ring_PROT_BUFF', 'TRINKET_tough_ring_MAXHP_BUFF', 'TRINKET_tough_ring_DMG_DEBUFF_L', 'TRINKET_tough_ring_DMG_DEBUFF_H', 'TRINKET_tough_ring_STRESSDMG_DEBUFF'] },
  { id: 'legendary_bracer', name: '传奇护腕', rarity: 'very_rare', price: 25000, desc: '+20% 伤害, -2 速度, +10% 压力伤害', buffs: ['TRINKET_legendary_bracer_DMG_BUFF_L', 'TRINKET_legendary_bracer_DMG_BUFF_H', 'TRINKET_legendary_bracer_SPD_DEBUFF', 'TRINKET_legendary_bracer_STRESSDMG_DEBUFF'] },
];

// 供给品定义
const PROVISION_DEFS: Omit<ProvisionItem, 'count'>[] = [
  { id: 'food', name: '食物', type: 'food', description: '冒险途中的口粮，防止饥饿', price: 75 },
  { id: 'shovel', name: '铲子', type: 'shovel', description: '清除路障和阻塞', price: 250 },
  { id: 'skeleton_key', name: '骷髅钥匙', type: 'key', description: '开启锁住的柜子和门', price: 200 },
  { id: 'holy_water', name: '圣水', type: 'holy_water', description: '净化与祝福用品', price: 150 },
  { id: 'torch', name: '火把', type: 'torch', description: '提供光照，降低压力', price: 75 },
  { id: 'bandage', name: '绷带', type: 'bandage', description: '止血用品', price: 150 },
  { id: 'antivenom', name: '解毒剂', type: 'antivenom', description: '解除中毒状态', price: 150 },
  { id: 'medicinal_herbs', name: '草药', type: 'medicinal_herbs', description: '草药治疗用品', price: 150 },
];

// ---- 随机生成辅助函数 ----

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

let uidCounter = Date.now();
function generateHeroUid(): string {
  uidCounter++;
  return `hero_r_${uidCounter}`;
}

// 生成随机英雄实例
function generateRandomHero(): HeroInstance {
  const classData = randomPick(HERO_CLASS_DATA);
  const resolveLevel = randomInt(0, 2);
  const baseHp = classData.baseHp + resolveLevel * 5;
  const quirkCount = randomInt(1, 2);
  const quirks = randomPickN(QUIRK_POOL, quirkCount).map(q => q.id);
  const skills = DEFAULT_SKILLS[classData.id] || DEFAULT_SKILLS.crusader;

  // 随机决定是否带疾病（20%概率）
  const diseases = Math.random() < 0.2 ? [randomPick(DISEASE_POOL).id] : [];

  return {
    uid: generateHeroUid(),
    classId: classData.id,
    name: randomPick(NAME_POOL),
    resolveLevel,
    currentHp: baseHp,
    maxHp: baseHp,
    stress: randomInt(0, 30),
    quirks,
    diseases,
    trinket1: null,
    trinket2: null,
    skills,
    campingSkills: [],
    weaponLevel: resolveLevel > 0 ? randomInt(0, resolveLevel) : 0,
    armorLevel: resolveLevel > 0 ? randomInt(0, resolveLevel) : 0,
    missingUntilWeek: null,
    activityLocked: false,
  };
}

// 生成驿站英雄列表
function generateStagecoachHeroes(): HeroInstance[] {
  const count = randomInt(1, 3);
  return Array.from({ length: count }, () => generateRandomHero());
}

// 将饰品定义转为 TrinketEntry
function defToTrinketEntry(def: TrinketDef): TrinketEntry {
  return {
    id: def.id,
    buffs: [],
    heroClassRequirements: [],
    rarity: def.rarity,
    price: def.price,
    limit: 0,
    originDungeon: '',
    name: def.name,
    desc: def.desc,
  };
}

// 生成游商饰品
function generateNomadTrinkets(): TrinketEntry[] {
  const count = randomInt(3, 5);
  const selected = randomPickN(TRINKET_POOL, count);
  return selected.map(defToTrinketEntry);
}

// 生成供给品库存
function generateProvisions(): ProvisionItem[] {
  const list = PROVISION_DEFS.map((def) => ({
    ...def,
    count: randomInt(3, 8),
  }));
  // 血液：高价值稀缺品，仅 40% 概率上架，存量 0-2 瓶
  if (Math.random() < 0.4) {
    list.push({ ...THE_BLOOD_ITEM, count: randomInt(0, 2) });
  }
  return list;
}

// ---- 升级费用计算 ----

export function getWeaponUpgradeCost(currentLevel: number): { gold: number; crests: number } {
  if (currentLevel >= 4) return { gold: 0, crests: 0 };
  return {
    gold: Math.round(500 * Math.pow(currentLevel + 1, 1.5)),
    crests: currentLevel + 1,
  };
}

export function getArmorUpgradeCost(currentLevel: number): { gold: number; crests: number } {
  if (currentLevel >= 4) return { gold: 0, crests: 0 };
  return {
    gold: Math.round(500 * Math.pow(currentLevel + 1, 1.5)),
    crests: currentLevel + 1,
  };
}

export function getSkillUpgradeCost(currentLevel: number): { gold: number; crests: number } {
  if (currentLevel >= 4) return { gold: 0, crests: 0 };
  return {
    gold: Math.round(500 * Math.pow(currentLevel + 1, 1.5)),
    crests: currentLevel + 1,
  };
}

export function getRecruitCost(resolveLevel: number): number {
  return 1000 * (resolveLevel + 1);
}

// ---- 怪癖/疾病中文名查询 ----

export function getQuirkName(quirkId: string): string {
  const q = QUIRK_POOL.find(x => x.id === quirkId);
  if (q) return q.name;
  return wordZh(quirkId);
}

export function isPositiveQuirk(quirkId: string): boolean {
  const q = QUIRK_POOL.find(x => x.id === quirkId);
  return q ? q.positive : false;
}

export function getDiseaseName(diseaseId: string): string {
  const d = DISEASE_POOL.find(x => x.id === diseaseId);
  if (d) return d.name;
  return wordZh(diseaseId);
}

export function getTrinketRarityName(rarity: string): string {
  const map: Record<string, string> = {
    common: '普通',
    uncommon: '罕见',
    rare: '稀有',
    very_rare: '极品',
  };
  return map[rarity] || rarity;
}

// ---- Store 定义 ----

interface TownStore {
  activeBuilding: BuildingId | null;
  buildingData: Record<string, BuildingState>;
  showDistricts: boolean;   // 是否显示区域建筑面板

  // 建筑操作
  openBuilding: (id: BuildingId) => void;
  closeBuilding: () => void;
  openDistricts: () => void;
  closeDistricts: () => void;

  // 驿站 — 招募英雄
  stagecoachHeroes: HeroInstance[];
  refreshStagecoach: () => void;
  recruitHero: (hero: HeroInstance) => void;

  // 游商 — 购买饰品和补给
  nomadWagonTrinkets: TrinketEntry[];
  nomadWagonProvisions: ProvisionItem[];
  refreshNomadWagon: () => void;
  buyTrinket: (trinketId: string) => boolean;
  buyProvision: (provisionId: string, count: number) => boolean;

  // 酒馆 — 降压力 / 解雇
  tavernTreatHero: (heroUid: string, treatment: 'drink' | 'gamble') => boolean;
  dismissHero: (heroUid: string) => void;

  // 修道院 — 降压力
  abbeyTreatHero: (heroUid: string, treatment: 'meditate' | 'pray') => boolean;

  // 铁匠 — 升级武器 / 护甲
  upgradeWeapon: (heroUid: string) => boolean;
  upgradeArmor: (heroUid: string) => boolean;

  // 公会 — 升级技能
  upgradeSkill: (heroUid: string, skillId: string) => boolean;

  // 疗养院 — 治疗疾病 / 锁定怪癖
  sanitariumCureDisease: (heroUid: string, diseaseId: string) => boolean;
  sanitariumLockQuirk: (heroUid: string, quirkId: string) => boolean;
}

// 初始建筑状态
function initBuildingData(): Record<string, BuildingState> {
  const data: Record<string, BuildingState> = {};
  const ids: BuildingId[] = ['stagecoach', 'nomad_wagon', 'tavern', 'abbey', 'blacksmith', 'guild', 'sanitarium', 'mod_manager', 'sanctum'];
  for (const id of ids) {
    data[id] = { unlocked: id === 'stagecoach' || id === 'nomad_wagon' || id === 'mod_manager', refreshWeek: 1 };
  }
  return data;
}

export const useTownStore = create<TownStore>((set, get) => ({
  activeBuilding: null,
  buildingData: initBuildingData(),
  showDistricts: false,

  // ---- 建筑操作 ----

  openBuilding: (id) => set({ activeBuilding: id, showDistricts: false }),
  closeBuilding: () => set({ activeBuilding: null }),
  openDistricts: () => set({ showDistricts: true, activeBuilding: null }),
  closeDistricts: () => set({ showDistricts: false }),

  // ---- 驿站 ----

  stagecoachHeroes: generateStagecoachHeroes(),

  refreshStagecoach: () => {
    set({ stagecoachHeroes: generateStagecoachHeroes() });
  },

  recruitHero: (hero) => {
    const result = runGameCommand('dd.recruitHero', { heroUid: hero.uid }, 'stagecoach');
    return result.status === 'committed';
  },

  // ---- 游商 ----

  nomadWagonTrinkets: generateNomadTrinkets(),
  nomadWagonProvisions: generateProvisions(),

  refreshNomadWagon: () => {
    set({
      nomadWagonTrinkets: generateNomadTrinkets(),
      nomadWagonProvisions: generateProvisions(),
    });
  },

  buyTrinket: (trinketId) => {
    const state = get();
    const trinket = state.nomadWagonTrinkets.find(t => t.id === trinketId);
    if (!trinket) return false;
    const gs = useGameStore.getState();
    if (gs.gold < trinket.price) return false;
    gs.spendGold(trinket.price);
    set((s) => ({
      nomadWagonTrinkets: s.nomadWagonTrinkets.filter(t => t.id !== trinketId),
    }));
    return true;
  },

  buyProvision: (provisionId, count) => {
    const state = get();
    const item = state.nomadWagonProvisions.find(p => p.id === provisionId);
    if (!item) return false;
    const buyCount = Math.min(count, item.count);
    if (buyCount <= 0) return false;
    const gs = useGameStore.getState();
    const totalCost = item.price * buyCount;
    if (gs.gold < totalCost) return false;
    gs.spendGold(totalCost);
    set((s) => ({
      nomadWagonProvisions: s.nomadWagonProvisions.map(p =>
        p.id === provisionId
          ? { ...p, count: p.count - buyCount }
          : p
      ),
    }));
    return true;
  },

  // ---- 酒馆 ----

  tavernTreatHero: (heroUid, treatment) => {
    const gs = useGameStore.getState();
    const hero = gs.roster.find(h => h.uid === heroUid);
    if (!hero) return false;
    if (hero.activityLocked) return false;
    const cost = treatment === 'drink' ? 1250 : 750;
    if (gs.gold < cost) return false;
    gs.spendGold(cost);
    gs.updateHero(heroUid, {
      stress: Math.max(0, hero.stress - 15),
      activityLocked: true,
    });
    return true;
  },

  dismissHero: (heroUid) => {
    const gs = useGameStore.getState();
    gs.removeHero(heroUid);
  },

  // ---- 修道院 ----

  abbeyTreatHero: (heroUid, treatment) => {
    const gs = useGameStore.getState();
    const hero = gs.roster.find(h => h.uid === heroUid);
    if (!hero) return false;
    if (hero.activityLocked) return false;
    const cost = treatment === 'meditate' ? 1000 : 1500;
    if (gs.gold < cost) return false;
    gs.spendGold(cost);
    gs.updateHero(heroUid, {
      stress: Math.max(0, hero.stress - 15),
      activityLocked: true,
    });
    return true;
  },

  // ---- 铁匠 ----

  upgradeWeapon: (heroUid) => {
    const gs = useGameStore.getState();
    const hero = gs.roster.find(h => h.uid === heroUid);
    if (!hero) return false;
    if (hero.weaponLevel >= 4) return false;
    const cost = getWeaponUpgradeCost(hero.weaponLevel);
    if (gs.gold < cost.gold) return false;
    if (gs.heirlooms.crest < cost.crests) return false;
    gs.spendGold(cost.gold);
    // 扣除纹章
    for (let i = 0; i < cost.crests; i++) {
      gs.addHeirloom('crest', -1);
    }
    gs.updateHero(heroUid, { weaponLevel: hero.weaponLevel + 1 });
    return true;
  },

  upgradeArmor: (heroUid) => {
    const gs = useGameStore.getState();
    const hero = gs.roster.find(h => h.uid === heroUid);
    if (!hero) return false;
    if (hero.armorLevel >= 4) return false;
    const cost = getArmorUpgradeCost(hero.armorLevel);
    if (gs.gold < cost.gold) return false;
    if (gs.heirlooms.crest < cost.crests) return false;
    gs.spendGold(cost.gold);
    for (let i = 0; i < cost.crests; i++) {
      gs.addHeirloom('crest', -1);
    }
    // 护甲升级会增加最大生命值
    const hpIncrease = 7; // 每级+7 HP（近似值）
    gs.updateHero(heroUid, {
      armorLevel: hero.armorLevel + 1,
      maxHp: hero.maxHp + hpIncrease,
      currentHp: hero.currentHp + hpIncrease,
    });
    return true;
  },

  // ---- 公会 ----

  upgradeSkill: (heroUid, skillId) => {
    const gs = useGameStore.getState();
    const hero = gs.roster.find(h => h.uid === heroUid);
    if (!hero) return false;
    if (!hero.skills.includes(skillId)) return false;
    const currentSkillLevel = hero.skillLevels?.[skillId] ?? 0;
    if (currentSkillLevel >= 4) return false;
    const cost = getSkillUpgradeCost(currentSkillLevel);
    if (gs.gold < cost.gold) return false;
    if (gs.heirlooms.crest < cost.crests) return false;
    gs.spendGold(cost.gold);
    for (let i = 0; i < cost.crests; i++) {
      gs.addHeirloom('crest', -1);
    }
    const newSkillLevels = {
      ...(hero.skillLevels || {}),
      [skillId]: currentSkillLevel + 1,
    };
    gs.updateHero(heroUid, { skillLevels: newSkillLevels });
    return true;
  },

  // ---- 疗养院 ----

  sanitariumCureDisease: (heroUid, diseaseId) => {
    const gs = useGameStore.getState();
    const hero = gs.roster.find(h => h.uid === heroUid);
    if (!hero) return false;
    if (!hero.diseases.includes(diseaseId)) return false;
    if (gs.gold < 1500) return false;
    gs.spendGold(1500);
    gs.updateHero(heroUid, {
      diseases: hero.diseases.filter(d => d !== diseaseId),
    });
    return true;
  },

  sanitariumLockQuirk: (heroUid, quirkId) => {
    const gs = useGameStore.getState();
    const hero = gs.roster.find(h => h.uid === heroUid);
    if (!hero) return false;
    if (!hero.quirks.includes(quirkId)) return false;
    const locked = hero.lockedQuirks || [];
    if (locked.includes(quirkId)) return false;
    if (gs.gold < 1500) return false;
    gs.spendGold(1500);
    gs.updateHero(heroUid, {
      lockedQuirks: [...locked, quirkId],
    });
    return true;
  },
}));

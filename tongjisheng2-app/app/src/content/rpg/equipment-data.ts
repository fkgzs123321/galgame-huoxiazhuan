/**
 * 装备系统数据(阶段3 步骤7 · RPG 养成)
 *
 * 装备分类:
 *  - 武器(影响战斗伤害/命中率)
 *  - 防具(影响防御/HP 上限)
 *  - 饰品(特殊效果:技能加成/经济加成/社交加成)
 *
 * 装备槽:
 *  - weapon(武器)
 *  - armor(防具)
 *  - accessory(饰品)
 *
 * 与 schema.ts 集成:
 *  - 装备栏存 主角.装备 对象(weapon/armor/accessory 字段)
 *  - 装备效果由 rpg-engine 在战斗/技能检定时计算
 *  - 与 shop-engine 联动:商店购买装备 → 入库 → 装备
 */

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';
export type EquipmentRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface EquipmentBonus {
  /** 技能加成 */
  skillBonus?: Partial<Record<string, number>>;
  /** 属性加成 */
  attributeBonus?: Partial<{
    魅力: number;
    学业: number;
    体力: number;
    社交: number;
    敏感: number;
    声誉: number;
  }>;
  /** HP 加成 */
  hpBonus?: number;
  /** 伤害加成(百分比) */
  damageBonus?: number;
  /** 防御加成 */
  defenseBonus?: number;
  /** 经济加成(打工收入百分比) */
  incomeBonus?: number;
  /** 好感度加成(百分比) */
  affectionBonus?: number;
}

export interface Equipment {
  id: string;
  /** 显示名 */
  name: string;
  /** 槽位 */
  slot: EquipmentSlot;
  /** 稀有度 */
  rarity: EquipmentRarity;
  /** 简述 */
  description: string;
  /** 购买价格(0=不可购买) */
  price: number;
  /** 出售价格 */
  sellPrice: number;
  /** 装备效果 */
  bonus: EquipmentBonus;
  /** 获取方式 */
  obtain: 'shop' | 'quest' | 'event' | 'craft';
  /** 获取来源 id(商店/任务/事件) */
  sourceId?: string;
  /** 等级要求(对应玩家技能等级) */
  levelRequirement?: number;
}

// ───────────────────────────────────────────────────────────
//  装备列表
// ───────────────────────────────────────────────────────────

export const EQUIPMENTS: Equipment[] = [
  // ─── 武器 ───
  {
    id: 'weapon_fists',
    name: '徒手',
    slot: 'weapon',
    rarity: 'common',
    description: '默认武器,无加成。',
    price: 0,
    sellPrice: 0,
    bonus: {},
    obtain: 'shop',
  },
  {
    id: 'weapon_bat',
    name: '棒球棍',
    slot: 'weapon',
    rarity: 'common',
    description: '常见运动器材,格斗伤害 +20%。',
    price: 1500,
    sellPrice: 500,
    bonus: { damageBonus: 0.2, skillBonus: { 格斗: 5 } },
    obtain: 'shop',
    sourceId: 'shop_sports',
  },
  {
    id: 'weapon_knife',
    name: '折叠刀',
    slot: 'weapon',
    rarity: 'rare',
    description: '危险工具,格斗 +10,潜行 +5,但违法风险高。',
    price: 3000,
    sellPrice: 1000,
    bonus: { damageBonus: 0.4, skillBonus: { 格斗: 10, 潜行: 5 } },
    obtain: 'shop',
    sourceId: 'shop_blackmarket',
    levelRequirement: 3,
  },
  {
    id: 'weapon_wooden_sword',
    name: '木刀',
    slot: 'weapon',
    rarity: 'rare',
    description: '剑道部标配,格斗 +12,力量 +5。',
    price: 2500,
    sellPrice: 800,
    bonus: { damageBonus: 0.3, skillBonus: { 格斗: 12, 力量: 5 } },
    obtain: 'shop',
    sourceId: 'shop_sports',
    levelRequirement: 2,
  },
  {
    id: 'weapon_legendary_katana',
    name: '传家武士刀',
    slot: 'weapon',
    rarity: 'legendary',
    description: '传说级武器,格斗 +25,力量 +10,伤害 +60%。',
    price: 0,
    sellPrice: 0,
    bonus: { damageBonus: 0.6, skillBonus: { 格斗: 25, 力量: 10 } },
    obtain: 'quest',
    sourceId: 'hidden_02_old_diary',
    levelRequirement: 7,
  },

  // ─── 防具 ───
  {
    id: 'armor_school_uniform',
    name: '校服',
    slot: 'armor',
    rarity: 'common',
    description: '标准校服,防御 +5。',
    price: 0,
    sellPrice: 0,
    bonus: { defenseBonus: 5 },
    obtain: 'shop',
  },
  {
    id: 'armor_leather_jacket',
    name: '皮夹克',
    slot: 'armor',
    rarity: 'common',
    description: '帅气皮夹克,防御 +10,魅力 +3。',
    price: 2000,
    sellPrice: 700,
    bonus: { defenseBonus: 10, attributeBonus: { 魅力: 3 } },
    obtain: 'shop',
    sourceId: 'shop_clothing',
  },
  {
    id: 'armor_dragon_vest',
    name: '龙纹背心',
    slot: 'armor',
    rarity: 'epic',
    description: '稀有防具,防御 +25,体力 +10,HP +30。',
    price: 5000,
    sellPrice: 1500,
    bonus: { defenseBonus: 25, attributeBonus: { 体力: 10 }, hpBonus: 30 },
    obtain: 'shop',
    sourceId: 'shop_blackmarket',
    levelRequirement: 4,
  },

  // ─── 饰品 ───
  {
    id: 'accessory_watch',
    name: '电子表',
    slot: 'accessory',
    rarity: 'common',
    description: '90 年代电子表,观察 +3。',
    price: 800,
    sellPrice: 200,
    bonus: { skillBonus: { 观察: 3 } },
    obtain: 'shop',
    sourceId: 'shop_electronics',
  },
  {
    id: 'accessory_cologne',
    name: '古龙水',
    slot: 'accessory',
    rarity: 'common',
    description: '提升魅力 +5,恋爱 +3,好感度 +10%。',
    price: 1200,
    sellPrice: 400,
    bonus: { attributeBonus: { 魅力: 5 }, skillBonus: { 恋爱: 3 }, affectionBonus: 0.1 },
    obtain: 'shop',
    sourceId: 'shop_cosmetics',
  },
  {
    id: 'accessory_lucky_charm',
    name: '护身符',
    slot: 'accessory',
    rarity: 'rare',
    description: '幸运护身符,意志 +5,所有技能 +2。',
    price: 2500,
    sellPrice: 800,
    bonus: { skillBonus: { 力量: 2, 敏捷: 2, 智力: 2, 意志: 5, 格斗: 2, 恋爱: 2, 观察: 2 } },
    obtain: 'quest',
    sourceId: 'side_02_cooking_practice',
  },
  {
    id: 'accessory_photo_camera',
    name: '一次性相机',
    slot: 'accessory',
    rarity: 'rare',
    description: '拍照用,观察 +8,潜行 +5,可触发偷拍剧情。',
    price: 1800,
    sellPrice: 600,
    bonus: { skillBonus: { 观察: 8, 潜行: 5 } },
    obtain: 'shop',
    sourceId: 'shop_electronics',
    levelRequirement: 2,
  },
  {
    id: 'accessory_silver_ring',
    name: '银戒指',
    slot: 'accessory',
    rarity: 'epic',
    description: '精致银戒,魅力 +10,恋爱 +8,好感度 +20%。',
    price: 4000,
    sellPrice: 1200,
    bonus: { attributeBonus: { 魅力: 10 }, skillBonus: { 恋爱: 8 }, affectionBonus: 0.2 },
    obtain: 'shop',
    sourceId: 'shop_jewelry',
    levelRequirement: 4,
  },
  {
    id: 'accessory_rose_pendant',
    name: '玫瑰吊坠',
    slot: 'accessory',
    rarity: 'legendary',
    description: '传说级饰品,魅力 +15,恋爱 +15,好感度 +30%,打工收入 +20%。',
    price: 0,
    sellPrice: 0,
    bonus: {
      attributeBonus: { 魅力: 15 },
      skillBonus: { 恋爱: 15 },
      affectionBonus: 0.3,
      incomeBonus: 0.2,
    },
    obtain: 'quest',
    sourceId: 'main_05_christmas',
    levelRequirement: 6,
  },
];

// ───────────────────────────────────────────────────────────
//  辅助函数
// ───────────────────────────────────────────────────────────

/** 按 id 查找装备 */
export function findEquipment(id: string): Equipment | undefined {
  return EQUIPMENTS.find((e) => e.id === id);
}

/** 按槽位列出装备 */
export function listEquipmentsBySlot(slot: EquipmentSlot): Equipment[] {
  return EQUIPMENTS.filter((e) => e.slot === slot);
}

/** 按稀有度列出装备 */
export function listEquipmentsByRarity(rarity: EquipmentRarity): Equipment[] {
  return EQUIPMENTS.filter((e) => e.rarity === rarity);
}

/** 稀有度显示信息 */
export function getRarityInfo(rarity: EquipmentRarity): { label: string; color: string; icon: string } {
  switch (rarity) {
    case 'common':
      return { label: '普通', color: '#95a5a6', icon: '⚪' };
    case 'rare':
      return { label: '稀有', color: '#3498db', icon: '🔵' };
    case 'epic':
      return { label: '史诗', color: '#9b59b6', icon: '🟣' };
    case 'legendary':
      return { label: '传说', color: '#f39c12', icon: '🟡' };
  }
}

/** 装备槽位显示信息 */
export function getSlotInfo(slot: EquipmentSlot): { label: string; icon: string } {
  switch (slot) {
    case 'weapon':
      return { label: '武器', icon: '⚔️' };
    case 'armor':
      return { label: '防具', icon: '🛡️' };
    case 'accessory':
      return { label: '饰品', icon: '💍' };
  }
}

/** 计算装备总加成(多个装备合并) */
export function mergeEquipmentBonuses(equipments: Equipment[]): EquipmentBonus {
  const skillBonus: Record<string, number> = {};
  const attributeBonus: Record<string, number> = {};
  let hpBonus = 0;
  let damageBonus = 0;
  let defenseBonus = 0;
  let incomeBonus = 0;
  let affectionBonus = 0;

  for (const eq of equipments) {
    const b = eq.bonus;
    if (b.skillBonus) {
      for (const [k, v] of Object.entries(b.skillBonus)) {
        skillBonus[k] = (skillBonus[k] ?? 0) + (v ?? 0);
      }
    }
    if (b.attributeBonus) {
      for (const [k, v] of Object.entries(b.attributeBonus)) {
        attributeBonus[k] = (attributeBonus[k] ?? 0) + (v ?? 0);
      }
    }
    if (b.hpBonus) hpBonus += b.hpBonus;
    if (b.damageBonus) damageBonus += b.damageBonus;
    if (b.defenseBonus) defenseBonus += b.defenseBonus;
    if (b.incomeBonus) incomeBonus += b.incomeBonus;
    if (b.affectionBonus) affectionBonus += b.affectionBonus;
  }

  const merged: EquipmentBonus = {
    skillBonus,
    attributeBonus: attributeBonus as EquipmentBonus['attributeBonus'],
    hpBonus,
    damageBonus,
    defenseBonus,
    incomeBonus,
    affectionBonus,
  };
  return merged;
}

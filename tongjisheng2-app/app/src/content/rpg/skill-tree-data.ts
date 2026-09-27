/**
 * 技能树数据(阶段3 步骤7 · RPG 养成)
 *
 * 13 项技能可视化技能树:
 *  - 前置依赖(解锁需要先达到某等级的其他技能)
 *  - 等级上限(10 级,每级加成不同)
 *  - 升级消耗(技能点 + 金钱)
 *  - 派系分组(身体/心智/生活/社交/特殊)
 *
 * 与 schema.ts 对齐:
 *  - 技能.* 字段为 0-100 的"经验值",每 10 点 = 1 级
 *  - 战斗.*等级 字段为 1-10 的"战斗等级",由 rpg-engine 从技能值推算
 */

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

export type SkillId =
  | '力量' | '敏捷' | '智力' | '意志'
  | '潜行' | '口才'
  | '医学' | '烹饪' | '艺术' | '驾驶'
  | '格斗' | '恋爱' | '观察';

export type SkillFaction = '身体' | '心智' | '生活' | '社交' | '特殊';

export interface SkillNode {
  id: SkillId;
  /** 显示名 */
  name: string;
  /** 派系 */
  faction: SkillFaction;
  /** 简述 */
  description: string;
  /** 前置技能(id + 所需等级) */
  prerequisites: Array<{ skill: SkillId; level: number }>;
  /** 升级消耗:技能点 + 金钱 */
  cost: { skillPoints: number; money: number };
  /** 每级加成(应用到 schema 技能值或战斗等级) */
  perLevelBonus: {
    /** 直接加到 技能.* 字段(每级+10) */
    skillValue: number;
    /** 战斗等级加成(仅战斗相关技能:力量/敏捷/格斗/意志) */
    combatLevelBonus?: number;
  };
  /** 关联的战斗技能等级字段(若有) */
  combatLevelField?: '力量等级' | '格斗等级' | '敏捷等级' | '意志等级';
}

// ───────────────────────────────────────────────────────────
//  派系定义
// ───────────────────────────────────────────────────────────

export const SKILL_FACTIONS: Array<{ id: SkillFaction; label: string; color: string; icon: string }> = [
  { id: '身体', label: '身体派系', color: '#e74c3c', icon: '💪' },
  { id: '心智', label: '心智派系', color: '#3498db', icon: '🧠' },
  { id: '生活', label: '生活派系', color: '#27ae60', icon: '🍳' },
  { id: '社交', label: '社交派系', color: '#f39c12', icon: '💬' },
  { id: '特殊', label: '特殊派系', color: '#9b59b6', icon: '✨' },
];

// ───────────────────────────────────────────────────────────
//  13 项技能节点
// ───────────────────────────────────────────────────────────

export const SKILL_TREE: SkillNode[] = [
  // ─── 身体派系 ───
  {
    id: '力量',
    name: '力量',
    faction: '身体',
    description: '影响搬重物、近战伤害、威吓。每级 +10 技能值,+1 战斗等级。',
    prerequisites: [],
    cost: { skillPoints: 1, money: 200 },
    perLevelBonus: { skillValue: 10, combatLevelBonus: 1 },
    combatLevelField: '力量等级',
  },
  {
    id: '敏捷',
    name: '敏捷',
    faction: '身体',
    description: '影响逃跑、潜行、闪避。每级 +10 技能值,+1 战斗等级。',
    prerequisites: [],
    cost: { skillPoints: 1, money: 200 },
    perLevelBonus: { skillValue: 10, combatLevelBonus: 1 },
    combatLevelField: '敏捷等级',
  },
  {
    id: '格斗',
    name: '格斗',
    faction: '身体',
    description: '影响战斗命中率、伤害、招式。每级 +10 技能值,+1 战斗等级。',
    prerequisites: [{ skill: '力量', level: 2 }],
    cost: { skillPoints: 2, money: 500 },
    perLevelBonus: { skillValue: 10, combatLevelBonus: 1 },
    combatLevelField: '格斗等级',
  },
  {
    id: '意志',
    name: '意志',
    faction: '身体',
    description: '影响抵抗强迫、精神判定、压力承受。每级 +10 技能值,+1 战斗等级。',
    prerequisites: [],
    cost: { skillPoints: 1, money: 300 },
    perLevelBonus: { skillValue: 10, combatLevelBonus: 1 },
    combatLevelField: '意志等级',
  },

  // ─── 心智派系 ───
  {
    id: '智力',
    name: '智力',
    faction: '心智',
    description: '影响学习、解谜、学业成绩。每级 +10 技能值。',
    prerequisites: [],
    cost: { skillPoints: 1, money: 300 },
    perLevelBonus: { skillValue: 10 },
  },
  {
    id: '观察',
    name: '观察',
    faction: '心智',
    description: '影响发现线索、识破谎言、偷拍成功率。每级 +10 技能值。',
    prerequisites: [],
    cost: { skillPoints: 1, money: 200 },
    perLevelBonus: { skillValue: 10 },
  },
  {
    id: '潜行',
    name: '潜行',
    faction: '心智',
    description: '影响尾随、潜入、不被发现。每级 +10 技能值。需观察 2 级。',
    prerequisites: [{ skill: '观察', level: 2 }],
    cost: { skillPoints: 2, money: 400 },
    perLevelBonus: { skillValue: 10 },
  },

  // ─── 生活派系 ───
  {
    id: '医学',
    name: '医学',
    faction: '生活',
    description: '影响治疗、药物使用、急救。每级 +10 技能值。',
    prerequisites: [{ skill: '智力', level: 2 }],
    cost: { skillPoints: 2, money: 600 },
    perLevelBonus: { skillValue: 10 },
  },
  {
    id: '烹饪',
    name: '烹饪',
    faction: '生活',
    description: '影响料理品质、女角好感加成、日常省钱。每级 +10 技能值。',
    prerequisites: [],
    cost: { skillPoints: 1, money: 150 },
    perLevelBonus: { skillValue: 10 },
  },
  {
    id: '艺术',
    name: '艺术',
    faction: '生活',
    description: '影响绘画、音乐、审美判定。每级 +10 技能值。',
    prerequisites: [],
    cost: { skillPoints: 1, money: 200 },
    perLevelBonus: { skillValue: 10 },
  },
  {
    id: '驾驶',
    name: '驾驶',
    faction: '生活',
    description: '影响骑自行车、摩托、汽车。每级 +10 技能值。需力量 1 级。',
    prerequisites: [{ skill: '力量', level: 1 }],
    cost: { skillPoints: 2, money: 800 },
    perLevelBonus: { skillValue: 10 },
  },

  // ─── 社交派系 ───
  {
    id: '口才',
    name: '口才',
    faction: '社交',
    description: '影响说服、谈判、社交判定。每级 +10 技能值。',
    prerequisites: [],
    cost: { skillPoints: 1, money: 250 },
    perLevelBonus: { skillValue: 10 },
  },
  {
    id: '恋爱',
    name: '恋爱',
    faction: '社交',
    description: '影响好感度加成、H 场景判定、关系推进。每级 +10 技能值。',
    prerequisites: [{ skill: '口才', level: 2 }],
    cost: { skillPoints: 2, money: 500 },
    perLevelBonus: { skillValue: 10 },
  },
];

// ───────────────────────────────────────────────────────────
//  辅助函数
// ───────────────────────────────────────────────────────────

/** 按 id 查找技能节点 */
export function findSkillNode(id: SkillId): SkillNode | undefined {
  return SKILL_TREE.find((s) => s.id === id);
}

/** 按派系列出技能 */
export function listSkillsByFaction(faction: SkillFaction): SkillNode[] {
  return SKILL_TREE.filter((s) => s.faction === faction);
}

/** 从 schema 技能值(0-100)推算等级(1-10) */
export function skillValueToLevel(value: number): number {
  return Math.max(1, Math.min(10, Math.floor(value / 10) + 1));
}

/** 从等级(1-10)推算所需技能值 */
export function skillLevelToValue(level: number): number {
  return Math.max(0, Math.min(100, (level - 1) * 10));
}

/** 检查前置是否满足 */
export function checkPrerequisites(
  node: SkillNode,
  currentSkills: Record<SkillId, number>,
): { ok: boolean; missing: Array<{ skill: SkillId; required: number; current: number }> } {
  const missing: Array<{ skill: SkillId; required: number; current: number }> = [];
  for (const pre of node.prerequisites) {
    const currentLevel = skillValueToLevel(currentSkills[pre.skill] ?? 0);
    if (currentLevel < pre.level) {
      missing.push({ skill: pre.skill, required: pre.level, current: currentLevel });
    }
  }
  return { ok: missing.length === 0, missing };
}

/**
 * RPG Engine · RPG 养成引擎(阶段3 步骤7)
 *
 * 职责:
 *  - 技能成长:消耗技能点+金钱升级技能,写回 schema 技能.* 字段
 *  - 战斗等级推算:从技能值(0-100)推算战斗等级(1-10),写回 战斗.*等级
 *  - 装备管理:装备/卸下/替换装备,更新 主角.装备 字段
 *  - 装备效果计算:合并装备加成,供战斗/技能检定使用
 *  - 任务系统:评估触发条件/目标完成度/奖励结算
 *  - 数值平衡:难度系数、成长曲线、装备加成汇总
 *
 * 集成:
 *  - ui/RpgPanel 调用本引擎
 *  - 生成 stateOps,合并到 CandidateChangeSet
 *  - 与 combat-engine 联动:提供装备加成后的有效属性
 *  - 与 shop-engine 联动:商店购买装备后可装备
 *  - 与 achievement-engine 联动:任务完成可触发成就
 */

import {
  SKILL_TREE,
  checkPrerequisites,
  findSkillNode,
  skillValueToLevel,
  type SkillId,
} from '../content/rpg/skill-tree-data';
import {
  QUESTS,
  checkPrerequisiteQuests,
  evaluateObjectives,
  evaluateTrigger,
  findQuest,
  type Quest,
  type QuestReward,
  type QuestStatus,
} from '../content/rpg/quest-data';
import {
  EQUIPMENTS,
  findEquipment,
  getSlotInfo,
  mergeEquipmentBonuses,
  type Equipment,
  type EquipmentBonus,
  type EquipmentSlot,
} from '../content/rpg/equipment-data';
import type { MvuRuntime } from './mvu-runtime';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

/** 数值平衡配置 */
export interface BalanceConfig {
  /** 技能等级上限 */
  maxSkillLevel: number;
  /** 技能值上限 */
  maxSkillValue: number;
  /** 战斗等级上限 */
  maxCombatLevel: number;
  /** 初始技能点 */
  initialSkillPoints: number;
  /** 每日技能点恢复 */
  dailySkillPointRecovery: number;
  /** 难度对成长的影响(地狱=0.8,普通=1.0,轻松=1.2) */
  difficultyGrowthMultiplier: number;
}

/** 技能升级结果 */
export interface SkillUpgradeResult {
  ok: boolean;
  reason?: string;
  /** 变更操作 */
  stateOps: Array<{ op: 'replace' | 'add'; path: string; value: unknown }>;
  /** 消耗 */
  cost: { skillPoints: number; money: number };
  /** 新等级 */
  newLevel: number;
  /** 新技能值 */
  newValue: number;
}

/** 装备操作结果 */
export interface EquipResult {
  ok: boolean;
  reason?: string;
  /** 变更操作 */
  stateOps: Array<{ op: 'replace'; path: string; value: unknown }>;
  /** 新装备列表 */
  newEquipments: Record<EquipmentSlot, string>;
  /** 装备总加成 */
  totalBonus: EquipmentBonus;
}

/** 任务评估结果 */
export interface QuestEvaluationResult {
  questId: string;
  status: QuestStatus;
  /** 目标完成情况 */
  objectives: { allCompleted: boolean; completed: string[]; pending: string[] };
  /** 是否满足前置 */
  prerequisitesMet: boolean;
  /** 是否满足触发 */
  triggered: boolean;
}

/** 任务完成结算结果 */
export interface QuestCompletionResult {
  ok: boolean;
  reason?: string;
  /** 变更操作 */
  stateOps: Array<{ op: 'replace' | 'add'; path: string; value: unknown }>;
  /** 奖励明细 */
  rewards: QuestReward;
  /** 奖励描述(用于 UI 显示) */
  rewardDescription: string;
}

/** RPG 玩家状态概要 */
export interface RpgPlayerSummary {
  /** 已装备 */
  equipped: Record<EquipmentSlot, string>;
  /** 装备总加成 */
  equipmentBonus: EquipmentBonus;
  /** 当前技能值 */
  skills: Record<string, number>;
  /** 当前战斗等级 */
  combatLevels: Record<string, number>;
  /** 可用技能点(从 主角.技能点 读) */
  availableSkillPoints: number;
  /** 已完成任务 id 列表 */
  completedQuests: string[];
  /** 进行中任务 id 列表 */
  activeQuests: string[];
}

// ───────────────────────────────────────────────────────────
//  默认平衡配置
// ───────────────────────────────────────────────────────────

export const DEFAULT_BALANCE: BalanceConfig = {
  maxSkillLevel: 10,
  maxSkillValue: 100,
  maxCombatLevel: 10,
  initialSkillPoints: 5,
  dailySkillPointRecovery: 1,
  difficultyGrowthMultiplier: 1.0,
};

// ───────────────────────────────────────────────────────────
//  RPG Engine 类
// ───────────────────────────────────────────────────────────

export class RpgEngine {
  constructor(
    private mvu: MvuRuntime,
    private balance: BalanceConfig = DEFAULT_BALANCE,
  ) {}

  // ═══════════════════════════════════════════════════════
  //  技能成长
  // ═══════════════════════════════════════════════════════

  /**
   * 升级技能
   * @param skillId 技能 id
   * @param statData 当前 stat_data
   */
  upgradeSkill(
    skillId: SkillId,
    statData: Record<string, unknown>,
  ): SkillUpgradeResult {
    const node = findSkillNode(skillId);
    if (!node) {
      return { ok: false, reason: `未找到技能 ${skillId}`, stateOps: [], cost: { skillPoints: 0, money: 0 }, newLevel: 0, newValue: 0 };
    }

    // 当前技能值和等级
    const currentValue = this.getSkillValue(statData, skillId);
    const currentLevel = skillValueToLevel(currentValue);

    // 检查是否已达上限
    if (currentLevel >= this.balance.maxSkillLevel) {
      return { ok: false, reason: `${skillId} 已达上限 ${this.balance.maxSkillLevel} 级`, stateOps: [], cost: { skillPoints: 0, money: 0 }, newLevel: currentLevel, newValue: currentValue };
    }

    // 检查前置
    const currentSkills = this.getAllSkillValues(statData);
    const preCheck = checkPrerequisites(node, currentSkills);
    if (!preCheck.ok) {
      const missingDesc = preCheck.missing.map((m) => `${m.skill}(需${m.required}级,当前${m.current}级)`).join(', ');
      return { ok: false, reason: `前置不满足: ${missingDesc}`, stateOps: [], cost: { skillPoints: 0, money: 0 }, newLevel: currentLevel, newValue: currentValue };
    }

    // 检查技能点和金钱
    const availablePoints = this.getAvailableSkillPoints(statData);
    const currentMoney = this.getMoney(statData);
    if (availablePoints < node.cost.skillPoints) {
      return { ok: false, reason: `技能点不足(需 ${node.cost.skillPoints},有 ${availablePoints})`, stateOps: [], cost: { skillPoints: 0, money: 0 }, newLevel: currentLevel, newValue: currentValue };
    }
    if (currentMoney < node.cost.money) {
      return { ok: false, reason: `金钱不足(需 ${node.cost.money},有 ${currentMoney})`, stateOps: [], cost: { skillPoints: 0, money: 0 }, newLevel: currentLevel, newValue: currentValue };
    }

    // 计算新值
    const newValue = Math.min(this.balance.maxSkillValue, currentValue + node.perLevelBonus.skillValue);
    const newLevel = skillValueToLevel(newValue);

    // 生成 stateOps
    const stateOps: SkillUpgradeResult['stateOps'] = [
      { op: 'replace', path: `/技能/${skillId}`, value: newValue },
      { op: 'replace', path: '/主角/技能点', value: availablePoints - node.cost.skillPoints },
      { op: 'replace', path: '/主角/现金', value: currentMoney - node.cost.money },
    ];

    // 战斗技能等级同步
    if (node.combatLevelField && node.perLevelBonus.combatLevelBonus) {
      const currentCombatLevel = this.getCombatLevel(statData, node.combatLevelField);
      const newCombatLevel = Math.min(this.balance.maxCombatLevel, currentCombatLevel + node.perLevelBonus.combatLevelBonus);
      stateOps.push({ op: 'replace', path: `/战斗/${node.combatLevelField}`, value: newCombatLevel });
    }

    return {
      ok: true,
      stateOps,
      cost: node.cost,
      newLevel,
      newValue,
    };
  }

  /** 获取技能值 */
  private getSkillValue(statData: Record<string, unknown>, skillId: SkillId): number {
    const skills = (statData['技能'] ?? {}) as Record<string, unknown>;
    const v = skills[skillId];
    return typeof v === 'number' ? v : 0;
  }

  /** 获取所有技能值 */
  private getAllSkillValues(statData: Record<string, unknown>): Record<SkillId, number> {
    const skills = (statData['技能'] ?? {}) as Record<string, unknown>;
    const result = {} as Record<SkillId, number>;
    for (const node of SKILL_TREE) {
      const v = skills[node.id];
      result[node.id] = typeof v === 'number' ? v : 0;
    }
    return result;
  }

  /** 获取战斗等级 */
  private getCombatLevel(statData: Record<string, unknown>, field: string): number {
    const combat = (statData['战斗'] ?? {}) as Record<string, unknown>;
    const v = combat[field];
    return typeof v === 'number' ? v : 1;
  }

  /** 获取可用技能点 */
  private getAvailableSkillPoints(statData: Record<string, unknown>): number {
    const player = (statData['主角'] ?? {}) as Record<string, unknown>;
    const v = player['技能点'];
    return typeof v === 'number' ? v : 0;
  }

  /** 获取金钱 */
  private getMoney(statData: Record<string, unknown>): number {
    const player = (statData['主角'] ?? {}) as Record<string, unknown>;
    const v = player['现金'];
    return typeof v === 'number' ? v : 0;
  }

  // ═══════════════════════════════════════════════════════
  //  装备系统
  // ═══════════════════════════════════════════════════════

  /**
   * 装备装备
   * @param equipmentId 装备 id
   * @param statData 当前 stat_data
   */
  equip(
    equipmentId: string,
    statData: Record<string, unknown>,
  ): EquipResult {
    const eq = findEquipment(equipmentId);
    if (!eq) {
      return { ok: false, reason: `未找到装备 ${equipmentId}`, stateOps: [], newEquipments: this.getCurrentEquipments(statData), totalBonus: this.calculateTotalBonus(statData) };
    }

    // 检查等级要求
    if (eq.levelRequirement) {
      const relatedSkillValue = this.getEquipmentRelatedSkillValue(statData, eq);
      const relatedLevel = skillValueToLevel(relatedSkillValue);
      if (relatedLevel < eq.levelRequirement) {
        return { ok: false, reason: `等级不足(需 ${eq.levelRequirement} 级,当前 ${relatedLevel} 级)`, stateOps: [], newEquipments: this.getCurrentEquipments(statData), totalBonus: this.calculateTotalBonus(statData) };
      }
    }

    // 读取当前装备栏
    const currentEquipped = this.getCurrentEquipments(statData);
    const newEquipped = { ...currentEquipped, [eq.slot]: eq.id };

    // 生成 stateOps
    const stateOps: EquipResult['stateOps'] = [
      { op: 'replace', path: `/主角/装备/${eq.slot}`, value: eq.id },
    ];

    // 计算新总加成
    const equippedList = Object.values(newEquipped)
      .map((id) => findEquipment(id))
      .filter((e): e is Equipment => !!e);
    const totalBonus = mergeEquipmentBonuses(equippedList);

    return {
      ok: true,
      stateOps,
      newEquipments: newEquipped,
      totalBonus,
    };
  }

  /**
   * 卸下装备
   * @param slot 槽位
   * @param statData 当前 stat_data
   */
  unequip(slot: EquipmentSlot, statData: Record<string, unknown>): EquipResult {
    const currentEquipped = this.getCurrentEquipments(statData);
    const defaultId = slot === 'weapon' ? 'weapon_fists' : slot === 'armor' ? 'armor_school_uniform' : '';
    const newEquipped = { ...currentEquipped, [slot]: defaultId };

    const stateOps: EquipResult['stateOps'] = [
      { op: 'replace', path: `/主角/装备/${slot}`, value: defaultId },
    ];

    const equippedList = Object.values(newEquipped)
      .map((id) => findEquipment(id))
      .filter((e): e is Equipment => !!e);
    const totalBonus = mergeEquipmentBonuses(equippedList);

    return {
      ok: true,
      stateOps,
      newEquipments: newEquipped,
      totalBonus,
    };
  }

  /** 获取当前装备栏 */
  private getCurrentEquipments(statData: Record<string, unknown>): Record<EquipmentSlot, string> {
    const player = (statData['主角'] ?? {}) as Record<string, unknown>;
    const equipped = (player['装备'] ?? {}) as Record<string, unknown>;
    return {
      weapon: typeof equipped['weapon'] === 'string' ? equipped['weapon'] : 'weapon_fists',
      armor: typeof equipped['armor'] === 'string' ? equipped['armor'] : 'armor_school_uniform',
      accessory: typeof equipped['accessory'] === 'string' ? equipped['accessory'] : '',
    };
  }

  /** 计算当前装备总加成 */
  private calculateTotalBonus(statData: Record<string, unknown>): EquipmentBonus {
    const currentEquipped = this.getCurrentEquipments(statData);
    const equippedList = Object.values(currentEquipped)
      .map((id) => findEquipment(id))
      .filter((e): e is Equipment => !!e);
    return mergeEquipmentBonuses(equippedList);
  }

  /** 获取装备关联的技能值(用于等级检查) */
  private getEquipmentRelatedSkillValue(statData: Record<string, unknown>, eq: Equipment): number {
    // 武器优先检查格斗,防具优先检查体力,饰品优先检查恋爱
    if (eq.slot === 'weapon') return this.getSkillValue(statData, '格斗');
    if (eq.slot === 'armor') {
      const player = (statData['主角'] ?? {}) as Record<string, unknown>;
      const attrs = (player['属性'] ?? {}) as Record<string, unknown>;
      const v = attrs['体力'];
      return typeof v === 'number' ? v : 0;
    }
    return this.getSkillValue(statData, '恋爱');
  }

  /** 获取有效技能值(基础 + 装备加成) */
  getEffectiveSkillValue(
    statData: Record<string, unknown>,
    skillId: string,
  ): number {
    const baseValue = this.getSkillValue(statData, skillId as SkillId);
    const bonus = this.calculateTotalBonus(statData);
    const skillBonus = bonus.skillBonus?.[skillId] ?? 0;
    return Math.min(this.balance.maxSkillValue, baseValue + skillBonus);
  }

  // ═══════════════════════════════════════════════════════
  //  任务系统
  // ═══════════════════════════════════════════════════════

  /**
   * 评估所有任务状态
   * @param statData 当前 stat_data
   * @param completedQuestIds 已完成任务 id 集合
   */
  evaluateAllQuests(
    statData: Record<string, unknown>,
    completedQuestIds: Set<string>,
  ): QuestEvaluationResult[] {
    const results: QuestEvaluationResult[] = [];
    for (const quest of QUESTS) {
      const prereqOk = checkPrerequisiteQuests(quest, completedQuestIds).ok;
      const triggered = evaluateTrigger(quest, statData);
      const objectives = evaluateObjectives(quest, statData);

      let status: QuestStatus;
      if (completedQuestIds.has(quest.id)) {
        status = 'completed';
      } else if (!prereqOk || !triggered) {
        status = 'locked';
      } else if (objectives.allCompleted) {
        status = 'completed';
      } else {
        status = 'active';
      }

      results.push({
        questId: quest.id,
        status,
        objectives,
        prerequisitesMet: prereqOk,
        triggered,
      });
    }
    return results;
  }

  /**
   * 结算任务完成奖励
   * @param questId 任务 id
   * @param statData 当前 stat_data
   */
  completeQuest(
    questId: string,
    statData: Record<string, unknown>,
  ): QuestCompletionResult {
    const quest = findQuest(questId);
    if (!quest) {
      return { ok: false, reason: `未找到任务 ${questId}`, stateOps: [], rewards: {}, rewardDescription: '' };
    }

    // 检查目标是否全部完成
    const objResult = evaluateObjectives(quest, statData);
    if (!objResult.allCompleted) {
      return { ok: false, reason: `任务目标未全部完成(剩余 ${objResult.pending.length} 项)`, stateOps: [], rewards: quest.reward, rewardDescription: '' };
    }

    const reward = quest.reward;
    const stateOps: QuestCompletionResult['stateOps'] = [];

    // 金钱奖励
    if (reward.money) {
      const currentMoney = this.getMoney(statData);
      stateOps.push({ op: 'replace', path: '/主角/现金', value: currentMoney + reward.money });
    }

    // 技能点奖励
    if (reward.skillPoints) {
      const currentPoints = this.getAvailableSkillPoints(statData);
      stateOps.push({ op: 'replace', path: '/主角/技能点', value: currentPoints + reward.skillPoints });
    }

    // 技能经验奖励
    if (reward.skillExp) {
      for (const exp of reward.skillExp) {
        const currentValue = this.getSkillValue(statData, exp.skill as SkillId);
        const newValue = Math.min(this.balance.maxSkillValue, currentValue + exp.exp);
        stateOps.push({ op: 'replace', path: `/技能/${exp.skill}`, value: newValue });
      }
    }

    // 任务完成记录
    const completedList = (statData['隐藏'] ?? {}) as Record<string, unknown>;
    const currentCompleted = Array.isArray(completedList['已完成任务']) ? completedList['已完成任务'] as string[] : [];
    if (!currentCompleted.includes(questId)) {
      stateOps.push({ op: 'replace', path: '/隐藏/已完成任务', value: [...currentCompleted, questId] });
    }

    // 生成奖励描述
    const descParts: string[] = [];
    if (reward.money) descParts.push(`💰 ${reward.money} 日元`);
    if (reward.skillPoints) descParts.push(`✨ ${reward.skillPoints} 技能点`);
    if (reward.skillExp?.length) {
      descParts.push(reward.skillExp.map((e) => `${e.skill}+${e.exp}`).join(', '));
    }
    if (reward.unlockCg?.length) descParts.push(`🎨 解锁 ${reward.unlockCg.length} 张 CG`);
    if (reward.unlockAchievement?.length) descParts.push(`🏆 解锁 ${reward.unlockAchievement.length} 个成就`);
    const rewardDescription = descParts.join(' · ');

    return {
      ok: true,
      stateOps,
      rewards: reward,
      rewardDescription,
    };
  }

  // ═══════════════════════════════════════════════════════
  //  概要
  // ═══════════════════════════════════════════════════════

  /** 获取 RPG 玩家状态概要 */
  getPlayerSummary(statData: Record<string, unknown>): RpgPlayerSummary {
    const equipped = this.getCurrentEquipments(statData);
    const equipmentBonus = this.calculateTotalBonus(statData);
    const skills = this.getAllSkillValues(statData);

    const combatLevels: Record<string, number> = {};
    const combat = (statData['战斗'] ?? {}) as Record<string, unknown>;
    for (const field of ['力量等级', '格斗等级', '敏捷等级', '意志等级']) {
      const v = combat[field];
      combatLevels[field] = typeof v === 'number' ? v : 1;
    }

    const availableSkillPoints = this.getAvailableSkillPoints(statData);

    const hidden = (statData['隐藏'] ?? {}) as Record<string, unknown>;
    const completedQuests = Array.isArray(hidden['已完成任务']) ? hidden['已完成任务'] as string[] : [];
    const activeQuests = Array.isArray(hidden['进行中任务']) ? hidden['进行中任务'] as string[] : [];

    return {
      equipped,
      equipmentBonus,
      skills,
      combatLevels,
      availableSkillPoints,
      completedQuests,
      activeQuests,
    };
  }

  /** 列出所有装备定义 */
  listAllEquipments(): Equipment[] {
    return EQUIPMENTS;
  }

  /** 列出所有任务定义 */
  listAllQuests(): Quest[] {
    return QUESTS;
  }

  /** 列出所有技能节点 */
  listAllSkills() {
    return SKILL_TREE;
  }
}

// ───────────────────────────────────────────────────────────
//  单例(延迟初始化,需要传入 mvu)
// ───────────────────────────────────────────────────────────

let _rpgEngine: RpgEngine | null = null;

export function initRpgEngine(mvu: MvuRuntime, balance?: BalanceConfig): RpgEngine {
  _rpgEngine = new RpgEngine(mvu, balance);
  return _rpgEngine;
}

export function getRpgEngine(): RpgEngine | null {
  return _rpgEngine;
}

/** 工具函数:不需要 mvu 实例的静态方法 */
export const rpgUtils = {
  skillValueToLevel,
  findSkill: findSkillNode,
  findEquip: findEquipment,
  findQuestById: findQuest,
  getSlotInfo,
};

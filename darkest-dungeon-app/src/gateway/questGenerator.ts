// ============================================================
// 任务生成引擎 — 根据玩家进度生成可接取的任务
// ============================================================

import type { Quest, QuestType, QuestDifficulty, QuestObjective } from '@/types';

// ---- 工具函数 ----

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return result;
}

// ---- 任务类型配置 ----

export const QUEST_CONFIG: Record<QuestType, {
  name: string;
  description: string;
  baseReward: number;
  provisionLimit: number;
  rewardMultiplier: number;
}> = {
  explore: {
    name: '探索',
    description: '探索地牢中90%的房间，揭开它的秘密',
    baseReward: 500,
    provisionLimit: 16,
    rewardMultiplier: 1.1,
  },
  exterminate: {
    name: '清剿',
    description: '消灭地牢中所有敌人，肃清这片区域',
    baseReward: 500,
    provisionLimit: 18,
    rewardMultiplier: 1.2,
  },
  purge: {
    name: '净化',
    description: '清除地牢中特定的怪物群体',
    baseReward: 500,
    provisionLimit: 16,
    rewardMultiplier: 1.15,
  },
  collect: {
    name: '收集',
    description: '在地牢中收集特定的传家宝物品',
    baseReward: 500,
    provisionLimit: 14,
    rewardMultiplier: 1.25,
  },
  boss: {
    name: 'BOSS战',
    description: '深入地牢最深处，击败盘踞其中的BOSS',
    baseReward: 500,
    provisionLimit: 24,
    rewardMultiplier: 1.5,
  },
  escape: {
    name: '逃生',
    description: '从地牢中安全撤离，保住队伍的性命',
    baseReward: 500,
    provisionLimit: 12,
    rewardMultiplier: 0.8,
  },
};

// ---- 难度配置 ----

export const DIFFICULTY_CONFIG: Record<QuestDifficulty, {
  name: string;
  dungeonLevel: [number, number];  // 地牢等级范围
  rewardMultiplier: number;
  description: string;
  unlockRequirement: number;        // 解锁所需完成的任务数
}> = {
  novice: {
    name: '新手',
    dungeonLevel: [1, 2],
    rewardMultiplier: 1.0,
    description: '适合初出茅庐的冒险者，敌人较弱',
    unlockRequirement: 0,
  },
  veteran: {
    name: '老手',
    dungeonLevel: [3, 4],
    rewardMultiplier: 1.5,
    description: '需要经验丰富的队伍，敌人更具威胁',
    unlockRequirement: 3,
  },
  champion: {
    name: '冠军',
    dungeonLevel: [5, 5],
    rewardMultiplier: 2.0,
    description: '最危险的挑战，只有精锐队伍方可尝试',
    unlockRequirement: 6,
  },
};

// 传家宝类型
const HEIRLOOM_TYPES = ['bust', 'portrait', 'deed', 'crest'] as const;

// 传家宝中文名
const HEIRLOOM_NAMES: Record<string, string> = {
  bust: '雕像',
  portrait: '画像',
  deed: '契约',
  crest: '纹章',
};

export function getHeirloomName(type: string): string {
  return HEIRLOOM_NAMES[type] || type;
}

// BOSS 候选 ID（按地牢等级分组）
const BOSS_CANDIDATES: Record<number, string[]> = {
  1: ['necromancer_A'],
  2: ['necromancer_B', 'swine_prince_A'],
  3: ['necromancer_C', 'swine_prince_B', 'prophet_A', 'hag_A'],
  4: ['swine_prince_C', 'prophet_B', 'hag_B', 'brigand_cannon_A', 'siren_A'],
  5: ['prophet_C', 'hag_C', 'brigand_cannon_B', 'siren_B', 'formless_flesh_A'],
};

// ---- 难度解锁判定 ----

export function getAvailableDifficulties(questsFinished: number): QuestDifficulty[] {
  const result: QuestDifficulty[] = ['novice'];
  if (questsFinished >= DIFFICULTY_CONFIG.veteran.unlockRequirement) {
    result.push('veteran');
  }
  if (questsFinished >= DIFFICULTY_CONFIG.champion.unlockRequirement) {
    result.push('champion');
  }
  return result;
}

// ---- 奖励计算 ----

/**
 * 计算任务金币奖励
 * 基础金币 = 500 * 地牢等级 * 难度倍率 * 任务类型倍率
 */
export function calculateRewardGold(
  type: QuestType,
  difficulty: QuestDifficulty,
  dungeonLevel: number
): number {
  const base = QUEST_CONFIG[type].baseReward;
  const typeMult = QUEST_CONFIG[type].rewardMultiplier;
  const diffMult = DIFFICULTY_CONFIG[difficulty].rewardMultiplier;
  return Math.round(base * dungeonLevel * typeMult * diffMult);
}

/**
 * 计算纹章奖励
 * 纹章奖励 = 地牢等级 * 2-5个（随机类型）
 */
export function calculateRewardHeirlooms(
  dungeonLevel: number,
  difficulty: QuestDifficulty
): { type: string; amount: number }[] {
  const diffMult = DIFFICULTY_CONFIG[difficulty].rewardMultiplier;
  const baseCount = randInt(2, 5) * dungeonLevel;
  const totalAmount = Math.max(1, Math.round(baseCount * diffMult));

  // 随机选1-2种传家宝类型
  const typeCount = randInt(1, 2);
  const types = pickN([...HEIRLOOM_TYPES], typeCount);

  // 分配数量
  if (types.length === 1) {
    return [{ type: types[0], amount: totalAmount }];
  }
  const split = randInt(1, totalAmount - 1);
  return [
    { type: types[0], amount: split },
    { type: types[1], amount: totalAmount - split },
  ];
}

// ---- 任务目标生成 ----

function generateQuestObjective(
  type: QuestType,
  dungeonLevel: number
): QuestObjective {
  switch (type) {
    case 'explore': {
      // 探索90%的房间（按地牢等级估算房间数）
      const estimatedRooms = dungeonLevel <= 2 ? 9 : 16;
      const target = Math.ceil(estimatedRooms * 0.9);
      return {
        type,
        description: `探索 ${target} 个房间`,
        targetCount: target,
        currentCount: 0,
      };
    }
    case 'exterminate': {
      // 消灭所有敌人（估算战斗场次：约地牢等级+2到地牢等级+4）
      const target = randInt(2, 4) + Math.ceil(dungeonLevel / 2);
      return {
        type,
        description: `消灭 ${target} 组敌人`,
        targetCount: target,
        currentCount: 0,
      };
    }
    case 'purge': {
      // 清除特定怪物（数量略低于 exterminate）
      const target = randInt(2, 3) + Math.ceil(dungeonLevel / 2);
      return {
        type,
        description: `清除 ${target} 个特定怪物`,
        targetCount: target,
        currentCount: 0,
      };
    }
    case 'collect': {
      // 收集特定物品
      const target = 3 + dungeonLevel;
      return {
        type,
        description: `收集 ${target} 件传家宝`,
        targetCount: target,
        currentCount: 0,
      };
    }
    case 'boss': {
      const bossPool = BOSS_CANDIDATES[dungeonLevel] || BOSS_CANDIDATES[5];
      const bossId = pick(bossPool);
      return {
        type,
        description: '击败地牢深处的BOSS',
        targetCount: 1,
        currentCount: 0,
        bossId,
      };
    }
    case 'escape': {
      return {
        type,
        description: '从地牢中安全撤离',
        targetCount: 1,
        currentCount: 0,
      };
    }
    default:
      return {
        type: 'explore',
        description: '探索地牢',
        targetCount: 1,
        currentCount: 0,
      };
  }
}

// ---- 生成单个任务 ----

export function generateQuest(
  type: QuestType,
  difficulty: QuestDifficulty,
  dungeonLevel: number,
  week: number
): Quest {
  const config = QUEST_CONFIG[type];
  const diffConfig = DIFFICULTY_CONFIG[difficulty];
  const goal = generateQuestObjective(type, dungeonLevel);
  const rewardGold = calculateRewardGold(type, difficulty, dungeonLevel);
  const rewardHeirlooms = calculateRewardHeirlooms(dungeonLevel, difficulty);

  // BOSS任务额外奖励饰品
  let rewardTrinket: string | undefined;
  if (type === 'boss') {
    rewardTrinket = pick([
      'lucky_charm',
      'warriors_bracelet',
      'focus_ring',
      'prophet_eye',
      'ancestors_coat',
    ]);
  }

  // 补给品上限随难度和地牢等级调整
  const provisionLimit = Math.round(
    config.provisionLimit + (dungeonLevel - 1) * 2 + (difficulty === 'champion' ? 4 : difficulty === 'veteran' ? 2 : 0)
  );

  // 任务描述
  const description = `${diffConfig.name}级 · ${config.name}：${config.description}`;

  return {
    id: `quest_${type}_${difficulty}_${dungeonLevel}_${week}_${Math.floor(Math.random() * 100000)}`,
    type,
    difficulty,
    dungeonLevel,
    goal,
    rewardGold,
    rewardHeirlooms,
    rewardTrinket,
    provisionLimit,
    description,
    isCompleted: false,
    isFailed: false,
    week,
  };
}

// ---- 根据当前进度生成可用任务列表 ----

/**
 * 根据当前进度生成可用任务
 * 每周生成3-5个任务供选择
 */
export function generateQuests(
  week: number,
  highestDungeonLevel: number,
  questsFinished: number
): Quest[] {
  // 可用难度
  const availableDifficulties = getAvailableDifficulties(questsFinished);

  // 玩家可探索的最高地牢等级（至少为1）
  // highestDungeonLevel 表示已通关的最高等级，可探索等级 = max(1, highestDungeonLevel) 并允许挑战下一级
  const maxExplorableLevel = Math.max(1, Math.min(5, Math.max(highestDungeonLevel, 1) + 1));

  // 生成3-5个任务
  const questCount = randInt(3, 5);
  const quests: Quest[] = [];
  const usedKeys = new Set<string>();

  // 保证至少有一个新手难度的任务
  let hasNovice = false;

  for (let i = 0; i < questCount; i++) {
    // 选择难度（偏向于已解锁的低难度）
    let difficulty: QuestDifficulty;
    if (i === 0) {
      // 第一个任务强制为最低可用难度
      difficulty = availableDifficulties[0];
    } else {
      // 后续任务随机选择，但偏向低难度
      const roll = Math.random();
      if (roll < 0.5 && availableDifficulties.length > 0) {
        difficulty = availableDifficulties[0];
      } else if (roll < 0.85 && availableDifficulties.length > 1) {
        difficulty = availableDifficulties[1];
      } else if (availableDifficulties.length > 2) {
        difficulty = availableDifficulties[2];
      } else {
        difficulty = availableDifficulties[availableDifficulties.length - 1];
      }
    }

    if (difficulty === 'novice') hasNovice = true;

    const diffConfig = DIFFICULTY_CONFIG[difficulty];
    // 根据难度的地牢等级范围和玩家进度选择地牢等级
    const minLevel = diffConfig.dungeonLevel[0];
    const maxLevel = Math.min(diffConfig.dungeonLevel[1], maxExplorableLevel);
    const dungeonLevel = randInt(Math.min(minLevel, maxLevel), Math.max(minLevel, maxLevel));

    // 选择任务类型
    // BOSS任务只在难度足够高时出现（老手或冠军），且概率较低
    let availableTypes: QuestType[];
    if (difficulty === 'novice') {
      availableTypes = ['explore', 'exterminate', 'purge', 'collect', 'escape'];
    } else {
      availableTypes = ['explore', 'exterminate', 'purge', 'collect', 'escape', 'boss'];
    }

    // 移除escape（逃生任务）的概率降低，只在少数情况出现
    let type: QuestType;
    let attempts = 0;
    do {
      type = pick(availableTypes);
      attempts++;
      // boss 任务出现概率较低
      if (type === 'boss' && Math.random() > 0.3) {
        type = pick(['explore', 'exterminate', 'purge', 'collect']);
      }
      // escape 任务出现概率较低
      if (type === 'escape' && Math.random() > 0.25) {
        type = pick(['explore', 'exterminate', 'purge', 'collect']);
      }
    } while (attempts < 5);

    // 确保不重复（类型+难度+地牢等级的组合）
    const key = `${type}_${difficulty}_${dungeonLevel}`;
    if (usedKeys.has(key)) {
      // 尝试换成 explore
      const fallbackKey = `explore_${difficulty}_${dungeonLevel}`;
      if (!usedKeys.has(fallbackKey)) {
        type = 'explore';
        usedKeys.add(fallbackKey);
      } else {
        // 跳过重复
        continue;
      }
    } else {
      usedKeys.add(key);
    }

    quests.push(generateQuest(type, difficulty, dungeonLevel, week));
  }

  // 如果没有新手任务，补充一个
  if (!hasNovice && availableDifficulties.includes('novice')) {
    const diffConfig = DIFFICULTY_CONFIG.novice;
    const dungeonLevel = randInt(diffConfig.dungeonLevel[0], Math.min(diffConfig.dungeonLevel[1], maxExplorableLevel));
    const type: QuestType = pick(['explore', 'exterminate', 'purge', 'collect']);
    quests.push(generateQuest(type, 'novice', dungeonLevel, week));
  }

  return quests;
}

// ---- 辅助：获取任务类型中文名 ----

export function getQuestTypeName(type: QuestType): string {
  return QUEST_CONFIG[type].name;
}

// ---- 辅助：获取难度中文名 ----

export function getDifficultyName(difficulty: QuestDifficulty): string {
  return DIFFICULTY_CONFIG[difficulty].name;
}

// ---- 辅助：获取难度颜色类 ----

export function getDifficultyColorClass(difficulty: QuestDifficulty): string {
  switch (difficulty) {
    case 'novice':
      return 'text-dd-greenBright';
    case 'veteran':
      return 'text-dd-gold';
    case 'champion':
      return 'text-dd-redBright';
    default:
      return 'text-dd-text';
  }
}

// ---- 辅助：获取难度边框颜色类 ----

export function getDifficultyBorderClass(difficulty: QuestDifficulty): string {
  switch (difficulty) {
    case 'novice':
      return 'border-dd-green';
    case 'veteran':
      return 'border-dd-goldDark';
    case 'champion':
      return 'border-dd-red';
    default:
      return 'border-dd-border';
  }
}

// ---- 辅助：任务类型图标 ----

export function getQuestTypeIcon(type: QuestType): string {
  switch (type) {
    case 'explore':
      return '◈';
    case 'exterminate':
      return '⚔';
    case 'purge':
      return '☩';
    case 'collect':
      return '◆';
    case 'boss':
      return '☠';
    case 'escape':
      return '⛨';
    default:
      return '?';
  }
}

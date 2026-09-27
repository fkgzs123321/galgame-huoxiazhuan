/**
 * 任务系统数据(阶段3 步骤7 · RPG 养成)
 *
 * 任务分类:
 *  - 主线:推进剧情必做,完成解锁下一阶段
 *  - 支线:可选,奖励技能点/金钱/物品
 *  - 隐藏:特殊触发条件,奖励稀有道具/CG/成就
 *
 * 任务状态机:
 *  - locked(未触发) → active(进行中) → completed(已完成) / failed(失败)
 *  - 部分任务有可选分支(branch_a / branch_b),影响后续
 *
 * 与 schema.ts 集成:
 *  - 任务进度存 临时.* 或 隐藏.* 字段(由 AI 写入触发器)
 *  - 奖励由 rpg-engine 在完成时结算
 */

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

export type QuestType = 'main' | 'side' | 'hidden';
export type QuestStatus = 'locked' | 'active' | 'completed' | 'failed';

export interface QuestReward {
  /** 金钱奖励 */
  money?: number;
  /** 技能点奖励 */
  skillPoints?: number;
  /** 经验奖励(指定技能) */
  skillExp?: Array<{ skill: string; exp: number }>;
  /** 物品奖励(物品 id + 数量) */
  items?: Array<{ itemId: string; quantity: number }>;
  /** CG 解锁奖励 */
  unlockCg?: string[];
  /** 成就解锁奖励 */
  unlockAchievement?: string[];
}

export interface QuestObjective {
  /** 目标 id(用于追踪) */
  id: string;
  /** 描述 */
  description: string;
  /** 完成条件(变量路径 + 期望值) */
  condition: {
    path: string;
    op: 'eq' | 'gte' | 'lte' | 'contains' | 'exists';
    value?: unknown;
  };
}

export interface Quest {
  id: string;
  /** 显示名 */
  name: string;
  /** 类型 */
  type: QuestType;
  /** 简述 */
  description: string;
  /** 触发条件(变量路径 + 期望值) */
  triggerCondition: {
    path: string;
    op: 'eq' | 'gte' | 'lte' | 'contains' | 'exists';
    value?: unknown;
  };
  /** 目标列表(全部完成才算完成) */
  objectives: QuestObjective[];
  /** 奖励 */
  reward: QuestReward;
  /** 前置任务 id(必须先完成) */
  prerequisiteQuests?: string[];
  /** 是否可选分支 */
  isBranch?: boolean;
  /** 分支选择(完成后激活哪个后续任务) */
  branches?: string[];
}

// ───────────────────────────────────────────────────────────
//  任务定义
// ───────────────────────────────────────────────────────────

export const QUESTS: Quest[] = [
  // ─── 主线任务 ───
  {
    id: 'main_01_settle',
    name: '安顿鸣泽家',
    type: 'main',
    description: '寒假第一天,与美佐子/亚柚一起整理新家,建立基础信任。',
    triggerCondition: { path: '时间.天数', op: 'eq', value: 1 },
    objectives: [
      { id: 'talk_sawako', description: '与美佐子对话 3 次', condition: { path: '女角.鸣泽美佐子.互动次数', op: 'gte', value: 3 } },
      { id: 'explore_home', description: '探索自宅周边', condition: { path: '主角.已探索地点', op: 'contains', value: '鸣泽家周边' } },
    ],
    reward: { money: 1000, skillPoints: 2, skillExp: [{ skill: '恋爱', exp: 10 }] },
  },
  {
    id: 'main_02_school_visit',
    name: '校园初探',
    type: 'main',
    description: '寒假前的最后一次到校,认识同学和老师。',
    triggerCondition: { path: '时间.天数', op: 'gte', value: 2 },
    objectives: [
      { id: 'meet_classmate', description: '认识至少 3 位同学', condition: { path: '主角.已认识角色数', op: 'gte', value: 3 } },
      { id: 'find_club', description: '找到一个社团', condition: { path: '主角.已探索地点', op: 'contains', value: '学园' } },
    ],
    reward: { skillPoints: 2, skillExp: [{ skill: '社交', exp: 20 }] },
    prerequisiteQuests: ['main_01_settle'],
  },
  {
    id: 'main_03_first_date',
    name: '初次约会',
    type: 'main',
    description: '与心仪女角进行第一次单独约会。',
    triggerCondition: { path: '时间.天数', op: 'gte', value: 5 },
    objectives: [
      { id: 'date_any_heroine', description: '与任意女角好感度 ≥ 40', condition: { path: '女角', op: 'exists' } },
    ],
    reward: { skillPoints: 3, skillExp: [{ skill: '恋爱', exp: 20 }], unlockAchievement: ['first_date'] },
    prerequisiteQuests: ['main_02_school_visit'],
    isBranch: true,
    branches: ['main_04a_snow_trip', 'main_04b_stay_home'],
  },
  {
    id: 'main_04a_snow_trip',
    name: '温泉乡旅行(分支 A)',
    type: 'main',
    description: '选择与女角一起去温泉乡旅行,浪漫升级。',
    triggerCondition: { path: '临时.上次选择结果', op: 'eq', value: '温泉旅行' },
    objectives: [
      { id: 'onsen_date', description: '在温泉乡约会', condition: { path: '场景.地点', op: 'eq', value: '温泉乡' } },
    ],
    reward: { skillPoints: 4, unlockCg: ['onsen_date'], unlockAchievement: ['snow_trip'] },
    prerequisiteQuests: ['main_03_first_date'],
  },
  {
    id: 'main_04b_stay_home',
    name: '留守家中(分支 B)',
    type: 'main',
    description: '选择留在鸣泽家,深化家庭关系。',
    triggerCondition: { path: '临时.上次选择结果', op: 'eq', value: '留守家中' },
    objectives: [
      { id: 'home_event', description: '触发家庭事件', condition: { path: '时间.天数', op: 'gte', value: 8 } },
    ],
    reward: { skillPoints: 3, skillExp: [{ skill: '烹饪', exp: 20 }] },
    prerequisiteQuests: ['main_03_first_date'],
  },
  {
    id: 'main_05_christmas',
    name: '圣诞夜抉择',
    type: 'main',
    description: '圣诞夜的关键选择,决定寒假后半段走向。',
    triggerCondition: { path: '时间.天数', op: 'eq', value: 12 },
    objectives: [
      { id: 'xmas_choice', description: '做出圣诞夜选择', condition: { path: '临时.上次选择结果', op: 'exists' } },
    ],
    reward: { skillPoints: 5, unlockAchievement: ['christmas_choice'] },
    prerequisiteQuests: ['main_04a_snow_trip', 'main_04b_stay_home'],
    isBranch: true,
  },

  // ─── 支线任务 ───
  {
    id: 'side_01_part_time',
    name: '便利店打工',
    type: 'side',
    description: '在便利店打工赚钱,可能遇到女角。',
    triggerCondition: { path: '时间.天数', op: 'gte', value: 3 },
    objectives: [
      { id: 'work_3_days', description: '打工 3 次', condition: { path: '主角.打工次数', op: 'gte', value: 3 } },
    ],
    reward: { money: 3000, skillExp: [{ skill: '社交', exp: 10 }] },
  },
  {
    id: 'side_02_cooking_practice',
    name: '烹饪练习',
    type: 'side',
    description: '练习烹饪,提升美佐子好感。',
    triggerCondition: { path: '技能.烹饪', op: 'gte', value: 20 },
    objectives: [
      { id: 'cook_5_times', description: '烹饪 5 次', condition: { path: '主角.烹饪次数', op: 'gte', value: 5 } },
    ],
    reward: { skillPoints: 1, skillExp: [{ skill: '烹饪', exp: 20 }], money: 500 },
  },
  {
    id: 'side_03_sports_club',
    name: '运动部训练',
    type: 'side',
    description: '参加运动部训练,提升体能。',
    triggerCondition: { path: '技能.力量', op: 'gte', value: 30 },
    objectives: [
      { id: 'train_5_times', description: '训练 5 次', condition: { path: '主角.训练次数', op: 'gte', value: 5 } },
    ],
    reward: { skillPoints: 2, skillExp: [{ skill: '力量', exp: 20 }, { skill: '格斗', exp: 10 }] },
  },

  // ─── 隐藏任务 ───
  {
    id: 'hidden_01_sneak_school',
    name: '夜探校园',
    type: 'hidden',
    description: '深夜潜入校园,可能发现秘密。',
    triggerCondition: { path: '技能.潜行', op: 'gte', value: 30 },
    objectives: [
      { id: 'sneak_success', description: '成功潜入', condition: { path: '临时.上次事件ID', op: 'eq', value: 'sneak_school_success' } },
    ],
    reward: { skillPoints: 3, unlockCg: ['night_school'], unlockAchievement: ['sneak_master'] },
  },
  {
    id: 'hidden_02_old_diary',
    name: '美佐子的旧日记',
    type: 'hidden',
    description: '发现美佐子的高中日记,了解她的过去。',
    triggerCondition: { path: '女角.鸣泽美佐子.好感度', op: 'gte', value: 60 },
    objectives: [
      { id: 'find_diary', description: '找到日记', condition: { path: '临时.上次事件ID', op: 'eq', value: 'found_diary' } },
    ],
    reward: { unlockCg: ['old_diary'], skillExp: [{ skill: '恋爱', exp: 30 }], unlockAchievement: ['diary_finder'] },
  },
];

// ───────────────────────────────────────────────────────────
//  辅助函数
// ───────────────────────────────────────────────────────────

/** 按 id 查找任务 */
export function findQuest(id: string): Quest | undefined {
  return QUESTS.find((q) => q.id === id);
}

/** 按类型列出任务 */
export function listQuestsByType(type: QuestType): Quest[] {
  return QUESTS.filter((q) => q.type === type);
}

/** 检查前置任务是否完成 */
export function checkPrerequisiteQuests(
  quest: Quest,
  completedQuestIds: Set<string>,
): { ok: boolean; missing: string[] } {
  if (!quest.prerequisiteQuests) return { ok: true, missing: [] };
  const missing = quest.prerequisiteQuests.filter((id) => !completedQuestIds.has(id));
  return { ok: missing.length === 0, missing };
}

/** 评估任务触发条件 */
export function evaluateTrigger(
  quest: Quest,
  statData: Record<string, unknown>,
): boolean {
  return evaluateCondition(quest.triggerCondition, statData);
}

/** 评估任务目标是否完成 */
export function evaluateObjectives(
  quest: Quest,
  statData: Record<string, unknown>,
): { allCompleted: boolean; completed: string[]; pending: string[] } {
  const completed: string[] = [];
  const pending: string[] = [];
  for (const obj of quest.objectives) {
    if (evaluateCondition(obj.condition, statData)) {
      completed.push(obj.id);
    } else {
      pending.push(obj.id);
    }
  }
  return { allCompleted: pending.length === 0, completed, pending };
}

/** 通用条件评估 */
function evaluateCondition(
  cond: { path: string; op: string; value?: unknown },
  statData: Record<string, unknown>,
): boolean {
  const actual = getPathValue(statData, cond.path);
  switch (cond.op) {
    case 'eq':
      return actual === cond.value;
    case 'gte':
      return typeof actual === 'number' && typeof cond.value === 'number' && actual >= cond.value;
    case 'lte':
      return typeof actual === 'number' && typeof cond.value === 'number' && actual <= cond.value;
    case 'contains':
      if (Array.isArray(actual)) return actual.includes(cond.value);
      if (typeof actual === 'string') return actual.includes(String(cond.value ?? ''));
      return false;
    case 'exists':
      return actual !== undefined && actual !== null;
    default:
      return false;
  }
}

/** 按 dotted path 取值 */
function getPathValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

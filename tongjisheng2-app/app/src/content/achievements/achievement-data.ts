/**
 * 成就数据资产(阶段3 步骤5)
 *
 * 来源:原卡 世界书/事件/结局分支矩阵.txt + 隐藏剧情触发器.txt + CG触发条件表.txt
 *  - 结局成就:88 结局(19女角×4 + 隐藏1 + BAD_END×8 + 特殊3)
 *  - 女角成就:全攻略/初H/进阶H/True End
 *  - 隐藏成就:日记收集/变数屋/樱子线/毕业生外传
 *  - 技能成就:单项满级/全满级
 *  - CG成就:全收集
 *  - 经济成就:储蓄目标/破产
 *
 * 设计:
 *  - 纯数据,不依赖运行时
 *  - 解锁条件用 evaluator 函数(运行时由 achievement-engine 调用)
 *  - 每条成就:ID/标题/描述/类型/稀有度/解锁条件/奖励(继承点数)
 */

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

export type AchievementType =
  | 'ending'      // 结局成就
  | 'heroine'     // 女角成就
  | 'hidden'      // 隐藏剧情成就
  | 'skill'       // 技能成就
  | 'cg'          // CG 收集成就
  | 'economy'     // 经济成就
  | 'milestone';  // 里程碑成就

export type AchievementRarity =
  | 'common'      // 普通
  | 'rare'        // 稀有
  | 'epic'        // 史诗
  | 'legendary';  // 传说

export interface AchievementReward {
  /** 继承点数(NG+ 用于属性继承) */
  inheritPoints?: number;
  /** 解锁标记(影响 NG+ 初始状态) */
  unlockFlags?: string[];
  /** 描述 */
  desc?: string;
}

export interface Achievement {
  /** 唯一 ID */
  id: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 类型 */
  type: AchievementType;
  /** 稀有度 */
  rarity: AchievementRarity;
  /** 图标(emoji) */
  icon: string;
  /** 解锁条件描述(给玩家看) */
  unlockCondition: string;
  /** 是否隐藏(未解锁前不显示详情) */
  hidden?: boolean;
  /** 奖励 */
  reward: AchievementReward;
  /** 评估器 ID(achievement-engine 根据 ID 匹配评估函数) */
  evaluatorId: string;
  /** 评估器参数(传给评估函数) */
  evaluatorParams?: Record<string, unknown>;
}

// ───────────────────────────────────────────────────────────
//  评估器 ID 常量
// ───────────────────────────────────────────────────────────

export const EVALUATOR = {
  // 结局类
  ENDING_REACHED: 'ending_reached',          // 参数: ending_id
  ENDING_ALL_TRUE: 'ending_all_true',        // 全 True End
  ENDING_COUNT: 'ending_count',              // 参数: min_count

  // 女角类
  HEROINE_CAPTURED: 'heroine_captured',      // 参数: heroine_name
  HEROINE_ALL_CAPTURED: 'heroine_all_captured',
  HEROINE_FIRST_H: 'heroine_first_h',        // 参数: heroine_name
  HEROINE_ADVANCED_H: 'heroine_advanced_h',  // 参数: heroine_name
  HEROINE_TRUE_END: 'heroine_true_end',      // 参数: heroine_name

  // 隐藏类
  DIARY_ALL: 'diary_all',
  DIARY_ONE: 'diary_one',                    // 参数: diary_id
  VARIABLE_SHOP_VISIT: 'variable_shop_visit', // 参数: min_visits
  SAKURAKO_ROUTE: 'sakurako_route',
  GRADUATE_SIDE: 'graduate_side',
  HOSPITAL_VISIT: 'hospital_visit',          // 参数: min_visits

  // 技能类
  SKILL_MAX: 'skill_max',                    // 参数: skill_name
  SKILL_ALL_MAX: 'skill_all_max',

  // CG 类
  CG_ALL: 'cg_all',
  CG_COUNT: 'cg_count',                      // 参数: min_count

  // 经济类
  SAVINGS_GOAL: 'savings_goal',
  BANKRUPTCY: 'bankruptcy',

  // 里程碑
  TURN_COUNT: 'turn_count',                  // 参数: min_turns
  PLAYTHROUGH_COUNT: 'playthrough_count',    // 参数: min_count
} as const;

// ───────────────────────────────────────────────────────────
//  成就列表
// ───────────────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  // ═══════════════════════════════════════════════════════
  //  A. 里程碑成就(7)
  // ═══════════════════════════════════════════════════════
  {
    id: 'milestone_first_step',
    title: '初涉寒假',
    description: '完成第一个游戏回合',
    type: 'milestone',
    rarity: 'common',
    icon: '🌸',
    unlockCondition: '完成第 1 个回合',
    evaluatorId: EVALUATOR.TURN_COUNT,
    evaluatorParams: { min_turns: 1 },
    reward: { inheritPoints: 1, desc: 'NG+ 起点' },
  },
  {
    id: 'milestone_week_one',
    title: '一周通关',
    description: '游戏内天数达到第 7 天',
    type: 'milestone',
    rarity: 'common',
    icon: '📅',
    unlockCondition: '天数 >= 7',
    evaluatorId: EVALUATOR.TURN_COUNT,
    evaluatorParams: { min_turns: 7 },
    reward: { inheritPoints: 2 },
  },
  {
    id: 'milestone_full_play',
    title: '寒假圆满',
    description: '完成完整 17 天寒假流程',
    type: 'milestone',
    rarity: 'rare',
    icon: '❄️',
    unlockCondition: '到达第 17 天结局判定',
    evaluatorId: EVALUATOR.TURN_COUNT,
    evaluatorParams: { min_turns: 50 },
    reward: { inheritPoints: 5 },
  },
  {
    id: 'milestone_ng_plus',
    title: 'New Game+',
    description: '开启第一次多周目继承',
    type: 'milestone',
    rarity: 'rare',
    icon: '🔄',
    unlockCondition: '完成一周目后开始 NG+',
    evaluatorId: EVALUATOR.PLAYTHROUGH_COUNT,
    evaluatorParams: { min_count: 2 },
    reward: { inheritPoints: 10, unlockFlags: ['ng_plus_unlocked'] },
  },
  {
    id: 'milestone_veteran',
    title: '老练玩家',
    description: '累计完成 3 个周目',
    type: 'milestone',
    rarity: 'epic',
    icon: '⭐',
    unlockCondition: '总周目数 >= 3',
    evaluatorId: EVALUATOR.PLAYTHROUGH_COUNT,
    evaluatorParams: { min_count: 3 },
    reward: { inheritPoints: 20, unlockFlags: ['veteran_bonus'] },
  },
  {
    id: 'milestone_master',
    title: '同级生大师',
    description: '累计完成 5 个周目',
    type: 'milestone',
    rarity: 'legendary',
    icon: '👑',
    unlockCondition: '总周目数 >= 5',
    evaluatorId: EVALUATOR.PLAYTHROUGH_COUNT,
    evaluatorParams: { min_count: 5 },
    reward: { inheritPoints: 50, unlockFlags: ['master_bonus'] },
  },
  {
    id: 'milestone_completionist',
    title: '全成就达成',
    description: '解锁除本成就外的所有成就',
    type: 'milestone',
    rarity: 'legendary',
    icon: '🏆',
    unlockCondition: '其他所有成就均解锁',
    evaluatorId: '_meta_all_others',
    reward: { inheritPoints: 100, desc: '终极成就' },
  },

  // ═══════════════════════════════════════════════════════
  //  B. 结局成就(12)
  // ═══════════════════════════════════════════════════════
  {
    id: 'ending_first_clear',
    title: '首次通关',
    description: '首次达成任意结局',
    type: 'ending',
    rarity: 'common',
    icon: '🎬',
    unlockCondition: '完成任意 1 个结局',
    evaluatorId: EVALUATOR.ENDING_COUNT,
    evaluatorParams: { min_count: 1 },
    reward: { inheritPoints: 5 },
  },
  {
    id: 'ending_true_first',
    title: '真结局初遇',
    description: '首次达成 True End',
    type: 'ending',
    rarity: 'rare',
    icon: '💫',
    unlockCondition: '达成任意女角的 True End',
    evaluatorId: EVALUATOR.ENDING_ALL_TRUE,
    evaluatorParams: { min_count: 1 },
    reward: { inheritPoints: 10 },
  },
  {
    id: 'ending_bad_first',
    title: '失败的寒假',
    description: '首次触发 BAD END',
    type: 'ending',
    rarity: 'common',
    icon: '💔',
    unlockCondition: '触发任意 BAD END',
    evaluatorId: EVALUATOR.ENDING_REACHED,
    evaluatorParams: { ending_id: 'bad_end_any' },
    reward: { inheritPoints: 3 },
  },
  {
    id: 'ending_sakurako_hidden',
    title: '隐藏结局·樱子',
    description: '解锁杉本樱子的隐藏结局',
    type: 'ending',
    rarity: 'legendary',
    icon: '🔮',
    unlockCondition: '完成樱子隐藏结局',
    evaluatorId: EVALUATOR.ENDING_REACHED,
    evaluatorParams: { ending_id: 'sakurako_hidden' },
    reward: { inheritPoints: 30, unlockFlags: ['sakurako_ending'] },
  },
  {
    id: 'ending_harem',
    title: '后宫结局',
    description: '达成后宫结局',
    type: 'ending',
    rarity: 'epic',
    icon: '💕',
    unlockCondition: '达成后宫结局',
    evaluatorId: EVALUATOR.ENDING_REACHED,
    evaluatorParams: { ending_id: 'harem' },
    reward: { inheritPoints: 25 },
  },
  {
    id: 'ending_bankruptcy',
    title: '破产结局',
    description: '因经济破产触发结局',
    type: 'ending',
    rarity: 'common',
    icon: '💸',
    unlockCondition: '触发破产结局',
    evaluatorId: EVALUATOR.ENDING_REACHED,
    evaluatorParams: { ending_id: 'bankruptcy' },
    reward: { inheritPoints: 3 },
  },
  {
    id: 'ending_all_true',
    title: '全 True End',
    description: '解锁全部 19 位女角的 True End',
    type: 'ending',
    rarity: 'legendary',
    icon: '🌟',
    unlockCondition: '19 位女角 True End 全达成',
    evaluatorId: EVALUATOR.ENDING_ALL_TRUE,
    evaluatorParams: { min_count: 19 },
    reward: { inheritPoints: 50 },
  },
  {
    id: 'ending_yoko_pregnancy',
    title: '洋子怀孕',
    description: '触发南川洋子怀孕特殊结局',
    type: 'ending',
    rarity: 'epic',
    icon: '🍼',
    unlockCondition: '洋子无保护次数累计后触发',
    evaluatorId: EVALUATOR.ENDING_REACHED,
    evaluatorParams: { ending_id: 'yoko_pregnancy' },
    reward: { inheritPoints: 15 },
  },
  {
    id: 'ending_misha_confession',
    title: '美沙反告白',
    description: '触发田中美沙反告白结局',
    type: 'ending',
    rarity: 'rare',
    icon: '💌',
    unlockCondition: '美沙反告白结局',
    evaluatorId: EVALUATOR.ENDING_REACHED,
    evaluatorParams: { ending_id: 'misha_confession' },
    reward: { inheritPoints: 10 },
  },
  {
    id: 'ending_izumi_auto',
    title: '泉美自动告白',
    description: '触发筱原泉美自动告白结局',
    type: 'ending',
    rarity: 'rare',
    icon: '🏹',
    unlockCondition: '泉美自动告白结局',
    evaluatorId: EVALUATOR.ENDING_REACHED,
    evaluatorParams: { ending_id: 'izumi_auto' },
    reward: { inheritPoints: 10 },
  },
  {
    id: 'ending_collector_5',
    title: '结局收藏家',
    description: '解锁 5 种不同结局',
    type: 'ending',
    rarity: 'rare',
    icon: '📚',
    unlockCondition: '累计 5 种不同结局',
    evaluatorId: EVALUATOR.ENDING_COUNT,
    evaluatorParams: { min_count: 5 },
    reward: { inheritPoints: 15 },
  },
  {
    id: 'ending_collector_20',
    title: '结局大师',
    description: '解锁 20 种不同结局',
    type: 'ending',
    rarity: 'epic',
    icon: '🎭',
    unlockCondition: '累计 20 种不同结局',
    evaluatorId: EVALUATOR.ENDING_COUNT,
    evaluatorParams: { min_count: 20 },
    reward: { inheritPoints: 30 },
  },

  // ═══════════════════════════════════════════════════════
  //  C. 女角成就(7 代表 + 全成就 3)
  // ═══════════════════════════════════════════════════════
  {
    id: 'heroine_yui_captured',
    title: '唯的心',
    description: '完成鸣泽唯的攻略',
    type: 'heroine',
    rarity: 'rare',
    icon: '🌸',
    unlockCondition: '唯 攻略完成',
    evaluatorId: EVALUATOR.HEROINE_CAPTURED,
    evaluatorParams: { heroine_name: '鸣泽唯' },
    reward: { inheritPoints: 8 },
  },
  {
    id: 'heroine_misako_captured',
    title: '美佐子的温柔',
    description: '完成鸣泽美佐子的攻略',
    type: 'heroine',
    rarity: 'rare',
    icon: '🌷',
    unlockCondition: '美佐子 攻略完成',
    evaluatorId: EVALUATOR.HEROINE_CAPTURED,
    evaluatorParams: { heroine_name: '鸣泽美佐子' },
    reward: { inheritPoints: 8 },
  },
  {
    id: 'heroine_sakurako_captured',
    title: '隐藏之恋',
    description: '完成杉本樱子的攻略(隐藏女角)',
    type: 'heroine',
    rarity: 'legendary',
    icon: '🌺',
    unlockCondition: '樱子 攻略完成',
    evaluatorId: EVALUATOR.HEROINE_CAPTURED,
    evaluatorParams: { heroine_name: '杉本樱子' },
    reward: { inheritPoints: 20, unlockFlags: ['sakurako_captured'] },
  },
  {
    id: 'heroine_first_h_misako',
    title: '初次·美佐子',
    description: '与鸣泽美佐子完成初 H',
    type: 'heroine',
    rarity: 'rare',
    icon: '💕',
    unlockCondition: '美佐子 初H',
    evaluatorId: EVALUATOR.HEROINE_FIRST_H,
    evaluatorParams: { heroine_name: '鸣泽美佐子' },
    reward: { inheritPoints: 5 },
  },
  {
    id: 'heroine_advanced_h_misako',
    title: '进阶·美佐子',
    description: '与鸣泽美佐子完成进阶 H',
    type: 'heroine',
    rarity: 'epic',
    icon: '💖',
    unlockCondition: '美佐子 进阶H',
    evaluatorId: EVALUATOR.HEROINE_ADVANCED_H,
    evaluatorParams: { heroine_name: '鸣泽美佐子' },
    reward: { inheritPoints: 8 },
  },
  {
    id: 'heroine_true_end_yui',
    title: '唯·True End',
    description: '达成鸣泽唯的 True End',
    type: 'heroine',
    rarity: 'epic',
    icon: '✨',
    unlockCondition: '唯 True End',
    evaluatorId: EVALUATOR.HEROINE_TRUE_END,
    evaluatorParams: { heroine_name: '鸣泽唯' },
    reward: { inheritPoints: 15 },
  },
  {
    id: 'heroine_true_end_misako',
    title: '美佐子·True End',
    description: '达成鸣泽美佐子的 True End',
    type: 'heroine',
    rarity: 'epic',
    icon: '✨',
    unlockCondition: '美佐子 True End',
    evaluatorId: EVALUATOR.HEROINE_TRUE_END,
    evaluatorParams: { heroine_name: '鸣泽美佐子' },
    reward: { inheritPoints: 15 },
  },
  {
    id: 'heroine_all_captured',
    title: '万人迷',
    description: '攻略全部 20 位女角(含隐藏)',
    type: 'heroine',
    rarity: 'legendary',
    icon: '💋',
    unlockCondition: '20 位女角全攻略',
    evaluatorId: EVALUATOR.HEROINE_ALL_CAPTURED,
    reward: { inheritPoints: 50 },
  },

  // ═══════════════════════════════════════════════════════
  //  D. 隐藏剧情成就(7)
  // ═══════════════════════════════════════════════════════
  {
    id: 'hidden_diary_one',
    title: '日记发现者',
    description: '找到第一本日记',
    type: 'hidden',
    rarity: 'common',
    icon: '📔',
    unlockCondition: '收集任意 1 本日记',
    evaluatorId: EVALUATOR.DIARY_ONE,
    evaluatorParams: { diary_id: 1 },
    reward: { inheritPoints: 3 },
  },
  {
    id: 'hidden_diary_all',
    title: '日记全收集',
    description: '收集全部 5 本日记',
    type: 'hidden',
    rarity: 'epic',
    icon: '📚',
    unlockCondition: '5 本日记全收集',
    evaluatorId: EVALUATOR.DIARY_ALL,
    reward: { inheritPoints: 15, unlockFlags: ['diary_all'] },
  },
  {
    id: 'hidden_variable_shop',
    title: '变数屋常客',
    description: '访问变数屋 10 次',
    type: 'hidden',
    rarity: 'rare',
    icon: '🔮',
    unlockCondition: '变数屋访问 >= 10 次',
    evaluatorId: EVALUATOR.VARIABLE_SHOP_VISIT,
    evaluatorParams: { min_visits: 10 },
    reward: { inheritPoints: 10 },
  },
  {
    id: 'hidden_sakurako_route',
    title: '樱子线开启',
    description: '解锁杉本樱子剧情线',
    type: 'hidden',
    rarity: 'epic',
    icon: '🌸',
    unlockCondition: '医院访问次数达标',
    evaluatorId: EVALUATOR.SAKURAKO_ROUTE,
    reward: { inheritPoints: 12, unlockFlags: ['sakurako_route'] },
  },
  {
    id: 'hidden_graduate_side',
    title: '毕业生外传',
    description: '触发毕业生外传彩蛋',
    type: 'hidden',
    rarity: 'rare',
    icon: '🎓',
    unlockCondition: '齐藤澪/澪奈/铃木美穗/仁科/正树夏子 任一好感 >= 50 且 day >= 14',
    evaluatorId: EVALUATOR.GRADUATE_SIDE,
    reward: { inheritPoints: 8 },
  },
  {
    id: 'hidden_hospitalvisitor',
    title: '医院常客',
    description: '访问 88 市民医院 5 次',
    type: 'hidden',
    rarity: 'common',
    icon: '🏥',
    unlockCondition: '医院访问 >= 5 次',
    evaluatorId: EVALUATOR.HOSPITAL_VISIT,
    evaluatorParams: { min_visits: 5 },
    reward: { inheritPoints: 5 },
  },
  {
    id: 'hidden_miki_dual',
    title: '美纪的双重身份',
    description: '揭示加藤美纪的双身份秘密',
    type: 'hidden',
    rarity: 'epic',
    icon: '🎭',
    unlockCondition: '美纪双身份揭示',
    evaluatorId: '_flag_check',
    evaluatorParams: { flag: '美纪双身份揭示' },
    reward: { inheritPoints: 12 },
  },

  // ═══════════════════════════════════════════════════════
  //  E. 技能成就(4)
  // ═══════════════════════════════════════════════════════
  {
    id: 'skill_romance_max',
    title: '恋爱大师',
    description: '恋爱技能达到 100',
    type: 'skill',
    rarity: 'rare',
    icon: '💘',
    unlockCondition: '恋爱技能 = 100',
    evaluatorId: EVALUATOR.SKILL_MAX,
    evaluatorParams: { skill_name: '恋爱' },
    reward: { inheritPoints: 10 },
  },
  {
    id: 'skill_speech_max',
    title: '辩才无碍',
    description: '口才技能达到 100',
    type: 'skill',
    rarity: 'rare',
    icon: '🗣',
    unlockCondition: '口才技能 = 100',
    evaluatorId: EVALUATOR.SKILL_MAX,
    evaluatorParams: { skill_name: '口才' },
    reward: { inheritPoints: 8 },
  },
  {
    id: 'skill_observation_max',
    title: '洞察秋毫',
    description: '观察技能达到 100',
    type: 'skill',
    rarity: 'rare',
    icon: '🔍',
    unlockCondition: '观察技能 = 100',
    evaluatorId: EVALUATOR.SKILL_MAX,
    evaluatorParams: { skill_name: '观察' },
    reward: { inheritPoints: 8 },
  },
  {
    id: 'skill_all_max',
    title: '全能达人',
    description: '所有 13 项技能均达到 100',
    type: 'skill',
    rarity: 'legendary',
    icon: '🎯',
    unlockCondition: '全技能 100',
    evaluatorId: EVALUATOR.SKILL_ALL_MAX,
    reward: { inheritPoints: 40 },
  },

  // ═══════════════════════════════════════════════════════
  //  F. CG 收集成就(3)
  // ═══════════════════════════════════════════════════════
  {
    id: 'cg_first',
    title: '首张 CG',
    description: '解锁第一张 CG',
    type: 'cg',
    rarity: 'common',
    icon: '🖼',
    unlockCondition: '解锁任意 1 张 CG',
    evaluatorId: EVALUATOR.CG_COUNT,
    evaluatorParams: { min_count: 1 },
    reward: { inheritPoints: 3 },
  },
  {
    id: 'cg_half',
    title: 'CG 收藏家',
    description: '解锁 50% 的 CG',
    type: 'cg',
    rarity: 'epic',
    icon: '🖼',
    unlockCondition: '解锁 50% CG',
    evaluatorId: EVALUATOR.CG_COUNT,
    evaluatorParams: { min_count: 25, percent: 50 },
    reward: { inheritPoints: 15 },
  },
  {
    id: 'cg_all',
    title: 'CG 全收集',
    description: '解锁全部 CG',
    type: 'cg',
    rarity: 'legendary',
    icon: '🖼',
    unlockCondition: '100% CG 收集',
    evaluatorId: EVALUATOR.CG_ALL,
    reward: { inheritPoints: 30 },
  },

  // ═══════════════════════════════════════════════════════
  //  G. 经济成就(3)
  // ═══════════════════════════════════════════════════════
  {
    id: 'economy_rich',
    title: '小富翁',
    description: '累计储蓄达到 50000',
    type: 'economy',
    rarity: 'rare',
    icon: '💰',
    unlockCondition: '储蓄 >= 50000',
    evaluatorId: EVALUATOR.SAVINGS_GOAL,
    evaluatorParams: { min_amount: 50000 },
    reward: { inheritPoints: 10 },
  },
  {
    id: 'economy_millionaire',
    title: '冬日富翁',
    description: '累计储蓄达到 100000',
    type: 'economy',
    rarity: 'epic',
    icon: '💎',
    unlockCondition: '储蓄 >= 100000',
    evaluatorId: EVALUATOR.SAVINGS_GOAL,
    evaluatorParams: { min_amount: 100000 },
    reward: { inheritPoints: 20 },
  },
  {
    id: 'economy_bankrupt',
    title: '身无分文',
    description: '触发破产事件',
    type: 'economy',
    rarity: 'common',
    icon: '🪙',
    unlockCondition: '现金 = 0 且连续无收入 >= 3 天',
    evaluatorId: EVALUATOR.BANKRUPTCY,
    reward: { inheritPoints: 3 },
  },
];

// ───────────────────────────────────────────────────────────
//  成就映射表(快速查找)
// ───────────────────────────────────────────────────────────

export const ACHIEVEMENT_MAP: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

// ───────────────────────────────────────────────────────────
//  按类型分组
// ───────────────────────────────────────────────────────────

export const ACHIEVEMENTS_BY_TYPE: Record<AchievementType, Achievement[]> = {
  ending: ACHIEVEMENTS.filter((a) => a.type === 'ending'),
  heroine: ACHIEVEMENTS.filter((a) => a.type === 'heroine'),
  hidden: ACHIEVEMENTS.filter((a) => a.type === 'hidden'),
  skill: ACHIEVEMENTS.filter((a) => a.type === 'skill'),
  cg: ACHIEVEMENTS.filter((a) => a.type === 'cg'),
  economy: ACHIEVEMENTS.filter((a) => a.type === 'economy'),
  milestone: ACHIEVEMENTS.filter((a) => a.type === 'milestone'),
};

// ───────────────────────────────────────────────────────────
//  稀有度配色
// ───────────────────────────────────────────────────────────

export const RARITY_COLOR: Record<AchievementRarity, string> = {
  common: '#9e9e9e',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ff9800',
};

export const RARITY_LABEL: Record<AchievementRarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export const TYPE_LABEL: Record<AchievementType, string> = {
  ending: '结局',
  heroine: '女角',
  hidden: '隐藏',
  skill: '技能',
  cg: 'CG',
  economy: '经济',
  milestone: '里程碑',
};

export const TYPE_ICON: Record<AchievementType, string> = {
  ending: '🎬',
  heroine: '💋',
  hidden: '🔮',
  skill: '🎯',
  cg: '🖼',
  economy: '💰',
  milestone: '⭐',
};

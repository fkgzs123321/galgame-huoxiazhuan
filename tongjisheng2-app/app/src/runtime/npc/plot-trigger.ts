/**
 * NPC 独立剧情触发器(阶段2 步骤5)
 *
 * 职责:
 *  - 基于女角_剧情线文件,判定 NPC 独立剧情是否触发
 *  - 触发条件:dayCount + 女角关系阶段 + 女角位置 + NPC关系网事件
 *  - 剧情推进:按阶段(寒假前奏/核心/尾声/结局)推进
 *  - 错过事件:玩家未在 NPC 剧情地点时,NPC 独立推进
 *  - 遭遇事件:玩家移动到 NPC 剧情地点时,判定可能遭遇
 *
 * 设计:
 *  - 剧情线数据从女角档案的 剧情线.txt 提取(此处用简化结构)
 *  - 不修改状态,只返回触发建议
 *  - 由 Kernel/NPC自然行动AI 决定是否真的推进
 */

import { scheduleEngine } from './schedule-engine';
import { relationshipGraph } from './relationship-graph';
import { HEROINE_ID_MAP } from '../../content/npc/schedule-data';
import type { TimeSlot, Region } from '../../content/npc/schedule-data';

// ───────────────────────────────────────────────────────────
//  剧情线数据结构
// ───────────────────────────────────────────────────────────

export type PlotStage = '寒假前奏' | '寒假核心' | '寒假尾声' | '结局阶段';

export interface PlotNode {
  /** 女角 ID */
  heroineId: number;
  /** 女角姓名 */
  heroineName: string;
  /** 触发日期(游戏内天数) */
  dayCount: number | number[];
  /** 触发时段 */
  timeSlot?: TimeSlot | TimeSlot[];
  /** 触发地点 */
  location?: Region | Region[];
  /** 事件名 */
  event: string;
  /** 事件描述 */
  description: string;
  /** 触发条件(好感度阈值等) */
  condition?: string;
  /** 是否不可逆 */
  isReversible: boolean;
  /** 触发的 flag */
  flags?: string[];
  /** 是否需要玩家在场 */
  requiresPlayerPresence: boolean;
  /** 剧情阶段 */
  stage: PlotStage;
}

// ───────────────────────────────────────────────────────────
//  内置剧情节点(从原卡女角_剧情线文件提取的简化版)
// ───────────────────────────────────────────────────────────

export const PLOT_NODES: PlotNode[] = [
  // 鸣泽美佐子(2)
  {
    heroineId: 2,
    heroineName: '鸣泽美佐子',
    dayCount: 1,
    event: '寒假第一天 · 日常家庭互动',
    description: '美佐子清晨在商业区开店准备,上午起到下午在咖啡店《憩》营业;晚归鸣泽家与主角共进晚餐',
    isReversible: true,
    requiresPlayerPresence: false,
    stage: '寒假前奏',
    flags: ['flag_misako_daily_interaction_active'],
  },
  {
    heroineId: 2,
    heroineName: '鸣泽美佐子',
    dayCount: 4,
    timeSlot: ['下午', '晚'],
    location: '自宅周边',
    event: '圣诞夜事件',
    description: '圣诞夜在鸣泽家与美佐子独处;美佐子酒后微醺时吐露"十年了,他没回来过过一个圣诞"',
    condition: '好感度≥10',
    isReversible: true,
    requiresPlayerPresence: true,
    stage: '寒假前奏',
    flags: ['flag_misako_christmas_eve', 'flag_misako_loneliness_revealed'],
  },
  {
    heroineId: 2,
    heroineName: '鸣泽美佐子',
    dayCount: 5,
    timeSlot: '深夜',
    location: '自宅周边',
    event: '美佐子酒后深夜归来',
    description: '美佐子酒后深夜归家,主角为其解围;美佐子吐露"作为女人而非母亲被看待"的渴望',
    condition: '好感度≥10',
    isReversible: false,
    requiresPlayerPresence: true,
    stage: '寒假核心',
    flags: ['flag_misako_drunk_first', 'flag_misako_ambiguous_unlocked'],
  },
  // 鸣泽唯(1)
  {
    heroineId: 1,
    heroineName: '鸣泽唯',
    dayCount: 7,
    event: '西御寺事件预兆',
    description: '西御寺开始介入唯线,唯的日常行为出现变化',
    isReversible: true,
    requiresPlayerPresence: false,
    stage: '寒假核心',
  },
  {
    heroineId: 1,
    heroineName: '鸣泽唯',
    dayCount: 8,
    event: '西御寺事件高潮',
    description: '若唯好感≥40 触发西御寺阴谋,唯线关键转折',
    condition: '好感度≥40',
    isReversible: false,
    requiresPlayerPresence: true,
    stage: '寒假核心',
  },
  // 舞岛可怜(3)
  {
    heroineId: 3,
    heroineName: '舞岛可怜',
    dayCount: [10, 11, 12, 13],
    event: '夏威夷出差期间',
    description: '可怜 12/31~1/3 夏威夷出差,期间不可遇;day13 下午回八十八町',
    isReversible: true,
    requiresPlayerPresence: false,
    stage: '寒假核心',
  },
  // 永岛久美子(13)
  {
    heroineId: 13,
    heroineName: '永岛久美子',
    dayCount: 11,
    event: '元日登场',
    description: '01-01 主角在自宅收留久美子,久美子线开启',
    isReversible: false,
    requiresPlayerPresence: true,
    stage: '寒假核心',
  },
  {
    heroineId: 13,
    heroineName: '永岛久美子',
    dayCount: 15,
    event: '久美子线高潮',
    description: '久美子攻略完成,达亲密阶段',
    condition: '好感度≥50',
    isReversible: false,
    requiresPlayerPresence: true,
    stage: '寒假尾声',
  },
  // 永岛佐知子(14)
  {
    heroineId: 14,
    heroineName: '永岛佐知子',
    dayCount: 13,
    event: '佐知子登场',
    description: '佐知子来接久美子,佐知子线开启',
    isReversible: false,
    requiresPlayerPresence: true,
    stage: '寒假尾声',
  },
  // 筱原泉美(5)
  {
    heroineId: 5,
    heroineName: '筱原泉美',
    dayCount: 9,
    event: '温泉之旅预兆',
    description: '泉美线开启,温泉乡相关剧情预兆',
    isReversible: true,
    requiresPlayerPresence: false,
    stage: '寒假核心',
  },
];

// ───────────────────────────────────────────────────────────
//  触发判定
// ───────────────────────────────────────────────────────────

export interface TriggerContext {
  /** 游戏内天数 */
  dayCount: number;
  /** 当前时段 */
  timeSlot: TimeSlot;
  /** 玩家当前位置 */
  playerRegion: Region;
  /** 女角状态快照(女角ID → { 好感度, 关系阶段, 当前位置, 独立剧情进度 }) */
  heroineStates: Record<number, {
    好感度: number;
    关系阶段: string;
    当前位置: string;
    独立剧情进度: string;
  }>;
  /** 已触发的 flag 集合 */
  triggeredFlags: Set<string>;
}

export interface TriggerResult {
  /** 触发的剧情节点 */
  node: PlotNode;
  /** 触发类型:encounter(玩家遭遇)/ miss(玩家错过)/ independent(NPC独立推进) */
  type: 'encounter' | 'miss' | 'independent';
  /** 是否需要 NPC 自然行动AI 生成叙事 */
  needsNarrative: boolean;
  /** 触发原因 */
  reason: string;
}

export class PlotTrigger {
  /**
   * 判定某女角在当前上下文下是否触发独立剧情
   *
   * @param heroineId 女角 ID
   * @param ctx 触发上下文
   * @returns 触发结果(若未触发返回 null)
   */
  evaluate(heroineId: number, ctx: TriggerContext): TriggerResult | null {
    const nodes = PLOT_NODES.filter((n) => n.heroineId === heroineId);
    const heroineState = ctx.heroineStates[heroineId];

    for (const node of nodes) {
      // 1. 日期匹配
      const dayMatch = Array.isArray(node.dayCount)
        ? node.dayCount.includes(ctx.dayCount)
        : node.dayCount === ctx.dayCount;
      if (!dayMatch) continue;

      // 2. 时段匹配(若剧情指定时段)
      if (node.timeSlot) {
        const slots = Array.isArray(node.timeSlot) ? node.timeSlot : [node.timeSlot];
        if (!slots.includes(ctx.timeSlot)) continue;
      }

      // 3. flag 检查(已触发的不可逆事件跳过)
      if (node.flags && !node.isReversible) {
        if (node.flags.some((f) => ctx.triggeredFlags.has(f))) continue;
      }

      // 4. 独立剧情进度检查
      if (heroineState && heroineState.独立剧情进度 !== '未开始') {
        // 已进入更高阶段,跳过低阶段
        const stageOrder: PlotStage[] = ['寒假前奏', '寒假核心', '寒假尾声', '结局阶段'];
        const currentStageIdx = stageOrder.indexOf(heroineState.独立剧情进度 as PlotStage);
        const nodeStageIdx = stageOrder.indexOf(node.stage);
        if (currentStageIdx >= 0 && nodeStageIdx < currentStageIdx) continue;
      }

      // 5. 判定触发类型
      if (node.requiresPlayerPresence) {
        // 需要玩家在场
        if (node.location) {
          const locations = Array.isArray(node.location) ? node.location : [node.location];
          if (locations.includes(ctx.playerRegion)) {
            return {
              node,
              type: 'encounter',
              needsNarrative: true,
              reason: `玩家在 ${ctx.playerRegion},遭遇 ${node.heroineName} 的 ${node.event}`,
            };
          }
          // 玩家不在剧情地点 → 错过事件
          return {
            node,
            type: 'miss',
            needsNarrative: false,
            reason: `玩家未在 ${node.location},错过 ${node.heroineName} 的 ${node.event}`,
          };
        }
        // 未指定地点,默认遭遇
        return {
          node,
          type: 'encounter',
          needsNarrative: true,
          reason: `${node.heroineName} 的 ${node.event} 触发(无地点限制)`,
        };
      }

      // 不需要玩家在场 → NPC 独立推进
      return {
        node,
        type: 'independent',
        needsNarrative: true,
        reason: `${node.heroineName} 独立推进 ${node.event}(玩家不需要在场)`,
      };
    }

    return null;
  }

  /**
   * 批量判定所有当日可遇女角的剧情触发
   */
  evaluateAll(ctx: TriggerContext): TriggerResult[] {
    const results: TriggerResult[] = [];
    const dayHeroines = scheduleEngine.getDayHeroines(ctx.dayCount);

    for (const entry of dayHeroines) {
      const result = this.evaluate(entry.heroineId, ctx);
      if (result) {
        results.push(result);
      }
    }
    return results;
  }

  /**
   * 获取某女角的所有剧情节点(用于 UI 展示)
   */
  getHeroinePlotNodes(heroineId: number): PlotNode[] {
    return PLOT_NODES.filter((n) => n.heroineId === heroineId);
  }
}

// 单例
export const plotTrigger = new PlotTrigger();

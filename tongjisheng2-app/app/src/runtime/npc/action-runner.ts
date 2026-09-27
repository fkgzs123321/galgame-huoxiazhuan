/**
 * NPC 自然行动运行器(阶段2 步骤6)
 *
 * 职责:
 *  - 每回合开始时,计算场外女角的行动
 *  - 查询日程引擎确定女角位置
 *  - 检查剧情触发器
 *  - 生成 NPC 行动摘要(注入主聊天AI上下文)
 *  - 生成 NPC 状态变更 ops(交给变量AI合并或直接应用)
 *  - 记录 NPC 记忆
 *
 * 集成点:
 *  - Kernel.startTurn 后调用 runNpcActions()
 *  - 返回的 actionSummary 注入主聊天AI上下文
 *  - 返回的 stateOps 合并到候选变更集
 *
 * 设计:
 *  - 阶段2 不实际调用 NPC自然行动AI(模型未配置时用规则生成摘要)
 *  - 阶段3 接入真实 AI 后,摘要由 AI 生成
 */

import { scheduleEngine } from './schedule-engine';
import { relationshipGraph } from './relationship-graph';
import { plotTrigger, type TriggerResult } from './plot-trigger';
import { recordMemory } from './memory';
import { HEROINE_ID_MAP, type TimeSlot, type Region } from '../../content/npc/schedule-data';
import { createLcg } from '../lcg-engine';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

export interface NpcActionContext {
  /** 游戏内天数 */
  dayCount: number;
  /** 当前时段 */
  timeSlot: TimeSlot;
  /** 玩家当前位置 */
  playerRegion: Region;
  /** 当前女角 ID(在场女角) */
  currentHeroineId?: number;
  /** 女角状态快照(女角ID → 状态) */
  heroineStates: Record<number, {
    好感度: number;
    关系阶段: string;
    当前位置: string;
    独立剧情进度: string;
  }>;
  /** 已触发的 flag 集合 */
  triggeredFlags: Set<string>;
  /** 关系覆盖(攻略完成后女角常驻区域) */
  relationshipOverrides?: Record<number, Region>;
  /** 已解锁的隐藏女角 */
  unlockedHiddenIds?: number[];
}

export interface NpcActionResult {
  /** NPC 行动摘要(注入主聊天AI上下文) */
  actionSummary: string;
  /** NPC 状态变更 ops(合并到候选变更集) */
  stateOps: Array<{
    op: 'replace' | 'add';
    path: string;
    value: unknown;
  }>;
  /** 剧情触发结果 */
  plotTriggers: TriggerResult[];
  /** 场外行动女角列表 */
  offScreenActions: Array<{
    heroineId: number;
    heroineName: string;
    location: Region;
    action: string;
  }>;
  /** trace 记录(供调试) */
  traces: Array<{ step: string; detail: string }>;
}

// ───────────────────────────────────────────────────────────
//  NPC 行动运行器
// ───────────────────────────────────────────────────────────

export class NpcActionRunner {
  /**
   * 运行 NPC 自然行动
   *  - 查询当日可遇女角
   *  - 过滤在场女角(当前女角不算场外)
   *  - 为每个场外女角生成行动摘要
   *  - 检查剧情触发
   *  - 生成状态变更 ops
   */
  async run(ctx: NpcActionContext): Promise<NpcActionResult> {
    const traces: Array<{ step: string; detail: string }> = [];
    const offScreenActions: NpcActionResult['offScreenActions'] = [];
    const stateOps: NpcActionResult['stateOps'] = [];
    const plotTriggers: TriggerResult[] = [];
    const summaryParts: string[] = [];

    traces.push({ step: 'npc-start', detail: `NPC自然行动启动:day${ctx.dayCount} ${ctx.timeSlot} 玩家在${ctx.playerRegion}` });

    // 1. 查询当日可遇女角
    const dayHeroines = scheduleEngine.getDayHeroines(ctx.dayCount, {
      relationshipOverrides: ctx.relationshipOverrides,
      unlockedHiddenIds: ctx.unlockedHiddenIds,
    });
    traces.push({ step: 'day-heroines', detail: `当日可遇女角 ${dayHeroines.length} 人:${dayHeroines.map((h) => h.heroineName).join('/')}` });

    // 2. 检查剧情触发
    const plotCtx = {
      dayCount: ctx.dayCount,
      timeSlot: ctx.timeSlot,
      playerRegion: ctx.playerRegion,
      heroineStates: ctx.heroineStates,
      triggeredFlags: ctx.triggeredFlags,
    };
    const triggers = plotTrigger.evaluateAll(plotCtx);
    for (const t of triggers) {
      plotTriggers.push(t);
      traces.push({ step: 'plot-trigger', detail: `${t.node.heroineName} ${t.node.event} → ${t.type}:${t.reason}` });

      if (t.type === 'independent' || t.type === 'miss') {
        // NPC 独立推进或玩家错过 → 记录 NPC 记忆
        await recordMemory({
          heroineId: t.node.heroineId,
          type: 'plot_event',
          content: t.node.event,
          dayCount: ctx.dayCount,
          impact: t.node.description,
          weight: t.node.isReversible ? 40 : 70,
        });
      }
    }

    // 3. 为场外女角生成行动摘要
    for (const entry of dayHeroines) {
      // 跳过当前在场女角
      if (entry.heroineId === ctx.currentHeroineId) continue;

      // 查询女角在本时段的位置
      const schedule = scheduleEngine.getHeroineDaySchedule(entry.heroineId, ctx.dayCount, {
        relationshipOverrides: ctx.relationshipOverrides,
        unlockedHiddenIds: ctx.unlockedHiddenIds,
      });
      const currentSlot = schedule.find((s) => s.timeSlot === ctx.timeSlot);
      if (!currentSlot) continue;

      // 跳过与玩家同区域的女角(她们是"可遭遇"而非"场外")
      if (currentSlot.region === ctx.playerRegion) continue;

      // 生成行动摘要(规则生成,阶段3 由 AI 生成)
      const action = this.generateActionSummary(entry.heroineId, currentSlot.region, ctx);
      offScreenActions.push({
        heroineId: entry.heroineId,
        heroineName: entry.heroineName,
        location: currentSlot.region,
        action,
      });

      // 生成状态变更 ops:更新女角位置和心情
      const heroineName = entry.heroineName;
      stateOps.push({
        op: 'replace',
        path: `女角.${heroineName}.当前位置`,
        value: currentSlot.region,
      });
      stateOps.push({
        op: 'replace',
        path: `女角.${heroineName}.是否在场外行动`,
        value: 1,
      });
      stateOps.push({
        op: 'replace',
        path: `女角.${heroineName}.今日行动`,
        value: action,
      });

      // 摘要片段
      summaryParts.push(`${entry.heroineName}在${currentSlot.region}(${action})`);

      traces.push({ step: 'off-screen-action', detail: `${entry.heroineName} → ${currentSlot.region}:${action}` });
    }

    // 4. 关系网影响:检查场外女角之间的关系
    for (let i = 0; i < offScreenActions.length; i++) {
      for (let j = i + 1; j < offScreenActions.length; j++) {
        const a = offScreenActions[i];
        const b = offScreenActions[j];
        if (a.location === b.location) {
          // 同区域的女角 → 检查关系影响
          const effect = relationshipGraph.computeCoPresenceEffect(a.heroineId, b.heroineId);
          if (effect.jealousyDelta > 0) {
            // 嫉妒值增加
            stateOps.push({
              op: 'replace',
              path: `女角.${a.heroineName}.嫉妒值`,
              value: (ctx.heroineStates[a.heroineId]?.好感度 ?? 0) + effect.jealousyDelta,
            });
            traces.push({ step: 'jealousy', detail: `${a.heroineName} 与 ${b.heroineName} 同区域,嫉妒值+${effect.jealousyDelta}` });
          }
        }
      }
    }

    // 5. 组装行动摘要
    const actionSummary = summaryParts.length > 0
      ? `【场外动态】${summaryParts.join(';')}`
      : '';

    traces.push({ step: 'npc-done', detail: `NPC自然行动完成:场外${offScreenActions.length}人,剧情触发${plotTriggers.length}个,状态ops${stateOps.length}条` });

    return {
      actionSummary,
      stateOps,
      plotTriggers,
      offScreenActions,
      traces,
    };
  }

  /**
   * 生成女角行动摘要(规则生成,阶段3 由 AI 生成)
   */
  private generateActionSummary(
    heroineId: number,
    region: Region,
    ctx: NpcActionContext,
  ): string {
    const heroineName = HEROINE_ID_MAP[heroineId] ?? `女角${heroineId}`;
    const state = ctx.heroineStates[heroineId];
    const mood = state ? this.deriveMood(state.好感度, state.关系阶段) : '平静';

    // 根据区域生成行动
    const actionsByRegion: Record<Region, string[]> = {
      自宅周边: ['休息', '做家务', '看电视'],
      八十八学园: ['社团活动', '自习', '与同学聊天'],
      八十八町商业区: ['购物', '打工', '逛街'],
      八十八海岸: ['散步', '看海', '跑步'],
      温泉乡: ['泡温泉', '放松', '赏景'],
      '88市民医院': ['就诊', '探病', '体检'],
      保育园: ['照顾小孩', '志愿服务', '打扫'],
    };

    const actions = actionsByRegion[region] ?? ['活动'];
    const lcg = createLcg({
      day: ctx.dayCount,
      timeSlot: ctx.timeSlot,
      heroineId,
      salt: `npc-action-${region}`,
    });
    const action = lcg.pick(actions);
    return `${action}(心情:${mood})`;
  }

  /**
   * 根据好感度和关系阶段推导心情
   */
  private deriveMood(好感度: number, 关系阶段: string): string {
    if (关系阶段 === '亲密' || 好感度 >= 60) return '愉悦';
    if (关系阶段 === '暧昧' || 好感度 >= 30) return '期待';
    if (好感度 >= 10) return '平静';
    if (好感度 < 0) return '不悦';
    return '平静';
  }
}

// 单例
export const npcActionRunner = new NpcActionRunner();

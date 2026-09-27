/**
 * TriggerDispatcher · 触发型 AI 调度器(阶段3 步骤1)
 *
 * 职责:
 *  - 评估当前 stat_data 是否满足触发型 AI 的调用条件
 *  - 路由到对应触发型 AI(opening/plot-evolution/combat/h-scene/worldview)
 *  - 未配置端点时按规则降级:
 *      开局/剧情演化/战斗/H结算 → 主聊天AI 兼并(同端点)
 *      世界观 → 跳过(不调用)
 *      NPC自然行动 → 阶段2 规则引擎已实现,本调度器不重复
 *  - 触发结果作为"附加候选变更集"合并到 Kernel.commit
 *  - 生成触发调用 Trace(8AI 调用链)
 *
 * 触发规则:
 *  - opening: 玩家身份 == '未选择' 或 turnCount == 0
 *  - plot-evolution: 关键 flag 变化(樱子死讯/西寺阴谋/美纪揭示等)或章节切换
 *  - combat: 玩家行动含战斗关键词(打/攻击/格斗/反抗)且场景允许
 *  - h-scene: 玩家行动含 H 关键词且当前女角好感度/关系阶段达标
 *  - worldview: 每 N 回合一次的世界观一致性审查(可配置)
 *
 * 集成点:
 *  - Kernel.startTurn 后调用 evaluateTriggers()
 *  - 返回的 triggerOps 合并到 CandidateChangeSet
 *  - 返回的 triggerNarrative 注入主聊天AI 上下文
 */

import type { AiProfile, AiProfileId } from '../ai/profiles';
import { findProfile } from '../ai/profiles';
import type { GatewayResult } from './model-gateway';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

export type TriggerType = 'opening' | 'plot-evolution' | 'combat' | 'h-scene' | 'worldview';

export interface TriggerContext {
  /** 当前 stat_data 快照 */
  statData: Record<string, unknown>;
  /** 玩家本回合行动文本 */
  userAction: string;
  /** 回合计数 */
  turnCount: number;
  /** 上一回合的 flag 快照(用于检测 flag 变化) */
  previousFlags?: Record<string, unknown>;
  /** 已配置的 AI 端点 id 集合(用于判断是否降级) */
  configuredProfileIds: Set<AiProfileId>;
}

export interface TriggerEvaluation {
  /** 是否触发 */
  triggered: boolean;
  /** 触发类型 */
  type: TriggerType | null;
  /** 触发原因 */
  reason: string;
  /** 应调用的 profile id(null=降级/跳过) */
  profileId: AiProfileId | null;
  /** 是否降级到主聊天AI */
  degradedToMainChat: boolean;
  /** 触发器额外上下文(注入 prompt) */
  extraContext?: string;
}

export interface TriggerInvocation {
  type: TriggerType;
  /** 实际调用的 profile id */
  profileId: AiProfileId;
  /** Gateway 调用结果 */
  result: GatewayResult;
  /** 是否降级 */
  degraded: boolean;
  /** 触发原因 */
  reason: string;
  /** 触发时间戳 */
  timestamp: number;
}

export interface TriggerDispatchResult {
  /** 所有触发器评估结果 */
  evaluations: TriggerEvaluation[];
  /** 实际执行的调用 */
  invocations: TriggerInvocation[];
  /** 触发器产生的叙事文本(注入主聊天AI 上下文) */
  triggerNarrative: string;
  /** 触发器产生的候选 ops(合并到 CandidateChangeSet) */
  triggerOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
  /** 调用链 Trace */
  traces: Array<{ step: string; detail: string; timestamp: number }>;
}

// ───────────────────────────────────────────────────────────
//  关键词表
// ───────────────────────────────────────────────────────────

const COMBAT_KEYWORDS = [
  '打', '攻击', '格斗', '反抗', '揍', '踢', '挥拳', '搏斗', '战斗', '拦截', '夺刀', '制止',
];

const HSCENE_KEYWORDS = [
  '亲吻', '抱住', '抚摸', '脱衣', '做爱', 'H', '性', '亲密', '诱惑', '勾引', '拥抱', '缠绵',
];

const PLOT_EVOLUTION_FLAGS = [
  '樱子死讯', '樱子线解锁', '美纪双身份揭示', '美纪秘密揭穿', '西寺解决进度', '阴谋偷听',
];

const PLOT_EVOLUTION_CHAPTERS = ['寒假核心', '寒假尾声', '结局'];

// ───────────────────────────────────────────────────────────
//  TriggerDispatcher 类
// ───────────────────────────────────────────────────────────

export class TriggerDispatcher {
  /** 评估所有触发器 */
  evaluateAll(ctx: TriggerContext): TriggerEvaluation[] {
    const results: TriggerEvaluation[] = [];
    results.push(this.evaluateOpening(ctx));
    results.push(this.evaluatePlotEvolution(ctx));
    results.push(this.evaluateCombat(ctx));
    results.push(this.evaluateHScene(ctx));
    results.push(this.evaluateWorldview(ctx));
    return results;
  }

  /** 开局AI 触发:身份未选择 或 第0回合 */
  private evaluateOpening(ctx: TriggerContext): TriggerEvaluation {
    const player = ctx.statData.主角 as { 玩家身份?: string } | undefined;
    const identity = player?.玩家身份 ?? '未选择';

    if (identity === '未选择' || ctx.turnCount === 0) {
      const configured = ctx.configuredProfileIds.has('opening');
      return {
        triggered: true,
        type: 'opening',
        reason: `身份=${identity} turnCount=${ctx.turnCount}`,
        profileId: configured ? 'opening' : 'main-chat',
        degradedToMainChat: !configured,
        extraContext: '【开局触发】生成开场叙事:玩家身份初始化场景(如美佐子叫起床)',
      };
    }

    return { triggered: false, type: null, reason: '身份已选择且非第0回合', profileId: null, degradedToMainChat: false };
  }

  /** 剧情演化AI 触发:关键 flag 变化 或 章节切换 */
  private evaluatePlotEvolution(ctx: TriggerContext): TriggerEvaluation {
    // 1. 检查关键 flag 变化
    if (ctx.previousFlags) {
      const hidden = ctx.statData.隐藏 as Record<string, unknown> | undefined;
      const prevHidden = ctx.previousFlags.隐藏 as Record<string, unknown> | undefined;
      if (hidden && prevHidden) {
        for (const flag of PLOT_EVOLUTION_FLAGS) {
          const curr = hidden[flag];
          const prev = prevHidden[flag];
          if (curr !== prev && (curr === true || curr === 1)) {
            const configured = ctx.configuredProfileIds.has('plot-evolution');
            return {
              triggered: true,
              type: 'plot-evolution',
              reason: `关键 flag 变化:${flag} ${String(prev)} → ${String(curr)}`,
              profileId: configured ? 'plot-evolution' : 'main-chat',
              degradedToMainChat: !configured,
              extraContext: `【剧情演化触发】flag ${flag} 触发,推进剧情线`,
            };
          }
        }
      }
    }

    // 2. 检查章节切换
    const time = ctx.statData.时间 as { 章节?: string } | undefined;
    const chapter = time?.章节 ?? '寒假前奏';
    if (PLOT_EVOLUTION_CHAPTERS.includes(chapter) && ctx.turnCount > 0) {
      const prevTime = ctx.previousFlags?.时间 as { 章节?: string } | undefined;
      const prevChapter = prevTime?.章节;
      if (prevChapter && prevChapter !== chapter) {
        const configured = ctx.configuredProfileIds.has('plot-evolution');
        return {
          triggered: true,
          type: 'plot-evolution',
          reason: `章节切换:${prevChapter} → ${chapter}`,
          profileId: configured ? 'plot-evolution' : 'main-chat',
          degradedToMainChat: !configured,
          extraContext: `【剧情演化触发】章节进入 ${chapter},推进剧情线`,
        };
      }
    }

    return { triggered: false, type: null, reason: '无 flag 变化/章节切换', profileId: null, degradedToMainChat: false };
  }

  /** 战斗结算AI 触发:行动含战斗关键词 */
  private evaluateCombat(ctx: TriggerContext): TriggerEvaluation {
    const action = ctx.userAction;
    if (!action || action.length === 0) {
      return { triggered: false, type: null, reason: '无行动文本', profileId: null, degradedToMainChat: false };
    }

    const hit = COMBAT_KEYWORDS.some((kw) => action.includes(kw));
    if (!hit) {
      return { triggered: false, type: null, reason: '行动未命中战斗关键词', profileId: null, degradedToMainChat: false };
    }

    // 场景允许性检查(学校/公园/夜晚街道等允许战斗)
    const scene = ctx.statData.场景 as { 当前地点?: string } | undefined;
    const location = scene?.当前地点 ?? '';
    const forbiddenLocations = ['自宅', '公寓', '家'];
    if (forbiddenLocations.some((l) => location.includes(l))) {
      return { triggered: false, type: null, reason: `场景 ${location} 不允许战斗`, profileId: null, degradedToMainChat: false };
    }

    const configured = ctx.configuredProfileIds.has('combat-settlement');
    return {
      triggered: true,
      type: 'combat',
      reason: `行动命中战斗关键词,场景 ${location} 允许`,
      profileId: configured ? 'combat-settlement' : 'main-chat',
      degradedToMainChat: !configured,
      extraContext: '【战斗触发】生成战斗结算页(骰子判定+伤害计算+胜负裁定)',
    };
  }

  /** H场景结算AI 触发:行动含 H 关键词 且 好感度/关系阶段达标 */
  private evaluateHScene(ctx: TriggerContext): TriggerEvaluation {
    const action = ctx.userAction;
    if (!action || action.length === 0) {
      return { triggered: false, type: null, reason: '无行动文本', profileId: null, degradedToMainChat: false };
    }

    const hit = HSCENE_KEYWORDS.some((kw) => action.includes(kw));
    if (!hit) {
      return { triggered: false, type: null, reason: '行动未命中 H 关键词', profileId: null, degradedToMainChat: false };
    }

    // 关系阶段检查(暧昧及以上才允许 H 场景)
    const heroine = ctx.statData.当前女角 as { 关系阶段?: string; 好感度?: number } | undefined;
    const stage = heroine?.关系阶段 ?? '初识';
    const favor = Number(heroine?.好感度 ?? 0);
    const allowedStages = ['暧昧', '心动', '亲密', '攻略完成'];
    if (!allowedStages.includes(stage)) {
      return {
        triggered: false,
        type: null,
        reason: `关系阶段 ${stage} 未达 H 场景要求(需暧昧+)`,
        profileId: null,
        degradedToMainChat: false,
      };
    }
    if (favor < 30) {
      return {
        triggered: false,
        type: null,
        reason: `好感度 ${favor} < 30,未达 H 场景要求`,
        profileId: null,
        degradedToMainChat: false,
      };
    }

    const configured = ctx.configuredProfileIds.has('h-scene-settlement');
    return {
      triggered: true,
      type: 'h-scene',
      reason: `行动命中 H 关键词,关系阶段 ${stage} 好感 ${favor} 达标`,
      profileId: configured ? 'h-scene-settlement' : 'main-chat',
      degradedToMainChat: !configured,
      extraContext: '【H场景触发】生成H结算页(CG触发+身体状态变化+敏感度计算)',
    };
  }

  /** 世界观AI 触发:每 N 回合一次的世界观一致性审查 */
  private evaluateWorldview(ctx: TriggerContext): TriggerEvaluation {
    const REVIEW_INTERVAL = 10; // 每 10 回合审查一次
    if (ctx.turnCount === 0 || ctx.turnCount % REVIEW_INTERVAL !== 0) {
      return { triggered: false, type: null, reason: `未到审查周期(turnCount=${ctx.turnCount})`, profileId: null, degradedToMainChat: false };
    }

    const configured = ctx.configuredProfileIds.has('worldview');
    if (!configured) {
      // 世界观 AI 未配置时跳过(不降级到主聊天AI)
      return {
        triggered: false,
        type: null,
        reason: '世界观AI 未配置,跳过审查',
        profileId: null,
        degradedToMainChat: false,
      };
    }

    return {
      triggered: true,
      type: 'worldview',
      reason: `周期性审查(turnCount=${ctx.turnCount})`,
      profileId: 'worldview',
      degradedToMainChat: false,
      extraContext: '【世界观审查】检查地理/时代/设定/法律/道德一致性',
    };
  }

  /** 从 Gateway 结果提取候选 ops */
  extractOpsFromResult(result: GatewayResult): Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> {
    if (!result.ok || !result.text) return [];
    // 简单提取 <JSONPatch>...</JSONPatch> 中的 ops
    const match = result.text.match(/<JSONPatch>([\s\S]*?)<\/JSONPatch>/);
    if (!match) return [];
    try {
      const ops = JSON.parse(match[1]);
      if (Array.isArray(ops)) return ops;
    } catch {
      // 解析失败,忽略
    }
    return [];
  }

  /** 从 Gateway 结果提取叙事文本 */
  extractNarrativeFromResult(result: GatewayResult): string {
    if (!result.ok || !result.text) return '';
    // 去掉 <UpdateVariable>/<UpdateTable>/<StatusPlaceHolderImpl/> 等标签
    return result.text
      .replace(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/g, '')
      .replace(/<UpdateTable>[\s\S]*?<\/UpdateTable>/g, '')
      .replace(/<StatusPlaceHolderImpl\s*\/>/g, '')
      .trim();
  }

  /** 组装触发器评估摘要(注入主聊天AI 上下文) */
  summarizeEvaluations(evaluations: TriggerEvaluation[]): string {
    const triggered = evaluations.filter((e) => e.triggered);
    if (triggered.length === 0) return '';
    const parts = triggered.map((e) => `[${e.type}] ${e.extraContext ?? e.reason}`);
    return `【触发器】本回合触发 ${triggered.length} 个:\n${parts.join('\n')}`;
  }
}

// ───────────────────────────────────────────────────────────
//  单例
// ───────────────────────────────────────────────────────────

export const triggerDispatcher = new TriggerDispatcher();

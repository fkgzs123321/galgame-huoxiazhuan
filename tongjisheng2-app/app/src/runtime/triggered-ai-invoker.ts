/**
 * Triggered AI Invoker · 触发型 AI 实际调用器(阶段3 步骤10)
 *
 * 职责:
 *  - 接收 TriggerDispatcher 的评估结果,对触发的 AI 执行实际 Gateway 调用
 *  - 区分降级场景:
 *      degradedToMainChat=true → 跳过(由主聊天AI 兼并,仅注入 extraContext)
 *      profileId 为触发型 AI 且端点已配置 → 实际调用
 *      profileId 为触发型 AI 但端点未配置 → 降级到 mock(返回占位叙事+空 ops)
 *  - 并行调用多个触发型 AI(invokeMany)
 *  - 从结果中提取 ops(<JSONPatch>)和 narrative(去标签后文本)
 *  - 生成调用链 Trace(8AI 调用链的一部分)
 *  - 失败容错:单个触发器失败不影响其他触发器和主流程
 *
 * 集成点:
 *  - App.tsx handleChatSend 在评估触发器后调用本 invoker
 *  - 返回的 triggerOps 合并到 CandidateChangeSet
 *  - 返回的 triggerNarrative 作为独立消息展示给玩家
 *  - 返回的 triggerEvaluations(含降级标记)注入主聊天AI 上下文(供其兼并)
 */

import type { AiProfile, AiProfileId } from '../ai/profiles';
import { findProfile } from '../ai/profiles';
import type { PresetProfile } from './preset/types';
import type { GatewayResult } from './model-gateway';
import { modelGateway } from './model-gateway';
import type { PromptAssembler, AssemblyContext } from './prompt-assembly';
import {
  triggerDispatcher,
  type TriggerEvaluation,
  type TriggerInvocation,
  type TriggerType,
} from './trigger-dispatcher';
import { traceBus } from './trace-bus';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

/** 触发器调用输入 */
export interface TriggerInvokerInput {
  /** TriggerDispatcher 评估结果(全部,包含未触发的) */
  evaluations: TriggerEvaluation[];
  /** 当前 stat_data 快照(供 Prompt 组装) */
  statData: Record<string, unknown>;
  /** 玩家动作文本 */
  userAction: string;
  /** 聊天历史 */
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** 玩家姓名 */
  userName: string;
  /** 当前女角姓名 */
  charName: string;
  /** Prompt 组装器实例 */
  promptAssembler: PromptAssembler;
  /** 默认预设(未绑定预设的触发型 AI 用此预设) */
  defaultPreset: PresetProfile;
  /** 已配置端点的 profile id 集合 */
  configuredProfileIds: Set<AiProfileId>;
  /** 各 AI Profile 绑定的预设(可选,缺省用 defaultPreset) */
  presetByProfile?: Partial<Record<AiProfileId, PresetProfile>>;
  /** 是否启用 mock 降级(无 API Key 时用 mock 叙事) */
  enableMockFallback?: boolean;
}

/** 单个触发器的调用结果 */
export interface TriggerCallResult {
  /** 触发类型 */
  type: TriggerType | null;
  /** 评估时的 profileId(可能为 null=未触发) */
  evaluatedProfileId: AiProfileId | null;
  /** 实际调用的 profile id(降级到 main-chat 时为 'main-chat') */
  actualProfileId: AiProfileId | null;
  /** 是否触发 */
  triggered: boolean;
  /** 是否降级到主聊天AI(不实际调用,由主聊天AI 兼并) */
  degradedToMainChat: boolean;
  /** 是否走 mock 降级(端点未配置) */
  mocked: boolean;
  /** 触发原因 */
  reason: string;
  /** Gateway 调用结果(mock 时为合成结果) */
  result: GatewayResult | null;
  /** 提取的 ops */
  ops: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
  /** 提取的叙事文本 */
  narrative: string;
  /** 注入主聊天AI 的额外上下文 */
  extraContext: string;
}

/** 触发器调用总结果 */
export interface TriggerInvokerResult {
  /** 每个评估的调用结果 */
  results: TriggerCallResult[];
  /** 实际执行的调用(非降级、非 mock) */
  invocations: TriggerInvocation[];
  /** 合并后的 ops(所有触发器 ops 合并) */
  triggerOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
  /** 合并后的叙事文本(各触发器叙事用分隔符连接) */
  triggerNarrative: string;
  /** 注入主聊天AI 的摘要上下文(降级触发器的 extraContext) */
  mainChatInjection: string;
  /** 调用链 Trace */
  traces: Array<{ step: string; detail: string; timestamp: number }>;
  /** 触发的 AI 数量(含降级) */
  triggeredCount: number;
  /** 实际调用的 AI 数量(不含降级、不含 mock) */
  invokedCount: number;
  /** mock 降级的 AI 数量 */
  mockedCount: number;
}

// ───────────────────────────────────────────────────────────
//  常量
// ───────────────────────────────────────────────────────────

/** mock 降级时各触发类型的叙事模板 */
const MOCK_NARRATIVE_TEMPLATES: Record<TriggerType, string> = {
  opening: '【开局AI · mock】生成开场叙事:玩家身份初始化场景(美佐子叫起床/搬家入宅/第一天早晨)。',
  'plot-evolution': '【剧情演化AI · mock】推进剧情线:关键 flag 触发,生成剧情过渡叙事。',
  combat: '【战斗结算AI · mock】生成战斗结算页:骰子判定+伤害计算+胜负裁定。',
  'h-scene': '【H场景结算AI · mock】生成H结算页:CG触发+身体状态变化+敏感度计算。',
  worldview: '【世界观AI · mock】生成世界观一致性审查报告:地理/时代/设定/法律/道德一致性检查。',
};

/** mock 降级时的占位 ops */
const MOCK_OPS: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [];

// ───────────────────────────────────────────────────────────
//  TriggeredAiInvoker 类
// ───────────────────────────────────────────────────────────

export class TriggeredAiInvoker {
  /**
   * 执行触发型 AI 调用
   *
   * 流程:
   *  1. 过滤出 triggered=true 的评估
   *  2. 分流:
   *     - degradedToMainChat=true → 跳过实际调用,extraContext 注入主聊天AI
   *     - profileId 为触发型 AI 且端点已配置 → 实际调用
   *     - profileId 为触发型 AI 但端点未配置 → mock 降级
   *  3. 并行调用所有需实际调用的触发型 AI
   *  4. 提取 ops 和 narrative
   *  5. 合并 triggerOps / triggerNarrative / mainChatInjection
   */
  async invoke(input: TriggerInvokerInput): Promise<TriggerInvokerResult> {
    const traces: Array<{ step: string; detail: string; timestamp: number }> = [];
    const startedAt = Date.now();

    traces.push({
      step: 'invoker-start',
      detail: `evaluations=${input.evaluations.length} configured=${Array.from(input.configuredProfileIds).join(',')}`,
      timestamp: startedAt,
    });

    // 1. 过滤出触发的评估
    const triggered = input.evaluations.filter((e) => e.triggered);
    if (triggered.length === 0) {
      traces.push({
        step: 'invoker-skip',
        detail: '无触发器命中',
        timestamp: Date.now(),
      });
      return {
        results: input.evaluations.map((e) => this.buildNonTriggeredResult(e)),
        invocations: [],
        triggerOps: [],
        triggerNarrative: '',
        mainChatInjection: '',
        traces,
        triggeredCount: 0,
        invokedCount: 0,
        mockedCount: 0,
      };
    }

    traces.push({
      step: 'triggered-list',
      detail: triggered.map((e) => `${e.type}:${e.profileId}${e.degradedToMainChat ? '(degraded)' : ''}`).join(', '),
      timestamp: Date.now(),
    });

    // 2. 分流:降级 / 实际调用 / mock
    const results: TriggerCallResult[] = [];
    const invokeQueue: Array<{ evaluation: TriggerEvaluation; profile: AiProfile; preset: PresetProfile }> = [];

    for (const evaluation of triggered) {
      // 降级到主聊天AI:不实际调用,但可选走 mock 降级以展示触发器叙事
      if (evaluation.degradedToMainChat) {
        // 降级时也检查是否需要 mock(用于展示触发器产生的叙事)
        if (input.enableMockFallback !== false && evaluation.profileId) {
          // 降级到 main-chat 的触发器:尝试用原 profileId 的模板生成 mock 叙事
          const originalProfile = findProfile(evaluation.profileId);
          if (originalProfile) {
            const mockResult = this.buildMockResult(originalProfile, evaluation);
            results.push({
              type: evaluation.type,
              evaluatedProfileId: evaluation.profileId,
              actualProfileId: evaluation.profileId,
              triggered: true,
              degradedToMainChat: true,
              mocked: true,
              reason: `${evaluation.reason} [降级到主聊天AI,mock 展示叙事]`,
              result: mockResult,
              ops: MOCK_OPS,
              narrative: MOCK_NARRATIVE_TEMPLATES[evaluation.type ?? 'worldview'],
              extraContext: evaluation.extraContext ?? '',
            });
            continue;
          }
        }
        // 不走 mock:纯降级,仅注入 extraContext
        results.push({
          type: evaluation.type,
          evaluatedProfileId: evaluation.profileId,
          actualProfileId: 'main-chat',
          triggered: true,
          degradedToMainChat: true,
          mocked: false,
          reason: evaluation.reason,
          result: null,
          ops: [],
          narrative: '',
          extraContext: evaluation.extraContext ?? '',
        });
        continue;
      }

      // 触发型 AI:检查端点是否配置
      const profileId = evaluation.profileId;
      if (!profileId) {
        results.push({
          type: evaluation.type,
          evaluatedProfileId: null,
          actualProfileId: null,
          triggered: true,
          degradedToMainChat: false,
          mocked: false,
          reason: 'profileId 为 null,跳过',
          result: null,
          ops: [],
          narrative: '',
          extraContext: '',
        });
        continue;
      }

      const profile = findProfile(profileId);
      if (!profile) {
        results.push({
          type: evaluation.type,
          evaluatedProfileId: profileId,
          actualProfileId: null,
          triggered: true,
          degradedToMainChat: false,
          mocked: false,
          reason: `Profile ${profileId} 未找到`,
          result: null,
          ops: [],
          narrative: '',
          extraContext: '',
        });
        continue;
      }

      // 检查端点配置
      const endpointConfigured = !!(
        profile.endpoint.baseURL &&
        profile.endpoint.apiKey &&
        profile.endpoint.model
      );

      if (!endpointConfigured) {
        // 端点未配置:走 mock 降级(可选)
        if (input.enableMockFallback !== false) {
          const mockResult = this.buildMockResult(profile, evaluation);
          results.push({
            type: evaluation.type,
            evaluatedProfileId: profileId,
            actualProfileId: profileId,
            triggered: true,
            degradedToMainChat: false,
            mocked: true,
            reason: `${evaluation.reason} [端点未配置,mock 降级]`,
            result: mockResult,
            ops: MOCK_OPS,
            narrative: MOCK_NARRATIVE_TEMPLATES[evaluation.type ?? 'worldview'],
            extraContext: evaluation.extraContext ?? '',
          });
        } else {
          // 不启用 mock:跳过
          results.push({
            type: evaluation.type,
            evaluatedProfileId: profileId,
            actualProfileId: null,
            triggered: true,
            degradedToMainChat: false,
            mocked: false,
            reason: `${evaluation.reason} [端点未配置,未启用 mock 降级,跳过]`,
            result: null,
            ops: [],
            narrative: '',
            extraContext: evaluation.extraContext ?? '',
          });
        }
        continue;
      }

      // 端点已配置:加入实际调用队列
      const preset = input.presetByProfile?.[profileId] ?? profile.endpoint.preset ?? input.defaultPreset;
      invokeQueue.push({ evaluation, profile, preset });
    }

    // 3. 并行调用所有需实际调用的触发型 AI
    const invocations: TriggerInvocation[] = [];

    if (invokeQueue.length > 0) {
      traces.push({
        step: 'invoke-queue',
        detail: `${invokeQueue.length} 个触发型 AI 待并行调用`,
        timestamp: Date.now(),
      });

      const invokeResults = await this.invokeTriggerProfilesParallel(invokeQueue, input, traces);

      for (const { evaluation, profile, result } of invokeResults) {
        const ops = triggerDispatcher.extractOpsFromResult(result);
        const narrative = triggerDispatcher.extractNarrativeFromResult(result);

        results.push({
          type: evaluation.type,
          evaluatedProfileId: profile.id,
          actualProfileId: profile.id,
          triggered: true,
          degradedToMainChat: false,
          mocked: false,
          reason: evaluation.reason,
          result,
          ops,
          narrative,
          extraContext: evaluation.extraContext ?? '',
        });

        invocations.push({
          type: evaluation.type ?? 'worldview',
          profileId: profile.id,
          result,
          degraded: false,
          reason: evaluation.reason,
          timestamp: Date.now(),
        });
      }
    }

    // 4. 合并结果
    const triggeredResults = results.filter((r) => r.triggered);
    const allOps = triggeredResults.flatMap((r) => r.ops);
    const narrativeParts = triggeredResults
      .filter((r) => r.narrative)
      .map((r) => `--- ${r.type} ---\n${r.narrative}`);
    const injectionParts = triggeredResults
      .filter((r) => r.degradedToMainChat && r.extraContext)
      .map((r) => r.extraContext);

    traces.push({
      step: 'invoker-end',
      detail: `triggered=${triggeredResults.length} invoked=${invocations.length} mocked=${triggeredResults.filter((r) => r.mocked).length}`,
      timestamp: Date.now(),
    });

    return {
      results,
      invocations,
      triggerOps: allOps,
      triggerNarrative: narrativeParts.join('\n\n'),
      mainChatInjection: injectionParts.join('\n'),
      traces,
      triggeredCount: triggeredResults.length,
      invokedCount: invocations.length,
      mockedCount: triggeredResults.filter((r) => r.mocked).length,
    };
  }

  /**
   * 并行调用多个触发型 AI Profile
   *
   * 阶段4:升级为 invokeManyWithBudget,带并发限制+总预算+性能指标
   */
  private async invokeTriggerProfilesParallel(
    queue: Array<{ evaluation: TriggerEvaluation; profile: AiProfile; preset: PresetProfile }>,
    input: TriggerInvokerInput,
    traces: Array<{ step: string; detail: string; timestamp: number }>,
  ): Promise<Array<{ evaluation: TriggerEvaluation; profile: AiProfile; result: GatewayResult }>> {
    const assemblyCtx: AssemblyContext = {
      userName: input.userName,
      charName: input.charName,
      userAction: input.userAction,
      chatHistory: input.chatHistory,
      memorySummary: '',
      skipEjs: false,
    };

    // 为每个触发型 AI 组装 Prompt
    const requests: Array<{
      evaluation: TriggerEvaluation;
      profile: AiProfile;
      req: import('./model-gateway').GatewayRequest;
    }> = [];

    for (const { evaluation, profile, preset } of queue) {
      try {
        const assembly = await input.promptAssembler.assemble(profile, preset, assemblyCtx);
        requests.push({
          evaluation,
          profile,
          req: {
            profile,
            preset,
            messages: assembly.messages,
            requestId: `trigger-${profile.id}-${Date.now()}`,
          },
        });
      } catch (e) {
        traces.push({
          step: `assemble-fail-${profile.id}`,
          detail: `Prompt 组装失败: ${e instanceof Error ? e.message : String(e)}`,
          timestamp: Date.now(),
        });
      }
    }

    if (requests.length === 0) {
      return [];
    }

    // 阶段4:使用带预算的并行调用
    const invokeManyInput = requests.map(({ req }) => ({ req, onStream: undefined }));
    const { results: resultsById, metrics } = await modelGateway.invokeManyWithBudget(invokeManyInput, {
      maxConcurrency: 4,
      totalBudgetMs: 15000,
    });

    // 推送性能指标到 traceBus
    try {
      const firstTurnId = requests[0]?.req.turnId;
      if (firstTurnId) {
        traceBus.append(
          firstTurnId,
          'gatewayLatency',
          'parallel-budget-metrics',
          `8AI 并行完成: 成功=${metrics.succeeded}/${metrics.totalRequests} p50=${metrics.p50Ms}ms p95=${metrics.p95Ms}ms max=${metrics.maxMs}ms 总=${metrics.totalElapsedMs}ms 预算内=${metrics.withinBudget}`,
          {
            metrics,
            profileIds: requests.map((r) => r.profile.id),
          },
        );
      }
    } catch {
      // traceBus 失败不影响主流程
    }

    traces.push({
      step: 'parallel-metrics',
      detail: `8AI 并行: 成功=${metrics.succeeded}/${metrics.totalRequests} p50=${metrics.p50Ms}ms p95=${metrics.p95Ms}ms max=${metrics.maxMs}ms 总=${metrics.totalElapsedMs}ms 超时=${metrics.timedOut} 中止=${metrics.aborted} 预算内=${metrics.withinBudget}`,
      timestamp: Date.now(),
    });

    // 按 profileId 匹配结果
    return requests.map(({ evaluation, profile }) => {
      const result = resultsById[profile.id] ?? this.buildFailResult(profile, 'invokeManyWithBudget 未返回结果');
      return { evaluation, profile, result };
    });
  }

  /**
   * 构建 mock 降级结果
   */
  private buildMockResult(profile: AiProfile, evaluation: TriggerEvaluation): GatewayResult {
    const now = Date.now();
    return {
      ok: true,
      text: `[mock] ${MOCK_NARRATIVE_TEMPLATES[evaluation.type ?? 'worldview']}`,
      finishReason: 'stop',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      trace: [
        {
          step: 'mock-invoke',
          detail: `profile=${profile.id} type=${evaluation.type} (端点未配置,mock 降级)`,
          timestamp: now,
        },
      ],
      elapsedMs: 0,
      retryCount: 0,
      requestId: `mock-${profile.id}-${now}`,
    };
  }

  /**
   * 构建失败结果
   */
  private buildFailResult(profile: AiProfile, error: string): GatewayResult {
    const now = Date.now();
    return {
      ok: false,
      text: '',
      trace: [
        {
          step: 'invoke-fail',
          detail: `profile=${profile.id} error=${error}`,
          timestamp: now,
        },
      ],
      error,
      elapsedMs: 0,
      retryCount: 0,
      requestId: `fail-${profile.id}-${now}`,
    };
  }

  /**
   * 构建未触发的评估结果
   */
  private buildNonTriggeredResult(evaluation: TriggerEvaluation): TriggerCallResult {
    return {
      type: evaluation.type,
      evaluatedProfileId: evaluation.profileId,
      actualProfileId: null,
      triggered: false,
      degradedToMainChat: false,
      mocked: false,
      reason: evaluation.reason,
      result: null,
      ops: [],
      narrative: '',
      extraContext: '',
    };
  }
}

// ───────────────────────────────────────────────────────────
//  单例
// ───────────────────────────────────────────────────────────

export const triggeredAiInvoker = new TriggeredAiInvoker();

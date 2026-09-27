/**
 * RuntimeTraceBus · 运行时 Trace 总线(阶段4 调试工具)
 *
 * 职责:
 *  - 全局单例,收集运行时各类 trace(aiCall/getwiLoad/variableUpdate/worldbookHit/presetApply/gatewayLatency/promptAsm)
 *  - 按回合(turnId)分组,支持查询最近 N 个回合
 *  - 支持订阅(实时推送给 UI,变量监视器/Trace 查看器)
 *  - 内存环形缓冲(默认保留最近 50 回合,超出自动丢弃最旧)
 *  - 不修改 Kernel 状态,只读采集
 *
 * 使用方式:
 *   import { traceBus } from './trace-bus';
 *   traceBus.startTurn(turnId, { userAction, dayCount, timeSlot });
 *   traceBus.append(turnId, 'aiCall', 'main-ai-call', `主聊天AI 调用,model=${model}`);
 *   traceBus.endTurn(turnId, { ok, elapsedMs });
 *   const recent = traceBus.recentTurns(10);
 *
 * 集成点:
 *  - Kernel.startTurn → traceBus.startTurn
 *  - Kernel.finalizeStream → traceBus.append('aiCall', ...)
 *  - Kernel.commit → traceBus.append('variableUpdate', ...) + traceBus.endTurn
 *  - PromptAssembler.assemble → traceBus.append('promptAsm', ...)
 *  - ModelGateway.invoke → traceBus.append('gatewayLatency', ...)
 *  - getwi-loader → traceBus.append('getwiLoad', ...)
 *  - worldbook-selector → traceBus.append('worldbookHit', ...)
 *  - preset/importer → traceBus.append('presetApply', ...)
 */

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

/** Trace 类别 */
export type RuntimeTraceCategory =
  | 'aiCall' // AI 调用(2AI + 6触发型)
  | 'getwiLoad' // getwi 条目加载
  | 'variableUpdate' // 变量变更(JSONPatch before/after)
  | 'worldbookHit' // 世界书命中
  | 'presetApply' // 预设应用
  | 'gatewayLatency' // 网关延迟
  | 'promptAsm' // Prompt 组装
  | 'kernel' // Kernel 四态流转
  | 'npc'; // NPC 自然行动

/** 单条 Trace */
export interface RuntimeTraceEntry {
  /** 类别 */
  category: RuntimeTraceCategory;
  /** 步骤名 */
  step: string;
  /** 详情 */
  detail: string;
  /** 时间戳 */
  timestamp: number;
  /** 关联数据(可选,便于 UI 展开详情) */
  data?: unknown;
}

/** 回合 Trace 上下文 */
export interface TurnTraceContext {
  /** 玩家动作 */
  userAction: string;
  /** 当前日数 */
  dayCount?: number;
  /** 当前时段 */
  timeSlot?: string;
  /** 当前角色 */
  heroineName?: string;
}

/** 回合 Trace 汇总 */
export interface TurnTrace {
  /** 回合 ID */
  turnId: string;
  /** 开始时间戳 */
  startedAt: number;
  /** 结束时间戳(若已结束) */
  endedAt?: number;
  /** 上下文 */
  context: TurnTraceContext;
  /** 是否已完成 */
  done: boolean;
  /** 是否成功 */
  ok?: boolean;
  /** 耗时(ms) */
  elapsedMs?: number;
  /** Trace 条目(按时间顺序) */
  entries: RuntimeTraceEntry[];
}

/** 订阅回调 */
type TraceSubscriber = (event: TraceBusEvent) => void;

/** 总线事件(推送给订阅者) */
export type TraceBusEvent =
  | { type: 'turn-start'; turn: TurnTrace }
  | { type: 'turn-end'; turn: TurnTrace }
  | { type: 'entry-appended'; turnId: string; entry: RuntimeTraceEntry }
  | { type: 'cleared' };

// ───────────────────────────────────────────────────────────
//  TraceBus 单例
// ───────────────────────────────────────────────────────────

const MAX_TURNS = 50; // 环形缓冲容量

class TraceBus {
  private turns = new Map<string, TurnTrace>();
  private turnOrder: string[] = []; // 按开始顺序排列的 turnId
  private subscribers = new Set<TraceSubscriber>();
  private paused = false;

  /** 暂停收集(调试工具中可手动暂停) */
  pause(): void {
    this.paused = true;
  }

  /** 恢复收集 */
  resume(): void {
    this.paused = false;
  }

  /** 是否暂停 */
  isPaused(): boolean {
    return this.paused;
  }

  /** 开始新回合 */
  startTurn(turnId: string, context: TurnTraceContext): TurnTrace {
    const turn: TurnTrace = {
      turnId,
      startedAt: Date.now(),
      context,
      done: false,
      entries: [],
    };
    this.turns.set(turnId, turn);
    this.turnOrder.push(turnId);
    this.evictIfNeeded();
    this.emit({ type: 'turn-start', turn });
    return turn;
  }

  /** 追加 trace 条目到指定回合 */
  append(
    turnId: string,
    category: RuntimeTraceCategory,
    step: string,
    detail: string,
    data?: unknown,
  ): void {
    if (this.paused) return;
    const turn = this.turns.get(turnId);
    if (!turn) {
      // 回合不存在(可能被淘汰),丢弃
      return;
    }
    const entry: RuntimeTraceEntry = {
      category,
      step,
      detail,
      timestamp: Date.now(),
      data,
    };
    turn.entries.push(entry);
    this.emit({ type: 'entry-appended', turnId, entry });
  }

  /** 结束回合 */
  endTurn(turnId: string, result: { ok: boolean; elapsedMs?: number }): void {
    const turn = this.turns.get(turnId);
    if (!turn) return;
    turn.done = true;
    turn.ok = result.ok;
    turn.endedAt = Date.now();
    turn.elapsedMs = result.elapsedMs ?? (turn.endedAt - turn.startedAt);
    this.emit({ type: 'turn-end', turn });
  }

  /** 获取指定回合 */
  getTurn(turnId: string): TurnTrace | undefined {
    return this.turns.get(turnId);
  }

  /** 最近 N 个回合(按开始时间降序) */
  recentTurns(limit = 20): TurnTrace[] {
    return this.turnOrder
      .slice(-limit)
      .reverse()
      .map((id) => this.turns.get(id))
      .filter((t): t is TurnTrace => !!t);
  }

  /** 当前回合(最近开始的,可能未完成) */
  currentTurn(): TurnTrace | undefined {
    if (this.turnOrder.length === 0) return undefined;
    const lastId = this.turnOrder[this.turnOrder.length - 1];
    return this.turns.get(lastId);
  }

  /** 全部回合(按开始时间升序) */
  allTurns(): TurnTrace[] {
    return this.turnOrder
      .map((id) => this.turns.get(id))
      .filter((t): t is TurnTrace => !!t);
  }

  /** 按类别过滤所有 trace(跨回合) */
  byCategory(category: RuntimeTraceCategory, limit = 100): RuntimeTraceEntry[] {
    const out: RuntimeTraceEntry[] = [];
    for (let i = this.turnOrder.length - 1; i >= 0 && out.length < limit; i--) {
      const turn = this.turns.get(this.turnOrder[i]);
      if (!turn) continue;
      for (let j = turn.entries.length - 1; j >= 0 && out.length < limit; j--) {
        if (turn.entries[j].category === category) {
          out.push(turn.entries[j]);
        }
      }
    }
    return out;
  }

  /** 统计:各类别条目数 + 平均回合耗时 */
  stats(): {
    totalTurns: number;
    completedTurns: number;
    categoryCounts: Record<RuntimeTraceCategory, number>;
    avgTurnMs: number;
    maxTurnMs: number;
  } {
    const categoryCounts: Record<RuntimeTraceCategory, number> = {
      aiCall: 0,
      getwiLoad: 0,
      variableUpdate: 0,
      worldbookHit: 0,
      presetApply: 0,
      gatewayLatency: 0,
      promptAsm: 0,
      kernel: 0,
      npc: 0,
    };
    let completed = 0;
    let totalMs = 0;
    let maxMs = 0;
    for (const turn of this.turns.values()) {
      for (const e of turn.entries) {
        categoryCounts[e.category]++;
      }
      if (turn.done) {
        completed++;
        const ms = turn.elapsedMs ?? 0;
        totalMs += ms;
        if (ms > maxMs) maxMs = ms;
      }
    }
    return {
      totalTurns: this.turns.size,
      completedTurns: completed,
      categoryCounts,
      avgTurnMs: completed > 0 ? Math.round(totalMs / completed) : 0,
      maxTurnMs: maxMs,
    };
  }

  /** 订阅事件 */
  subscribe(fn: TraceSubscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  /** 清空所有 trace */
  clear(): void {
    this.turns.clear();
    this.turnOrder = [];
    this.emit({ type: 'cleared' });
  }

  /** 导出为 JSON(用于保存/分享) */
  exportJSON(): string {
    return JSON.stringify(
      {
        exportedAt: Date.now(),
        turns: this.allTurns(),
        stats: this.stats(),
      },
      null,
      2,
    );
  }

  // ─────────────────────────────────────────────────────────
  //  内部
  // ─────────────────────────────────────────────────────────

  private evictIfNeeded(): void {
    while (this.turnOrder.length > MAX_TURNS) {
      const oldest = this.turnOrder.shift();
      if (oldest) this.turns.delete(oldest);
    }
  }

  private emit(event: TraceBusEvent): void {
    for (const sub of this.subscribers) {
      try {
        sub(event);
      } catch (e) {
        console.error('[traceBus] subscriber error', e);
      }
    }
  }
}

// 单例
export const traceBus = new TraceBus();

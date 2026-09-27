/**
 * Turn Kernel(步骤5:回合内核 + 四态事务)
 *
 * 职责:
 *  - Command 入口:接收玩家动作,启动一个回合
 *  - base revision 读取:从 IndexedDB 恢复 stat_data + chatSheets 快照
 *  - 回合前置校验:身份校验(未选择→开局AI触发)/时间锁/行动次数/疲劳/死结局检查
 *  - 四态事务流转:
 *      StreamDraft(流式未解析)
 *      → RawModelResponse(解析完成)
 *      → CandidateChangeSet(2AI候选聚合)
 *      → CommittedFacts(Zod校验+裁定后提交)
 *  - 候选裁定:变量AI数值优先于主聊天AI叙事数值;NPC视角AI补充不覆盖(阶段3)
 *  - IndexedDB CAS 原子提交:新 revision + chatSheets 更新 + 历史追加
 *  - 失败语义:模型失败保留 StreamDraft;解析失败不污染状态;Zod失败部分提交
 *
 * 不做:
 *  - 实际模型调用(由步骤6 Model Gateway 提供,Kernel 只接收结果)
 *  - LCG 骰子判定(阶段2)
 *  - 8AI 并行(阶段1只 2AI:主聊天AI + 变量AI)
 *  - NPC 自然行动(阶段2)
 */

import { MvuRuntime, type PatchOp } from './mvu-runtime';
import { schemaRegistry } from './schema-loader';
import { MvuTransaction, parseAiOutput, type ParsedAiOutput, type TransactionResult } from './mvu-transaction';
import { npcActionRunner, type NpcActionResult } from './npc/action-runner';
import { scheduleEngine } from './npc/schedule-engine';
import { HEROINE_NAME_TO_ID } from '../content/npc/schedule-data';
import type { TimeSlot, Region } from '../content/npc/schedule-data';
import * as idb from '../db/indexeddb';
import { triggerDispatcher } from './trigger-dispatcher';
import { traceBus } from './trace-bus';
import { executeSqlStatements } from './sql-executor';

// ───────────────────────────────────────────────────────────
//  四态事务类型
// ───────────────────────────────────────────────────────────

/**
 * 状态 1: StreamDraft(流式未解析)
 *  - 玩家输入动作后,Kernel 启动回合,进入此态
 *  - 主聊天AI 流式输出未完成 / 变量AI 未返回时停留
 *  - 模型失败时保留此态,玩家可重试
 */
export interface StreamDraft {
  /** 回合 ID(用于 trace) */
  turnId: string;
  /** 玩家动作文本 */
  userAction: string;
  /** 回合开始时间戳 */
  startedAt: number;
  /** base revision hash(本回合基于哪个 revision) */
  baseRevisionHash: string | null;
  /** base stat_data 快照(深拷贝,本回合的"事实基础") */
  baseStatData: Record<string, unknown>;
  /** 主聊天AI 流式累计文本(未解析) */
  mainAiPartial: string;
  /** 变量AI 输出文本(变量AI 通常非流式,完成后整体填入) */
  varAiText: string;
  /** 是否主聊天AI 已完成 */
  mainAiDone: boolean;
  /** 是否变量AI 已完成 */
  varAiDone: boolean;
  /** 错误信息(若有) */
  errors: string[];
  /** NPC 自然行动结果(阶段2,每回合开始时生成) */
  npcAction?: NpcActionResult;
}

/**
 * 状态 2: RawModelResponse(解析完成)
 *  - 两个AI 都返回完整文本后,进入此态
 *  - 把原始文本解析为结构化 ParsedAiOutput
 *  - 提取主聊天AI 的叙事正文(去掉 <UpdateVariable>/<UpdateTable> 等标签)
 */
export interface RawModelResponse {
  turnId: string;
  userAction: string;
  startedAt: number;
  baseRevisionHash: string | null;
  baseStatData: Record<string, unknown>;
  /** 主聊天AI 原始文本 */
  mainAiRawText: string;
  /** 变量AI 原始文本 */
  varAiRawText: string;
  /** 变量AI 解析后的结构化输出 */
  varAiParsed: ParsedAiOutput;
  /** 主聊天AI 叙事正文(去掉标签后的可见文本) */
  mainAiNarrative: string;
  /** 主聊天AI 解析后的结构化输出(阶段1通常为空,主聊天AI 不输出变量变更) */
  mainAiParsed: ParsedAiOutput;
  /** 解析错误(若有,不阻塞但记 trace) */
  parseErrors: string[];
  /** NPC 自然行动结果(从 StreamDraft 透传) */
  npcAction?: NpcActionResult;
}

/**
 * 状态 3: CandidateChangeSet(2AI 候选聚合)
 *  - 把 2AI 的输出聚合为候选变更集
 *  - 主聊天AI 的叙事正文(可见文本,不参与变量裁定)
 *  - 变量AI 的 JSONPatch ops(主要变量变更源)
 *  - 主聊天AI 的 JSONPatch ops(若主聊天AI 也输出了变量变更,作为次要候选)
 *  - chatSheets 更新(变量AI 的 <UpdateTable> SQL)
 *
 * 阶段1 假设:主聊天AI 不输出 <UpdateVariable>(只输出叙事正文 + <StatusPlaceHolderImpl/>)
 *            变量AI 不输出叙事正文(只输出 <UpdateVariable>)
 *            因此候选聚合简化为:变量AI 的 ops + chatSheets SQL
 */
export interface CandidateChangeSet {
  turnId: string;
  /** 玩家动作文本(从 RawModelResponse 透传) */
  userAction: string;
  /** 主聊天AI 叙事正文(可见文本) */
  narrative: string;
  /** 主聊天AI 解析出的 ops(若主聊天AI 也输出了变量变更;阶段1通常为空) */
  mainAiOps: ParsedAiOutput;
  /** 变量AI 解析出的 ops(主要变量变更源) */
  varAiOps: ParsedAiOutput;
  /** chatSheets SQL 语句(来自变量AI <UpdateTable>) */
  chatSheetsSql: string[];
  /** 候选聚合 trace(每个候选的来源/优先级) */
  candidateTrace: CandidateTrace[];
  /** NPC 自然行动摘要(注入主聊天AI上下文) */
  npcActionSummary: string;
  /** NPC 状态变更 ops(合并到变量变更) */
  npcStateOps: Array<{ op: 'replace' | 'add'; path: string; value: unknown }>;
  /** NPC 剧情触发结果 */
  npcPlotTriggers: Array<{ heroineName: string; event: string; type: string }>;
}

/** 单个候选 trace */
export interface CandidateTrace {
  source: 'main-ai' | 'var-ai' | 'npc-ai' | 'plot-ai' | 'worldview-ai';
  field?: string;
  priority: number; // 1=最高(变量AI 数值),2=次(主聊天AI 叙事数值),3=补充(NPC视角AI)
  decision: 'accept' | 'reject' | 'merge' | 'defer';
  reason: string;
}

/**
 * 状态 4: CommittedFacts(Zod校验+裁定后提交)
 *  - 经过裁定后的最终变更集
 *  - 已应用到 MvuRuntime
 *  - 已写入 IndexedDB(新 revision + chatSheets + 历史)
 *  - 包含 before/after 快照供 UI 展示
 */
export interface CommittedFacts {
  turnId: string;
  /** 是否提交成功(部分提交也算成功) */
  ok: boolean;
  /** 应用前的 stat_data 快照 */
  before: Record<string, unknown>;
  /** 应用后的 stat_data 快照(经 Zod transform) */
  after: Record<string, unknown>;
  /** MVU 事务结果(每个 op 的校验详情) */
  txResult: TransactionResult;
  /** 主聊天AI 叙事正文(可见文本) */
  narrative: string;
  /** 新创建的 revision hash */
  newRevisionHash: string;
  /** 新 revision 的 scope */
  revisionScope: 'chat' | 'save' | 'auto';
  /** 候选裁定 trace */
  arbitrationTrace: CandidateTrace[];
  /** 回合耗时(ms) */
  elapsedMs: number;
  /** 错误列表(若有,不阻塞但记 trace) */
  errors: string[];
  /** NPC 自然行动摘要(阶段2) */
  npcActionSummary?: string;
  /** NPC 剧情触发结果(阶段2) */
  npcPlotTriggers?: Array<{ heroineName: string; event: string; type: string }>;
}

// ───────────────────────────────────────────────────────────
//  Command 入口类型
// ───────────────────────────────────────────────────────────

/** 玩家动作命令 */
export interface TurnCommand {
  /** 玩家输入的动作文本 */
  action: string;
  /** 回合类型(默认 normal;opening=开局AI触发) */
  type?: 'normal' | 'opening' | 'event';
  /** 是否强制跳过前置校验(调试用) */
  skipPreChecks?: boolean;
}

/** 前置校验结果 */
export interface PreCheckResult {
  ok: boolean;
  /** 是否触发开局AI(身份未选择时) */
  triggerOpening: boolean;
  /** 死结局触发(若有) */
  deathEnding?: {
    type: 'hunger' | 'thirst' | 'mood' | 'crime' | 'jealousy';
    reason: string;
  };
  /** 警告(不阻塞,但记 trace) */
  warnings: string[];
  /** 错误(阻塞) */
  errors: string[];
}

// ───────────────────────────────────────────────────────────
//  常量:回合参数
// ───────────────────────────────────────────────────────────

/** 每轮时间增量(分钟) */
const TIME_INCREMENT_MINUTES = 30;

/** 单日最大行动次数(防滥用) */
const MAX_ACTIONS_PER_DAY = 48; // 24h × 2(每30min一次)

/** 疲劳阈值(超过则警告) */
const FATIGUE_WARN_THRESHOLD = 80;
const FATIGUE_BLOCK_THRESHOLD = 100;

/** 死结局阈值 */
const DEATH_HUNGER = 100; // 饥饿满
const DEATH_THIRST = 100; // 口渴满
const DEATH_MOOD = 0; // 心情为0
const DEATH_CRIME = 3; // 违法计数3
const DEATH_JEALOUSY = 100; // 嫉妒值100

/** 当前 revision 指针的 KV key */
const CURRENT_REVISION_KEY = '__current_revision__';

// ───────────────────────────────────────────────────────────
//  Kernel 类
// ───────────────────────────────────────────────────────────

/**
 * 回合内核
 *
 * 用法:
 *   const kernel = new Kernel();
 *   await kernel.init(); // 从 IndexedDB 恢复当前 revision
 *   const draft = await kernel.startTurn({ action: '起床去客厅找美佐子' });
 *   // ... 调用 Model Gateway 获取 2AI 输出 ...
 *   const raw = kernel.finalizeStream(draft, mainAiText, varAiText);
 *   const candidate = kernel.aggregate(raw);
 *   const facts = await kernel.commit(candidate);
 *   if (facts.ok) { console.log('回合完成', facts.after); }
 */
export class Kernel {
  /** MVU 运行时(本回合的工作副本) */
  private mvu: MvuRuntime;
  /** MVU 事务应用器 */
  private tx: MvuTransaction;
  /** 当前 revision hash */
  private currentRevisionHash: string | null = null;
  /** 是否已初始化 */
  private initialized = false;
  /** 当前回合计数(防滥用) */
  private turnCount = 0;
  /** 今日行动次数 */
  private actionsToday = 0;
  /** 今日日期(用于跨日重置 actionsToday) */
  private lastActionDay: number = 1;
  /** 上一回合的 flag 快照(用于触发器检测 flag 变化) */
  private previousFlagsSnapshot: Record<string, unknown> | null = null;
  /** 已配置的 AI 端点 id 集合(由 App.tsx 注入,用于触发器降级判断) */
  private configuredProfileIds: Set<import('../ai/profiles').AiProfileId> = new Set();

  constructor() {
    // 初始化空 MVU,init() 时从 IndexedDB 恢复
    this.mvu = new MvuRuntime({});
    this.tx = new MvuTransaction(this.mvu);
  }

  /**
   * 注入已配置的 AI 端点 id 集合(阶段3 步骤1)
   * 由 App.tsx 在 ConfigPage 保存后调用,用于触发器降级判断
   */
  setConfiguredProfiles(ids: Array<import('../ai/profiles').AiProfileId>): void {
    this.configuredProfileIds = new Set(ids);
  }

  /** 初始化:从 IndexedDB 恢复当前 revision */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // 读取当前 revision 指针
    const ptr = await idb.kvGet<string>(CURRENT_REVISION_KEY);
    if (ptr) {
      await this.loadFromRevision(ptr);
    } else {
      // 无存档,用 initvar.yaml 的种子初始化(由 contentLoader 已加载,此处简化为空对象)
      // 实际初始化由步骤7 IdentitySelect 完成后写入
      this.mvu.replace({});
    }
  }

  /**
   * 从指定 revision 恢复 Kernel 状态(步骤8 Save-Recovery)
   *  - 替换 MVU stat_data
   *  - 恢复 actionsToday/lastActionDay/turnCount
   *  - 更新 currentRevisionHash 与 KV 指针
   *  - 用于:加载存档/重开恢复/分支切换
   *  - 返回 false 表示 revision 不存在或内容无效
   */
  async loadFromRevision(hash: string): Promise<boolean> {
    const rev = await idb.getRevision(hash);
    if (!rev || !rev.content || typeof rev.content !== 'object') {
      return false;
    }
    const content = rev.content as {
      statData?: Record<string, unknown>;
      actionsToday?: number;
      lastActionDay?: number;
      turnCount?: number;
    };
    if (content.statData && typeof content.statData === 'object') {
      this.mvu.replace(content.statData);
    }
    if (typeof content.actionsToday === 'number') this.actionsToday = content.actionsToday;
    if (typeof content.lastActionDay === 'number') this.lastActionDay = content.lastActionDay;
    if (typeof content.turnCount === 'number') this.turnCount = content.turnCount;
    this.currentRevisionHash = rev.hash;
    this.initialized = true;
    await idb.kvSet(CURRENT_REVISION_KEY, rev.hash);
    return true;
  }

  /**
   * 获取当前 revision 信息(步骤8 UI 展示用)
   *  - 不存在时返回 null
   */
  async getCurrentRevisionInfo(): Promise<{
    hash: string;
    parentHash: string | null;
    ts: number;
    scope: 'save' | 'chat' | 'auto' | 'branch';
    label?: string;
    turnCount: number;
    actionsToday: number;
    lastActionDay: number;
    statDataKeys: string[];
  } | null> {
    if (!this.currentRevisionHash) return null;
    const rev = await idb.getRevision(this.currentRevisionHash);
    if (!rev) return null;
    const content = (rev.content ?? {}) as {
      statData?: Record<string, unknown>;
      actionsToday?: number;
      lastActionDay?: number;
      turnCount?: number;
    };
    return {
      hash: rev.hash,
      parentHash: rev.parentHash,
      ts: rev.ts,
      scope: rev.scope,
      label: rev.label,
      turnCount: typeof content.turnCount === 'number' ? content.turnCount : this.turnCount,
      actionsToday: typeof content.actionsToday === 'number' ? content.actionsToday : this.actionsToday,
      lastActionDay: typeof content.lastActionDay === 'number' ? content.lastActionDay : this.lastActionDay,
      statDataKeys: content.statData && typeof content.statData === 'object'
        ? Object.keys(content.statData)
        : [],
    };
  }

  /** 获取当前 stat_data 快照(只读) */
  getStatData(): Record<string, unknown> {
    return this.mvu.snapshot();
  }

  /** 获取当前 revision hash */
  getCurrentRevisionHash(): string | null {
    return this.currentRevisionHash;
  }

  /** 获取 MVU 运行时(供 EJS 渲染等场景使用) */
  getMvuRuntime(): MvuRuntime {
    return this.mvu;
  }

  /** 获取当前回合计数(步骤8 UI/Save-Cas 用) */
  getTurnCount(): number {
    return this.turnCount;
  }

  /** 获取今日行动次数(步骤8 UI/Save-Cas 用) */
  getActionsToday(): number {
    return this.actionsToday;
  }

  /**
   * 应用开局身份选择(步骤7 → 引擎同步)
   *  - 替换 MVU stat_data(含身份属性)
   *  - 立即持久化为新 revision,避免与后续 commit 冲突
   *  - 返回新 revision hash
   */
  async applyOpeningIdentity(sd: Record<string, unknown>): Promise<string> {
    this.mvu.replace(sd);
    this.initialized = true;
    const revisionContent = {
      statData: sd,
      userAction: '__identity_select__',
      actionsToday: this.actionsToday,
      lastActionDay: this.lastActionDay,
      turnCount: this.turnCount,
      txResult: { ok: true, appliedCount: 0, rejectedCount: 0 },
    };
    const rev = await idb.createRevision({
      content: revisionContent,
      parentHash: this.currentRevisionHash,
      scope: 'chat',
      label: `identity-${Date.now()}`,
    });
    this.currentRevisionHash = rev.hash;
    await idb.kvSet(CURRENT_REVISION_KEY, rev.hash);
    return rev.hash;
  }

  /** 获取最近行动日(游戏内天数,步骤8 UI/Save-Cas 用) */
  getLastActionDay(): number {
    return this.lastActionDay;
  }

  // ─────────────────────────────────────────────────────────
  //  前置校验
  // ─────────────────────────────────────────────────────────

  /**
   * 回合前置校验
   *  - 身份校验:未选择 → 触发开局AI
   *  - 死结局检查:饥饿/口渴/心情/违法/嫉妒
   *  - 行动次数检查:超过单日上限 → 阻塞
   *  - 疲劳检查:超过阈值 → 警告(不阻塞)
   *  - 时间锁:跨日时重置 actionsToday
   */
  preCheck(cmd: TurnCommand): PreCheckResult {
    const result: PreCheckResult = {
      ok: true,
      triggerOpening: false,
      warnings: [],
      errors: [],
    };

    if (cmd.skipPreChecks) return result;

    const sd = this.mvu.snapshot();

    // 1. 身份校验
    const identity = sd.主角 as { 玩家身份?: string } | undefined;
    if (!identity || identity.玩家身份 === '未选择' || !identity.玩家身份) {
      result.triggerOpening = true;
      result.warnings.push('玩家身份未选择,触发开局AI');
      // 身份未选择不阻塞,允许开局AI 流程
      return result;
    }

    // 2. 跨日重置 actionsToday
    const time = sd.时间 as { 天数?: number } | undefined;
    const currentDay = typeof time?.天数 === 'number' ? time.天数 : 1;
    if (currentDay !== this.lastActionDay) {
      this.actionsToday = 0;
      this.lastActionDay = currentDay;
    }

    // 3. 行动次数检查
    if (this.actionsToday >= MAX_ACTIONS_PER_DAY) {
      result.ok = false;
      result.errors.push(`今日行动次数已达上限(${MAX_ACTIONS_PER_DAY}次),请休息或次日再行动`);
    }

    // 4. 疲劳检查(警告,不阻塞)
    const fatigue = (sd.主角 as { 疲劳?: number } | undefined)?.疲劳;
    if (typeof fatigue === 'number') {
      if (fatigue >= FATIGUE_BLOCK_THRESHOLD) {
        result.ok = false;
        result.errors.push(`疲劳值过高(${fatigue}/${FATIGUE_BLOCK_THRESHOLD}),无法行动,需休息`);
      } else if (fatigue >= FATIGUE_WARN_THRESHOLD) {
        result.warnings.push(`疲劳值较高(${fatigue}/${FATIGUE_WARN_THRESHOLD}),建议休息`);
      }
    }

    // 5. 死结局检查
    const death = this.checkDeathEnding(sd);
    if (death) {
      result.ok = false;
      result.deathEnding = death;
      result.errors.push(`死结局触发: ${death.reason}`);
    }

    return result;
  }

  /** 死结局检查:饥饿/口渴/心情/违法/嫉妒 */
  private checkDeathEnding(sd: Record<string, unknown>): PreCheckResult['deathEnding'] | undefined {
    const protagonist = sd.主角 as Record<string, unknown> | undefined;
    if (!protagonist) return undefined;

    const hunger = typeof protagonist.饥饿 === 'number' ? protagonist.饥饿 : 0;
    const thirst = typeof protagonist.口渴 === 'number' ? protagonist.口渴 : 0;
    const mood = typeof protagonist.心情 === 'number' ? protagonist.心情 : 100;
    const crime = typeof protagonist.违法计数 === 'number' ? protagonist.违法计数 : 0;
    const jealousy = typeof (sd.当前女角 as { 嫉妒值?: number } | undefined)?.嫉妒值 === 'number'
      ? (sd.当前女角 as { 嫉妒值: number }).嫉妒值
      : 0;

    if (hunger >= DEATH_HUNGER) {
      return { type: 'hunger', reason: `饥饿值达到 ${hunger},主角饿死` };
    }
    if (thirst >= DEATH_THIRST) {
      return { type: 'thirst', reason: `口渴值达到 ${thirst},主角脱水` };
    }
    if (mood <= DEATH_MOOD) {
      return { type: 'mood', reason: `心情值降至 ${mood},主角精神崩溃` };
    }
    if (crime >= DEATH_CRIME) {
      return { type: 'crime', reason: `违法计数达到 ${crime},主角被逮捕` };
    }
    if (jealousy >= DEATH_JEALOUSY) {
      return { type: 'jealousy', reason: `当前女角嫉妒值达到 ${jealousy},触发嫉妒死结局` };
    }
    return undefined;
  }

  // ─────────────────────────────────────────────────────────
  //  四态事务流转
  // ─────────────────────────────────────────────────────────

  /**
   * 启动回合 → StreamDraft
   *  - 读取 base revision
   *  - 执行前置校验
   *  - 时间锁:每轮 +30 分钟(由变量AI 决定是否真的推进,此处只准备提示)
   *  - 返回 StreamDraft,等待 Model Gateway 填入 AI 输出
   */
  async startTurn(cmd: TurnCommand): Promise<StreamDraft> {
    if (!this.initialized) {
      await this.init();
    }

    // 前置校验
    const pre = this.preCheck(cmd);
    if (!pre.ok && !pre.triggerOpening) {
      throw new KernelError(
        `前置校验失败: ${pre.errors.join('; ')}`,
        'PRE_CHECK_FAILED',
        { preCheck: pre },
      );
    }

    // 跨日重置
    const sd = this.mvu.snapshot();
    const time = sd.时间 as { 天数?: number } | undefined;
    const currentDay = typeof time?.天数 === 'number' ? time.天数 : 1;
    if (currentDay !== this.lastActionDay) {
      this.actionsToday = 0;
      this.lastActionDay = currentDay;
    }

    this.turnCount++;
    this.actionsToday++;

    const turnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 阶段4:启动 traceBus 回合
    const timeForTrace = sd.时间 as { 天数?: number; 时段?: string } | undefined;
    traceBus.startTurn(turnId, {
      userAction: cmd.action,
      dayCount: typeof timeForTrace?.天数 === 'number' ? timeForTrace.天数 : undefined,
      timeSlot: timeForTrace?.时段,
    });
    traceBus.append(turnId, 'kernel', 'turn-start', `回合启动:day${currentDay} 行动次数=${this.actionsToday}`);

    // 阶段2:NPC 自然行动(每回合开始时计算场外女角行动)
    let npcAction: NpcActionResult | undefined;
    try {
      npcAction = await this.runNpcActionsInternal(sd, cmd);
      if (npcAction) {
        traceBus.append(turnId, 'npc', 'npc-action-summary', npcAction.actionSummary || '(无场外行动)', {
          offScreenCount: npcAction.offScreenActions.length,
          plotTriggerCount: npcAction.plotTriggers.length,
          stateOpsCount: npcAction.stateOps.length,
        });
      }
    } catch (e) {
      // NPC 行动失败不阻塞主流程
      console.warn('[kernel] NPC 自然行动失败:', e);
      traceBus.append(turnId, 'npc', 'npc-action-error', `NPC 行动失败: ${e instanceof Error ? e.message : String(e)}`);
    }

    return {
      turnId,
      userAction: cmd.action,
      startedAt: Date.now(),
      baseRevisionHash: this.currentRevisionHash,
      baseStatData: this.mvu.snapshot(),
      mainAiPartial: '',
      varAiText: '',
      mainAiDone: false,
      varAiDone: false,
      errors: pre.warnings,
      npcAction,
    };
  }

  /**
   * 评估触发型 AI(阶段3 步骤1)
   *  - 在 startTurn 后调用,评估当前 stat_data 是否满足触发型 AI 的调用条件
   *  - 返回的 triggerNarrative 注入主聊天AI 上下文
   *  - 返回的 triggerOps 合并到 CandidateChangeSet
   *  - 实际的 Gateway 调用由 App.tsx 在收到评估结果后执行(降级时主聊天AI兼并)
   */
  evaluateTriggers(
    userAction: string,
    statData: Record<string, unknown>,
  ): import('./trigger-dispatcher').TriggerEvaluation[] {
    const ctx: import('./trigger-dispatcher').TriggerContext = {
      statData,
      userAction,
      turnCount: this.turnCount,
      previousFlags: this.previousFlagsSnapshot ?? undefined,
      configuredProfileIds: this.configuredProfileIds,
    };
    const evaluations = triggerDispatcher.evaluateAll(ctx);
    // 保存当前 flag 快照供下一回合比较
    this.previousFlagsSnapshot = structuredCloneSafe(statData);
    return evaluations;
  }

  /** 组装触发器评估摘要(注入主聊天AI 上下文) */
  summarizeTriggerEvaluations(
    evaluations: import('./trigger-dispatcher').TriggerEvaluation[],
  ): string {
    return triggerDispatcher.summarizeEvaluations(evaluations);
  }

  /**
   * NPC 自然行动(阶段2)
   *  - 计算场外女角行动
   *  - 生成行动摘要(注入主聊天AI上下文)
   *  - 生成状态变更 ops(合并到候选变更集)
   *  - 记录 NPC 记忆
   */
  private async runNpcActionsInternal(
    sd: Record<string, unknown>,
    _cmd: TurnCommand,
  ): Promise<NpcActionResult> {
    const time = sd.时间 as { 天数?: number; 时段?: string } | undefined;
    const dayCount = typeof time?.天数 === 'number' ? time.天数 : 1;
    const timeSlot = (time?.时段 as TimeSlot) ?? '早';

    // 玩家当前位置
    const scene = sd.场景 as { 当前位置?: string } | undefined;
    const playerRegion = (scene?.当前位置 as Region) ?? '自宅周边';

    // 当前女角 ID
    const currentHeroineName = sd.当前女角名 as string | undefined;
    const currentHeroineId = currentHeroineName ? HEROINE_NAME_TO_ID[currentHeroineName] : undefined;

    // 女角状态快照
    const heroines = (sd.女角 as Record<string, unknown>) ?? {};
    const heroineStates: Record<number, {
      好感度: number;
      关系阶段: string;
      当前位置: string;
      独立剧情进度: string;
    }> = {};
    for (const [name, raw] of Object.entries(heroines)) {
      const id = HEROINE_NAME_TO_ID[name];
      if (!id) continue;
      const h = raw as Record<string, unknown>;
      heroineStates[id] = {
        好感度: typeof h.好感度 === 'number' ? h.好感度 : 0,
        关系阶段: typeof h.关系阶段 === 'string' ? h.关系阶段 : '初识',
        当前位置: typeof h.当前位置 === 'string' ? h.当前位置 : '未知',
        独立剧情进度: typeof h.独立剧情进度 === 'string' ? h.独立剧情进度 : '未开始',
      };
    }

    // 已触发的 flag 集合(从剧情已触发事件读取)
    const plotEvents = (sd.剧情已触发事件 as Record<string, unknown>) ?? {};
    const triggeredFlags = new Set<string>(Object.keys(plotEvents));

    return npcActionRunner.run({
      dayCount,
      timeSlot,
      playerRegion,
      currentHeroineId,
      heroineStates,
      triggeredFlags,
    });
  }

  /**
   * 流式累计:更新 StreamDraft 的主聊天AI 部分文本
   *  - 用于流式接收主聊天AI 输出
   *  - 不做解析,只累计文本
   */
  appendMainAiPartial(draft: StreamDraft, chunk: string): StreamDraft {
    return {
      ...draft,
      mainAiPartial: draft.mainAiPartial + chunk,
    };
  }

  /**
   * 主聊天AI 流式完成
   */
  finalizeMainAiStream(draft: StreamDraft, fullText?: string): StreamDraft {
    return {
      ...draft,
      mainAiPartial: fullText ?? draft.mainAiPartial,
      mainAiDone: true,
    };
  }

  /**
   * 变量AI 完成(非流式,整体填入)
   */
  setVarAiResult(draft: StreamDraft, varAiText: string): StreamDraft {
    return {
      ...draft,
      varAiText,
      varAiDone: true,
    };
  }

  /**
   * StreamDraft → RawModelResponse
   *  - 两个AI 都完成后调用
   *  - 解析变量AI 输出为 ParsedAiOutput
   *  - 提取主聊天AI 叙事正文(去掉 <UpdateVariable>/<UpdateTable> 等标签)
   */
  finalizeStream(draft: StreamDraft, mainAiText?: string, varAiText?: string): RawModelResponse {
    const mainRaw = mainAiText ?? draft.mainAiPartial;
    const varRaw = varAiText ?? draft.varAiText;

    if (!draft.mainAiDone && !mainAiText) {
      throw new KernelError('主聊天AI 未完成', 'STREAM_NOT_DONE');
    }
    if (!draft.varAiDone && !varAiText) {
      throw new KernelError('变量AI 未完成', 'STREAM_NOT_DONE');
    }

    // 解析变量AI 输出
    const varAiParsed = parseAiOutput(varRaw);

    // 提取主聊天AI 叙事正文(去掉标签)
    const narrative = stripAiTags(mainRaw);

    // 解析主聊天AI 是否也输出了变量变更(阶段1通常为空)
    const mainAiParsed = parseAiOutput(mainRaw);

    const parseErrors: string[] = [];
    if (!varAiParsed.hasUpdateVariable && varRaw.length > 0) {
      parseErrors.push('变量AI 输出未包含 <UpdateVariable> 块');
    }
    if (varAiParsed.parseErrors.length > 0) {
      parseErrors.push(...varAiParsed.parseErrors);
    }

    // 阶段4:trace 收集
    traceBus.append(draft.turnId, 'aiCall', 'finalize-stream', `2AI 输出解析完成:mainAi=${mainRaw.length}字符 varAi=${varRaw.length}字符`, {
      mainAiOps: mainAiParsed.ops.length,
      varAiOps: varAiParsed.ops.length,
      chatSheetsSql: varAiParsed.sqlStatements.length,
      parseErrors,
    });

    return {
      turnId: draft.turnId,
      userAction: draft.userAction,
      startedAt: draft.startedAt,
      baseRevisionHash: draft.baseRevisionHash,
      baseStatData: draft.baseStatData,
      mainAiRawText: mainRaw,
      varAiRawText: varRaw,
      varAiParsed,
      mainAiNarrative: narrative,
      mainAiParsed,
      parseErrors,
      npcAction: draft.npcAction,
    };
  }

  /**
   * RawModelResponse → CandidateChangeSet
   *  - 聚合 2AI 候选
   *  - 阶段1 假设:主聊天AI 不输出变量变更,候选只来自变量AI
   *  - 生成候选 trace(来源/优先级/决策)
   */
  aggregate(raw: RawModelResponse): CandidateChangeSet {
    const candidateTrace: CandidateTrace[] = [];

    // 变量AI 候选(优先级 1,主要变量变更源)
    for (const op of raw.varAiParsed.ops) {
      candidateTrace.push({
        source: 'var-ai',
        field: op.path,
        priority: 1,
        decision: 'accept',
        reason: '变量AI 数值优先(主要变量变更源)',
      });
    }

    // 主聊天AI 候选(优先级 2,若主聊天AI 也输出了变量变更)
    for (const op of raw.mainAiParsed.ops) {
      // 同字段冲突时,变量AI 优先
      const conflict = raw.varAiParsed.ops.some((v) => v.path === op.path);
      candidateTrace.push({
        source: 'main-ai',
        field: op.path,
        priority: 2,
        decision: conflict ? 'reject' : 'merge',
        reason: conflict
          ? '与变量AI 同字段冲突,变量AI 优先,主聊天AI 候选被拒绝'
          : '主聊天AI 候选(无冲突,接受合并)',
      });
    }

    // NPC 自然行动候选(优先级 3,场外女角状态变更)
    const npcAction = raw.npcAction;
    const npcStateOps = npcAction?.stateOps ?? [];
    for (const op of npcStateOps) {
      // NPC ops 不与变量AI 冲突(NPC 只写 女角.X.当前位置 等字段)
      const conflict = raw.varAiParsed.ops.some((v) => v.path === op.path);
      candidateTrace.push({
        source: 'npc-ai',
        field: op.path,
        priority: 3,
        decision: conflict ? 'reject' : 'accept',
        reason: conflict
          ? '与变量AI 同字段冲突,NPC 候选被拒绝'
          : 'NPC 自然行动状态变更(场外女角)',
      });
    }

    return {
      turnId: raw.turnId,
      userAction: raw.userAction,
      narrative: raw.mainAiNarrative,
      mainAiOps: raw.mainAiParsed,
      varAiOps: raw.varAiParsed,
      chatSheetsSql: raw.varAiParsed.sqlStatements,
      candidateTrace,
      npcActionSummary: npcAction?.actionSummary ?? '',
      npcStateOps: conflictFreeNpcOps(npcStateOps, raw.varAiParsed.ops),
      npcPlotTriggers: (npcAction?.plotTriggers ?? []).map((t) => ({
        heroineName: t.node.heroineName,
        event: t.node.event,
        type: t.type,
      })),
    };
  }

  /**
   * CandidateChangeSet → CommittedFacts
   *  - 裁定:变量AI 优先,主聊天AI 不冲突字段可合并
   *  - 应用 MVU 事务(Zod 校验)
   *  - 应用时间锁(每轮 +30 分钟,如果变量AI 没显式更新时间)
   *  - IndexedDB CAS 提交:新 revision + chatSheets + 历史追加
   */
  async commit(candidate: CandidateChangeSet): Promise<CommittedFacts> {
    const before = this.mvu.snapshot();
    const startedAt = Date.now();
    const arbitrationTrace: CandidateTrace[] = [...candidate.candidateTrace];

    // 1. 裁定:合并变量AI ops + 主聊天AI 不冲突 ops
    const mergedOps = this.arbitrate(candidate, arbitrationTrace);

    // 2. 应用时间锁(若变量AI 没显式更新 时间.当前时间,Kernel 自动 +30 分钟)
    //    applyTimeLock 返回时间 op 数组(若变量AI 已显式更新则返回 [])
    const timeOps = this.applyTimeLock(before, mergedOps, arbitrationTrace);

    // 3. 应用 MVU 事务(Zod 校验)
    // 重建 ParsedAiOutput 用于 MvuTransaction.apply
    const mergedParsed: ParsedAiOutput = {
      hasUpdateVariable: true,
      analysis: candidate.varAiOps.analysis,
      hasJsonPatch: true,
      jsonPatchRaw: '',
      ops: mergedOps.map((op) => ({
        op: op.op as 'add' | 'replace' | 'remove',
        path: op.path,
        value: op.value,
        rawOp: op.rawOp ?? (op.op === 'remove' ? 'remove' : 'replace'),
        rawPath: op.path,
        isNewField: !schemaRegistry.hasPath(op.path),
      })),
      hasUpdateTable: candidate.chatSheetsSql.length > 0,
      sqlStatements: candidate.chatSheetsSql,
      parseErrors: [],
    };

    const txResult = this.tx.apply(mergedParsed);

    // 3.5 应用 NPC 自然行动状态 ops(阶段2,NPC 场外女角位置/心情/今日行动)
    if (candidate.npcStateOps.length > 0) {
      const npcPatchOps: PatchOp[] = candidate.npcStateOps.map((op) => ({
        op: op.op,
        path: op.path,
        value: op.value,
      }));
      this.mvu.applyPatch(npcPatchOps);
      arbitrationTrace.push({
        source: 'npc-ai',
        field: 'npc-state',
        priority: 3,
        decision: 'accept',
        reason: `NPC 自然行动状态变更 ${candidate.npcStateOps.length} 条已应用`,
      });
    }

    // 4. 时间锁:把时间锁 op 也应用(若变量AI 没显式更新时间)
    if (timeOps.length > 0) {
      this.mvu.applyPatch(timeOps);
    }

    const after = this.mvu.snapshot();

    // 5. IndexedDB CAS 提交
    const revisionContent = {
      statData: after,
      narrative: candidate.narrative,
      userAction: candidate.userAction,
      actionsToday: this.actionsToday,
      lastActionDay: this.lastActionDay,
      turnCount: this.turnCount,
      txResult: {
        ok: txResult.ok,
        appliedCount: txResult.appliedCount,
        rejectedCount: txResult.rejectedCount,
      },
    };

    let newRevisionHash = '';
    try {
      const rev = await idb.createRevision({
        content: revisionContent,
        parentHash: this.currentRevisionHash,
        scope: 'chat',
        label: candidate.turnId,
      });
      newRevisionHash = rev.hash;
      this.currentRevisionHash = rev.hash;
      await idb.kvSet(CURRENT_REVISION_KEY, rev.hash);
    } catch (e) {
      // IndexedDB 写入失败,内存状态保留,玩家可重试
      const failedElapsedMs = Date.now() - startedAt;
      try {
        traceBus.append(
          candidate.turnId,
          'kernel',
          'commit-failed',
          `IndexedDB 提交失败: ${e instanceof Error ? e.message : String(e)}`,
        );
        traceBus.endTurn(candidate.turnId, { ok: false, elapsedMs: failedElapsedMs });
      } catch {}
      return {
        turnId: candidate.turnId,
        ok: false,
        before,
        after,
        txResult,
        narrative: candidate.narrative,
        newRevisionHash: '',
        revisionScope: 'chat',
        arbitrationTrace,
        elapsedMs: failedElapsedMs,
        errors: [`IndexedDB 提交失败: ${e instanceof Error ? e.message : String(e)}`],
      };
    }

    // 6. chatSheets 更新(若变量AI 输出了 SQL)
    if (candidate.chatSheetsSql.length > 0) {
      await this.applyChatSheetsSql(candidate.chatSheetsSql, arbitrationTrace);
    }

    const elapsedMs = Date.now() - startedAt;

    const facts: CommittedFacts = {
      turnId: candidate.turnId,
      ok: txResult.ok || txResult.appliedCount > 0,
      before,
      after,
      txResult,
      narrative: candidate.narrative,
      newRevisionHash,
      revisionScope: 'chat',
      arbitrationTrace,
      elapsedMs,
      errors: txResult.fullParseErrors,
      npcActionSummary: candidate.npcActionSummary,
      npcPlotTriggers: candidate.npcPlotTriggers,
    };

    // 阶段4:推送 trace 到 traceBus,结束回合
    try {
      traceBus.append(
        candidate.turnId,
        'variableUpdate',
        'commit-ops',
        `应用 ${facts.txResult.appliedCount} 条 ops / 拒绝 ${facts.txResult.rejectedCount} 条 / 耗时 ${elapsedMs}ms`,
        {
          applied: facts.txResult.appliedCount,
          rejected: facts.txResult.rejectedCount,
          validations: facts.txResult.validations,
        },
      );
      traceBus.append(
        candidate.turnId,
        'kernel',
        'commit-done',
        `回合完成 ok=${facts.ok} hash=${facts.newRevisionHash.slice(0, 8)} 耗时=${elapsedMs}ms`,
        {
          ok: facts.ok,
          newRevisionHash: facts.newRevisionHash,
          elapsedMs,
          errors: facts.errors,
        },
      );
      traceBus.endTurn(candidate.turnId, { ok: facts.ok, elapsedMs });
    } catch (e) {
      console.warn('[kernel] traceBus 推送失败:', e);
    }

    return facts;
  }

  /**
   * 候选裁定:变量AI 优先,主聊天AI 不冲突字段可合并
   *  - 返回合并后的 ops 数组(已去重)
   */
  private arbitrate(
    candidate: CandidateChangeSet,
    trace: CandidateTrace[],
  ): Array<{ op: string; path: string; value?: unknown; rawOp?: string }> {
    const merged = new Map<string, { op: string; path: string; value?: unknown; rawOp?: string }>();

    // 变量AI 优先(全接受)
    for (const op of candidate.varAiOps.ops) {
      const key = `${op.op}:${op.path}`;
      merged.set(key, { op: op.op, path: op.path, value: op.value, rawOp: op.rawOp });
    }

    // 主聊天AI 补充(仅不冲突字段)
    for (const op of candidate.mainAiOps.ops) {
      const conflict = candidate.varAiOps.ops.some((v) => v.path === op.path);
      if (conflict) {
        // 已在 trace 中记录 reject
        continue;
      }
      const key = `${op.op}:${op.path}`;
      if (!merged.has(key)) {
        merged.set(key, { op: op.op, path: op.path, value: op.value, rawOp: op.rawOp });
        trace.push({
          source: 'main-ai',
          field: op.path,
          priority: 2,
          decision: 'merge',
          reason: '主聊天AI 候选(无冲突,合并)',
        });
      }
    }

    return Array.from(merged.values());
  }

  /**
   * 时间锁:每轮 +30 分钟
   *  - 若变量AI 已显式更新 时间.当前时间 或 时间.天数,则不重复推进(返回 [])
   *  - 否则 Kernel 自动 +30 分钟,推进 时段/当前时间
   *  - 跨日时自动 天数+1,时段重置为"早",当前时间为 08:00
   *  - 返回时间 op 数组(由 commit 应用)
   */
  private applyTimeLock(
    before: Record<string, unknown>,
    mergedOps: Array<{ op: string; path: string; value?: unknown }>,
    trace: CandidateTrace[],
  ): PatchOp[] {
    // 检查变量AI 是否已显式更新时间
    const hasTimeUpdate = mergedOps.some(
      (op) => op.path.startsWith('时间.当前时间') || op.path.startsWith('时间.天数'),
    );
    if (hasTimeUpdate) {
      trace.push({
        source: 'var-ai',
        field: '时间.当前时间',
        priority: 1,
        decision: 'accept',
        reason: '变量AI 已显式更新时间,Kernel 时间锁不重复推进',
      });
      return [];
    }

    // 读取当前时间
    const time = before.时间 as Record<string, unknown> | undefined;
    if (!time) {
      trace.push({
        source: 'var-ai',
        field: '时间',
        priority: 1,
        decision: 'defer',
        reason: '时间字段不存在,时间锁跳过',
      });
      return [];
    }

    const currentTime = typeof time.当前时间 === 'string' ? time.当前时间 : '08:00';
    const currentDay = typeof time.天数 === 'number' ? time.天数 : 1;

    // 解析 HH:MM 并 +30 分钟
    const [hh, mm] = currentTime.split(':').map((s) => parseInt(s, 10) || 0);
    let newMin = mm + TIME_INCREMENT_MINUTES;
    let newHour = hh;
    let newDay = currentDay;
    if (newMin >= 60) {
      newMin -= 60;
      newHour += 1;
    }
    if (newHour >= 24) {
      newHour -= 24;
      newDay += 1;
    }
    const newTimeStr = `${String(newHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;

    // 推导新时段
    const newSlot = deriveTimeSlot(newHour);

    trace.push({
      source: 'var-ai',
      field: '时间.当前时间',
      priority: 1,
      decision: 'accept',
      reason: `Kernel 时间锁自动推进: ${currentTime} → ${newTimeStr}(时段=${newSlot})`,
    });

    // 跨日检测:由变量AI 决定是否真的推进天数(剧情上可能跳过)
    if (newDay !== currentDay) {
      trace.push({
        source: 'var-ai',
        field: '时间.天数',
        priority: 1,
        decision: 'defer',
        reason: `跨日检测: 天数 ${currentDay} → ${newDay}(由变量AI 决定是否真的推进)`,
      });
    }

    return [
      { op: 'replace', path: '时间.当前时间', value: newTimeStr },
      { op: 'replace', path: '时间.时段', value: newSlot },
    ];
  }

  /**
   * 应用 chatSheets SQL(阶段2:真实解析执行 <UpdateTable> SQL 到 IndexedDB chat_sheets)
   *  - INSERT/UPDATE/DELETE 实际写入 chat_sheets store
   *  - CREATE/DROP 等 DDL 忽略(表格结构由模板预建)
   *  - 单条失败不阻塞后续语句,错误写入 trace
   */
  private async applyChatSheetsSql(
    sqls: string[],
    trace: CandidateTrace[],
  ): Promise<void> {
    if (sqls.length === 0) return;
    try {
      const results = await executeSqlStatements(sqls);
      const okCount = results.filter((r) => r.ok).length;
      const failCount = results.length - okCount;
      // 把 SQL 执行记录存到 KV(审计用)
      await idb.kvSet(`__turn_sqls_${Date.now()}__`, results);
      trace.push({
        source: 'var-ai',
        field: 'chatSheets',
        priority: 1,
        decision: failCount > 0 ? 'merge' : 'accept',
        reason: `chatSheets SQL ${results.length} 条已执行: 成功 ${okCount} / 失败 ${failCount}(${results
          .filter((r) => !r.ok)
          .map((r) => r.error ?? 'unknown')
          .join('; ').slice(0, 200)})`,
      });
    } catch (e) {
      trace.push({
        source: 'var-ai',
        field: 'chatSheets',
        priority: 1,
        decision: 'reject',
        reason: `chatSheets SQL 执行失败: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  //  重置与回滚
  // ─────────────────────────────────────────────────────────

  /**
   * 回滚到 base revision(模型失败/解析失败时调用)
   *  - 不创建新 revision
   *  - 恢复 MVU 到 base stat_data
   *  - 重置 turnCount/actionsToday(本回合不算)
   */
  rollback(draft: StreamDraft): void {
    this.mvu.replace(draft.baseStatData);
    this.turnCount = Math.max(0, this.turnCount - 1);
    this.actionsToday = Math.max(0, this.actionsToday - 1);
  }

  /**
   * 重置 Kernel(清空所有状态,回到初始)
   *  - 调试用,或玩家开新档
   */
  async reset(): Promise<void> {
    this.mvu.replace({});
    this.currentRevisionHash = null;
    this.turnCount = 0;
    this.actionsToday = 0;
    this.lastActionDay = 1;
    this.initialized = false;
    await idb.kvDelete(CURRENT_REVISION_KEY);
  }

  /**
   * 直接设置 stat_data(IdentitySelect 完成后调用)
   *  - 创建初始 revision
   */
  async initializeNewGame(initialStatData: Record<string, unknown>): Promise<string> {
    this.mvu.replace(initialStatData);
    this.turnCount = 0;
    this.actionsToday = 0;
    const time = initialStatData.时间 as { 天数?: number } | undefined;
    this.lastActionDay = typeof time?.天数 === 'number' ? time.天数 : 1;

    const rev = await idb.createRevision({
      content: {
        statData: initialStatData,
        narrative: '',
        userAction: '__game_start__',
        actionsToday: 0,
        lastActionDay: this.lastActionDay,
        turnCount: 0,
      },
      parentHash: null,
      scope: 'save',
      label: 'game-start',
    });
    this.currentRevisionHash = rev.hash;
    await idb.kvSet(CURRENT_REVISION_KEY, rev.hash);
    this.initialized = true;
    return rev.hash;
  }
}

// ───────────────────────────────────────────────────────────
//  辅助函数
// ───────────────────────────────────────────────────────────

/**
 * 从 AI 输出中提取叙事正文(去掉 <UpdateVariable>/<UpdateTable>/<Analysis>/<JSONPatch> 等标签)
 *  - 保留 <StatusPlaceHolderImpl/> 占位符(由 UI 解析)
 *  - 保留其他可见文本
 */
/**
 * 过滤掉与变量AI ops 路径冲突的 NPC ops
 *  - 变量AI 优先,NPC ops 只写变量AI 未覆盖的字段
 */
function conflictFreeNpcOps(
  npcOps: Array<{ op: 'replace' | 'add'; path: string; value: unknown }>,
  varAiOps: Array<{ path: string }>,
): Array<{ op: 'replace' | 'add'; path: string; value: unknown }> {
  const varPaths = new Set(varAiOps.map((o) => o.path));
  return npcOps.filter((op) => !varPaths.has(op.path));
}

export function stripAiTags(text: string): string {
  if (!text) return '';
  let result = text;
  // 去掉 <UpdateVariable>...</UpdateVariable>(含子标签)
  result = result.replace(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gi, '');
  // 去掉 <UpdateTable>...</UpdateTable>
  result = result.replace(/<UpdateTable>[\s\S]*?<\/UpdateTable>/gi, '');
  // 去掉散落的 <Analysis>/<JSONPatch>(若主聊天AI 误输出)
  result = result.replace(/<Analysis>[\s\S]*?<\/Analysis>/gi, '');
  result = result.replace(/<JSONPatch>[\s\S]*?<\/JSONPatch>/gi, '');
  // 去掉 <think>...</think>(若模型输出了思维链)
  result = result.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // 去掉多余的空行(保留单个换行)
  result = result.replace(/\n{3,}/g, '\n\n').trim();
  return result;
}

/**
 * 根据小时数推导时段
 *  - 5-8: 早
 *  - 9-11: 上午
 *  - 12-17: 下午
 *  - 18-22: 晚
 *  - 23-4: 深夜
 */
export function deriveTimeSlot(hour: number): string {
  if (hour >= 5 && hour <= 8) return '早';
  if (hour >= 9 && hour <= 11) return '上午';
  if (hour >= 12 && hour <= 17) return '下午';
  if (hour >= 18 && hour <= 22) return '晚';
  return '深夜';
}

// ───────────────────────────────────────────────────────────
//  错误类型
// ───────────────────────────────────────────────────────────

export class KernelError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'KernelError';
  }
}

// ───────────────────────────────────────────────────────────
//  辅助:深拷贝(避免 structuredClone 在某些环境不可用)
// ───────────────────────────────────────────────────────────

function structuredCloneSafe<T>(obj: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch {
      // fallback
    }
  }
  try {
    return JSON.parse(JSON.stringify(obj)) as T;
  } catch {
    return obj;
  }
}

// ───────────────────────────────────────────────────────────
//  单例
// ───────────────────────────────────────────────────────────

export const kernel = new Kernel();

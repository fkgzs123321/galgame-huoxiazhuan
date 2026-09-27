/**
 * 成就引擎 + 多周目继承(阶段3 步骤5)
 *
 * 职责:
 *  - 成就解锁状态管理(持久化到 IndexedDB KV)
 *  - 评估器注册表:根据 stat_data 评估某条成就是否满足条件
 *  - 多周目(NG+)继承:从上一周目提取继承点数/解锁标记/部分属性
 *  - 周目历史记录:每次完成结局时存档周目元数据
 *
 * 设计:
 *  - 纯客户端逻辑,不依赖 EJS/MVU 运行时
 *  - 评估器函数接收 statData + params,返回 boolean
 *  - 解锁事件通过回调通知 UI
 *  - 持久化键:KV_STORE_KEY = '__achievements__'
 *  - 多周目键:KV_PLAYTHROUGH_KEY = '__playthroughs__'
 */

import * as idb from '../db/indexeddb';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_MAP,
  EVALUATOR,
  type Achievement,
  type AchievementRarity,
  type AchievementType,
} from '../content/achievements/achievement-data';
import type { MvuRuntime } from './mvu-runtime';
import { detectEnding, extractPlayerStats } from './ending-detector';
import { cgGallery } from './cg-gallery';

// ───────────────────────────────────────────────────────────
//  持久化状态
// ───────────────────────────────────────────────────────────

const KV_ACHIEVEMENT_KEY = '__achievements_v1__';
const KV_PLAYTHROUGH_KEY = '__playthroughs_v1__';
const KV_NG_PLUS_KEY = '__ng_plus_state_v1__';

/** 单条成就解锁记录 */
export interface AchievementUnlockRecord {
  /** 成就 ID */
  id: string;
  /** 解锁时间戳 */
  unlockedAt: number;
  /** 解锁时的周目序号 */
  playthrough: number;
  /** 解锁时的游戏内天数 */
  dayInGame: number;
  /** 解锁时的回合数 */
  turnCount: number;
}

/** 全部成就持久化状态 */
export interface AchievementState {
  /** 已解锁成就(按 ID 索引) */
  unlocks: Record<string, AchievementUnlockRecord>;
  /** 总继承点数(累计所有解锁成就的 inheritPoints) */
  totalInheritPoints: number;
  /** 已激活的解锁标记(累计 unlockFlags) */
  activeFlags: string[];
  /** 最后一次评估的时间戳 */
  lastEvaluatedAt: number;
}

/** 单次周目历史 */
export interface PlaythroughRecord {
  /** 周目序号(1, 2, 3...) */
  index: number;
  /** 开始时间戳 */
  startedAt: number;
  /** 结束时间戳 */
  endedAt: number;
  /** 结局 ID */
  endingId: string;
  /** 结局标题 */
  endingTitle: string;
  /** 结局类型:true_end / good_end / normal_end / bad_end / hidden */
  endingType: 'true_end' | 'good_end' | 'normal_end' | 'bad_end' | 'hidden';
  /** 主角姓名 */
  playerName: string;
  /** 主角身份 */
  identityName: string;
  /** 完成时的游戏内天数 */
  dayInGame: number;
  /** 完成时的回合数 */
  turnCount: number;
  /** 本周目获得的成就 ID 列表 */
  unlockedAchievements: string[];
  /** 本周目获得的继承点数 */
  earnedInheritPoints: number;
  /** 周目结束时的主角六维属性快照(魅力/学业/体力/社交/敏感/声誉),用于 NG+ 继承 */
  finalStats?: Record<string, number>;
}

/** NG+ 继承状态 */
export interface NgPlusState {
  /** 是否已激活 NG+ */
  activated: boolean;
  /** 当前周目序号(1=首周目) */
  currentPlaythrough: number;
  /** 可用的继承点数(已扣除本周目消耗) */
  availablePoints: number;
  /** 已解锁的标记 */
  unlockedFlags: string[];
  /** 继承的主角属性(部分) */
  inheritedStats?: {
    魅力?: number;
    学业?: number;
    体力?: number;
    社交?: number;
    敏感?: number;
    声誉?: number;
  };
  /** 继承的物品(部分 ID) */
  inheritedItems?: string[];
  /** 来源周目序号 */
  sourcePlaythrough: number;
}

// ───────────────────────────────────────────────────────────
//  评估器函数类型
// ───────────────────────────────────────────────────────────

export type EvaluatorFn = (
  statData: Record<string, unknown>,
  params: Record<string, unknown> | undefined,
  context: EvaluatorContext,
) => boolean;

export interface EvaluatorContext {
  /** 当前已解锁成就 ID 集合 */
  unlockedIds: Set<string>;
  /** 当前周目序号 */
  playthrough: number;
  /** 历史周目记录 */
  playthroughs: PlaythroughRecord[];
  /** CG 画廊状态(已解锁 CG 数量) */
  cgUnlockedCount: number;
  /** CG 总数 */
  cgTotalCount: number;
}

// ───────────────────────────────────────────────────────────
//  内置评估器
// ───────────────────────────────────────────────────────────

const HEROINE_NAMES = [
  '鸣泽唯', '鸣泽美佐子', '舞岛可怜', '加藤美纪', '筱原泉美',
  '南川洋子', '都筑梢江', '水野友美', '安田爱美', '田中美沙',
  '片桐美铃', '野野村美里', '永岛久美子', '永岛佐知子', '齐藤澪',
  '齐藤澪奈', '铃木美穗', '仁科', '正树夏子', '杉本樱子',
];

function asObj(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object') ? v as Record<string, unknown> : {};
}

function asNum(v: unknown): number {
  return typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) || 0 : 0);
}

function asStr(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '');
}

/** 查询女角属性(从 当前女角 或 女角镜像 中查) */
function getHeroineField(statData: Record<string, unknown>, name: string, field: string): unknown {
  const current = asObj(statData.当前女角);
  if (asStr(current.姓名) === name) return current[field];
  const heroines = asObj(statData.女角);
  // 直接以姓名为 key
  if (name in heroines) {
    return asObj(heroines[name])[field];
  }
  // 兼容以 ID 为 key 的格式
  return undefined;
}

const evaluators: Record<string, EvaluatorFn> = {
  // ── 里程碑 ──
  [EVALUATOR.TURN_COUNT]: (sd, params) => {
    const minTurns = asNum(params?.min_turns);
    // 用 stat_data.时间.天数 作为近似(每回合一天过于宽松,但 day>=7 等仍可判断)
    const day = asNum(asObj(sd.时间).天数);
    return day >= minTurns;
  },
  [EVALUATOR.PLAYTHROUGH_COUNT]: (_sd, _params, ctx) => {
    const minCount = asNum(_params?.min_count);
    return ctx.playthrough >= minCount;
  },

  // ── 结局类 ──
  [EVALUATOR.ENDING_REACHED]: (_sd, params, ctx) => {
    const endingId = asStr(params?.ending_id);
    if (endingId === 'bad_end_any') {
      return ctx.playthroughs.some((p) => p.endingType === 'bad_end');
    }
    return ctx.playthroughs.some((p) => p.endingId === endingId);
  },
  [EVALUATOR.ENDING_ALL_TRUE]: (_sd, params, ctx) => {
    const minCount = asNum(params?.min_count);
    const trueEnds = ctx.playthroughs.filter((p) => p.endingType === 'true_end');
    if (minCount === 1) return trueEnds.length >= 1;
    // 统计不同女角的 True End
    const names = new Set(trueEnds.map((p) => p.playerName));
    return names.size >= minCount;
  },
  [EVALUATOR.ENDING_COUNT]: (_sd, _params, ctx) => {
    const minCount = asNum(_params?.min_count);
    // 不同 endingId 的数量
    const ids = new Set(ctx.playthroughs.map((p) => p.endingId));
    return ids.size >= minCount;
  },

  // ── 女角类 ──
  [EVALUATOR.HEROINE_CAPTURED]: (sd, params) => {
    const name = asStr(params?.heroine_name);
    const stage = asStr(getHeroineField(sd, name, '关系阶段'));
    return stage === '攻略完成';
  },
  [EVALUATOR.HEROINE_ALL_CAPTURED]: (sd) => {
    return HEROINE_NAMES.every((name) => {
      const stage = asStr(getHeroineField(sd, name, '关系阶段'));
      return stage === '攻略完成';
    });
  },
  [EVALUATOR.HEROINE_FIRST_H]: (sd, params) => {
    const name = asStr(params?.heroine_name);
    return asNum(getHeroineField(sd, name, '初H')) === 1;
  },
  [EVALUATOR.HEROINE_ADVANCED_H]: (sd, params) => {
    const name = asStr(params?.heroine_name);
    return asNum(getHeroineField(sd, name, '进阶H')) === 1;
  },
  [EVALUATOR.HEROINE_TRUE_END]: (_sd, params, ctx) => {
    const name = asStr(params?.heroine_name);
    return ctx.playthroughs.some((p) =>
      p.endingType === 'true_end' && p.playerName === name,
    );
  },

  // ── 隐藏类 ──
  [EVALUATOR.DIARY_ONE]: (sd, _params) => {
    const hidden = asObj(sd.隐藏);
    return asNum(hidden.日记1) === 1 || Boolean(hidden.日记1);
  },
  [EVALUATOR.DIARY_ALL]: (sd) => {
    const h = asObj(sd.隐藏);
    return [1, 2, 3, 4, 5].every((i) => Boolean(h[`日记${i}`]));
  },
  [EVALUATOR.VARIABLE_SHOP_VISIT]: (sd, params) => {
    const min = asNum(params?.min_visits);
    return asNum(asObj(sd.隐藏).变数屋访问次数) >= min;
  },
  [EVALUATOR.SAKURAKO_ROUTE]: (sd) => {
    return Boolean(asObj(sd.隐藏).樱子线解锁);
  },
  [EVALUATOR.GRADUATE_SIDE]: (sd) => {
    const day = asNum(asObj(sd.时间).天数);
    if (day < 14) return false;
    const grads = ['齐藤澪', '齐藤澪奈', '铃木美穗', '仁科', '正树夏子'];
    return grads.some((name) => asNum(getHeroineField(sd, name, '好感度')) >= 50);
  },
  [EVALUATOR.HOSPITAL_VISIT]: (sd, params) => {
    const min = asNum(params?.min_visits);
    return asNum(asObj(sd.隐藏).医院访问次数) >= min;
  },

  // ── 技能类 ──
  [EVALUATOR.SKILL_MAX]: (sd, params) => {
    const name = asStr(params?.skill_name);
    const skills = asObj(sd.技能);
    return asNum(skills[name]) >= 100;
  },
  [EVALUATOR.SKILL_ALL_MAX]: (sd) => {
    const skills = asObj(sd.技能);
    const all = ['力量', '敏捷', '智力', '意志', '潜行', '口才', '医学', '烹饪', '艺术', '驾驶', '格斗', '恋爱', '观察'];
    return all.every((k) => asNum(skills[k]) >= 100);
  },

  // ── CG 类 ──
  [EVALUATOR.CG_ALL]: (_sd, _params, ctx) => {
    return ctx.cgTotalCount > 0 && ctx.cgUnlockedCount >= ctx.cgTotalCount;
  },
  [EVALUATOR.CG_COUNT]: (_sd, params, ctx) => {
    const min = asNum(params?.min_count);
    const percent = params?.percent !== undefined ? asNum(params?.percent) : null;
    if (percent !== null && ctx.cgTotalCount > 0) {
      const actualPercent = (ctx.cgUnlockedCount / ctx.cgTotalCount) * 100;
      return actualPercent >= percent;
    }
    return ctx.cgUnlockedCount >= min;
  },

  // ── 经济类 ──
  [EVALUATOR.SAVINGS_GOAL]: (sd, params) => {
    const min = asNum(params?.min_amount);
    const savings = asNum(asObj(sd.经济).累计储蓄) || asNum(asObj(sd.主角).储蓄);
    return savings >= min;
  },
  [EVALUATOR.BANKRUPTCY]: (sd) => {
    const cash = asNum(asObj(sd.主角).现金);
    const noIncomeDays = asNum(asObj(sd.临时).连续无收入天数);
    return cash <= 0 && noIncomeDays >= 3;
  },

  // ── 标记检查(动态 flag) ──
  _flag_check: (sd, params) => {
    const flag = asStr(params?.flag);
    return Boolean(asObj(sd.隐藏)[flag]);
  },

  // ── 元成就:其他全部解锁 ──
  _meta_all_others: (_sd, _params, ctx) => {
    const others = ACHIEVEMENTS.filter((a) => a.id !== 'milestone_completionist');
    return others.every((a) => ctx.unlockedIds.has(a.id));
  },
};

// ───────────────────────────────────────────────────────────
//  成就引擎
// ───────────────────────────────────────────────────────────

class AchievementEngine {
  private state: AchievementState | null = null;
  private playthroughs: PlaythroughRecord[] = [];
  private ngPlusState: NgPlusState | null = null;
  private listeners: Array<(record: AchievementUnlockRecord, ach: Achievement) => void> = [];
  private loaded = false;

  /** 注册解锁事件监听器 */
  onUnlock(fn: (record: AchievementUnlockRecord, ach: Achievement) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn);
    };
  }

  private notify(record: AchievementUnlockRecord, ach: Achievement) {
    for (const fn of this.listeners) {
      try { fn(record, ach); } catch { /* noop */ }
    }
  }

  /** 加载持久化状态 */
  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const [s, p, ng] = await Promise.all([
        idb.kvGet<AchievementState>(KV_ACHIEVEMENT_KEY),
        idb.kvGet<PlaythroughRecord[]>(KV_PLAYTHROUGH_KEY),
        idb.kvGet<NgPlusState>(KV_NG_PLUS_KEY),
      ]);
      this.state = s ?? {
        unlocks: {},
        totalInheritPoints: 0,
        activeFlags: [],
        lastEvaluatedAt: 0,
      };
      this.playthroughs = p ?? [];
      this.ngPlusState = ng ?? {
        activated: false,
        currentPlaythrough: 1,
        availablePoints: 0,
        unlockedFlags: [],
        sourcePlaythrough: 0,
      };
      this.loaded = true;
    } catch {
      this.state = {
        unlocks: {},
        totalInheritPoints: 0,
        activeFlags: [],
        lastEvaluatedAt: 0,
      };
      this.playthroughs = [];
      this.ngPlusState = {
        activated: false,
        currentPlaythrough: 1,
        availablePoints: 0,
        unlockedFlags: [],
        sourcePlaythrough: 0,
      };
      this.loaded = true;
    }
  }

  private async save(): Promise<void> {
    if (!this.state || !this.ngPlusState) return;
    await Promise.all([
      idb.kvSet(KV_ACHIEVEMENT_KEY, this.state),
      idb.kvSet(KV_PLAYTHROUGH_KEY, this.playthroughs),
      idb.kvSet(KV_NG_PLUS_KEY, this.ngPlusState),
    ]);
  }

  /** 获取当前状态(只读) */
  getState(): AchievementState {
    return this.state ?? {
      unlocks: {},
      totalInheritPoints: 0,
      activeFlags: [],
      lastEvaluatedAt: 0,
    };
  }

  /** 获取周目历史 */
  getPlaythroughs(): PlaythroughRecord[] {
    return [...this.playthroughs];
  }

  /** 获取 NG+ 状态 */
  getNgPlusState(): NgPlusState {
    return this.ngPlusState ?? {
      activated: false,
      currentPlaythrough: 1,
      availablePoints: 0,
      unlockedFlags: [],
      sourcePlaythrough: 0,
    };
  }

  /** 评估所有成就,解锁满足条件但尚未解锁的 */
  async evaluateAll(
    statData: Record<string, unknown>,
    options?: {
      cgUnlockedCount?: number;
      cgTotalCount?: number;
      turnCount?: number;
    },
  ): Promise<AchievementUnlockRecord[]> {
    if (!this.state) await this.load();
    if (!this.state) return [];

    const ctx: EvaluatorContext = {
      unlockedIds: new Set(Object.keys(this.state.unlocks)),
      playthrough: this.getNgPlusState().currentPlaythrough,
      playthroughs: this.playthroughs,
      cgUnlockedCount: options?.cgUnlockedCount ?? 0,
      cgTotalCount: options?.cgTotalCount ?? 0,
    };

    const newlyUnlocked: AchievementUnlockRecord[] = [];
    const now = Date.now();
    const day = asNum(asObj(statData.时间).天数) || 0;

    for (const ach of ACHIEVEMENTS) {
      if (this.state.unlocks[ach.id]) continue;
      const fn = evaluators[ach.evaluatorId];
      if (!fn) continue;
      let ok = false;
      try {
        ok = fn(statData, ach.evaluatorParams, ctx);
      } catch {
        ok = false;
      }
      if (ok) {
        const record: AchievementUnlockRecord = {
          id: ach.id,
          unlockedAt: now,
          playthrough: ctx.playthrough,
          dayInGame: day,
          turnCount: options?.turnCount ?? 0,
        };
        this.state.unlocks[ach.id] = record;
        this.state.totalInheritPoints += ach.reward.inheritPoints ?? 0;
        if (ach.reward.unlockFlags) {
          for (const f of ach.reward.unlockFlags) {
            if (!this.state.activeFlags.includes(f)) {
              this.state.activeFlags.push(f);
            }
          }
        }
        newlyUnlocked.push(record);
        ctx.unlockedIds.add(ach.id);
        this.notify(record, ach);
      }
    }
    this.state.lastEvaluatedAt = now;
    await this.save();
    return newlyUnlocked;
  }

  /** 手动解锁(管理用) */
  async unlock(id: string, options?: { dayInGame?: number; turnCount?: number }): Promise<boolean> {
    if (!this.state) await this.load();
    if (!this.state) return false;
    const ach = ACHIEVEMENT_MAP[id];
    if (!ach) return false;
    if (this.state.unlocks[id]) return false;
    const now = Date.now();
    const record: AchievementUnlockRecord = {
      id,
      unlockedAt: now,
      playthrough: this.getNgPlusState().currentPlaythrough,
      dayInGame: options?.dayInGame ?? 0,
      turnCount: options?.turnCount ?? 0,
    };
    this.state.unlocks[id] = record;
    this.state.totalInheritPoints += ach.reward.inheritPoints ?? 0;
    if (ach.reward.unlockFlags) {
      for (const f of ach.reward.unlockFlags) {
        if (!this.state.activeFlags.includes(f)) {
          this.state.activeFlags.push(f);
        }
      }
    }
    await this.save();
    this.notify(record, ach);
    return true;
  }

  /** 重置全部成就(慎用) */
  async resetAll(): Promise<void> {
    this.state = {
      unlocks: {},
      totalInheritPoints: 0,
      activeFlags: [],
      lastEvaluatedAt: 0,
    };
    this.playthroughs = [];
    this.ngPlusState = {
      activated: false,
      currentPlaythrough: 1,
      availablePoints: 0,
      unlockedFlags: [],
      sourcePlaythrough: 0,
    };
    await this.save();
  }

  // ═══════════════════════════════════════════════════════
  //  多周目继承(NG+)
  // ═══════════════════════════════════════════════════════

  /**
   * 结束当前周目并存档
   *  - 记录周目历史
   *  - 累计继承点数到 NG+ 状态
   *  - 触发成就解锁(结局成就)
   */
  async endPlaythrough(record: Omit<PlaythroughRecord, 'index' | 'startedAt' | 'endedAt' | 'unlockedAchievements' | 'earnedInheritPoints'>): Promise<PlaythroughRecord> {
    if (!this.state) await this.load();
    if (!this.ngPlusState) await this.load();
    if (!this.state || !this.ngPlusState) throw new Error('achievement-engine not loaded');

    const now = Date.now();
    const playthrough: PlaythroughRecord = {
      ...record,
      index: this.playthroughs.length + 1,
      startedAt: this.playthroughs.length > 0
        ? this.playthroughs[this.playthroughs.length - 1].endedAt
        : now,
      endedAt: now,
      unlockedAchievements: Object.keys(this.state.unlocks).filter(
        (id) => this.state!.unlocks[id].playthrough === this.ngPlusState!.currentPlaythrough,
      ),
      earnedInheritPoints: 0,
    };
    // 计算本周目获得的继承点数
    let earned = 0;
    for (const id of playthrough.unlockedAchievements) {
      const ach = ACHIEVEMENT_MAP[id];
      if (ach) earned += ach.reward.inheritPoints ?? 0;
    }
    playthrough.earnedInheritPoints = earned;
    this.playthroughs.push(playthrough);
    await this.save();
    return playthrough;
  }

  /**
   * 从当前 stat_data 检测并结束周目(UI 回合流程接入点)
   *  - 调用 detectEnding 检测结局状态,未命中返回 null
   *  - 命中则提取主角六维 finalStats 并调用 endPlaythrough
   *  - 自动评估结局成就(结束后 evaluateAll)
   */
  async endPlaythroughFromStatData(
    statData: Record<string, unknown>,
    options?: { turnCount?: number },
  ): Promise<PlaythroughRecord | null> {
    if (!this.state) await this.load();
    if (!this.ngPlusState) await this.load();
    if (!this.state || !this.ngPlusState) throw new Error('achievement-engine not loaded');

    const detection = detectEnding(statData);
    if (!detection) return null;

    const player = asObj(statData.主角);
    const time = asObj(statData.时间);
    const day = asNum(time.天数) || 1;

    const record = await this.endPlaythrough({
      endingId: detection.endingId,
      endingTitle: detection.endingTitle,
      endingType: detection.endingType,
      playerName: asStr(player.玩家姓名) || '玩家',
      identityName: asStr(player.玩家身份) || '自定义',
      dayInGame: day,
      turnCount: options?.turnCount ?? 0,
      finalStats: extractPlayerStats(statData),
    });

    // 结束后评估结局成就(ending_* 依赖 playthroughs)
    await this.evaluateAll(statData, {
      turnCount: options?.turnCount ?? 0,
      cgUnlockedCount: cgGallery.getStats().unlocked,
      cgTotalCount: cgGallery.getStats().total,
    });

    return record;
  }

  /**
   * 开始新周目(NG+)
   *  - 周目序号 +1
   *  - 注入继承属性(部分)
   *  - 激活解锁标记
   */
  async startNewGamePlus(options?: {
    inheritStats?: NgPlusState['inheritedStats'];
    inheritItems?: string[];
    pointsToSpend?: number;
  }): Promise<NgPlusState> {
    if (!this.state) await this.load();
    if (!this.ngPlusState) await this.load();
    if (!this.state || !this.ngPlusState) throw new Error('achievement-engine not loaded');

    this.ngPlusState.activated = true;
    this.ngPlusState.currentPlaythrough += 1;
    this.ngPlusState.availablePoints = this.state.totalInheritPoints - (options?.pointsToSpend ?? 0);
    if (this.ngPlusState.availablePoints < 0) this.ngPlusState.availablePoints = 0;
    this.ngPlusState.unlockedFlags = [...this.state.activeFlags];
    this.ngPlusState.inheritedStats = options?.inheritStats;
    this.ngPlusState.inheritedItems = options?.inheritItems;
    this.ngPlusState.sourcePlaythrough = this.playthroughs.length;
    await this.save();
    return this.ngPlusState;
  }

  /**
   * 生成 NG+ 初始 stat_data(基于继承状态修改默认值)
   *  - 注入继承的主角属性(50% 衰减)
   *  - 注入继承的物品
   *  - 设置 周目数 flag
   */
  generateNgPlusInitialStatData(baseStatData: Record<string, unknown>): Record<string, unknown> {
    if (!this.ngPlusState) return baseStatData;
    const ng = this.ngPlusState;
    const result: Record<string, unknown> = JSON.parse(JSON.stringify(baseStatData));

    // 注入主角属性(50% 衰减)
    if (ng.inheritedStats) {
      const player = asObj(result.主角);
      for (const [k, v] of Object.entries(ng.inheritedStats)) {
        if (typeof v === 'number' && v > 0) {
          player[k] = Math.round(v * 0.5);
        }
      }
      result.主角 = player;
    }

    // 注入物品
    if (ng.inheritedItems && ng.inheritedItems.length > 0) {
      const bag = asObj(result.物品栏);
      for (const itemId of ng.inheritedItems) {
        if (!(itemId in bag)) bag[itemId] = 1;
      }
      result.物品栏 = bag;
    }

    // 注入 NG+ 标记
    const hidden = asObj(result.隐藏);
    hidden.NG_PLUS_ACTIVATED = 1;
    hidden.NG_PLUS_PLAYTHROUGH = ng.currentPlaythrough;
    result.隐藏 = hidden;

    return result;
  }

  /** 检查是否已解锁某标记 */
  hasFlag(flag: string): boolean {
    return this.state?.activeFlags.includes(flag) ?? false;
  }

  /** 查询某条成就的解锁记录 */
  getUnlockRecord(id: string): AchievementUnlockRecord | undefined {
    return this.state?.unlocks[id];
  }

  /** 检查某条成就是否已解锁 */
  isUnlocked(id: string): boolean {
    return !!this.state?.unlocks[id];
  }

  /** 获取按类型分组的统计 */
  getStatsByType(): Record<AchievementType, { total: number; unlocked: number }> {
    const result = {} as Record<AchievementType, { total: number; unlocked: number }>;
    for (const t of ['ending', 'heroine', 'hidden', 'skill', 'cg', 'economy', 'milestone'] as AchievementType[]) {
      const all = ACHIEVEMENTS.filter((a) => a.type === t);
      const unlocked = all.filter((a) => this.isUnlocked(a.id)).length;
      result[t] = { total: all.length, unlocked };
    }
    return result;
  }

  /** 按 rarity 统计 */
  getStatsByRarity(): Record<AchievementRarity, { total: number; unlocked: number }> {
    const result = {} as Record<AchievementRarity, { total: number; unlocked: number }>;
    for (const r of ['common', 'rare', 'epic', 'legendary'] as AchievementRarity[]) {
      const all = ACHIEVEMENTS.filter((a) => a.rarity === r);
      const unlocked = all.filter((a) => this.isUnlocked(a.id)).length;
      result[r] = { total: all.length, unlocked };
    }
    return result;
  }

  /** 从 MvuRuntime 评估(便捷方法) */
  async evaluateFromMvu(mvu: MvuRuntime, options?: { cgUnlockedCount?: number; cgTotalCount?: number; turnCount?: number }): Promise<AchievementUnlockRecord[]> {
    const sd = mvu.snapshot();
    return this.evaluateAll(sd, options);
  }
}

// 单例
export const achievementEngine = new AchievementEngine();

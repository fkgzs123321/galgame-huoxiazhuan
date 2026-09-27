/**
 * 剧情冲突引擎(阶段3 步骤7 增强)
 *
 * 职责:
 *  - 根据当前 stat_data 匹配可触发的冲突场景
 *  - 执行玩家选择的解决路径(骰子判定)
 *  - 计算关系影响(好感/信任/嫉妒/心跳/关系阶段)
 *  - 生成 stateOps(合并到 CandidateChangeSet)
 *  - 生成叙事文本(注入主聊天AI 上下文)
 *
 * 与 CombatEngine 的关系:
 *  - CombatEngine 是通用的回合制战斗模拟器
 *  - ConflictEngine 是剧情驱动的冲突解决器
 *  - 两者可共存:CombatEngine 处理随机遭遇,ConflictEngine 处理剧情冲突
 *
 * 集成点:
 *  - 玩家在 ConflictPanel 选择场景和路径后,调用 ConflictEngine.resolve()
 *  - 返回的 settlement 注入主聊天AI 上下文
 *  - 返回的 stateOps 合并到 CandidateChangeSet
 */

import {
  CONFLICT_SCENARIOS,
  type ConflictScenario,
  type ResolutionPath,
  type ResolutionPathDef,
  type RelationshipImpact,
  type ConflictType,
  type ConflictSeverity,
} from '../content/conflicts/conflict-scenarios';
import type { CombatSkillType } from './combat-engine';
import { createLcg, seedFromStatData } from './lcg-engine';

// ───────────────────────────────────────────────────────────
//  类型定义
// ───────────────────────────────────────────────────────────

/** 玩家当前的 stat_data 上下文 */
export interface ConflictContext {
  /** stat_data 快照 */
  statData: Record<string, unknown>;
  /** 当前难度 */
  difficulty?: '轻松' | '普通' | '挑战' | '地狱';
}

/** 骰子判定结果 */
export interface ConflictDiceRoll {
  /** 使用的技能类型 */
  skill: CombatSkillType;
  /** 玩家技能值 */
  skillValue: number;
  /** 1d100 骰子结果 */
  dice: number;
  /** 总值(技能值+骰子) */
  total: number;
  /** 难度阈值 */
  threshold: number;
  /** 是否成功 */
  success: boolean;
  /** 大成功(骰子≤5) */
  criticalSuccess: boolean;
  /** 大失败(骰子≥96) */
  criticalFailure: boolean;
}

/** 单个关系影响应用结果 */
export interface AppliedImpact {
  /** 女角姓名 */
  heroineName: string;
  /** 影响数据 */
  impact: RelationshipImpact;
  /** 应用前的值 */
  before: { affection: number; trust: number; jealousy: number; heartbeat: number; relationshipStage: string };
  /** 应用后的值 */
  after: { affection: number; trust: number; jealousy: number; heartbeat: number; relationshipStage: string };
  /** 是否发生关系阶段推进 */
  stageAdvanced: boolean;
}

/** 冲突解决结果 */
export interface ConflictResolution {
  /** 场景ID */
  scenarioId: string;
  /** 场景名称 */
  scenarioName: string;
  /** 选择的路径 */
  chosenPath: ResolutionPath;
  /** 路径定义 */
  pathDef: ResolutionPathDef;
  /** 骰子判定 */
  roll: ConflictDiceRoll;
  /** 是否成功 */
  success: boolean;
  /** 叙事文本(注入主聊天AI) */
  narrative: string;
  /** 关系影响应用结果 */
  appliedImpacts: AppliedImpact[];
  /** 状态变更 ops(合并到 CandidateChangeSet) */
  stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
  /** 触发的 flag */
  triggeredFlags: string[];
  /** 是否触发 BAD_END */
  triggeredBadEnd?: string;
  /** 是否违法行为 */
  isIllegal: boolean;
  /** 时间戳 */
  ts: number;
}

/** 可触发的场景(匹配后返回) */
export interface TriggerableScenario {
  scenario: ConflictScenario;
  /** 匹配的原因 */
  matchReason: string;
  /** 关联女角(若有) */
  relatedHeroine?: string;
}

// ───────────────────────────────────────────────────────────
//  辅助:stat_data 读取
// ───────────────────────────────────────────────────────────

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function asNum(v: unknown): number {
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}

function asStr(v: unknown, def = ''): string {
  return typeof v === 'string' ? v : def;
}

function asBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return v === 'true' || v === '1';
  return false;
}

/** 从 stat_data 读取玩家技能值 */
function getSkillValue(statData: Record<string, unknown>, skill: CombatSkillType): number {
  const skills = asObj(statData.技能);
  return asNum(skills[skill]);
}

/** 从 stat_data 读取 flag(从 隐藏 命名空间) */
function getFlag(statData: Record<string, unknown>, flagName: string): boolean {
  const hidden = asObj(statData.隐藏);
  return asBool(hidden[flagName]);
}

/** 从 stat_data 读取女角字段 */
function getHeroineField(statData: Record<string, unknown>, heroineName: string, field: string): unknown {
  // 优先从 女角.<姓名> 命名空间读取
  const heroines = asObj(statData.女角);
  const heroine = asObj(heroines[heroineName]);
  if (heroine[field] !== undefined) return heroine[field];

  // 回退到 当前女角 命名空间(若当前女角就是该姓名)
  const currentHeroine = asObj(statData.当前女角);
  if (asStr(currentHeroine.姓名) === heroineName) {
    return currentHeroine[field];
  }
  return undefined;
}

/** 从 stat_data 读取当前女角姓名 */
function getCurrentHeroineName(statData: Record<string, unknown>): string {
  const scene = asObj(statData.场景);
  const currentHeroine = asObj(statData.当前女角);
  return asStr(currentHeroine.姓名, asStr(scene.当前女角名, ''));
}

// ───────────────────────────────────────────────────────────
//  ConflictEngine 主体
// ───────────────────────────────────────────────────────────

class ConflictEngine {
  /**
   * 扫描所有场景,返回当前可触发的场景列表
   *  - 检查地点/天数/时段/flag/女角好感等条件
   */
  findTriggerable(ctx: ConflictContext): TriggerableScenario[] {
    const sd = ctx.statData;
    const scene = asObj(sd.场景);
    const time = asObj(sd.时间);
    const location = asStr(scene.当前地点);
    const day = asNum(time.天数);
    const timeSlot = asStr(time.时段);

    const result: TriggerableScenario[] = [];

    for (const scenario of CONFLICT_SCENARIOS) {
      const cond = scenario.triggerCondition;
      const matchReasons: string[] = [];

      // 地点匹配(任一)
      if (!cond.locations.some((l) => location.includes(l) || l.includes(location))) {
        continue;
      }
      matchReasons.push(`地点匹配(${location})`);

      // 天数范围
      if (day < cond.dayRange[0] || day > cond.dayRange[1]) {
        continue;
      }
      matchReasons.push(`天数${day}∈[${cond.dayRange[0]},${cond.dayRange[1]}]`);

      // 时段
      if (!cond.timeSlots.includes(timeSlot)) {
        continue;
      }
      matchReasons.push(`时段${timeSlot}`);

      // 前置 flag
      if (cond.requiredFlags) {
        let allMet = true;
        for (const f of cond.requiredFlags) {
          // 特殊处理:变数屋访问次数_10 表示 >=10
          if (f === '变数屋访问次数_10') {
            const visits = asNum(asObj(sd.隐藏).变数屋访问次数);
            if (visits < 10) {
              allMet = false;
              break;
            }
          } else if (!getFlag(sd, f)) {
            allMet = false;
            break;
          }
        }
        if (!allMet) continue;
        matchReasons.push(`前置flag满足`);
      }

      // 排除 flag
      if (cond.excludedFlags) {
        let anyExcluded = false;
        for (const f of cond.excludedFlags) {
          if (getFlag(sd, f)) {
            anyExcluded = true;
            break;
          }
        }
        if (anyExcluded) continue;
        matchReasons.push(`排除flag未触发`);
      }

      // 关联女角好感度
      if (cond.relatedHeroine && cond.heroineAffectionMin !== undefined) {
        const aff = asNum(getHeroineField(sd, cond.relatedHeroine, '好感度'));
        if (aff < cond.heroineAffectionMin) {
          continue;
        }
        matchReasons.push(`${cond.relatedHeroine}好感${aff}≥${cond.heroineAffectionMin}`);
      }

      result.push({
        scenario,
        matchReason: matchReasons.join(', '),
        relatedHeroine: cond.relatedHeroine,
      });
    }

    return result;
  }

  /**
   * 解决冲突场景
   *  - 根据玩家选择的路径执行骰子判定
   *  - 计算关系影响
   *  - 生成 stateOps 和叙事文本
   */
  resolve(
    scenarioId: string,
    chosenPath: ResolutionPath,
    ctx: ConflictContext,
  ): ConflictResolution {
    const scenario = CONFLICT_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`冲突场景不存在: ${scenarioId}`);
    }

    const pathDef = scenario.resolutionPaths.find((p) => p.path === chosenPath);
    if (!pathDef) {
      throw new Error(`解决路径不存在: ${scenarioId}/${chosenPath}`);
    }

    // 骰子判定
    const skillValue = getSkillValue(ctx.statData, chosenPath);
    const lcg = createLcg({
      ...seedFromStatData(ctx.statData),
      salt: `conflict-${scenarioId}-${chosenPath}`,
    });
    const dice = lcg.rollD100();
    const total = skillValue + dice;
    const threshold = pathDef.threshold;
    const criticalSuccess = dice <= 5;
    const criticalFailure = dice >= 96;
    const success = criticalSuccess || (!criticalFailure && total >= threshold);

    const roll: ConflictDiceRoll = {
      skill: chosenPath,
      skillValue,
      dice,
      total,
      threshold,
      success,
      criticalSuccess,
      criticalFailure,
    };

    // 应用关系影响
    const impacts = success ? pathDef.successImpacts : pathDef.failureImpacts;
    const appliedImpacts = this.applyImpacts(impacts, ctx.statData, pathDef, success, criticalSuccess, criticalFailure);

    // 生成 stateOps
    const stateOps = this.generateStateOps(scenario, pathDef, success, ctx, appliedImpacts, criticalSuccess, criticalFailure);

    // 生成叙事文本
    const narrative = this.generateNarrative(scenario, pathDef, roll, success, criticalSuccess, criticalFailure, appliedImpacts);

    // 触发的 flag
    const triggeredFlags: string[] = [];
    const pushFlag = (f: string) => {
      if (!triggeredFlags.includes(f)) triggeredFlags.push(f);
    };
    if (success) {
      if (pathDef.successFlags) pathDef.successFlags.forEach(pushFlag);
      if (scenario.victoryFlags) scenario.victoryFlags.forEach(pushFlag);
    } else {
      if (pathDef.failureFlags) pathDef.failureFlags.forEach(pushFlag);
    }
    // 大成功额外 flag
    if (criticalSuccess && scenario.victoryFlags) {
      for (const f of scenario.victoryFlags) {
        pushFlag(f);
      }
    }

    // 失败时可能触发 BAD_END
    let triggeredBadEnd: string | undefined;
    if (!success && scenario.failureBadEnd) {
      triggeredBadEnd = scenario.failureBadEnd;
    }

    return {
      scenarioId,
      scenarioName: scenario.name,
      chosenPath,
      pathDef,
      roll,
      success,
      narrative,
      appliedImpacts,
      stateOps,
      triggeredFlags,
      triggeredBadEnd,
      isIllegal: pathDef.isIllegal ?? false,
      ts: Date.now(),
    };
  }

  // ─────────────────────────────────────────────────────────
  //  辅助:应用关系影响
  // ─────────────────────────────────────────────────────────

  private applyImpacts(
    impacts: RelationshipImpact[],
    statData: Record<string, unknown>,
    pathDef: ResolutionPathDef,
    success: boolean,
    criticalSuccess: boolean,
    criticalFailure: boolean,
  ): AppliedImpact[] {
    const applied: AppliedImpact[] = [];

    for (const impact of impacts) {
      // 解析女角姓名(空字符串表示当前女角)
      const heroineName = impact.heroineName || getCurrentHeroineName(statData);
      if (!heroineName) continue;

      // 读取当前值(从 当前女角 或 女角.<姓名> 命名空间)
      const isCurrentHeroine = heroineName === getCurrentHeroineName(statData);
      const namespace = isCurrentHeroine ? '当前女角' : `女角.${heroineName}`;

      const before = {
        affection: asNum(getHeroineField(statData, heroineName, '好感度')),
        trust: asNum(getHeroineField(statData, heroineName, '信任度')),
        jealousy: asNum(getHeroineField(statData, heroineName, '嫉妒值')),
        heartbeat: asNum(getHeroineField(statData, heroineName, '心跳')),
        relationshipStage: asStr(getHeroineField(statData, heroineName, '关系阶段'), '初识'),
      };

      // 计算变化值(大成功×倍率,大失败额外减)
      let affDelta = impact.affectionDelta;
      if (criticalSuccess && pathDef.criticalSuccessBonus) {
        affDelta = Math.round(affDelta * pathDef.criticalSuccessBonus.affectionMultiplier);
      }
      if (criticalFailure && pathDef.criticalFailurePenalty) {
        affDelta += pathDef.criticalFailurePenalty.affectionDelta;
      }

      const after = {
        affection: Math.max(-100, Math.min(100, before.affection + affDelta)),
        trust: Math.max(-100, Math.min(100, before.trust + impact.trustDelta)),
        jealousy: Math.max(-100, Math.min(100, before.jealousy + impact.jealousyDelta)),
        heartbeat: Math.max(-100, Math.min(100, before.heartbeat + impact.heartbeatDelta)),
        relationshipStage: before.relationshipStage,
      };

      // 关系阶段推进(仅在成功且标记为推进时)
      let stageAdvanced = false;
      if (success && impact.relationshipStageAdvance) {
        const stages = ['初识', '熟悉', '暧昧', '亲密', '攻略完成'];
        const currentIdx = stages.indexOf(before.relationshipStage);
        if (currentIdx >= 0 && currentIdx < stages.length - 1) {
          after.relationshipStage = stages[currentIdx + 1];
          stageAdvanced = true;
        }
      }

      applied.push({
        heroineName,
        impact,
        before,
        after,
        stageAdvanced,
      });
    }

    return applied;
  }

  // ─────────────────────────────────────────────────────────
  //  辅助:生成 stateOps
  // ─────────────────────────────────────────────────────────

  private generateStateOps(
    scenario: ConflictScenario,
    pathDef: ResolutionPathDef,
    success: boolean,
    ctx: ConflictContext,
    appliedImpacts: AppliedImpact[],
    criticalSuccess: boolean,
    criticalFailure: boolean,
  ): Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> {
    const ops: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [];
    const sd = ctx.statData;
    const player = asObj(sd.主角);
    const lcg = createLcg({
      ...seedFromStatData(sd),
      salt: `conflict-ops-${scenario.id}-${pathDef.path}`,
    });

    // 1. 关系影响 ops(对每个受影响女角)
    for (const ap of appliedImpacts) {
      const isCurrentHeroine = ap.heroineName === getCurrentHeroineName(sd);
      const ns = isCurrentHeroine ? '当前女角' : `女角.${ap.heroineName}`;
      ops.push({ op: 'replace', path: `${ns}.好感度`, value: ap.after.affection });
      ops.push({ op: 'replace', path: `${ns}.信任度`, value: ap.after.trust });
      ops.push({ op: 'replace', path: `${ns}.嫉妒值`, value: ap.after.jealousy });
      ops.push({ op: 'replace', path: `${ns}.心跳`, value: ap.after.heartbeat });
      if (ap.stageAdvanced) {
        ops.push({ op: 'replace', path: `${ns}.关系阶段`, value: ap.after.relationshipStage });
      }
    }

    // 2. flag 写入 ops
    const flagsToWrite: string[] = [];
    const pushFlagToWrite = (f: string) => {
      if (!flagsToWrite.includes(f)) flagsToWrite.push(f);
    };
    if (success) {
      if (pathDef.successFlags) pathDef.successFlags.forEach(pushFlagToWrite);
      if (scenario.victoryFlags) scenario.victoryFlags.forEach(pushFlagToWrite);
    } else {
      if (pathDef.failureFlags) pathDef.failureFlags.forEach(pushFlagToWrite);
    }
    if (criticalSuccess && scenario.victoryFlags) {
      for (const f of scenario.victoryFlags) {
        pushFlagToWrite(f);
      }
    }
    for (const f of flagsToWrite) {
      ops.push({ op: 'replace', path: `隐藏.${f}`, value: true });
    }

    // 3. 违法计数(若 isIllegal 且实际发生冲突)
    if (pathDef.isIllegal && (success || !criticalSuccess)) {
      const currentIllegal = asNum(player.违法计数);
      ops.push({ op: 'replace', path: '主角.违法计数', value: Math.min(3, currentIllegal + 1) });
    }

    // 4. 疲劳(冲突消耗精力)
    const severityFatigue: Record<ConflictSeverity, number> = {
      轻微: 5,
      中等: 10,
      严重: 20,
      致命: 35,
    };
    const fatigueDelta = severityFatigue[scenario.severity];
    const currentFatigue = asNum(player.疲劳);
    ops.push({ op: 'replace', path: '主角.疲劳', value: Math.min(100, currentFatigue + fatigueDelta) });

    // 5. 技能经验(使用过的技能+1~3)
    const skills = asObj(sd.技能);
    const usedSkill = pathDef.path;
    const currentSkillVal = asNum(skills[usedSkill]);
    const skillExp = lcg.roll(1, 3);
    ops.push({ op: 'replace', path: `技能.${usedSkill}`, value: Math.min(100, currentSkillVal + skillExp) });

    // 6. BAD_END 标识(若失败且场景有 BAD_END)
    if (!success && scenario.failureBadEnd) {
      ops.push({ op: 'replace', path: '临时.死结局标识', value: scenario.failureBadEnd });
    }

    // 7. 声誉变化(严重/致命冲突+5/-10)
    if (scenario.severity === '严重' || scenario.severity === '致命') {
      const currentRep = asNum(player.声誉);
      const repDelta: number = success ? 5 : -10;
      ops.push({ op: 'replace', path: '主角.声誉', value: Math.max(0, Math.min(100, currentRep + repDelta)) });
    }

    return ops;
  }

  // ─────────────────────────────────────────────────────────
  //  辅助:生成叙事文本
  // ─────────────────────────────────────────────────────────

  private generateNarrative(
    scenario: ConflictScenario,
    pathDef: ResolutionPathDef,
    roll: ConflictDiceRoll,
    success: boolean,
    criticalSuccess: boolean,
    criticalFailure: boolean,
    appliedImpacts: AppliedImpact[],
  ): string {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════');
    lines.push(`      ⚔ ${scenario.name} ⚔`);
    lines.push('═══════════════════════════════════════');
    lines.push('');
    lines.push(`【场景】${scenario.description}`);
    lines.push('');
    lines.push(`【对手】${scenario.opponentName}`);
    lines.push(`  ${scenario.opponentDescription}`);
    lines.push('');
    lines.push('───────────── 选 择 与 判 定 ─────────────');
    lines.push(`你选择了:${pathDef.name}(${pathDef.description})`);
    lines.push(`  技能:${roll.skill}  技能值:${roll.skillValue}`);
    lines.push(`  骰子:${roll.dice}  总值:${roll.total}  阈值:${roll.threshold}`);
    if (criticalSuccess) lines.push('  ★ 大成功!');
    if (criticalFailure) lines.push('  ✗ 大失败!');
    lines.push(`  结果:${success ? '成功' : '失败'}`);
    lines.push('');

    // 结果描述
    lines.push('───────────── 结 果 描 述 ─────────────');
    if (criticalSuccess && pathDef.criticalSuccessBonus) {
      lines.push(pathDef.criticalSuccessBonus.description);
      lines.push('');
    }
    if (criticalFailure && pathDef.criticalFailurePenalty) {
      lines.push(pathDef.criticalFailurePenalty.description);
      lines.push('');
    }
    lines.push(success ? pathDef.successDescription : pathDef.failureDescription);
    lines.push('');

    // 关系影响
    if (appliedImpacts.length > 0) {
      lines.push('───────────── 关 系 影 响 ─────────────');
      for (const ap of appliedImpacts) {
        const affChange = ap.after.affection - ap.before.affection;
        const trustChange = ap.after.trust - ap.before.trust;
        const jealousyChange = ap.after.jealousy - ap.before.jealousy;
        const heartbeatChange = ap.after.heartbeat - ap.before.heartbeat;
        lines.push(`【${ap.heroineName}】`);
        if (affChange !== 0) lines.push(`  好感度:${ap.before.affection} → ${ap.after.affection}(${affChange > 0 ? '+' : ''}${affChange})`);
        if (trustChange !== 0) lines.push(`  信任度:${ap.before.trust} → ${ap.after.trust}(${trustChange > 0 ? '+' : ''}${trustChange})`);
        if (jealousyChange !== 0) lines.push(`  嫉妒值:${ap.before.jealousy} → ${ap.after.jealousy}(${jealousyChange > 0 ? '+' : ''}${jealousyChange})`);
        if (heartbeatChange !== 0) lines.push(`  心跳:${ap.before.heartbeat} → ${ap.after.heartbeat}(${heartbeatChange > 0 ? '+' : ''}${heartbeatChange})`);
        if (ap.stageAdvanced) lines.push(`  ★ 关系阶段推进:${ap.before.relationshipStage} → ${ap.after.relationshipStage}`);
      }
      lines.push('');
    }

    // 违法警告
    if (pathDef.isIllegal) {
      lines.push('⚠ 警告:此行为属于违法行为,违法计数+1(累计3次触发 BAD_END_7)');
      lines.push('');
    }

    lines.push('═══════════════════════════════════════');
    return lines.join('\n');
  }

  // ─────────────────────────────────────────────────────────
  //  辅助:查询接口(供 UI 使用)
  // ─────────────────────────────────────────────────────────

  /** 获取所有场景(供 UI 展示) */
  getAllScenarios(): ConflictScenario[] {
    return [...CONFLICT_SCENARIOS];
  }

  /** 根据 ID 获取场景 */
  getScenarioById(id: string): ConflictScenario | undefined {
    return CONFLICT_SCENARIOS.find((s) => s.id === id);
  }

  /** 按类型筛选 */
  filterByType(type: ConflictType): ConflictScenario[] {
    return CONFLICT_SCENARIOS.filter((s) => s.type === type);
  }

  /** 统计信息 */
  getStats(): {
    total: number;
    byType: Record<ConflictType, number>;
    bySeverity: Record<ConflictSeverity, number>;
  } {
    const byType: Record<ConflictType, number> = {
      解救: 0, 对峙: 0, 制止: 0, 骚扰: 0, 调停: 0, 威胁: 0, 隐藏: 0,
    };
    const bySeverity: Record<ConflictSeverity, number> = {
      轻微: 0, 中等: 0, 严重: 0, 致命: 0,
    };
    for (const s of CONFLICT_SCENARIOS) {
      byType[s.type]++;
      bySeverity[s.severity]++;
    }
    return { total: CONFLICT_SCENARIOS.length, byType, bySeverity };
  }
}

/** 单例 */
export const conflictEngine = new ConflictEngine();

/**
 * CombatEngine · 战斗结算引擎(阶段3 步骤2 + 步骤7 增强)
 *
 * 职责:
 *  - 战斗触发判定(玩家行动+场景+对手)
 *  - 骰子判定(LCG 7类预判:力量/敏捷/智力/意志/潜行/口才/格斗)
 *  - 伤害计算(攻防差值×技能系数×难度倍率)
 *  - 胜负裁定(HP 归零/逃跑成功/回合上限)
 *  - 生成战斗结算页(双方属性/骰子/伤害/结果)
 *  - 生成状态变更 ops(疲劳/违法计数/好感度/声誉等)
 *  - 阶段3 步骤7 增强:强迫抵抗场景的二元判定(抵抗 vs 不抵抗)
 *
 * LCG 骰子规则(对齐原卡):
 *  - 玩家技能值 + 1d100 ≥ 难度阈值 → 成功
 *  - 大成功(≤5)/大失败(≥96)触发特殊效果
 *  - 7 类预判对应 7 个技能:力量/敏捷/智力/意志/潜行/口才/格斗
 *
 * 集成点:
 *  - TriggerDispatcher 评估 combat 触发后,由 App.tsx 调用 CombatEngine.settle()
 *  - 返回的 settlement 注入主聊天AI 上下文(战斗结算页)
 *  - 返回的 stateOps 合并到 CandidateChangeSet
 *  - 强迫抵抗场景由 ConflictPanel 调用 CombatEngine.settleResistance()
 */

import type {
  ResistanceScenario,
  ResistancePath,
  ResistanceType,
  ResistanceSeverity,
} from '../content/conflicts/resistance-scenarios';
import { createLcg, seedFromStatData } from './lcg-engine';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

export type CombatSkillType = '力量' | '敏捷' | '智力' | '意志' | '潜行' | '口才' | '格斗';

export interface Combatant {
  /** 名称 */
  name: string;
  /** 当前 HP */
  hp: number;
  /** 最大 HP */
  maxHp: number;
  /** 6 维属性(0-100) */
  attributes: {
    魅力: number;
    学业: number;
    体力: number;
    社交: number;
    敏感: number;
    声誉: number;
  };
  /** 13 项技能(0-100) */
  skills: {
    力量: number;
    敏捷: number;
    智力: number;
    意志: number;
    潜行: number;
    口才: number;
    格斗: number;
  };
  /** 难度系数(1.0=普通,0.8=简单,1.2=困难,1.5=地狱) */
  difficultyMultiplier: number;
}

export interface DiceRoll {
  /** 技能类型 */
  skill: CombatSkillType;
  /** 技能值 */
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

export interface DamageResult {
  /** 攻击方 */
  attacker: string;
  /** 防御方 */
  defender: string;
  /** 基础伤害 */
  baseDamage: number;
  /** 技能系数 */
  skillMultiplier: number;
  /** 难度倍率 */
  difficultyMultiplier: number;
  /** 最终伤害 */
  finalDamage: number;
  /** 防御方剩余 HP */
  defenderRemainingHp: number;
}

export interface CombatRound {
  /** 回合序号 */
  round: number;
  /** 攻击方名称 */
  attacker: string;
  /** 骰子判定 */
  roll: DiceRoll;
  /** 伤害结果(成功时) */
  damage?: DamageResult;
  /** 回合描述 */
  description: string;
}

export interface CombatSettlement {
  /** 战斗触发原因 */
  triggerReason: string;
  /** 玩家 */
  player: Combatant;
  /** 对手 */
  opponent: Combatant;
  /** 全部回合 */
  rounds: CombatRound[];
  /** 战斗结果 */
  result: 'player_win' | 'player_lose' | 'player_flee' | 'draw';
  /** 结果描述 */
  resultDescription: string;
  /** 状态变更 ops(合并到 CandidateChangeSet) */
  stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
  /** 战斗结算页文本(注入主聊天AI 上下文) */
  settlementPage: string;
  /** 总回合数 */
  totalRounds: number;
  /** 总耗时(模拟) */
  elapsedMs: number;
}

export interface CombatTriggerCondition {
  /** 玩家行动文本 */
  userAction: string;
  /** 玩家 stat_data 快照 */
  statData: Record<string, unknown>;
  /** 对手名称(可选,未提供时根据场景推断) */
  opponentName?: string;
  /** 难度(默认普通) */
  difficulty?: '轻松' | '普通' | '挑战' | '地狱';
}

// ───────────────────────────────────────────────────────────
//  强迫抵抗相关类型(阶段3 步骤7 增强)
// ───────────────────────────────────────────────────────────

/** 抵抗结果分类 */
export type ResistanceOutcome = 'resisted' | 'failed' | 'no_resistance';

/** 单个关系影响应用结果(强迫抵抗专用) */
export interface ResistanceAppliedImpact {
  /** 女角姓名 */
  heroineName: string;
  /** 各项 delta */
  affectionDelta: number;
  trustDelta: number;
  jealousyDelta: number;
  heartbeatDelta: number;
  /** 是否推进关系阶段 */
  relationshipStageAdvance: boolean;
  /** 应用前的值 */
  before: { affection: number; trust: number; jealousy: number; heartbeat: number; relationshipStage: string };
  /** 应用后的值 */
  after: { affection: number; trust: number; jealousy: number; heartbeat: number; relationshipStage: string };
}

/** 强迫抵抗解决结果 */
export interface ResistanceResolution {
  /** 场景ID */
  scenarioId: string;
  /** 场景名称 */
  scenarioName: string;
  /** 场景类型 */
  type: ResistanceType;
  /** 严重程度 */
  severity: ResistanceSeverity;
  /** 强迫者信息 */
  aggressor: { name: string; description: string; hp: number };
  /** 被强迫者(若玩家则 isPlayer=true) */
  victim: { name: string; isPlayer: boolean };
  /** 选择的抵抗路径 */
  chosenPath: ResistancePath;
  /** 抵抗结果类型 */
  outcome: ResistanceOutcome;
  /** 骰子判定(不抵抗时为 null) */
  roll: DiceRoll | null;
  /** 是否成功(不抵抗视为 false) */
  success: boolean;
  /** 是否大成功 */
  criticalSuccess: boolean;
  /** 是否大失败 */
  criticalFailure: boolean;
  /** 叙事文本 */
  narrative: string;
  /** 关系影响应用结果 */
  appliedImpacts: ResistanceAppliedImpact[];
  /** 状态变更 ops(合并到 CandidateChangeSet) */
  stateOps: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
  /** 触发的 flag */
  triggeredFlags: string[];
  /** 是否触发 BAD_END */
  triggeredBadEnd?: string;
  /** 是否违法行为 */
  isIllegal: boolean;
  /** 战斗记录(供 UI 展示) */
  combatLog: string[];
  /** 战斗结算页文本(注入主聊天AI) */
  settlementPage: string;
  /** 时间戳 */
  ts: number;
}

/** 强迫抵抗触发上下文 */
export interface ResistanceContext {
  /** stat_data 快照 */
  statData: Record<string, unknown>;
  /** 玩家选择的抵抗路径 ID ('no_resistance' 表示不抵抗) */
  pathId: string | 'no_resistance';
  /** 难度(默认普通) */
  difficulty?: '轻松' | '普通' | '挑战' | '地狱';
}

// ───────────────────────────────────────────────────────────
//  CombatEngine 类
// ───────────────────────────────────────────────────────────

export class CombatEngine {
  /** 最大回合数(防止无限循环) */
  private static readonly MAX_ROUNDS = 10;

  /**
   * 战斗结算
   *  - 从 stat_data 提取玩家属性
   *  - 根据场景推断对手(或用传入的对手名)
   *  - 模拟 10 回合内的骰子判定+伤害计算
   *  - 裁定胜负,生成结算页+ops
   */
  settle(condition: CombatTriggerCondition): CombatSettlement {
    const startedAt = Date.now();
    const player = this.extractPlayer(condition.statData, condition.difficulty ?? '普通');
    const opponent = this.extractOpponent(condition.statData, condition.opponentName, condition.difficulty ?? '普通');
    const baseSeed = seedFromStatData(condition.statData);

    const rounds: CombatRound[] = [];
    let attacker: 'player' | 'opponent' = player.skills.敏捷 >= opponent.skills.敏捷 ? 'player' : 'opponent';
    let playerHp = player.hp;
    let opponentHp = opponent.hp;

    for (let round = 1; round <= CombatEngine.MAX_ROUNDS; round++) {
      // 检查胜负
      if (playerHp <= 0 || opponentHp <= 0) break;

      const isPlayerAttacking = attacker === 'player';
      const atk = isPlayerAttacking ? player : opponent;
      const def = isPlayerAttacking ? opponent : player;

      // 选择技能(优先格斗,其次力量)
      const skill: CombatSkillType = '格斗';
      const skillValue = atk.skills[skill];

      // 骰子判定(1d100)
      const lcg = createLcg({
        ...baseSeed,
        salt: `combat-round-${round}-${isPlayerAttacking ? 'player' : 'opponent'}`,
      });
      const dice = lcg.rollD100();
      const total = skillValue + dice;
      const threshold = 50 + def.skills.格斗 * 0.5;
      const success = total >= threshold;
      const criticalSuccess = dice <= 5;
      const criticalFailure = dice >= 96;

      const roll: DiceRoll = {
        skill,
        skillValue,
        dice,
        total,
        threshold,
        success: success || criticalSuccess,
        criticalSuccess,
        criticalFailure,
      };

      let damage: DamageResult | undefined;
      let description: string;

      if (criticalFailure) {
        // 大失败:攻击方反受伤害
        const recoil = lcg.roll(10, 19);
        if (isPlayerAttacking) {
          playerHp -= recoil;
        } else {
          opponentHp -= recoil;
        }
        description = `${atk.name} 大失败(骰子=${dice}),反受 ${recoil} 点伤害!`;
      } else if (roll.success) {
        // 成功:计算伤害
        const baseDamage = lcg.roll(10, 29);
        const skillMultiplier = criticalSuccess ? 2.0 : 1.0;
        const difficultyMultiplier = atk.difficultyMultiplier;
        const finalDamage = Math.floor(baseDamage * skillMultiplier * difficultyMultiplier);
        if (isPlayerAttacking) {
          opponentHp -= finalDamage;
        } else {
          playerHp -= finalDamage;
        }
        damage = {
          attacker: atk.name,
          defender: def.name,
          baseDamage,
          skillMultiplier,
          difficultyMultiplier,
          finalDamage,
          defenderRemainingHp: Math.max(0, isPlayerAttacking ? opponentHp : playerHp),
        };
        description = criticalSuccess
          ? `${atk.name} 大成功(骰子=${dice}),造成 ${finalDamage} 点暴击伤害!`
          : `${atk.name} 攻击成功(骰子=${dice},总值${total}≥${threshold}),造成 ${finalDamage} 点伤害`;
      } else {
        description = `${atk.name} 攻击失败(骰子=${dice},总值${total}<${threshold}),未命中`;
      }

      rounds.push({
        round,
        attacker: atk.name,
        roll,
        damage,
        description,
      });

      // 交换攻击方
      attacker = attacker === 'player' ? 'opponent' : 'player';
    }

    // 裁定胜负
    let result: CombatSettlement['result'];
    let resultDescription: string;
    if (opponentHp <= 0 && playerHp > 0) {
      result = 'player_win';
      resultDescription = `${player.name} 击败了 ${opponent.name}!`;
    } else if (playerHp <= 0 && opponentHp > 0) {
      result = 'player_lose';
      resultDescription = `${player.name} 被 ${opponent.name} 击败,进入住院结局`;
    } else if (playerHp <= 0 && opponentHp <= 0) {
      result = 'draw';
      resultDescription = `两败俱伤,${player.name} 和 ${opponent.name} 都倒下了`;
    } else {
      result = 'draw';
      resultDescription = `战斗超过 ${CombatEngine.MAX_ROUNDS} 回合,双方僵持,战斗结束`;
    }

    // 生成状态变更 ops
    const stateOps = this.generateStateOps(player, opponent, result, condition);

    // 生成战斗结算页
    const settlementPage = this.generateSettlementPage(player, opponent, rounds, result, resultDescription);

    return {
      triggerReason: condition.userAction,
      player: { ...player, hp: Math.max(0, playerHp) },
      opponent: { ...opponent, hp: Math.max(0, opponentHp) },
      rounds,
      result,
      resultDescription,
      stateOps,
      settlementPage,
      totalRounds: rounds.length,
      elapsedMs: Date.now() - startedAt,
    };
  }

  // ─────────────────────────────────────────────────────────
  //  辅助:从 stat_data 提取战斗双方
  // ─────────────────────────────────────────────────────────

  private extractPlayer(statData: Record<string, unknown>, difficulty: string): Combatant {
    const p = (statData.主角 ?? {}) as Record<string, unknown>;
    const skills = (statData.技能 ?? {}) as Record<string, unknown>;
    const diffMult = this.difficultyToMultiplier(difficulty);
    return {
      name: (p.玩家姓名 as string) || '玩家',
      hp: 100,
      maxHp: 100,
      attributes: {
        魅力: Number(p.魅力 ?? 50),
        学业: Number(p.学业 ?? 50),
        体力: Number(p.体力 ?? 50),
        社交: Number(p.社交 ?? 50),
        敏感: Number(p.敏感 ?? 50),
        声誉: Number(p.声誉 ?? 50),
      },
      skills: {
        力量: Number(skills.力量 ?? 30),
        敏捷: Number(skills.敏捷 ?? 40),
        智力: Number(skills.智力 ?? 50),
        意志: Number(skills.意志 ?? 40),
        潜行: Number(skills.潜行 ?? 20),
        口才: Number(skills.口才 ?? 40),
        格斗: Number(skills.格斗 ?? 25),
      },
      difficultyMultiplier: diffMult.player,
    };
  }

  private extractOpponent(
    statData: Record<string, unknown>,
    opponentName: string | undefined,
    difficulty: string,
  ): Combatant {
    const diffMult = this.difficultyToMultiplier(difficulty);
    const scene = (statData.场景 ?? {}) as Record<string, unknown>;
    const location = String(scene.当前地点 ?? '');

    // 根据场景推断对手
    const name = opponentName ?? this.inferOpponent(location);
    // 对手属性:基于难度生成
    const lcg = createLcg({
      ...seedFromStatData(statData),
      salt: `combat-opponent-${name}`,
    });
    const base = lcg.roll(40, 59);
    const hp = lcg.roll(80, 119);
    return {
      name,
      hp,
      maxHp: hp,
      attributes: {
        魅力: base,
        学业: base,
        体力: base + 10,
        社交: base,
        敏感: base,
        声誉: base,
      },
      skills: {
        力量: base + 10,
        敏捷: base,
        智力: base,
        意志: base,
        潜行: base - 10,
        口才: base,
        格斗: base + 15,
      },
      difficultyMultiplier: diffMult.opponent,
    };
  }

  private inferOpponent(location: string): string {
    if (location.includes('学校') || location.includes('校园')) return '不良少年';
    if (location.includes('公园') || location.includes('街道')) return '小混混';
    if (location.includes('酒吧') || location.includes('夜店')) return '醉汉';
    return '陌生人';
  }

  private difficultyToMultiplier(difficulty: string): { player: number; opponent: number } {
    switch (difficulty) {
      case '轻松': return { player: 1.2, opponent: 0.8 };
      case '挑战': return { player: 0.9, opponent: 1.1 };
      case '地狱': return { player: 0.7, opponent: 1.4 };
      default: return { player: 1.0, opponent: 1.0 };
    }
  }

  // ─────────────────────────────────────────────────────────
  //  辅助:生成状态变更 ops
  // ─────────────────────────────────────────────────────────

  private generateStateOps(
    player: Combatant,
    opponent: Combatant,
    result: CombatSettlement['result'],
    condition: CombatTriggerCondition,
  ): Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> {
    const ops: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [];
    const lcg = createLcg({
      ...seedFromStatData(condition.statData),
      salt: `combat-ops-${result}`,
    });

    // 疲劳 +20~40
    const fatigueDelta = lcg.roll(20, 39);
    const currentFatigue = Number(((condition.statData.主角 ?? {}) as Record<string, unknown>).疲劳 ?? 0);
    ops.push({ op: 'replace', path: '主角.疲劳', value: Math.min(100, currentFatigue + fatigueDelta) });

    // 违法计数(打架+1,超过3触发法律警告)
    if (result === 'player_win' || result === 'player_lose') {
      const currentIllegal = Number(((condition.statData.主角 ?? {}) as Record<string, unknown>).违法计数 ?? 0);
      ops.push({ op: 'replace', path: '主角.违法计数', value: Math.min(3, currentIllegal + 1) });
    }

    // 声誉变化(胜+5/败-10)
    const currentRep = Number(((condition.statData.主角 ?? {}) as Record<string, unknown>).声誉 ?? 50);
    const repDelta = result === 'player_win' ? 5 : result === 'player_lose' ? -10 : 0;
    if (repDelta !== 0) {
      ops.push({ op: 'replace', path: '主角.声誉', value: Math.max(0, Math.min(100, currentRep + repDelta)) });
    }

    // 格斗技能经验(战斗后+1~3)
    const currentCombatSkill = Number(((condition.statData.技能 ?? {}) as Record<string, unknown>).格斗 ?? 25);
    ops.push({ op: 'replace', path: '技能.格斗', value: Math.min(100, currentCombatSkill + lcg.roll(1, 3)) });

    // 死结局(玩家败北且 HP 严重)
    if (result === 'player_lose') {
      ops.push({ op: 'replace', path: '临时.死结局标识', value: '战斗败北_住院' });
    }

    return ops;
  }

  // ─────────────────────────────────────────────────────────
  //  辅助:生成战斗结算页
  // ─────────────────────────────────────────────────────────

  private generateSettlementPage(
    player: Combatant,
    opponent: Combatant,
    rounds: CombatRound[],
    result: CombatSettlement['result'],
    resultDescription: string,
  ): string {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════');
    lines.push('            ⚔ 战 斗 结 算 ⚔');
    lines.push('═══════════════════════════════════════');
    lines.push('');
    lines.push(`【攻方】${player.name}  HP ${player.hp}/${player.maxHp}`);
    lines.push(`  格斗 ${player.skills.格斗}  力量 ${player.skills.力量}  敏捷 ${player.skills.敏捷}`);
    lines.push('');
    lines.push(`【守方】${opponent.name}  HP ${opponent.hp}/${opponent.maxHp}`);
    lines.push(`  格斗 ${opponent.skills.格斗}  力量 ${opponent.skills.力量}  敏捷 ${opponent.skills.敏捷}`);
    lines.push('');
    lines.push('───────────── 回 合 记 录 ─────────────');
    for (const r of rounds) {
      lines.push(`[R${r.round}] ${r.attacker} 攻击`);
      lines.push(`  骰子 ${r.roll.dice} (总${r.roll.total} / 阈值${r.roll.threshold})`);
      if (r.roll.criticalSuccess) lines.push(`  ★ 大成功!`);
      if (r.roll.criticalFailure) lines.push(`  ✗ 大失败!`);
      if (r.damage) {
        lines.push(`  伤害 ${r.damage.finalDamage} (基础${r.damage.baseDamage}×技能${r.damage.skillMultiplier}×难度${r.damage.difficultyMultiplier})`);
      }
      lines.push(`  ${r.description}`);
    }
    lines.push('');
    lines.push('───────────── 结 算 结 果 ─────────────');
    const resultIcon = result === 'player_win' ? '★ 胜利' : result === 'player_lose' ? '✗ 败北' : '＝ 僵持';
    lines.push(`${resultIcon}:${resultDescription}`);
    lines.push('═══════════════════════════════════════');
    return lines.join('\n');
  }

  // ═════════════════════════════════════════════════════════
  //  阶段3 步骤7:强迫抵抗场景解决
  // ═════════════════════════════════════════════════════════

  /**
   * 解决强迫抵抗场景
   *  - 根据 scenario.id 查找场景
   *  - 根据 pathId 查找抵抗路径('no_resistance' 表示不抵抗)
   *  - 执行骰子判定(不抵抗时跳过)
   *  - 计算关系影响、生成 stateOps、触发 flag/BAD_END
   *  - 生成战斗记录和结算页
   */
  settleResistance(
    scenario: ResistanceScenario,
    ctx: ResistanceContext,
  ): ResistanceResolution {
    const startedAt = Date.now();
    const sd = ctx.statData;
    const difficulty = ctx.difficulty ?? '普通';

    // 查找抵抗路径
    const isNoResistance = ctx.pathId === 'no_resistance';
    const path = isNoResistance
      ? scenario.resistancePaths[0] // 不抵抗时取默认路径用于结构参考
      : scenario.resistancePaths.find((p) => p.id === ctx.pathId);

    if (!path) {
      throw new Error(`抵抗路径不存在: ${scenario.id}/${ctx.pathId}`);
    }

    const combatLog: string[] = [];
    combatLog.push(`【场景】${scenario.name} (${scenario.type} · ${scenario.severity})`);
    combatLog.push(`【强迫者】${scenario.aggressorName} — ${scenario.aggressorDescription}`);
    if (scenario.victimName) {
      combatLog.push(`【被强迫者】${scenario.victimName}`);
    }

    // ─── 骰子判定 ───
    let roll: DiceRoll | null = null;
    let success = false;
    let criticalSuccess = false;
    let criticalFailure = false;
    let outcome: ResistanceOutcome;

    if (isNoResistance) {
      // 不抵抗:跳过骰子
      outcome = 'no_resistance';
      combatLog.push(`【选择】不抵抗 — 接受强迫发生`);
    } else {
      // 抵抗:执行骰子判定
      const skillValue = this.readSkillValue(sd, path.skill);
      const lcg = createLcg({
        ...seedFromStatData(sd),
        salt: `resistance-${scenario.id}-${ctx.pathId}`,
      });
      const dice = lcg.rollD100();
      const total = skillValue + dice;
      const threshold = this.applyDifficultyToThreshold(path.threshold, difficulty);
      criticalSuccess = dice <= 5;
      criticalFailure = dice >= 96;
      success = criticalSuccess || (!criticalFailure && total >= threshold);
      outcome = success ? 'resisted' : 'failed';

      roll = {
        skill: path.skill,
        skillValue,
        dice,
        total,
        threshold,
        success,
        criticalSuccess,
        criticalFailure,
      };

      combatLog.push(`【选择】抵抗路径: ${path.name} (技能 ${path.skill}=${skillValue})`);
      combatLog.push(`【骰子】1d100=${dice} + 技能=${skillValue} = ${total} / 阈值 ${threshold}`);
      if (criticalSuccess) combatLog.push(`  ★ 大成功!`);
      else if (criticalFailure) combatLog.push(`  ✗ 大失败!`);
      else if (success) combatLog.push(`  ✓ 抵抗成功`);
      else combatLog.push(`  ✗ 抵抗失败`);
    }

    // ─── 选择叙事和影响 ───
    let narrative: string;
    let impacts: Array<{
      heroineName: string;
      affectionDelta: number;
      trustDelta: number;
      jealousyDelta: number;
      heartbeatDelta: number;
      relationshipStageAdvance?: boolean;
    }>;
    let triggeredFlags: string[];
    let triggeredBadEnd: string | undefined;

    if (outcome === 'resisted') {
      narrative = path.successDescription;
      impacts = path.successImpacts;
      triggeredFlags = [...(path.successFlags ?? [])];
    } else if (outcome === 'failed') {
      narrative = path.failureDescription;
      impacts = path.failureImpacts;
      triggeredFlags = [...(path.failureFlags ?? [])];
      if (path.failureBadEnd) triggeredBadEnd = path.failureBadEnd;
    } else {
      // no_resistance
      narrative = path.noResistanceDescription;
      impacts = path.noResistanceImpacts;
      triggeredFlags = [...(path.noResistanceFlags ?? [])];
      // 不抵抗时若路径有 failureBadEnd,同样可能触发(懦弱结局)
      if (path.failureBadEnd && outcome === 'no_resistance') {
        triggeredBadEnd = path.failureBadEnd;
      }
    }

    // ─── 应用关系影响 ───
    const appliedImpacts = this.applyResistanceImpacts(impacts, sd, success && outcome === 'resisted', criticalSuccess, criticalFailure);
    if (appliedImpacts.length > 0) {
      combatLog.push(`【关系影响】`);
      for (const ap of appliedImpacts) {
        combatLog.push(`  ${ap.heroineName}: 好感${ap.affectionDelta >= 0 ? '+' : ''}${ap.affectionDelta} 信任${ap.trustDelta >= 0 ? '+' : ''}${ap.trustDelta} 嫉妒${ap.jealousyDelta >= 0 ? '+' : ''}${ap.jealousyDelta} 心动${ap.heartbeatDelta >= 0 ? '+' : ''}${ap.heartbeatDelta}${ap.relationshipStageAdvance ? ' [阶段推进]' : ''}`);
      }
    }

    // ─── 生成 stateOps ───
    const stateOps = this.generateResistanceStateOps(
      scenario,
      path,
      outcome,
      success,
      criticalSuccess,
      criticalFailure,
      sd,
      appliedImpacts,
      triggeredFlags,
      difficulty,
    );

    // ─── 生成结算页 ───
    const settlementPage = this.generateResistanceSettlementPage(
      scenario,
      path,
      outcome,
      roll,
      narrative,
      appliedImpacts,
      triggeredFlags,
      triggeredBadEnd,
    );

    combatLog.push(`【耗时】${Date.now() - startedAt}ms`);

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      type: scenario.type,
      severity: scenario.severity,
      aggressor: {
        name: scenario.aggressorName,
        description: scenario.aggressorDescription,
        hp: scenario.aggressorHp,
      },
      victim: {
        name: scenario.victimName ?? '玩家',
        isPlayer: scenario.victimName === '玩家' || !scenario.victimName,
      },
      chosenPath: path,
      outcome,
      roll,
      success,
      criticalSuccess,
      criticalFailure,
      narrative,
      appliedImpacts,
      stateOps,
      triggeredFlags,
      triggeredBadEnd,
      isIllegal: path.isIllegal ?? false,
      combatLog,
      settlementPage,
      ts: Date.now(),
    };
  }

  // ─────────────────────────────────────────────────────────
  //  辅助:强迫抵抗专用 stat_data 读取
  // ─────────────────────────────────────────────────────────

  /** 从 stat_data 读取技能值 */
  private readSkillValue(statData: Record<string, unknown>, skill: CombatSkillType): number {
    const skills = (statData.技能 ?? {}) as Record<string, unknown>;
    const v = Number(skills[skill] ?? 0);
    return Number.isNaN(v) ? 0 : v;
  }

  /** 难度对阈值的影响:地狱 +10,挑战 +5,普通 0,轻松 -5 */
  private applyDifficultyToThreshold(threshold: number, difficulty: string): number {
    switch (difficulty) {
      case '轻松': return Math.max(1, threshold - 5);
      case '挑战': return threshold + 5;
      case '地狱': return threshold + 10;
      default: return threshold;
    }
  }

  /** 读取女角字段(优先 女角.<姓名>,回退 当前女角) */
  private readHeroineField(statData: Record<string, unknown>, heroineName: string, field: string): unknown {
    const heroines = (statData.女角 ?? {}) as Record<string, unknown>;
    const heroine = (heroines[heroineName] ?? {}) as Record<string, unknown>;
    if (heroine[field] !== undefined) return heroine[field];
    const currentHeroine = (statData.当前女角 ?? {}) as Record<string, unknown>;
    if (String(currentHeroine.姓名 ?? '') === heroineName) {
      return currentHeroine[field];
    }
    return undefined;
  }

  /** 读取当前女角姓名 */
  private readCurrentHeroineName(statData: Record<string, unknown>): string {
    const scene = (statData.场景 ?? {}) as Record<string, unknown>;
    const currentHeroine = (statData.当前女角 ?? {}) as Record<string, unknown>;
    return String(currentHeroine.姓名 ?? scene.当前女角名 ?? '');
  }

  /** 读取数值(安全转换) */
  private safeNum(v: unknown, def = 0): number {
    return typeof v === 'number' && !Number.isNaN(v) ? v : def;
  }

  /** 读取字符串(安全转换) */
  private safeStr(v: unknown, def = ''): string {
    return typeof v === 'string' ? v : def;
  }

  // ─────────────────────────────────────────────────────────
  //  辅助:应用强迫抵抗关系影响
  // ─────────────────────────────────────────────────────────

  private applyResistanceImpacts(
    impacts: Array<{
      heroineName: string;
      affectionDelta: number;
      trustDelta: number;
      jealousyDelta: number;
      heartbeatDelta: number;
      relationshipStageAdvance?: boolean;
    }>,
    statData: Record<string, unknown>,
    success: boolean,
    criticalSuccess: boolean,
    criticalFailure: boolean,
  ): ResistanceAppliedImpact[] {
    const applied: ResistanceAppliedImpact[] = [];
    const stages = ['决裂', '仇视', '厌恶', '冷漠', '疏离', '初识', '熟悉', '暧昧', '心动', '亲密', '攻略完成'];

    for (const impact of impacts) {
      const heroineName = impact.heroineName || this.readCurrentHeroineName(statData);
      if (!heroineName) continue;

      const before = {
        affection: this.safeNum(this.readHeroineField(statData, heroineName, '好感度'), 0),
        trust: this.safeNum(this.readHeroineField(statData, heroineName, '信任度'), 0),
        jealousy: this.safeNum(this.readHeroineField(statData, heroineName, '嫉妒值'), 0),
        heartbeat: this.safeNum(this.readHeroineField(statData, heroineName, '心动值'), 0),
        relationshipStage: this.safeStr(this.readHeroineField(statData, heroineName, '关系阶段'), '初识'),
      };

      // 大成功倍率 / 大失败额外惩罚
      let affDelta = impact.affectionDelta;
      let trustDelta = impact.trustDelta;
      let heartbeatDelta = impact.heartbeatDelta;
      if (criticalSuccess) {
        affDelta = Math.round(affDelta * 1.5);
        trustDelta = Math.round(trustDelta * 1.5);
        heartbeatDelta = Math.round(heartbeatDelta * 1.5);
      }
      if (criticalFailure) {
        affDelta = Math.round(affDelta * 0.5);
        trustDelta = Math.round(trustDelta * 0.5);
      }

      const after = {
        affection: Math.max(-100, Math.min(100, before.affection + affDelta)),
        trust: Math.max(-100, Math.min(100, before.trust + trustDelta)),
        jealousy: Math.max(-100, Math.min(100, before.jealousy + impact.jealousyDelta)),
        heartbeat: Math.max(-100, Math.min(100, before.heartbeat + heartbeatDelta)),
        relationshipStage: before.relationshipStage,
      };

      // 关系阶段推进(仅在成功且标记为推进时)
      let stageAdvanced = false;
      if (success && impact.relationshipStageAdvance) {
        const currentIdx = stages.indexOf(before.relationshipStage);
        // 仅在正向阶段中推进(初识→熟悉→暧昧→心动→亲密→攻略完成)
        if (currentIdx >= 5 && currentIdx < stages.length - 1) {
          after.relationshipStage = stages[currentIdx + 1];
          stageAdvanced = true;
        }
      }

      applied.push({
        heroineName,
        affectionDelta: affDelta,
        trustDelta,
        jealousyDelta: impact.jealousyDelta,
        heartbeatDelta,
        relationshipStageAdvance: stageAdvanced,
        before,
        after,
      });
    }

    return applied;
  }

  // ─────────────────────────────────────────────────────────
  //  辅助:生成强迫抵抗 stateOps
  // ─────────────────────────────────────────────────────────

  private generateResistanceStateOps(
    scenario: ResistanceScenario,
    path: ResistancePath,
    outcome: ResistanceOutcome,
    success: boolean,
    criticalSuccess: boolean,
    criticalFailure: boolean,
    statData: Record<string, unknown>,
    appliedImpacts: ResistanceAppliedImpact[],
    triggeredFlags: string[],
    difficulty: string,
  ): Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> {
    const ops: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }> = [];
    const player = (statData.主角 ?? {}) as Record<string, unknown>;
    const battle = (statData.战斗 ?? {}) as Record<string, unknown>;
    const skills = (statData.技能 ?? {}) as Record<string, unknown>;
    const lcg = createLcg({
      ...seedFromStatData(statData),
      salt: `resistance-ops-${scenario.id}-${path.id}`,
    });

    // 1. 关系影响 ops
    for (const ap of appliedImpacts) {
      const isCurrentHeroine = ap.heroineName === this.readCurrentHeroineName(statData);
      const ns = isCurrentHeroine ? '当前女角' : `女角.${ap.heroineName}`;
      ops.push({ op: 'replace', path: `${ns}.好感度`, value: ap.after.affection });
      ops.push({ op: 'replace', path: `${ns}.信任度`, value: ap.after.trust });
      ops.push({ op: 'replace', path: `${ns}.嫉妒值`, value: ap.after.jealousy });
      ops.push({ op: 'replace', path: `${ns}.心动值`, value: ap.after.heartbeat });
      if (ap.relationshipStageAdvance) {
        ops.push({ op: 'replace', path: `${ns}.关系阶段`, value: ap.after.relationshipStage });
      }
    }

    // 2. flag 写入 ops
    for (const f of triggeredFlags) {
      ops.push({ op: 'replace', path: `隐藏.${f}`, value: true });
    }

    // 3. 战斗统计 ops
    const totalBattles = this.safeNum(battle.总战斗次数, 0);
    ops.push({ op: 'replace', path: '战斗.总战斗次数', value: totalBattles + 1 });

    if (outcome === 'resisted') {
      ops.push({ op: 'replace', path: '战斗.胜利次数', value: this.safeNum(battle.胜利次数, 0) + 1 });
      ops.push({ op: 'replace', path: '战斗.强迫抵抗成功次数', value: this.safeNum(battle.强迫抵抗成功次数, 0) + 1 });
      // 成功时重置连续败北
      ops.push({ op: 'replace', path: '战斗.连续败北计数', value: 0 });
    } else if (outcome === 'failed') {
      ops.push({ op: 'replace', path: '战斗.败北次数', value: this.safeNum(battle.败北次数, 0) + 1 });
      ops.push({ op: 'replace', path: '战斗.强迫抵抗失败次数', value: this.safeNum(battle.强迫抵抗失败次数, 0) + 1 });
      ops.push({ op: 'replace', path: '战斗.被强迫次数', value: this.safeNum(battle.被强迫次数, 0) + 1 });
      // 连续败北 +1(最多3)
      const currentStreak = this.safeNum(battle.连续败北计数, 0);
      ops.push({ op: 'replace', path: '战斗.连续败北计数', value: Math.min(3, currentStreak + 1) });
    } else {
      // no_resistance:被强迫次数 +1,不增加败北次数(因为没抵抗)
      ops.push({ op: 'replace', path: '战斗.被强迫次数', value: this.safeNum(battle.被强迫次数, 0) + 1 });
    }

    // 4. 最近战斗记录
    const outcomeLabel = outcome === 'resisted' ? '抵抗成功' : outcome === 'failed' ? '抵抗失败' : '未抵抗';
    ops.push({ op: 'replace', path: '战斗.最近战斗结果', value: `${scenario.name} · ${outcomeLabel}` });
    ops.push({ op: 'replace', path: '战斗.最近战斗对手', value: scenario.aggressorName });
    ops.push({ op: 'replace', path: '战斗.最近战斗时间戳', value: Date.now() });

    // 5. 战斗技能等级提升(基于使用次数累积)
    if (outcome !== 'no_resistance') {
      const skillField = `${path.skill}等级` as '力量等级' | '格斗等级' | '敏捷等级' | '意志等级';
      const currentLevel = this.safeNum(battle[skillField], 1);
      // 大成功 +1 等级,普通成功 30% 概率 +1
      if (criticalSuccess) {
        ops.push({ op: 'replace', path: `战斗.${skillField}`, value: Math.min(10, currentLevel + 1) });
      } else if (success && lcg.chance(0.3)) {
        ops.push({ op: 'replace', path: `战斗.${skillField}`, value: Math.min(10, currentLevel + 1) });
      }
    }

    // 6. 技能经验(使用过的技能 +2~5)
    if (outcome !== 'no_resistance') {
      const usedSkill = path.skill;
      const currentSkillVal = this.safeNum(skills[usedSkill], 0);
      const skillExp = lcg.roll(2, 5);
      ops.push({ op: 'replace', path: `技能.${usedSkill}`, value: Math.min(100, currentSkillVal + skillExp) });
    }

    // 7. 疲劳(基于严重程度)
    const severityFatigue: Record<ResistanceSeverity, number> = {
      轻度: 8,
      中度: 15,
      重度: 25,
      极重: 40,
    };
    const fatigueDelta = severityFatigue[scenario.severity];
    const currentFatigue = this.safeNum(player.疲劳, 0);
    ops.push({ op: 'replace', path: '主角.疲劳', value: Math.min(100, currentFatigue + fatigueDelta) });

    // 8. 违法计数(若 isIllegal 且实际发生冲突)
    if (path.isIllegal && outcome !== 'no_resistance') {
      const currentIllegal = this.safeNum(player.违法计数, 0);
      ops.push({ op: 'replace', path: '主角.违法计数', value: Math.min(3, currentIllegal + 1) });
    }

    // 9. 心情变化(抵抗成功 +5,失败 -10,不抵抗 -15)
    const moodDelta = outcome === 'resisted' ? 5 : outcome === 'failed' ? -10 : -15;
    const currentMood = this.safeNum(player.心情, 70);
    ops.push({ op: 'replace', path: '主角.心情', value: Math.max(0, Math.min(100, currentMood + moodDelta)) });

    // 10. 声誉变化(抵抗成功 +3,不抵抗 -8)
    if (outcome === 'resisted') {
      const currentRep = this.safeNum(player.声誉, 50);
      ops.push({ op: 'replace', path: '主角.声誉', value: Math.min(100, currentRep + 3) });
    } else if (outcome === 'no_resistance') {
      const currentRep = this.safeNum(player.声誉, 50);
      ops.push({ op: 'replace', path: '主角.声誉', value: Math.max(0, currentRep - 8) });
    }

    // 11. BAD_END 标识
    if (path.failureBadEnd && (outcome === 'failed' || outcome === 'no_resistance')) {
      ops.push({ op: 'replace', path: '临时.死结局标识', value: path.failureBadEnd });
    }

    return ops;
  }

  // ─────────────────────────────────────────────────────────
  //  辅助:生成强迫抵抗结算页
  // ─────────────────────────────────────────────────────────

  private generateResistanceSettlementPage(
    scenario: ResistanceScenario,
    path: ResistancePath,
    outcome: ResistanceOutcome,
    roll: DiceRoll | null,
    narrative: string,
    appliedImpacts: ResistanceAppliedImpact[],
    triggeredFlags: string[],
    triggeredBadEnd?: string,
  ): string {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════');
    lines.push('        🛡 强 迫 抵 抗 结 算 🛡');
    lines.push('═══════════════════════════════════════');
    lines.push('');
    lines.push(`【场景】${scenario.name} (${scenario.type} · ${scenario.severity})`);
    lines.push(`【强迫者】${scenario.aggressorName}`);
    lines.push(`  ${scenario.aggressorDescription}`);
    if (scenario.victimName) {
      lines.push(`【被强迫者】${scenario.victimName}`);
    }
    lines.push('');

    if (roll) {
      lines.push('───────────── 抵 抗 判 定 ─────────────');
      lines.push(`【路径】${path.name} (技能 ${path.skill})`);
      lines.push(`【骰子】1d100=${roll.dice} + 技能=${roll.skillValue} = ${roll.total} / 阈值 ${roll.threshold}`);
      if (roll.criticalSuccess) lines.push(`  ★ 大成功!`);
      else if (roll.criticalFailure) lines.push(`  ✗ 大失败!`);
      else if (roll.success) lines.push(`  ✓ 抵抗成功`);
      else lines.push(`  ✗ 抵抗失败`);
      lines.push('');
    } else {
      lines.push('───────────── 选 择 不 抵 抗 ─────────────');
      lines.push('');
    }

    lines.push('───────────── 叙 事 ─────────────');
    lines.push(narrative);
    lines.push('');

    if (appliedImpacts.length > 0) {
      lines.push('───────────── 关 系 影 响 ─────────────');
      for (const ap of appliedImpacts) {
        lines.push(`【${ap.heroineName}】`);
        lines.push(`  好感 ${ap.before.affection} → ${ap.after.affection} (${ap.affectionDelta >= 0 ? '+' : ''}${ap.affectionDelta})`);
        lines.push(`  信任 ${ap.before.trust} → ${ap.after.trust} (${ap.trustDelta >= 0 ? '+' : ''}${ap.trustDelta})`);
        lines.push(`  嫉妒 ${ap.before.jealousy} → ${ap.after.jealousy} (${ap.jealousyDelta >= 0 ? '+' : ''}${ap.jealousyDelta})`);
        lines.push(`  心动 ${ap.before.heartbeat} → ${ap.after.heartbeat} (${ap.heartbeatDelta >= 0 ? '+' : ''}${ap.heartbeatDelta})`);
        if (ap.relationshipStageAdvance) {
          lines.push(`  ★ 关系阶段推进: ${ap.before.relationshipStage} → ${ap.after.relationshipStage}`);
        }
      }
      lines.push('');
    }

    if (triggeredFlags.length > 0) {
      lines.push('───────────── 触 发 flag ─────────────');
      for (const f of triggeredFlags) {
        lines.push(`  • ${f}`);
      }
      lines.push('');
    }

    if (triggeredBadEnd) {
      lines.push('───────────── ⚠ BAD END ─────────────');
      lines.push(`  ${triggeredBadEnd}`);
      lines.push('');
    }

    lines.push('═══════════════════════════════════════');
    return lines.join('\n');
  }
}

// ───────────────────────────────────────────────────────────
//  单例
// ───────────────────────────────────────────────────────────

export const combatEngine = new CombatEngine();

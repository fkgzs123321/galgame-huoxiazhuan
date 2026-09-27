// 战斗状态管理
import { create } from 'zustand';
import type { HeroInstance, MonsterData, HeroData, GamePhase } from '@/types';
import {
  type BattleState,
  type Combatant,
  type CombatSkill,
  type DamageResult,
  type CombatLogEntry,
  heroToCombatant,
  monsterToCombatant,
  calculateDamage,
  calculateHeal,
  processDoTs,
  decrementBuffs,
  clearStun,
  calculateTurnOrder,
  checkBattleEnd,
  createBattle,
  resolveCombatStress,
} from '@/gateway/combatEngine';
import { loadHeroes, loadMonsters, getHeroName, getSkillName } from '@/data/ddLoader';
import { monsterZh } from '@/data/zhNames';
import { useStressStore } from '@/stores/stressStore';
import { useGameStore } from '@/stores/gameStore';
import { useAiStore } from '@/stores/aiStore';
import { useNarrativeStore } from '@/stores/narrativeStore';
import { buildCombatNarrativePrompt, buildCombatStartPrompt } from '@/gateway/narrative';
import { getAfflictionById, getVirtueById } from '@/gateway/stressSystem';
import { applyInfection, isCrimsonMonster } from '@/gateway/crimsonSystem';
import type { StressLogEntry } from '@/stores/stressStore';

interface CombatStore {
  battle: BattleState | null;
  isInitializing: boolean;
  selectedSkill: string | null;
  selectedTargetUid: string | null;
  combatLog: CombatLogEntry[];
  lastWinner: 'hero' | 'enemy' | null;
  returnPhase: GamePhase;
  standalone: boolean;      // 独立页模式（斗技场/农场）：结束时不 setPhase，由页面接管

  // Actions
  startBattle: (heroes: HeroInstance[], monsterPool: MonsterData[], specificEnemies?: MonsterData[]) => Promise<void>;
  selectSkill: (skillId: string | null) => void;
  selectTarget: (uid: string | null) => void;
  executeAction: () => void;
  endTurn: () => void;
  endBattle: () => void;
  setReturnPhase: (phase: GamePhase) => void;
  setStandalone: (v: boolean) => void;
  reset: () => void;
}

export interface BattleConfig {
  difficulty?: 'easy' | 'normal' | 'hard';
  enemyCount?: number;
}

// 难度对应的怪物筛选条件
const difficultyFilters: Record<string, (m: MonsterData) => boolean> = {
  easy: (m) => m.maxHp > 0 && m.maxHp <= 25,
  normal: (m) => m.maxHp > 25 && m.maxHp <= 50,
  hard: (m) => m.maxHp > 50 && m.maxHp < 100,
};

// 难度对应的敌人数量
const difficultyEnemyCount: Record<string, number> = {
  easy: 2,
  normal: 3,
  hard: 4,
};

// 随机选择怪物
function pickRandomMonsters(pool: MonsterData[], count: number): MonsterData[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, pool.length));
}

// ============================================================
// AI 叙事接入（战斗）
//  - 叙事只在 AI 主开关开启时触发
//  - 数值判定全部由程序完成，AI 只负责叙事包装
//  - 叙事失败/跳过绝不阻塞战斗流程
// ============================================================

// 把生成的叙事文本提交为「旁白」日志条目（读取最新状态，避免过期引用）
function commitNarrativeText(text: string, turn: number) {
  const st = useCombatStore.getState();
  if (!st.battle) return;
  const narrEntry: CombatLogEntry = {
    turn,
    actor: '旁白',
    action: '',
    target: '',
    result: text,
  };
  useCombatStore.setState({
    battle: { ...st.battle, log: [...st.battle.log, narrEntry] },
    combatLog: [...st.combatLog, narrEntry],
  });
}

// 触发单次行动叙事
function narrateCombatAction(battle: BattleState, entry: CombatLogEntry) {
  if (!useAiStore.getState().config.enabled) return;
  const prompt = buildCombatNarrativePrompt(battle, entry, battle.log);
  useNarrativeStore.getState().startNarrative('combat', prompt, (text) => {
    commitNarrativeText(text, entry.turn);
  });
}

// 战斗开局叙事
function narrateCombatStart(battle: BattleState) {
  if (!useAiStore.getState().config.enabled) return;
  const prompt = buildCombatStartPrompt(battle);
  useNarrativeStore.getState().startNarrative('combat', prompt, (text) => {
    commitNarrativeText(text, 1);
  });
}

export const useCombatStore = create<CombatStore>((set, get) => ({
  battle: null,
  isInitializing: false,
  selectedSkill: null,
  selectedTargetUid: null,
  combatLog: [],
  lastWinner: null,
  returnPhase: 'town',
  standalone: false,

  setStandalone: (v) => set({ standalone: v }),

  startBattle: async (heroes: HeroInstance[], monsterPool: MonsterData[], specificEnemies?: MonsterData[]) => {
    set({ isInitializing: true });

    // 加载英雄数据
    const heroesData = await loadHeroes();

    // 转换英雄为战斗实体
    const combatantHeroes: Combatant[] = heroes.map((h) => {
      const hd = heroesData.find((d) => d.id === h.classId);
      return heroToCombatant(h, hd);
    });

    let selectedMonsters: MonsterData[];

    if (specificEnemies && specificEnemies.length > 0) {
      // 使用指定的怪物列表（地牢战斗）
      selectedMonsters = specificEnemies;
    } else {
      // 随机选择怪物（城镇快速测试）
      const regularPool = monsterPool.filter(m => m.maxHp > 0 && m.maxHp < 100);
      const pool = regularPool.length > 0 ? regularPool : monsterPool;
      const enemyCount = 2 + Math.floor(Math.random() * 3);
      selectedMonsters = pickRandomMonsters(pool, enemyCount);
    }

    // 转换怪物为战斗实体
    const combatantEnemies: Combatant[] = selectedMonsters.map((m, i) =>
      monsterToCombatant(m, i + 1, `enemy_${i}`)
    );

    // 创建战斗状态
    const battle = createBattle(combatantHeroes, combatantEnemies);

    set({
      battle,
      isInitializing: false,
      selectedSkill: null,
      selectedTargetUid: null,
      combatLog: battle.log,
    });

    // 战斗开局叙事
    narrateCombatStart(battle);
  },

  selectSkill: (skillId) => set({ selectedSkill: skillId, selectedTargetUid: null }),

  selectTarget: (uid) => set({ selectedTargetUid: uid }),

  executeAction: () => {
    const state = get();
    if (!state.battle || state.battle.isFinished) return;
    if (!state.selectedSkill || !state.selectedTargetUid) return;

    const battle = state.battle;
    const currentUid = battle.turnOrder[battle.currentActorIndex];
    const actor = [...battle.heroes, ...battle.enemies].find((c) => c.uid === currentUid);
    if (!actor || actor.isDead) {
      get().endTurn();
      return;
    }

    const skill = actor.skills.find((s) => s.id === state.selectedSkill);
    if (!skill) return;

    const target = [...battle.heroes, ...battle.enemies].find((c) => c.uid === state.selectedTargetUid);
    if (!target || target.isDead) return;

    // 执行技能
    let result: DamageResult;
    if (skill.isHeal) {
      result = calculateHeal(actor, target, skill);
    } else {
      result = calculateDamage(actor, target, skill);
    }

    // 记录日志
    const logEntry: CombatLogEntry = {
      turn: battle.turn,
      actor: getCombatantName(actor),
      action: getSkillName(skill.id),
      target: getCombatantName(target),
      result: result.log,
      damage: result.damage,
      crit: result.crit,
      miss: !result.hit,
      actorUid: actor.uid,
      targetUid: target.uid,
      isHeal: skill.isHeal,
    };

    set({
      battle: {
        ...battle,
        log: [...battle.log, logEntry],
      },
      combatLog: [...state.combatLog, logEntry],
      selectedSkill: null,
      selectedTargetUid: null,
    });

    // AI 叙事：描写本次行动
    narrateCombatAction(get().battle!, logEntry);

    // 检查战斗是否结束
    const updatedBattle = get().battle!;
    if (checkBattleEnd(updatedBattle)) {
      set({ battle: updatedBattle });
      return;
    }

    // 结束当前角色回合
    get().endTurn();
  },

  endTurn: () => {
    const state = get();
    if (!state.battle) return;

    let battle = { ...state.battle };
    let nextIndex = (battle.currentActorIndex + 1) % battle.turnOrder.length;

    // 如果一轮结束，推进回合
    if (nextIndex === 0) {
      battle.turn++;

      // 处理所有战斗者的 DoT 和 Buff
    const allCombatants = [...battle.heroes, ...battle.enemies];
    for (const c of allCombatants) {
      if (c.isDead) continue;
      const dotLogs = processDoTs(c);
      decrementBuffs(c);
      clearStun(c);

      for (const log of dotLogs) {
        battle.log.push({
          turn: battle.turn,
          actor: getCombatantName(c),
          action: '持续效果',
          target: '',
          result: log,
          actorUid: c.uid,
          targetUid: c.uid,
        });
      }
    }

    // 处理英雄压力判定（崩溃/美德/心脏病）
    const stressLogs = processHeroStress(battle);
    for (const log of stressLogs) {
      battle.log.push(log);
    }

      // 重新计算先攻顺序
      const alive = allCombatants.filter((c) => !c.isDead);
      battle.turnOrder = calculateTurnOrder(alive);
      battle.currentActorIndex = 0;

      // 检查战斗结束
      if (checkBattleEnd(battle)) {
        set({ battle });
        return;
      }
    } else {
      battle.currentActorIndex = nextIndex;
    }

    // 跳过已死亡的战斗者
    while (true) {
      const uid = battle.turnOrder[battle.currentActorIndex];
      const c = [...battle.heroes, ...battle.enemies].find((x) => x.uid === uid);
      if (!c || c.isDead || c.isStunned) {
        if (c && c.isStunned) {
          battle.log.push({
            turn: battle.turn,
            actor: getCombatantName(c),
            action: '眩晕',
            target: '',
            result: `${getCombatantName(c)} 被眩晕，无法行动!`,
          });
          c.isStunned = false;
        }
        battle.currentActorIndex = (battle.currentActorIndex + 1) % battle.turnOrder.length;
        if (battle.currentActorIndex === 0) {
          battle.turn++;
          const allCombatants = [...battle.heroes, ...battle.enemies];
          for (const cc of allCombatants) {
            if (cc.isDead) continue;
            processDoTs(cc);
            decrementBuffs(cc);
            clearStun(cc);
          }
          const alive = allCombatants.filter((cc) => !cc.isDead);
          battle.turnOrder = calculateTurnOrder(alive);
          battle.currentActorIndex = 0;
        }
      } else {
        break;
      }
    }

    set({
      battle,
      combatLog: battle.log,
      selectedSkill: null,
      selectedTargetUid: null,
    });

    // 如果当前是敌方回合，自动执行AI
    const currentUid = battle.turnOrder[battle.currentActorIndex];
    const currentCombatant = [...battle.heroes, ...battle.enemies].find((c) => c.uid === currentUid);
    if (currentCombatant && currentCombatant.side === 'enemy') {
      setTimeout(() => executeEnemyAction(set, get), 800);
    }
  },

  endBattle: () => {
    const battle = get().battle;
    if (battle) {
      // 同步战斗中的压力/状态回 HeroInstance
      syncHeroesFromBattle(battle);
      // 血腥诅咒：庭院战斗胜利后有感染风险
      applyCrimsonInfections(battle);
    }
    // 停止并清空战斗叙事槽
    useNarrativeStore.getState().skipNarrative('combat');
    set({
      battle: null,
      lastWinner: battle?.winner ?? null,
      selectedSkill: null,
      selectedTargetUid: null,
    });
  },

  setReturnPhase: (phase) => set({ returnPhase: phase }),

  reset: () => {
    useNarrativeStore.getState().skipNarrative('combat');
    set({
      battle: null,
      selectedSkill: null,
      selectedTargetUid: null,
      combatLog: [],
      lastWinner: null,
      returnPhase: 'town',
      standalone: false,
    });
  },
}));

// 获取战斗者中文名
function getCombatantName(c: Combatant): string {
  if (c.side === 'hero') {
    return getHeroName(c.classId);
  }
  return monsterZh(c.classId || c.name);
}

// 处理回合结束时的英雄压力判定（崩溃/美德/心脏病）
// 修改 battle 中的英雄状态，并返回需要追加的日志
function processHeroStress(battle: BattleState): CombatLogEntry[] {
  const newLogs: CombatLogEntry[] = [];

  for (const hero of battle.heroes) {
    if (hero.isDead) continue;

    const outcome = resolveCombatStress(hero);
    if (outcome.messages.length === 0) continue;

    for (const msg of outcome.messages) {
      newLogs.push({
        turn: battle.turn,
        actor: getCombatantName(hero),
        action: outcome.heartAttack ? '压力判定' : '压力判定',
        target: '',
        result: msg,
        actorUid: hero.uid,
        targetUid: hero.uid,
      });
    }

    // 推送判定结果到 stressStore，触发压力判定弹窗
    // 由于战斗中的判定在 gameStore 同步之前完成，这里直接根据战斗结果构造判定条目
    if (outcome.heartAttack) {
      useStressStore.setState((s) => ({
        pendingChecks: [
          ...s.pendingChecks,
          {
            rolled: 1,
            virtueChance: 0,
            isVirtue: false,
            isAffliction: false,
            heartAttack: true,
          },
        ],
      }));
      useStressStore.setState((s) => ({
        stressLog: [
          ...s.stressLog,
          {
            uid: hero.uid,
            heroName: getHeroName(hero.classId),
            time: '战斗',
            text: outcome.messages[0] ?? `${getHeroName(hero.classId)} 心脏病发作！`,
            type: 'heartattack' as const,
          },
        ].slice(-100),
      }));
    } else if (hero.affliction || hero.virtue) {
      const aff = hero.affliction ? getAfflictionById(hero.affliction) : undefined;
      const virt = hero.virtue ? getVirtueById(hero.virtue) : undefined;
      useStressStore.setState((s) => ({
        pendingChecks: [
          ...s.pendingChecks,
          {
            rolled: 0,
            virtueChance: 0,
            isVirtue: !!virt,
            isAffliction: !!aff,
            affliction: aff,
            virtue: virt,
            heartAttack: false,
          },
        ],
      }));
      useStressStore.setState((s) => ({
        stressLog: [
          ...s.stressLog,
          {
            uid: hero.uid,
            heroName: getHeroName(hero.classId),
            time: '战斗',
            text: outcome.messages[0] ?? '',
            type: (virt ? 'virtue' : 'affliction') as StressLogEntry['type'],
          },
        ].slice(-100),
      }));
    }
  }

  return newLogs;
}

// 将战斗结束后的压力/状态同步回 HeroInstance
function syncHeroesFromBattle(battle: BattleState) {
  const gameStore = useGameStore.getState();
  for (const hero of battle.heroes) {
    const patch: Partial<HeroInstance> = {
      currentHp: Math.max(1, hero.currentHp),
      stress: hero.stress,
      affliction: hero.affliction ?? null,
      virtue: hero.virtue ?? null,
      isDeathsDoor: hero.onDeathDoor,
      stressState: hero.affliction
        ? 'afflicted'
        : hero.virtue
          ? 'virtuous'
          : hero.stress >= 100
            ? 'afflicted'
            : hero.stress >= 75
              ? 'stressed'
              : 'calm',
    };
    if (hero.isDead) {
      gameStore.removeHero(hero.uid);
    } else {
      gameStore.updateHero(hero.uid, patch);
    }
  }
}

// 血腥诅咒：庭院战斗胜利结算感染（战斗中被咬已标记的必感染，其余概率感染）
function applyCrimsonInfections(battle: BattleState) {
  if (battle.winner !== 'hero') return;
  const hasCrimson = battle.enemies.some((e) => isCrimsonMonster(e.classId));
  if (!hasCrimson) return;
  const gs = useGameStore.getState();
  const combatInfected = new Set(
    battle.heroes
      .filter((h) => h.buffs.some((b) => b.source === '__crimson'))
      .map((h) => h.uid)
  );
  for (const combatant of battle.heroes) {
    if (combatant.isDead) continue;
    const hero = gs.roster.find((h) => h.uid === combatant.uid);
    if (!hero) continue;
    if (combatInfected.has(hero.uid) || Math.random() < 0.25) {
      const updated = applyInfection(hero, gs.week);
      gs.updateHero(hero.uid, { crimsonCurse: updated.crimsonCurse });
    }
  }
}

// 敌方 AI 行动
function executeEnemyAction(
  set: (partial: Partial<CombatStore>) => void,
  get: () => CombatStore
) {
  const state = get();
  if (!state.battle || state.battle.isFinished) return;

  const battle = state.battle;
  const currentUid = battle.turnOrder[battle.currentActorIndex];
  const actor = battle.enemies.find((c) => c.uid === currentUid);
  if (!actor || actor.isDead) {
    get().endTurn();
    return;
  }

  // 简单 AI：随机选择一个可用技能和目标
  const usableSkills = actor.skills.filter((s) => {
    if (!s.launchPositions.includes(actor.position)) return false;
    if (s.perBattleLimit && s.perBattleUsed && s.perBattleUsed >= s.perBattleLimit) return false;
    return true;
  });

  if (usableSkills.length === 0) {
    get().endTurn();
    return;
  }

  const skill = usableSkills[Math.floor(Math.random() * usableSkills.length)];

  // 选择目标
  const targetSide = skill.targetSide === 'ally' ? battle.enemies : battle.heroes;
  const validTargets = targetSide.filter((t) => {
    if (t.isDead) return false;
    if (!skill.targetPositions.includes(t.position)) return false;
    return true;
  });

  if (validTargets.length === 0) {
    get().endTurn();
    return;
  }

  const target = validTargets[Math.floor(Math.random() * validTargets.length)];

  // 执行攻击
  let result: DamageResult;
  if (skill.isHeal) {
    result = calculateHeal(actor, target, skill);
  } else {
    result = calculateDamage(actor, target, skill);
  }

  const logEntry: CombatLogEntry = {
    turn: battle.turn,
    actor: getCombatantName(actor),
    action: getSkillName(skill.id),
    target: getCombatantName(target),
    result: result.log,
    damage: result.damage,
    crit: result.crit,
    miss: !result.hit,
    actorUid: actor.uid,
    targetUid: target.uid,
    isHeal: skill.isHeal,
  };

  battle.log.push(logEntry);

  // 血腥诅咒（Crimson Court DLC）：庭院怪攻击英雄时有概率感染
  if (target.side === 'hero' && isCrimsonMonster(actor.classId) && Math.random() < 0.25) {
    target.buffs.push({ id: 'crimson_infected', stat: 'atk', amount: 0, duration: 999, source: '__crimson' });
    battle.log.push({
      turn: battle.turn,
      actor: getCombatantName(actor),
      action: '血之诅咒',
      target: getCombatantName(target),
      result: `${getCombatantName(target)} 被血腥诅咒感染！`,
      damage: 0,
      crit: false,
      miss: false,
      actorUid: actor.uid,
      targetUid: target.uid,
      isHeal: false,
    });
  }

  set({
    battle: { ...battle },
    combatLog: [...battle.log],
  });

  // AI 叙事：描写敌方行动
  narrateCombatAction(battle, logEntry);

  if (checkBattleEnd(battle)) {
    set({ battle: { ...battle } });
    return;
  }

  // 继续下一回合
  setTimeout(() => get().endTurn(), 600);
}

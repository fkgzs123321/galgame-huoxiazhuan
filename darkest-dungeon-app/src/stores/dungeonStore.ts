// ============================================================
// 地牢探索状态管理
// ============================================================

import { create } from 'zustand';
import type {
  Dungeon,
  ProvisionItem,
  TorchEffect,
  DungeonLogEntry,
  PendingBattle,
  LootEntry,
  CurioResult,
  HeroInstance,
} from '@/types';
import { generateDungeon, getTorchEffectByValue } from '@/gateway/dungeonGenerator';
import { investigateCurio as resolveCurio, getCurioDefinition } from '@/gateway/curioSystem';
import { loadMonsters, loadHeroes } from '@/data/ddLoader';
import { useGameStore } from '@/stores/gameStore';
import { useQuestStore, mapQuestTypeToDungeonType } from '@/stores/questStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { getTrinketEntryById, getTrinketName, pickRandomTrinket } from '@/gateway/trinketSystem';
import { useStressStore } from '@/stores/stressStore';
import { useAiStore } from '@/stores/aiStore';
import { useNarrativeStore } from '@/stores/narrativeStore';
import { buildDungeonNarrativePrompt, type DungeonNarrativeEvent } from '@/gateway/narrative';
import { REGIONS, type RegionId } from '@/gateway/regionSystem';
import { THE_BLOOD_ITEM, drinkBlood, isCursed, getCurseStage, CURSE_STAGES, CURSE_STAGE_ORDER } from '@/gateway/crimsonSystem';
import type { MonsterData, TrinketEntry, HeroData } from '@/types';
import {
  applyCampEffect,
  calculateAmbushChance,
  pickAmbushMonsters,
  getCampSkillsForHero,
} from '@/gateway/campSystem';

interface DungeonStore {
  dungeon: Dungeon | null;
  provisions: ProvisionItem[];
  partyUids: string[];
  pendingBattle: PendingBattle | null;
  awaitingResolution: boolean;
  log: DungeonLogEntry[];
  questComplete: boolean;
  curioResult: CurioResult | null;
  currentCurioId: string | null;
  roomLoot: LootEntry[] | null;
  showCamp: boolean;
  monsterPoolCache: MonsterData[];
  activeQuestId: string | null;   // 当前关联的任务ID（来自任务公告板）
  campUsedSkills: Record<string, string[]>;  // heroUid -> 已使用技能id列表
  campLog: string[];                          // 营地使用日志
  campHeroDataMap: Record<string, HeroData>;  // classId -> HeroData（营地技能解析用）

  // 地牢操作
  enterDungeon: (level: number, questType: string, provisions: ProvisionItem[], partyUids: string[], region?: string) => Promise<void>;
  moveToRoom: (roomId: string) => void;
  moveAlongCorridor: () => void;
  retreatAlongCorridor: () => void;
  useTorch: () => void;
  useProvision: (id: string) => void;
  investigateCurio: (curioId: string, provisionUsed?: string) => void;
  dismissCurioResult: () => void;
  collectLoot: () => void;
  useCamp: () => void;
  dismissCamp: () => void;
  useCampSkill: (heroUid: string, skillId: string, targetUid?: string) => void;
  endCamp: () => void;
  retreat: () => void;
  leaveDungeon: () => void;

  // 战斗触发
  triggerBattle: (monsterIds: string[], source: 'room' | 'corridor', sourceId: string) => void;
  clearPendingBattle: () => void;
  resolveBattle: (victory: boolean) => void;

  // 火把效果
  getTorchEffect: () => TorchEffect;

  // 日志
  addLog: (text: string, type: DungeonLogEntry['type']) => void;
}

// 获取当前队伍英雄
function getPartyHeroes(partyUids: string[]): HeroInstance[] {
  const roster = useGameStore.getState().roster;
  return roster.filter((h) => partyUids.includes(h.uid));
}

// ============================================================
// AI 叙事接入（地牢）
//  - 叙事只在 AI 主开关开启时触发，失败/跳过不阻塞探索
//  - 数值/事件判定全部由程序完成，AI 只负责氛围与叙事包装
// ============================================================

function getAreaName(dungeon: Dungeon | null): string {
  if (dungeon?.region && REGIONS[dungeon.region as RegionId]) {
    return REGIONS[dungeon.region as RegionId].name;
  }
  return dungeon?.name ?? '地牢';
}

function partyBrief(partyUids: string[]): string[] {
  return getPartyHeroes(partyUids).map((h) => {
    const state: string[] = [];
    if (h.isDeathsDoor) state.push('死亡之门');
    if (h.affliction) state.push('崩溃');
    if (h.virtue) state.push('美德');
    const stateText = state.length > 0 ? `（${state.join('，')}）` : '';
    return `${h.name}(${h.classId}) HP ${h.currentHp}/${h.maxHp}${stateText}`;
  });
}

// 触发一次地牢叙事
function narrateDungeonEvent(ev: Omit<DungeonNarrativeEvent, 'areaName' | 'torch' | 'party'>) {
  if (!useAiStore.getState().config.enabled) return;
  const st = useDungeonStore.getState();
  if (!st.dungeon) return;

  const fullEvent: DungeonNarrativeEvent = {
    ...ev,
    areaName: getAreaName(st.dungeon),
    torch: st.dungeon.torch,
    party: partyBrief(st.partyUids),
  };
  const prompt = buildDungeonNarrativePrompt(fullEvent);
  useNarrativeStore.getState().startNarrative('dungeon', prompt, (text) => {
    useDungeonStore.getState().addLog(text, 'narrative');
  });
}

// 应用战利品
function applyLoot(loot: LootEntry[]): string {
  const gameStore = useGameStore.getState();
  const messages: string[] = [];

  for (const entry of loot) {
    switch (entry.type) {
      case 'gold':
        gameStore.addGold(entry.amount);
        messages.push(`${entry.amount} 金币`);
        break;
      case 'heirloom':
        if (entry.heirloomType) {
          gameStore.addHeirloom(entry.heirloomType, entry.amount);
          messages.push(`${entry.amount} ${heirloomName(entry.heirloomType)}`);
        }
        break;
      case 'provision':
        messages.push(`${entry.amount} 补给品`);
        break;
      case 'trinket':
        if (entry.itemId) {
          const trinket = getTrinketEntryById(entry.itemId);
          if (trinket) {
            useInventoryStore.getState().addTrinket(trinket as TrinketEntry);
            messages.push(`饰品「${getTrinketName(entry.itemId)}」已入背包`);
          } else {
            messages.push(`饰品 ${entry.itemId}`);
          }
        } else {
          // 无具体ID：从饰品库随机抽一件稀有度相符的饰品
          const randomTrinket = pickRandomTrinket();
          if (randomTrinket) {
            useInventoryStore.getState().addTrinket(randomTrinket);
            messages.push(`饰品「${getTrinketName(randomTrinket.id)}」已入背包`);
          } else {
            messages.push(`1 件饰品`);
          }
        }
        break;
    }
  }
  return messages.join(', ');
}

function heirloomName(type: string): string {
  const names: Record<string, string> = {
    bust: '雕像',
    portrait: '画像',
    deed: '契约',
    crest: '纹章',
  };
  return names[type] || type;
}

// 检查任务完成
function checkQuestComplete(dungeon: Dungeon): boolean {
  const goal = dungeon.questGoal;
  const progress = goal.progress as number;
  const target = goal.target as number;
  if (!target) return false;

  switch (goal.type) {
    case 'explore':
    case 'purge':
    case 'collect':
      return progress >= target;
    case 'kill_boss':
      return progress >= 1;
    case 'exit':
      return progress >= 1;
    default:
      return false;
  }
}

// 同步任务公告板的进度到 questStore
function syncQuestProgress(dungeon: Dungeon) {
  const questStore = useQuestStore.getState();
  const quest = questStore.activeQuest;
  if (!quest) return;

  const goal = dungeon.questGoal;
  const progress = (goal.progress as number) || 0;

  // 直接更新 questStore 中的 activeQuest 进度
  const newCount = Math.min(quest.goal.targetCount, progress);
  const isCompleted = newCount >= quest.goal.targetCount || checkQuestComplete(dungeon);

  useQuestStore.setState({
    activeQuest: {
      ...quest,
      goal: {
        ...quest.goal,
        currentCount: newCount,
      },
      isCompleted,
    },
  });
}

// 更新任务进度
function updateQuestProgress(dungeon: Dungeon, type: string, amount = 1): Dungeon {
  const goal = dungeon.questGoal;
  if (goal.type === type) {
    const currentProgress = (goal.progress as number) || 0;
    const newProgress = currentProgress + amount;
    const updatedDungeon = {
      ...dungeon,
      questGoal: { ...goal, progress: newProgress },
    };
    // 同步到 questStore
    syncQuestProgress(updatedDungeon);
    return updatedDungeon;
  }
  // 对于 exit 类型，到达出口房间时完成
  if (goal.type === 'exit' && type === 'exit') {
    const updatedDungeon = {
      ...dungeon,
      questGoal: { ...goal, progress: 1 },
    };
    syncQuestProgress(updatedDungeon);
    return updatedDungeon;
  }
  return dungeon;
}

export const useDungeonStore = create<DungeonStore>((set, get) => ({
  dungeon: null,
  provisions: [],
  partyUids: [],
  pendingBattle: null,
  awaitingResolution: false,
  log: [],
  questComplete: false,
  curioResult: null,
  currentCurioId: null,
  roomLoot: null,
  showCamp: false,
  monsterPoolCache: [],
  campUsedSkills: {},
  campLog: [],
  campHeroDataMap: {},

  activeQuestId: null,

  enterDungeon: async (level, questType, provisions, partyUids, region) => {
    // 加载怪物数据
    let monsters = get().monsterPoolCache;
    if (monsters.length === 0) {
      monsters = await loadMonsters();
    }

    // 检查任务公告板的 activeQuest
    const questStore = useQuestStore.getState();
    const activeQuest = questStore.activeQuest;
    let activeQuestId: string | null = null;
    let effectiveLevel = level;
    let effectiveQuestType = questType;

    // 加载英雄数据（用于营地技能解析）
    let heroDataList: HeroData[] = [];
    try {
      heroDataList = await loadHeroes();
    } catch {
      heroDataList = [];
    }
    const heroDataMap: Record<string, HeroData> = {};
    for (const hd of heroDataList) {
      heroDataMap[hd.id] = hd;
    }

    if (activeQuest) {
      activeQuestId = activeQuest.id;
      // 使用任务的地牢等级和类型（覆盖传入的参数）
      effectiveLevel = activeQuest.dungeonLevel;
      effectiveQuestType = mapQuestTypeToDungeonType(activeQuest.type);
    }

    // 生成地牢
    const dungeon = generateDungeon(effectiveLevel, effectiveQuestType, monsters, region as never);
    if (region) {
      dungeon.region = region;
    }

    // 如果有 activeQuest，将任务的进度信息注入到 dungeon.questGoal 中
    if (activeQuest) {
      dungeon.questGoal = {
        ...dungeon.questGoal,
        description: activeQuest.goal.description,
        target: activeQuest.goal.targetCount,
        progress: 0,
      };
    }

    set({
      dungeon,
      provisions,
      partyUids,
      pendingBattle: null,
      awaitingResolution: false,
      log: [
        { step: 0, text: `进入了 ${dungeon.name}（等级 ${effectiveLevel}）`, type: 'info' },
        { step: 0, text: `任务目标: ${dungeon.questGoal.description as string}`, type: 'info' },
      ],
      questComplete: false,
      curioResult: null,
      currentCurioId: null,
      roomLoot: null,
      showCamp: false,
      monsterPoolCache: monsters,
      activeQuestId,
      campUsedSkills: {},
      campLog: [],
      campHeroDataMap: heroDataMap,
    });

    // 切换到地牢阶段
    useGameStore.getState().setPhase('dungeon');

    // AI 叙事：进入地牢的氛围描写
    narrateDungeonEvent({
      kind: 'corridor_step',
      eventText: `队伍踏入了 ${dungeon.name}，阴暗的入口在身后缓缓合拢。`,
      extra: dungeon.questGoal?.description ? `本次任务：${dungeon.questGoal.description}` : undefined,
    });
  },

  moveToRoom: (roomId) => {
    const state = get();
    if (!state.dungeon) return;
    const dungeon = state.dungeon;

    // 如果正在走廊中，不能移动
    if (dungeon.currentCorridorId) return;

    // 找到连接当前房间和目标房间的走廊
    const currentRoom = dungeon.rooms.find((r) => r.id === dungeon.currentRoomId);
    if (!currentRoom) return;

    const corridor = dungeon.corridors.find(
      (c) =>
        (c.fromRoom === dungeon.currentRoomId && c.toRoom === roomId) ||
        (c.toRoom === dungeon.currentRoomId && c.fromRoom === roomId)
    );

    if (!corridor) {
      get().addLog('无法到达该房间 — 没有连接的走廊', 'warning');
      return;
    }

    // 如果走廊中有未清除的战斗遭遇且需要铲子清除路障（简化版：直接进入）
    set({
      dungeon: {
        ...dungeon,
        currentCorridorId: corridor.id,
        corridorPosition: 0,
      },
    });

    get().addLog(`进入走廊，前往 ${roomId}`, 'info');
  },

  moveAlongCorridor: () => {
    const state = get();
    if (!state.dungeon || !state.dungeon.currentCorridorId) return;

    const dungeon = state.dungeon;
    const corridor = dungeon.corridors.find((c) => c.id === dungeon.currentCorridorId);
    if (!corridor) return;

    const newPosition = dungeon.corridorPosition + 1;
    const torch = Math.max(0, dungeon.torch - 1);
    const steps = dungeon.steps + 1;

    // 检查是否到达走廊尽头
    if (newPosition >= corridor.length) {
      // 到达目标房间
      const targetRoomId = corridor.fromRoom === dungeon.currentRoomId
        ? corridor.toRoom
        : corridor.fromRoom;

      const targetRoom = dungeon.rooms.find((r) => r.id === targetRoomId);
      if (!targetRoom) return;

      // 更新走廊状态
      const updatedCorridors = dungeon.corridors.map((c) =>
        c.id === corridor.id ? { ...c, state: 'explored' as const } : c
      );

      // 更新房间状态
      const wasUnexplored = targetRoom.state === 'unexplored';
      const updatedRooms = dungeon.rooms.map((r) => {
        if (r.id === targetRoomId) {
          return { ...r, state: 'current' as const };
        }
        if (r.id === dungeon.currentRoomId && r.state === 'current') {
          return { ...r, state: 'explored' as const };
        }
        return r;
      });

      let updatedDungeon: Dungeon = {
        ...dungeon,
        rooms: updatedRooms,
        corridors: updatedCorridors,
        currentRoomId: targetRoomId,
        currentCorridorId: null,
        corridorPosition: 0,
        torch,
        steps,
      };

      set({ dungeon: updatedDungeon });
      get().addLog(`到达房间 ${targetRoomId}`, 'info');

      // 更新探索进度
      if (wasUnexplored) {
        updatedDungeon = updateQuestProgress(updatedDungeon, 'explore');
        set({ dungeon: updatedDungeon });
      }

      // 检查到达出口
      if (targetRoom.type === 'exit') {
        updatedDungeon = updateQuestProgress(updatedDungeon, 'exit');
        set({ dungeon: updatedDungeon });
        get().addLog('你到达了地牢出口！', 'info');
        if (checkQuestComplete(updatedDungeon)) {
          set({ questComplete: true });
          get().addLog('任务目标已完成！你可以返回城镇。', 'treasure');
        }
      }

      // 处理房间内容
      handleRoomArrival(targetRoom);
      return;
    }

    // 还在走廊中，更新位置
    const updatedDungeon: Dungeon = {
      ...dungeon,
      corridorPosition: newPosition,
      torch,
      steps,
    };
    set({ dungeon: updatedDungeon });

    // 检查当前步骤的遭遇
    const encounter = corridor.encounters[newPosition - 1];
    if (!encounter || encounter.resolved) {
      get().addLog('走廊中一片寂静...', 'info');
      return;
    }

    switch (encounter.type) {
      case 'nothing':
        encounter.resolved = true;
        get().addLog('走廊中一片寂静...', 'info');
        narrateDungeonEvent({
          kind: 'corridor_step',
          eventText: '队伍沿着走廊继续前行，只有脚步声与火把的噼啪声回荡。',
        });
        break;

      case 'battle':
        get().addLog('遭遇敌人！', 'battle');
        narrateDungeonEvent({
          kind: 'battle_start',
          eventText: '阴影中传来低吼与骨骼摩擦的声响，敌人从黑暗里扑出！',
        });
        get().triggerBattle(encounter.monsterIds || [], 'corridor', corridor.id);
        break;

      case 'curio': {
        const curioName = getCurioDefinition(encounter.curioId || '')?.name || '好奇物';
        get().addLog(`发现了一个 ${curioName}！`, 'curio');
        narrateDungeonEvent({
          kind: 'curio_result',
          eventText: `队伍在走廊边发现了一个「${curioName}」。`,
          extra: '它静静地立在那里，等待有人触碰。',
        });
        set({ currentCurioId: encounter.curioId });
        break;
      }

      case 'trap': {
        encounter.resolved = true;
        const damage = encounter.trapDamage || 3;
        const stress = encounter.trapStress || 10;
        get().addLog(`触发了陷阱！受到 ${damage} 点伤害，${stress} 点压力`, 'trap');
        narrateDungeonEvent({
          kind: 'trap',
          eventText: `一声机关脆响，陷阱被触发了！队伍受到 ${damage} 点生命与 ${stress} 点压力的代价。`,
        });

        // 对随机一名英雄造成伤害
        const heroes = getPartyHeroes(get().partyUids);
        if (heroes.length > 0) {
          const victim = heroes[Math.floor(Math.random() * heroes.length)];
          useGameStore.getState().updateHero(victim.uid, {
            currentHp: Math.max(0, victim.currentHp - damage),
          });
          // 通过压力系统施加压力（可能触发崩溃/心脏病判定）
          useStressStore.getState().addStress(victim.uid, stress, '地牢');
        }
        break;
      }
    }
  },

  retreatAlongCorridor: () => {
    const state = get();
    if (!state.dungeon || !state.dungeon.currentCorridorId) return;

    set({
      dungeon: {
        ...state.dungeon,
        currentCorridorId: null,
        corridorPosition: 0,
      },
    });
    get().addLog('撤回了上一个房间', 'info');
  },

  useTorch: () => {
    const state = get();
    if (!state.dungeon) return;

    const torchItem = state.provisions.find((p) => p.type === 'torch' && p.count > 0);
    if (!torchItem) {
      get().addLog('没有火把了！', 'warning');
      return;
    }

    const newTorch = Math.min(100, state.dungeon.torch + 25);
    set({
      dungeon: { ...state.dungeon, torch: newTorch },
      provisions: state.provisions.map((p) =>
        p.id === torchItem.id ? { ...p, count: p.count - 1 } : p
      ),
    });
    get().addLog(`使用了火把，火把亮度恢复至 ${newTorch}`, 'info');
  },

  useProvision: (id) => {
    const state = get();
    const item = state.provisions.find((p) => p.id === id && p.count > 0);
    if (!item) {
      get().addLog('该物品不可用', 'warning');
      return;
    }

    // 消耗物品
    set({
      provisions: state.provisions.map((p) =>
        p.id === id ? { ...p, count: p.count - 1 } : p
      ),
    });

    // 根据类型应用效果
    if (item.type === 'torch') {
      const newTorch = Math.min(100, (state.dungeon?.torch || 0) + 25);
      if (state.dungeon) {
        set({ dungeon: { ...state.dungeon, torch: newTorch } });
      }
      get().addLog(`使用了火把，火把亮度恢复至 ${newTorch}`, 'info');
    } else if (item.type === 'food') {
      // 恢复队伍生命值
      const heroes = getPartyHeroes(state.partyUids);
      const healAmount = 8;
      for (const hero of heroes) {
        const newHp = Math.min(hero.maxHp, hero.currentHp + healAmount);
        useGameStore.getState().updateHero(hero.uid, { currentHp: newHp });
      }
      get().addLog(`使用了食物，队伍恢复 ${healAmount} 点生命值`, 'info');
    } else if (item.type === 'bandage') {
      // 恢复生命值
      const heroes = getPartyHeroes(state.partyUids);
      const lowestHp = heroes.reduce((min, h) => (h.currentHp < min.currentHp ? h : min), heroes[0]);
      if (lowestHp) {
        const newHp = Math.min(lowestHp.maxHp, lowestHp.currentHp + 15);
        useGameStore.getState().updateHero(lowestHp.uid, { currentHp: newHp });
        get().addLog(`对 ${lowestHp.name} 使用了绷带，恢复 15 点生命值`, 'info');
      }
    } else if (item.type === 'antivenom') {
      get().addLog('使用了解毒剂（在战斗外效果有限）', 'info');
    } else if (item.type === 'blood') {
      // 血液：队伍中被诅咒英雄饮下，压制一阶并减压
      const heroes = getPartyHeroes(state.partyUids);
      const target =
        heroes
          .filter((h) => isCursed(h))
          .sort((a, b) => CURSE_STAGE_ORDER.indexOf(getCurseStage(b)!) - CURSE_STAGE_ORDER.indexOf(getCurseStage(a)!))[0];
      if (!target) {
        get().addLog('队伍中无人受到血腥诅咒，不需要饮血', 'warning');
        set({
          provisions: get().provisions.map((p) =>
            p.id === id ? { ...p, count: p.count + 1 } : p
          ),
        });
        return;
      }
      const stage = getCurseStage(target)!;
      const stageIdx = CURSE_STAGE_ORDER.indexOf(stage);
      const updated = drinkBlood(target);
      useGameStore.getState().updateHero(target.uid, {
        crimsonCurse: updated.crimsonCurse,
        stress: updated.stress,
      });
      if (stage === 'dormant') {
        get().addLog(`「${target.name}」的诅咒尚在潜伏，饮血只是杯水车薪`, 'info');
      } else {
        const stageName = CURSE_STAGES[stage].name;
        get().addLog(`「${target.name}」饮下血液，从「${stageName}」暂时退却（压力 −15）`, 'info');
      }
    } else {
      get().addLog(`${item.name} 需要在好奇物交互时使用`, 'info');
      // 退还物品
      set({
        provisions: get().provisions.map((p) =>
          p.id === id ? { ...p, count: p.count + 1 } : p
        ),
      });
    }
  },

  investigateCurio: (curioId, provisionUsed) => {
    const state = get();

    // 如果使用了补给品，消耗它
    if (provisionUsed) {
      const item = state.provisions.find((p) => p.id === provisionUsed && p.count > 0);
      if (!item) {
        get().addLog('该补给品不可用', 'warning');
        return;
      }
      set({
        provisions: state.provisions.map((p) =>
          p.id === provisionUsed ? { ...p, count: p.count - 1 } : p
        ),
      });
    }

    // 执行调查
    const result = resolveCurio(curioId, provisionUsed);
    set({ curioResult: result });

    // 应用奖励
    if (result.rewards.length > 0) {
      const lootText = applyLoot(result.rewards);
      get().addLog(`获得: ${lootText}`, 'treasure');

      // 更新收集任务进度
      const heirloomRewards = result.rewards.filter((r) => r.type === 'heirloom');
      if (heirloomRewards.length > 0 && state.dungeon) {
        const totalHeirlooms = heirloomRewards.reduce((sum, r) => sum + r.amount, 0);
        const updatedDungeon = updateQuestProgress(state.dungeon, 'collect', totalHeirlooms);
        set({ dungeon: updatedDungeon });
        if (checkQuestComplete(updatedDungeon)) {
          set({ questComplete: true });
          get().addLog('任务目标已完成！', 'treasure');
        }
      }
    }

    // 应用惩罚（压力/生命值）
    if (result.penaltyText) {
      const heroes = getPartyHeroes(state.partyUids);
      const curio = getCurioDefinition(curioId);
      if (curio && !provisionUsed) {
        // 默认结果的惩罚
        const def = curio.defaultResult;
        if (def.stressChange && def.stressChange > 0 && heroes.length > 0) {
          // 对所有英雄施加压力（通过压力系统，可能触发崩溃判定）
          for (const hero of heroes) {
            useStressStore.getState().addStress(hero.uid, def.stressChange, '地牢');
          }
        }
        if (def.hpChange && def.hpChange > 0 && heroes.length > 0) {
          const victim = heroes[Math.floor(Math.random() * heroes.length)];
          useGameStore.getState().updateHero(victim.uid, {
            currentHp: Math.max(0, victim.currentHp - def.hpChange),
          });
        }
      } else if (curio && provisionUsed && !result.success) {
        // 使用了补给品但失败，施加少量压力
        if (heroes.length > 0) {
          const victim = heroes[Math.floor(Math.random() * heroes.length)];
          useStressStore.getState().addStress(victim.uid, 5, '地牢');
        }
      }
      get().addLog(result.penaltyText, 'trap');
    }

    get().addLog(result.rewardText, result.success ? 'treasure' : 'curio');

    // AI 叙事：好奇物交互结果
    const curioDef = getCurioDefinition(curioId);
    const extraParts: string[] = [];
    if (result.rewards.length > 0) {
      const lootText = result.rewards.map((r) => {
        if (r.type === 'gold') return `${r.amount} 金币`;
        if (r.type === 'heirloom') return `${r.amount} ${heirloomName(r.heirloomType || 'crest')}`;
        return r.type;
      }).join('、');
      extraParts.push(`队伍获得了战利品：${lootText}`);
    }
    if (result.penaltyText) {
      extraParts.push(result.penaltyText);
    }
    narrateDungeonEvent({
      kind: 'curio_result',
      eventText: `队伍检查了「${curioDef?.name ?? curioId}」。`,
      extra: extraParts.length > 0 ? extraParts.join('；') : undefined,
    });

    // 标记走廊/房间中的好奇物为已解决
    if (state.dungeon) {
      markCurioResolved(state.dungeon, curioId, set);
    }
  },

  dismissCurioResult: () => {
    set({ curioResult: null, currentCurioId: null });
  },

  collectLoot: () => {
    const state = get();
    if (!state.roomLoot) return;

    const lootText = applyLoot(state.roomLoot);
    get().addLog(`收集了战利品: ${lootText}`, 'treasure');

    // 更新收集任务进度
    if (state.dungeon) {
      const heirloomLoot = state.roomLoot.filter((l) => l.type === 'heirloom');
      if (heirloomLoot.length > 0) {
        const total = heirloomLoot.reduce((sum, l) => sum + l.amount, 0);
        const updatedDungeon = updateQuestProgress(state.dungeon, 'collect', total);
        set({ dungeon: updatedDungeon });
        if (checkQuestComplete(updatedDungeon)) {
          set({ questComplete: true });
          get().addLog('任务目标已完成！', 'treasure');
        }
      }
    }

    // 标记房间为已清除
    if (state.dungeon) {
      const updatedRooms = state.dungeon.rooms.map((r) =>
        r.id === state.dungeon!.currentRoomId
          ? { ...r, state: 'cleared' as const }
          : r
      );
      set({
        dungeon: { ...state.dungeon, rooms: updatedRooms },
        roomLoot: null,
      });
    }
  },

  useCamp: () => {
    const state = get();
    if (!state.dungeon) return;

    // 恢复队伍生命值和压力
    const heroes = getPartyHeroes(state.partyUids);
    for (const hero of heroes) {
      useGameStore.getState().updateHero(hero.uid, {
        currentHp: Math.min(hero.maxHp, hero.currentHp + Math.floor(hero.maxHp * 0.3)),
      });
      // 通过压力系统减少压力（可能清除崩溃/美德状态）
      useStressStore.getState().healStress(hero.uid, 15, '地牢');
    }

    // 恢复一些火把
    const newTorch = Math.min(100, state.dungeon.torch + 20);

    // 标记房间为已清除
    const updatedRooms = state.dungeon.rooms.map((r) =>
      r.id === state.dungeon!.currentRoomId
        ? { ...r, state: 'cleared' as const }
        : r
    );

    set({
      dungeon: { ...state.dungeon, torch: newTorch, rooms: updatedRooms },
      showCamp: false,
    });
    get().addLog('队伍在营地休整，恢复了生命值和压力', 'info');
  },

  dismissCamp: () => {
    set({ showCamp: false });
    // 标记房间为已探索
    const state = get();
    if (state.dungeon) {
      const updatedRooms = state.dungeon.rooms.map((r) =>
        r.id === state.dungeon!.currentRoomId && r.state === 'current'
          ? { ...r, state: 'explored' as const }
          : r
      );
      set({ dungeon: { ...state.dungeon, rooms: updatedRooms } });
    }
  },

  useCampSkill: (heroUid, skillId, targetUid) => {
    const state = get();
    if (!state.dungeon) return;

    const heroes = getPartyHeroes(state.partyUids);
    const hero = heroes.find((h) => h.uid === heroUid);
    if (!hero) return;

    // 检查是否已使用过该技能（每次露营每技能最多1次）
    const used = state.campUsedSkills[heroUid] || [];
    if (used.includes(skillId)) {
      get().addLog('该营地技能本次露营已使用过', 'warning');
      return;
    }

    const heroData = state.campHeroDataMap[hero.classId];
    const skills = getCampSkillsForHero(hero, heroData);
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) {
      get().addLog('未找到该营地技能', 'warning');
      return;
    }

    // 应用效果
    const result = applyCampEffect(hero, heroes, skill, targetUid);

    // 通过 gameStore.updateHero 修改英雄
    for (const change of result.changes) {
      const target = heroes.find((h) => h.uid === change.heroUid);
      if (!target) continue;
      useGameStore.getState().updateHero(target.uid, {
        currentHp: Math.max(0, Math.min(target.maxHp, target.currentHp + change.hpDelta)),
      });
      // 通过压力系统应用压力增减（可能触发崩溃判定或清除状态）
      if (change.stressDelta > 0) {
        useStressStore.getState().addStress(target.uid, change.stressDelta, '地牢');
      } else if (change.stressDelta < 0) {
        useStressStore.getState().healStress(target.uid, -change.stressDelta, '地牢');
      }
    }

    // 记录使用
    set({
      campUsedSkills: {
        ...state.campUsedSkills,
        [heroUid]: [...used, skillId],
      },
      campLog: [...state.campLog, `${hero.name} 使用了「${skill.name}」`, ...result.log],
    });

    // 同步到地牢日志
    for (const line of result.log) {
      get().addLog(line, 'info');
    }
  },

  endCamp: () => {
    const state = get();
    if (!state.dungeon) return;

    const heroes = getPartyHeroes(state.partyUids);

    // 恢复一些火把
    const newTorch = Math.min(100, state.dungeon.torch + 20);

    // 标记房间为已清除
    const updatedRooms = state.dungeon.rooms.map((r) =>
      r.id === state.dungeon!.currentRoomId
        ? { ...r, state: 'cleared' as const }
        : r
    );

    // 计算伏击几率
    const usedHeroesSkills = Object.values(state.campUsedSkills);
    const allSkills = usedHeroesSkills.flat();
    const hasVigil = allSkills.includes('vigil');
    const hasStall = allSkills.includes('stall') || allSkills.includes('terrify');
    const ambushChance = calculateAmbushChance(hasVigil, hasStall, state.dungeon.torch);

    set({
      dungeon: { ...state.dungeon, torch: newTorch, rooms: updatedRooms },
      showCamp: false,
      campUsedSkills: {},
      campLog: [],
    });

    get().addLog('队伍结束露营，继续探索', 'info');

    // 触发伏击
    if (!hasVigil && Math.random() * 100 < ambushChance) {
      get().addLog('营地遭遇伏击！敌人从黑暗中扑来！', 'battle');
      const monsters = pickAmbushMonsters(state.monsterPoolCache);
      if (monsters.length > 0) {
        get().triggerBattle(
          monsters.map((m) => m.id),
          'room',
          state.dungeon?.currentRoomId || ''
        );
      }
    }
  },

  retreat: () => {
    const state = get();
    if (!state.dungeon) return;

    // 撤退惩罚：压力增加
    const heroes = getPartyHeroes(state.partyUids);
    for (const hero of heroes) {
      useStressStore.getState().addStress(hero.uid, 25, '地牢');
    }

    get().addLog('从地牢中撤退...', 'warning');
    narrateDungeonEvent({
      kind: 'retreat',
      eventText: '队伍放弃了深入，循着来路向地表撤退。黑暗在身后缓缓合拢。',
    });

    // 停止地牢叙事槽（防止撤退后仍在生成）
    useNarrativeStore.getState().skipNarrative('dungeon');

    // 如果有关联的任务，标记任务失败
    if (state.activeQuestId) {
      useQuestStore.getState().failQuest();
    }

    set({
      dungeon: null,
      provisions: [],
      partyUids: [],
      pendingBattle: null,
      awaitingResolution: false,
      questComplete: false,
      curioResult: null,
      currentCurioId: null,
      roomLoot: null,
      showCamp: false,
      activeQuestId: null,
      campUsedSkills: {},
      campLog: [],
      campHeroDataMap: {},
    });

    useGameStore.getState().setPhase('town');
  },

  leaveDungeon: () => {
    const state = get();
    if (!state.dungeon) return;

    // 任务完成奖励
    const level = state.dungeon.level;

    // 如果有关联的任务，调用 questStore.completeQuest() 发放任务奖励
    // 否则使用原有的默认奖励逻辑
    if (state.activeQuestId && state.questComplete) {
      const questStore = useQuestStore.getState();
      const quest = questStore.activeQuest;
      if (quest) {
        questStore.completeQuest();
        get().addLog(`任务完成！获得 ${quest.rewardGold} 金币奖励`, 'treasure');
      } else {
        // fallback：任务已被清除，使用默认奖励
        const bonusGold = 500 * level;
        useGameStore.getState().addGold(bonusGold);
        get().addLog(`任务完成奖励: ${bonusGold} 金币`, 'treasure');
      }
    } else if (state.activeQuestId && !state.questComplete) {
      // 任务未完成但离开了地牢，标记任务失败
      useQuestStore.getState().failQuest();
      get().addLog('任务未完成，未获得奖励', 'warning');
    } else {
      // 没有关联任务，使用默认奖励
      const bonusGold = 500 * level;
      useGameStore.getState().addGold(bonusGold);
      get().addLog(`任务完成奖励: ${bonusGold} 金币`, 'treasure');
    }

    set({
      dungeon: null,
      provisions: [],
      partyUids: [],
      pendingBattle: null,
      awaitingResolution: false,
      questComplete: false,
      curioResult: null,
      currentCurioId: null,
      roomLoot: null,
      showCamp: false,
      activeQuestId: null,
      campUsedSkills: {},
      campLog: [],
      campHeroDataMap: {},
    });

    useNarrativeStore.getState().skipNarrative('dungeon');
    useGameStore.getState().setPhase('town');
  },

  triggerBattle: (monsterIds, source, sourceId) => {
    set({ pendingBattle: { monsterIds, source, sourceId } });
  },

  clearPendingBattle: () => {
    set({ pendingBattle: null, awaitingResolution: true });
  },

  resolveBattle: (victory) => {
    const state = get();
    if (!state.dungeon) {
      set({ awaitingResolution: false });
      return;
    }

    const dungeon = state.dungeon;

    // 战斗消耗火把
    const torchAfterBattle = Math.max(0, dungeon.torch - 5);

    if (victory) {
      // 胜利：标记遭遇为已清除
      let updatedDungeon: Dungeon = { ...dungeon, torch: torchAfterBattle };

      if (state.pendingBattle) {
        // 不应该到这里，pendingBattle 应该已经被清除
      }

      // 查找 awaitingResolution 时对应的遭遇
      // 通过查找最近的未清除战斗遭遇来确定
      // 实际上，我们在 triggerBattle 时已经记录了 source
      // 但 clearPendingBattle 清除了 pendingBattle，所以我们需要另一种方式

      // 简化：标记当前走廊或房间的战斗为已清除
      if (dungeon.currentCorridorId) {
        // 走廊战斗
        const corridor = dungeon.corridors.find((c) => c.id === dungeon.currentCorridorId);
        if (corridor) {
          const updatedEncounters = corridor.encounters.map((e, i) =>
            i === dungeon.corridorPosition - 1 && e.type === 'battle'
              ? { ...e, resolved: true }
              : e
          );
          updatedDungeon = {
            ...updatedDungeon,
            corridors: dungeon.corridors.map((c) =>
              c.id === corridor.id ? { ...c, encounters: updatedEncounters } : c
            ),
          };
        }
      } else {
        // 房间战斗
        const room = dungeon.rooms.find((r) => r.id === dungeon.currentRoomId);
        if (room && (room.type === 'battle' || room.type === 'boss')) {
          updatedDungeon = {
            ...updatedDungeon,
            rooms: dungeon.rooms.map((r) =>
              r.id === room.id ? { ...r, state: 'cleared' as const } : r
            ),
          };

          // 更新任务进度
          if (room.type === 'battle') {
            updatedDungeon = updateQuestProgress(updatedDungeon, 'purge');
          }
          if (room.type === 'boss') {
            updatedDungeon = updateQuestProgress(updatedDungeon, 'kill_boss');
            get().addLog('BOSS已被击败！', 'battle');
          }
        }
      }

      set({ dungeon: updatedDungeon, awaitingResolution: false });
      get().addLog('战斗胜利！', 'battle');

      // 血腥诅咒（Crimson Court DLC）：庭院战斗胜利掉落 The Blood
      if (dungeon.region === 'crimson_court') {
        const bloodCount = 1 + Math.floor(Math.random() * 2);
        useInventoryStore.getState().addProvision({ ...THE_BLOOD_ITEM, count: bloodCount });
        get().addLog(`从战利品中搜出了 ${bloodCount} 瓶血液`, 'treasure');
      }

      // 检查任务完成
      if (checkQuestComplete(updatedDungeon)) {
        set({ questComplete: true });
        get().addLog('任务目标已完成！你可以返回城镇。', 'treasure');
      }
    } else {
      // 撤退或失败
      const heroes = getPartyHeroes(state.partyUids);
      const allDead = heroes.every((h) => h.currentHp <= 0);

      if (allDead) {
        // 全灭：返回城镇
        get().addLog('队伍全灭...被迫撤出地牢', 'warning');

        // 如果有关联的任务，标记任务失败
        if (state.activeQuestId) {
          useQuestStore.getState().failQuest();
        }

        set({
          dungeon: null,
          provisions: [],
          partyUids: [],
          awaitingResolution: false,
          questComplete: false,
          activeQuestId: null,
        });
        useGameStore.getState().setPhase('town');
      } else {
        // 撤退：标记遭遇为已解决但未清除
        set({
          dungeon: { ...dungeon, torch: torchAfterBattle },
          awaitingResolution: false,
        });
        get().addLog('战斗中撤退...', 'warning');
      }
    }
  },

  getTorchEffect: () => {
    const torch = get().dungeon?.torch ?? 100;
    const effect = getTorchEffectByValue(torch);
    return {
      level: effect.level as 'radiant' | 'lit' | 'dimming' | 'dark',
      minValue: effect.minValue,
      maxValue: effect.maxValue,
      name: effect.name,
      playerBuffs: effect.playerBuffs,
      monsterBuffs: effect.monsterBuffs,
    };
  },

  addLog: (text, type) => {
    const state = get();
    const step = state.dungeon?.steps ?? 0;
    set({
      log: [...state.log, { step, text, type }].slice(-50),
    });
  },
}));

// ---- 辅助函数 ----

// 处理到达房间时的内容
function handleRoomArrival(room: { id: string; type: string; state: string; encounter?: { type: string; monsters?: string[]; loot?: LootEntry[]; curioIds?: string[] } }) {
  const store = useDungeonStore.getState();

  // 如果房间已清除，不触发内容
  if (room.state === 'cleared' || room.state === 'explored') {
    store.addLog('这个房间已经被探索过了', 'info');
    return;
  }

  switch (room.type) {
    case 'entrance':
      store.addLog('这是地牢的入口', 'info');
      break;

    case 'exit':
      // 出口处理已在 moveAlongCorridor 中完成
      break;

    case 'battle':
      if (room.encounter?.monsters && room.encounter.monsters.length > 0) {
        store.addLog('房间中有敌人！', 'battle');
        narrateDungeonEvent({
          kind: 'battle_start',
          eventText: '推开房门，腐臭与杀意扑面而来——房间里藏着敌人！',
        });
        store.triggerBattle(room.encounter.monsters, 'room', room.id);
      }
      break;

    case 'boss':
      if (room.encounter?.monsters && room.encounter.monsters.length > 0) {
        store.addLog('BOSS出现在你面前！', 'battle');
        narrateDungeonEvent({
          kind: 'battle_start',
          eventText: '一股令人窒息的威压从房间深处弥漫而出——此地的主人现身了！',
        });
        store.triggerBattle(room.encounter.monsters, 'room', room.id);
      }
      break;

    case 'treasure':
      if (room.encounter?.loot) {
        useDungeonStore.setState({ roomLoot: room.encounter.loot });
        store.addLog('发现了宝箱！', 'treasure');
        narrateDungeonEvent({
          kind: 'corridor_step',
          eventText: '微光在房间一角闪动，一只尘封的宝箱静静等待着被开启。',
        });
      }
      break;

    case 'curio':
      if (room.encounter?.curioIds && room.encounter.curioIds.length > 0) {
        useDungeonStore.setState({ currentCurioId: room.encounter.curioIds[0] });
        store.addLog('房间中有一个好奇物', 'curio');
        const curioName = getCurioDefinition(room.encounter.curioIds[0])?.name || '好奇物';
        narrateDungeonEvent({
          kind: 'curio_result',
          eventText: `房间中央立着一件「${curioName}」，来历不明，气息古怪。`,
        });
      }
      break;

    case 'camp':
      useDungeonStore.setState({
        showCamp: true,
        campUsedSkills: {},
        campLog: [],
      });
      store.addLog('发现了一个适合扎营的地点', 'info');
      narrateDungeonEvent({
        kind: 'camp',
        eventText: '此处地势平坦、相对隐蔽，疲惫的队伍可以在此扎营休整。',
      });
      break;

    default:
      store.addLog('房间空空如也', 'info');
      break;
  }
}

// 标记好奇物为已解决
function markCurioResolved(
  dungeon: Dungeon,
  curioId: string,
  set: (partial: Partial<DungeonStore>) => void
) {
  // 在走廊中
  if (dungeon.currentCorridorId) {
    const corridor = dungeon.corridors.find((c) => c.id === dungeon.currentCorridorId);
    if (corridor) {
      const updatedEncounters = corridor.encounters.map((e) =>
        e.type === 'curio' && e.curioId === curioId && !e.resolved
          ? { ...e, resolved: true }
          : e
      );
      set({
        dungeon: {
          ...dungeon,
          corridors: dungeon.corridors.map((c) =>
            c.id === corridor.id ? { ...c, encounters: updatedEncounters } : c
          ),
        },
      });
    }
  } else {
    // 在房间中
    const room = dungeon.rooms.find((r) => r.id === dungeon.currentRoomId);
    if (room && room.type === 'curio') {
      set({
        dungeon: {
          ...dungeon,
          rooms: dungeon.rooms.map((r) =>
            r.id === room.id ? { ...r, state: 'cleared' as const } : r
          ),
        },
      });
    }
  }
}

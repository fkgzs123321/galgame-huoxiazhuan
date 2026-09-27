// ============================================================
// 任务状态管理 — Zustand Store
// 管理任务公告板的可用任务、当前进行的任务及任务进度
// 不使用 persist：任务列表每次刷新重新生成
// ============================================================

import { create } from 'zustand';
import type { Quest, QuestType, TrinketEntry } from '@/types';
import { generateQuests } from '@/gateway/questGenerator';
import { useGameStore } from '@/stores/gameStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { getTrinketEntryById } from '@/gateway/trinketSystem';

interface QuestStore {
  availableQuests: Quest[];          // 当前可接取的任务
  activeQuest: Quest | null;          // 当前进行的任务
  lastRefreshWeek: number;            // 上次刷新任务时的周数
  rewardLog: string[];                // 任务奖励日志（用于UI提示）

  // 操作
  refreshQuests: (week: number, highestLevel: number, questsFinished: number) => void;
  acceptQuest: (questId: string) => void;
  completeQuest: () => void;
  failQuest: () => void;
  updateQuestProgress: (goalType: string, count: number) => void;
  abandonQuest: () => void;
  clearRewardLog: () => void;
}

// 将 QuestType 映射到地牢生成器的 questType 字符串
// 地牢生成器支持: explore, kill_boss, purge, collect, exit
export function mapQuestTypeToDungeonType(type: QuestType): string {
  switch (type) {
    case 'explore':
      return 'explore';
    case 'exterminate':
      // 地牢生成器没有专门的 exterminate，使用 purge（清除敌人）
      return 'purge';
    case 'purge':
      return 'purge';
    case 'collect':
      return 'collect';
    case 'boss':
      return 'kill_boss';
    case 'escape':
      return 'exit';
    default:
      return 'explore';
  }
}

// 传家宝类型映射到 gameStore 的 heirlooms 字段
type HeirloomKey = 'bust' | 'portrait' | 'deed' | 'crest';

function isHeirloomKey(key: string): key is HeirloomKey {
  return key === 'bust' || key === 'portrait' || key === 'deed' || key === 'crest';
}

export const useQuestStore = create<QuestStore>((set, get) => ({
  availableQuests: [],
  activeQuest: null,
  lastRefreshWeek: 0,
  rewardLog: [],

  refreshQuests: (_week, highestLevel, questsFinished) => {
    // 推进1周
    useGameStore.getState().advanceWeek();
    const newWeek = useGameStore.getState().week;

    // 生成新任务
    const quests = generateQuests(newWeek, highestLevel, questsFinished);
    set({
      availableQuests: quests,
      lastRefreshWeek: newWeek,
      rewardLog: [],
    });
  },

  acceptQuest: (questId) => {
    const state = get();
    // 如果已有进行中的任务，不能接取新任务
    if (state.activeQuest) return;

    const quest = state.availableQuests.find((q) => q.id === questId);
    if (!quest) return;

    set({
      activeQuest: { ...quest },
      availableQuests: state.availableQuests.filter((q) => q.id !== questId),
    });
  },

  completeQuest: () => {
    const state = get();
    const quest = state.activeQuest;
    if (!quest) return;

    const gs = useGameStore.getState();
    const logs: string[] = [];

    // 1. 发放金币奖励
    if (quest.rewardGold > 0) {
      gs.addGold(quest.rewardGold);
      logs.push(`获得 ${quest.rewardGold} 金币`);
    }

    // 2. 发放纹章奖励
    for (const heirloom of quest.rewardHeirlooms) {
      if (isHeirloomKey(heirloom.type)) {
        gs.addHeirloom(heirloom.type, heirloom.amount);
        const names: Record<string, string> = {
          bust: '雕像',
          portrait: '画像',
          deed: '契约',
          crest: '纹章',
        };
        logs.push(`获得 ${heirloom.amount} ${names[heirloom.type] || heirloom.type}`);
      }
    }

    // 3. 发放饰品奖励（进入饰品背包）
    if (quest.rewardTrinket) {
      const trinket = getTrinketEntryById(quest.rewardTrinket);
      if (trinket) {
        useInventoryStore.getState().addTrinket(trinket as TrinketEntry);
        logs.push(`获得饰品: ${trinket.id}（已存入背包）`);
      } else {
        logs.push(`获得饰品: ${quest.rewardTrinket}（未找到数据）`);
      }
    }

    // 4. 增加 questsFinished 计数
    const newQuestsFinished = gs.questsFinished + 1;
    useGameStore.setState({ questsFinished: newQuestsFinished });

    // 5. 更新 highestDungeonLevel
    const newHighestLevel = Math.max(gs.highestDungeonLevel, quest.dungeonLevel);
    useGameStore.setState({ highestDungeonLevel: newHighestLevel });

    logs.push(`已完成任务数: ${newQuestsFinished}`);
    logs.push(`最高地牢等级: ${newHighestLevel}`);

    set({
      activeQuest: null,
      rewardLog: logs,
    });
  },

  failQuest: () => {
    const state = get();
    if (!state.activeQuest) return;

    // 任务失败：轻微压力惩罚已在撤退逻辑中处理
    // 这里只清除任务状态
    set({
      activeQuest: null,
      rewardLog: ['任务失败，未获得奖励'],
    });
  },

  updateQuestProgress: (goalType, count) => {
    const state = get();
    const quest = state.activeQuest;
    if (!quest) return;

    // 只有任务类型匹配时才更新进度
    if (quest.type !== goalType) return;

    const newCount = Math.min(quest.goal.targetCount, quest.goal.currentCount + count);
    const updatedQuest: Quest = {
      ...quest,
      goal: {
        ...quest.goal,
        currentCount: newCount,
      },
      isCompleted: newCount >= quest.goal.targetCount,
    };

    set({ activeQuest: updatedQuest });
  },

  abandonQuest: () => {
    set({
      activeQuest: null,
      rewardLog: ['已放弃当前任务'],
    });
  },

  clearRewardLog: () => {
    set({ rewardLog: [] });
  },
}));

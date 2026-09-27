// ============================================================
// 周结算状态管理 — Zustand Store
// 负责：周结算过渡状态的持有与完成/取消
// 不使用 persist：周结算数据仅存在于过渡期间
// ============================================================

import { create } from 'zustand';
import type { WeekSummary } from '@/gateway/weekSystem';
import { generateWeekSummary } from '@/gateway/weekSystem';
import { useGameStore } from '@/stores/gameStore';
import { useQuestStore } from '@/stores/questStore';
import { useTownStore } from '@/stores/townStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { settleCurses, THE_BLOOD_ID } from '@/gateway/crimsonSystem';

interface WeekStore {
  // 周结算数据
  weekSummary: WeekSummary | null;
  isTransitioning: boolean;

  // 操作
  startWeekTransition: () => void;       // 开始周结算
  completeWeekTransition: () => void;    // 完成周结算，返回城镇
  cancelWeekTransition: () => void;      // 取消（返回城镇不结算）
}

export const useWeekStore = create<WeekStore>((set, get) => ({
  weekSummary: null,
  isTransitioning: false,

  // 开始周结算：生成结算数据并进入 week_transition 阶段
  startWeekTransition: () => {
    const gs = useGameStore.getState();
    const summary = generateWeekSummary(
      gs.week,
      gs.roster,
      gs.gold,
      gs.heirlooms,
      gs.questsFinished,
      gs.highestDungeonLevel
    );
    set({ weekSummary: summary, isTransitioning: true });
    useGameStore.setState({ phase: 'week_transition' });
  },

  // 完成周结算：应用实际变化并返回城镇
  completeWeekTransition: () => {
    const { weekSummary } = get();
    if (!weekSummary) {
      // 没有结算数据时直接返回城镇（防御）
      useGameStore.setState({ phase: 'town' });
      set({ weekSummary: null, isTransitioning: false });
      return;
    }

    const gs = useGameStore.getState();

    // 1. 周数增加
    const newWeek = weekSummary.week;

    // 2. 金币结算（工资支出 + 事件收入/损失）
    gs.addGold(weekSummary.goldChange);

    // 3. 纹章结算（事件带来的纹章变化）
    for (const [key, amount] of Object.entries(weekSummary.heirloomChanges)) {
      if (amount !== 0) {
        gs.addHeirloom(key as keyof typeof gs.heirlooms, amount);
      }
    }

    // 4. 英雄状态结算（压力 / 生命 / 行程解锁 / 失踪回归）
    const changeMap = new Map(weekSummary.heroChanges.map((c) => [c.heroUid, c]));
    let updatedRoster = gs.roster.map((hero) => {
      const change = changeMap.get(hero.uid);
      const base = {
        activityLocked: false,
        missingUntilWeek:
          hero.missingUntilWeek && hero.missingUntilWeek <= newWeek
            ? null
            : hero.missingUntilWeek,
      };
      if (!change) return { ...hero, ...base };
      return {
        ...hero,
        ...base,
        stress: change.stressAfter,
        currentHp: change.hpAfter,
      };
    });

    // 4b. 血腥诅咒周结算（阶段推进 + 渴血无血惩罚）
    const bloodCount = useInventoryStore
      .getState()
      .provisionInventory.find((p) => p.id === THE_BLOOD_ID)?.count ?? 0;
    const curseResult = settleCurses(updatedRoster, newWeek, () => bloodCount > 0);
    updatedRoster = curseResult.heroes;
    for (const note of curseResult.notes) {
      useQuestStore.setState((s) => ({
        rewardLog: [...s.rewardLog, note],
      }));
    }

    useGameStore.setState({
      week: newWeek,
      roster: updatedRoster,
    });

    // 5. 刷新任务（新生成的契约）与城镇商品
    // 注意：为避免与 questStore.refreshQuests 内部调用 advanceWeek 产生循环，
    // 这里直接使用结算时已生成的 newQuests 写入任务板。
    useQuestStore.setState({
      availableQuests: weekSummary.newQuests,
      lastRefreshWeek: newWeek,
      rewardLog: [],
    });
    // 新一周建筑刷新：驿站新英雄、游商新商品
    useTownStore.getState().refreshStagecoach();
    useTownStore.getState().refreshNomadWagon();

    // 6. 返回城镇
    useGameStore.setState({ phase: 'town' });
    set({ weekSummary: null, isTransitioning: false });

    // 7. 周导演联动（异步，不阻塞结算）：程序化周记录 + AI 剧情事件
    void import('@/gateway/weekDirector').then((m) => m.triggerWeeklyDirector(newWeek));
  },

  // 取消周结算：返回城镇但不结算（不推进周数）
  cancelWeekTransition: () => {
    useGameStore.setState({ phase: 'town' });
    set({ weekSummary: null, isTransitioning: false });
  },
}));
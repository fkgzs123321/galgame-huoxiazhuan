import { create } from 'zustand';

/**
 * gameplayStore · 游戏运行时状态库
 * 对齐 fanren-remake 的模式:当前 stat_data 快照/身份选择/阶段就绪标记
 */
interface GameplayState {
  /** 当前 stat_data 快照(StatusBar/GameView/面板读取) */
  statData: Record<string, unknown>;
  /** 已选身份 id */
  selectedIdentity: string;
  /** 步骤7 就绪 */
  step7Ready: boolean;
  /** 阶段2 NPC 就绪 */
  stage2NpcReady: boolean;
  /** 阶段2 步骤9(H 场景)就绪 */
  stage2Step9Ready: boolean;
  /** 步骤9 E2E 就绪 */
  step9Ready: boolean;
  /** 结局记录防重(同一周目只记一次) */
  endingRecorded: string | null;
  setStatData: (sd: Record<string, unknown>) => void;
  setSelectedIdentity: (id: string | ((prev: string) => string)) => void;
  setStep7Ready: (v: boolean) => void;
  setStage2NpcReady: (v: boolean) => void;
  setStage2Step9Ready: (v: boolean) => void;
  setStep9Ready: (v: boolean) => void;
  setEndingRecorded: (v: string | null) => void;
}

export const useGameplayStore = create<GameplayState>((set) => ({
  statData: {},
  selectedIdentity: '',
  step7Ready: false,
  stage2NpcReady: false,
  stage2Step9Ready: false,
  step9Ready: false,
  endingRecorded: null,

  setStatData: (statData) => set({ statData }),
  setSelectedIdentity: (selectedIdentity) =>
    set((s) => ({
      selectedIdentity:
        typeof selectedIdentity === 'function'
          ? selectedIdentity(s.selectedIdentity)
          : selectedIdentity,
    })),
  setStep7Ready: (step7Ready) => set({ step7Ready }),
  setStage2NpcReady: (stage2NpcReady) => set({ stage2NpcReady }),
  setStage2Step9Ready: (stage2Step9Ready) => set({ stage2Step9Ready }),
  setStep9Ready: (step9Ready) => set({ step9Ready }),
  setEndingRecorded: (endingRecorded) => set({ endingRecorded }),
}));

/** 便捷:读取当前 stat_data */
export const getStatData = () => useGameplayStore.getState().statData;

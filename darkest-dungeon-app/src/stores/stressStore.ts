// ============================================================
// 压力系统状态管理 — Zustand（不持久化，压力数据从 HeroInstance 读取）
// ============================================================

import { create } from 'zustand';
import { useGameStore } from '@/stores/gameStore';
import {
  checkStressState,
  heartAttack,
  type StressCheckResult,
  type StressState,
  getAfflictionById,
  getVirtueById,
} from '@/gateway/stressSystem';

// 压力事件日志条目
export interface StressLogEntry {
  uid: string;
  heroName: string;
  time: string;          // 事件发生时机（如 '战斗' / '周结算' / '地牢'）
  text: string;
  type: 'info' | 'affliction' | 'virtue' | 'heartattack' | 'heal';
}

interface StressStore {
  pendingChecks: StressCheckResult[];        // 待处理的压力判定
  stressLog: StressLogEntry[];               // 压力事件日志

  // 触发压力判定（英雄压力达到100时）
  triggerStressCheck: (heroUid: string, time?: string) => void;

  // 心脏病发作判定（压力达到200）
  triggerHeartAttack: (heroUid: string, time?: string) => void;

  // 压力事件
  addStress: (heroUid: string, amount: number, time?: string) => void;
  healStress: (heroUid: string, amount: number, time?: string) => void;

  // 清除崩溃/美德
  clearAffliction: (heroUid: string) => void;
  clearVirtue: (heroUid: string) => void;

  // 日志
  clearStressLog: () => void;
}

function getHero(uid: string) {
  return useGameStore.getState().roster.find((h) => h.uid === uid);
}

function pushLog(
  log: StressLogEntry[],
  entry: StressLogEntry
): StressLogEntry[] {
  return [...log, entry].slice(-100);
}

export const useStressStore = create<StressStore>((set, get) => ({
  pendingChecks: [],
  stressLog: [],

  triggerStressCheck: (heroUid, time = '地牢') => {
    const hero = getHero(heroUid);
    if (!hero) return;

    const { state, result } = checkStressState(
      hero.stress,
      hero.resolveLevel,
      !!hero.affliction,
      !!hero.virtue
    );

    // 心脏病发作
    if (result?.heartAttack || state === 'heartattack') {
      get().triggerHeartAttack(heroUid, time);
      return;
    }

    // 已有状态则不改动
    if (hero.affliction || hero.virtue) return;

    if (!result) return;

    if (result.isVirtue && result.virtue) {
      // 美德
      useGameStore.getState().updateHero(heroUid, {
        virtue: result.virtue.id,
        affliction: null,
        stressState: 'virtuous',
      });
      set((s) => ({
        pendingChecks: [...s.pendingChecks, result],
        stressLog: pushLog(s.stressLog, {
          uid: heroUid,
          heroName: hero.name,
          time,
          text: `${hero.name} 在压力中展现了美德「${result.virtue!.name}」！`,
          type: 'virtue',
        }),
      }));
    } else if (result.isAffliction && result.affliction) {
      // 崩溃
      useGameStore.getState().updateHero(heroUid, {
        affliction: result.affliction.id,
        virtue: null,
        stressState: 'afflicted',
      });
      set((s) => ({
        pendingChecks: [...s.pendingChecks, result],
        stressLog: pushLog(s.stressLog, {
          uid: heroUid,
          heroName: hero.name,
          time,
          text: `${hero.name} 的精神崩溃了，陷入「${result.affliction!.name}」！`,
          type: 'affliction',
        }),
      }));
    }
  },

  triggerHeartAttack: (heroUid, time = '地牢') => {
    const hero = getHero(heroUid);
    if (!hero) return;

    const { dead, stressReset } = heartAttack(hero);

    if (dead) {
      useGameStore.getState().removeHero(heroUid);
      set((s) => ({
        stressLog: pushLog(s.stressLog, {
          uid: heroUid,
          heroName: hero.name,
          time,
          text: `${hero.name} 因心脏病发作而倒下，灵魂永远消散在黑暗中...`,
          type: 'heartattack',
        }),
      }));
      return;
    }

    // 存活：压力回落到 100，获得"心脏病"debuff
    const diseases = hero.diseases.includes('心脏病')
      ? hero.diseases
      : [...hero.diseases, '心脏病'];

    useGameStore.getState().updateHero(heroUid, {
      stress: stressReset,
      stressState: 'heartattack',
      affliction: null,
      virtue: null,
      diseases,
    });

    set((s) => ({
      stressLog: pushLog(s.stressLog, {
        uid: heroUid,
        heroName: hero.name,
        time,
        text: `${hero.name} 挺过了心脏病发作，但留下了后患「心脏病」，压力回落到 ${stressReset}`,
        type: 'heartattack',
      }),
    }));
  },

  addStress: (heroUid, amount, time = '地牢') => {
    const hero = getHero(heroUid);
    if (!hero) return;

    const newStress = Math.min(200, hero.stress + amount);
    useGameStore.getState().updateHero(heroUid, { stress: newStress });

    // 达到 200：心脏病发作
    if (newStress >= 200) {
      get().triggerHeartAttack(heroUid, time);
      return;
    }

    // 达到 100 且无已有状态：触发崩溃/美德判定
    if (newStress >= 100 && !hero.affliction && !hero.virtue) {
      get().triggerStressCheck(heroUid, time);
    }
  },

  healStress: (heroUid, amount, time = '城镇') => {
    const hero = getHero(heroUid);
    if (!hero) return;

    const newStress = Math.max(0, hero.stress - amount);
    useGameStore.getState().updateHero(heroUid, { stress: newStress });

    // 压力降到 0 以下：清除崩溃/美德状态
    if (newStress < 100) {
      if (hero.affliction) {
        useGameStore.getState().updateHero(heroUid, {
          affliction: null,
          stressState: newStress >= 75 ? 'stressed' : 'calm',
        });
        set((s) => ({
          stressLog: pushLog(s.stressLog, {
            uid: heroUid,
            heroName: hero.name,
            time,
            text: `${hero.name} 的崩溃状态「${getAfflictionById(hero.affliction)?.name ?? ''}」在城镇疗养中得以平复`,
            type: 'info',
          }),
        }));
      } else if (hero.virtue) {
        useGameStore.getState().updateHero(heroUid, {
          virtue: null,
          stressState: newStress >= 75 ? 'stressed' : 'calm',
        });
        set((s) => ({
          stressLog: pushLog(s.stressLog, {
            uid: heroUid,
            heroName: hero.name,
            time,
            text: `${hero.name} 的美德「${getVirtueById(hero.virtue)?.name ?? ''}」逐渐消退`,
            type: 'info',
          }),
        }));
      }
    }
  },

  clearAffliction: (heroUid) => {
    const hero = getHero(heroUid);
    if (!hero) return;
    useGameStore.getState().updateHero(heroUid, {
      affliction: null,
      stressState: (hero.stress >= 100 ? 'afflicted' : hero.stress >= 75 ? 'stressed' : 'calm') as StressState,
    });
  },

  clearVirtue: (heroUid) => {
    const hero = getHero(heroUid);
    if (!hero) return;
    useGameStore.getState().updateHero(heroUid, {
      virtue: null,
      stressState: (hero.stress >= 100 ? 'virtuous' : hero.stress >= 75 ? 'stressed' : 'calm') as StressState,
    });
  },

  clearStressLog: () => {
    set({ stressLog: [] });
  },
}));
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, HeroInstance, GamePhase } from '@/types';
import { checkStressState } from '@/gateway/stressSystem';
import { useStressStore } from '@/stores/stressStore';
import type { Affliction, Virtue } from '@/gateway/stressSystem';

interface GameStore extends GameState {
  // 英雄名册
  roster: HeroInstance[];
  selectedHeroUid: string | null;

  // Actions
  setPhase: (phase: GamePhase) => void;
  selectHero: (uid: string | null) => void;
  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;
  addHeirloom: (type: keyof GameState['heirlooms'], amount: number) => void;
  advanceWeek: () => void;
  addHero: (hero: HeroInstance) => void;
  removeHero: (uid: string) => void;
  updateHero: (uid: string, updates: Partial<HeroInstance>) => void;
  resetGame: () => void;
}

// 初始英雄队伍（4人小队）
const starterHeroes: HeroInstance[] = [
  {
    uid: 'hero_001',
    classId: 'crusader',
    name: '雷诺尔德',
    resolveLevel: 0,
    currentHp: 33,
    maxHp: 33,
    stress: 0,
    quirks: [],
    diseases: [],
    trinket1: null,
    trinket2: null,
    skills: ['smite', 'stunning_blow', 'holy_lance', 'battle_heal'],
    campingSkills: [],
    weaponLevel: 0,
    armorLevel: 0,
    missingUntilWeek: null,
    activityLocked: false,
  },
  {
    uid: 'hero_002',
    classId: 'highwayman',
    name: '迪斯马',
    resolveLevel: 0,
    currentHp: 23,
    maxHp: 23,
    stress: 0,
    quirks: [],
    diseases: [],
    trinket1: null,
    trinket2: null,
    skills: ['wicked_slice', 'pistol_shot', 'point_blank_shot', 'open_vein'],
    campingSkills: [],
    weaponLevel: 0,
    armorLevel: 0,
    missingUntilWeek: null,
    activityLocked: false,
  },
  {
    uid: 'hero_003',
    classId: 'vestal',
    name: '朱妮娅',
    resolveLevel: 0,
    currentHp: 22,
    maxHp: 22,
    stress: 0,
    quirks: [],
    diseases: [],
    trinket1: null,
    trinket2: null,
    skills: ['mace_bash', 'divine_grace', 'divine_comfort', 'dazzling_light'],
    campingSkills: [],
    weaponLevel: 0,
    armorLevel: 0,
    missingUntilWeek: null,
    activityLocked: false,
  },
  {
    uid: 'hero_004',
    classId: 'plague_doctor',
    name: '帕拉修斯',
    resolveLevel: 0,
    currentHp: 22,
    maxHp: 22,
    stress: 0,
    quirks: [],
    diseases: [],
    trinket1: null,
    trinket2: null,
    skills: ['noxious_blast', 'plague_grenade', 'blinding_gas', 'battle_bandage'],
    campingSkills: [],
    weaponLevel: 0,
    armorLevel: 0,
    missingUntilWeek: null,
    activityLocked: false,
  },
];

const initialState: GameState = {
  week: 1,
  phase: 'town',
  gold: 500,
  heirlooms: {
    bust: 0,
    portrait: 0,
    deed: 0,
    crest: 0,
  },
  questsFinished: 0,
  highestDungeonLevel: 0,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      roster: starterHeroes,
      selectedHeroUid: 'hero_001',

      setPhase: (phase) => set({ phase }),

      selectHero: (uid) => set({ selectedHeroUid: uid }),

      addGold: (amount) =>
        set((s) => ({ gold: Math.max(0, s.gold + amount) })),

      spendGold: (amount) => {
        if (get().gold < amount) return false;
        set({ gold: get().gold - amount });
        return true;
      },

      addHeirloom: (type, amount) =>
        set((s) => ({
          heirlooms: {
            ...s.heirlooms,
            [type]: s.heirlooms[type] + amount,
          },
        })),

      advanceWeek: () => {
        const current = get();

        // 周结算：压力>100 且无崩溃/美德的英雄有几率触发崩溃/美德判定
        const weeklyChecks: { uid: string; name: string; state: string; virtue?: Virtue; affliction?: Affliction }[] = [];
        const newRoster = current.roster.map((h) => {
          // 崩溃/美德英雄在城镇中活动受限
          const hasState = !!h.affliction || !!h.virtue;

          // 压力>100 且无状态：有几率触发判定
          if (h.stress >= 100 && !hasState) {
            const { state, result } = checkStressState(h.stress, h.resolveLevel, false, false);
            if (result?.isVirtue && result.virtue) {
              weeklyChecks.push({ uid: h.uid, name: h.name, state: 'virtue', virtue: result.virtue });
              return {
                ...h,
                virtue: result.virtue!.id,
                affliction: null,
                stressState: 'virtuous' as const,
                activityLocked: true,
                stress: Math.max(0, h.stress - 5),
              };
            }
            if (result?.isAffliction && result.affliction) {
              weeklyChecks.push({ uid: h.uid, name: h.name, state: 'affliction', affliction: result.affliction });
              return {
                ...h,
                affliction: result.affliction!.id,
                virtue: null,
                stressState: 'afflicted' as const,
                activityLocked: true,
                stress: Math.max(0, h.stress - 5),
              };
            }
          }

          return {
            ...h,
            stress: Math.max(0, h.stress - 5),
            activityLocked: hasState,
            missingUntilWeek:
              h.missingUntilWeek && h.missingUntilWeek <= current.week + 1
                ? null
                : h.missingUntilWeek,
          };
        });

        set({ week: current.week + 1, roster: newRoster });

        // 将周结算判定的结果写入 stressStore 日志与弹窗
        if (weeklyChecks.length > 0) {
          for (const c of weeklyChecks) {
            if (c.state === 'virtue' && c.virtue) {
              const virtue = c.virtue;
              useStressStore.setState((s) => ({
                pendingChecks: [...s.pendingChecks, {
                  rolled: 0,
                  virtueChance: 0,
                  isVirtue: true,
                  isAffliction: false,
                  virtue,
                  heartAttack: false,
                }],
              }));
              useStressStore.setState((s) => ({
                stressLog: [...s.stressLog, {
                  uid: c.uid,
                  heroName: c.name,
                  time: '周结算',
                  text: `${c.name} 在过夜中展现了美德「${virtue.name}」！`,
                  type: 'virtue' as const,
                }].slice(-100),
              }));
            } else if (c.affliction) {
              const affliction = c.affliction;
              useStressStore.setState((s) => ({
                pendingChecks: [...s.pendingChecks, {
                  rolled: 0,
                  virtueChance: 0,
                  isVirtue: false,
                  isAffliction: true,
                  affliction,
                  heartAttack: false,
                }],
              }));
              useStressStore.setState((s) => ({
                stressLog: [...s.stressLog, {
                  uid: c.uid,
                  heroName: c.name,
                  time: '周结算',
                  text: `${c.name} 的精神崩溃了，陷入「${affliction.name}」！`,
                  type: 'affliction' as const,
                }].slice(-100),
              }));
            }
          }
        }
      },

      addHero: (hero) =>
        set((s) => ({ roster: [...s.roster, hero] })),

      removeHero: (uid) =>
        set((s) => ({
          roster: s.roster.filter((h) => h.uid !== uid),
          selectedHeroUid: s.selectedHeroUid === uid ? null : s.selectedHeroUid,
        })),

      updateHero: (uid, updates) =>
        set((s) => ({
          roster: s.roster.map((h) =>
            h.uid === uid ? { ...h, ...updates } : h
          ),
        })),

      resetGame: () =>
        set({
          ...initialState,
          roster: starterHeroes,
          selectedHeroUid: 'hero_001',
        }),
    }),
    {
      name: 'dd-save',
      version: 2,
      // 版本迁移：旧存档只有1个英雄，升级到4人队伍
      migrate: (persistedState: unknown, version: number) => {
        if (version < 2) {
          // 重置为新的初始状态
          return {
            ...initialState,
            roster: starterHeroes,
            selectedHeroUid: 'hero_001',
          };
        }
        return persistedState;
      },
    }
  )
);

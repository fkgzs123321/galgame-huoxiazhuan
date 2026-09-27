// 总设置存储（对齐凡人独立端 GameSettings 的模块化设置底座）
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ContentMode = 'sfw' | 'nsfw' | 'balanced';

export interface AppSettings {
  // 外观
  language: 'zh' | 'en';
  titleFlicker: boolean;
  compactMode: boolean;
  // 玩法规则
  combat: {
    enableCriticals: boolean;
    enableStress: boolean;
    enableDeathsDoor: boolean;
    enableTorchEffects: boolean;
    showHitChance: boolean;
  };
  dungeon: {
    torchStart: number;
    torchDrainPerStep: number;
    encounterDensity: number;   // 0.5~2 遭遇密度倍率
    curioDensity: number;
    allowCamping: boolean;
  };
  // 叙事
  narrative: {
    style: 'dark' | 'classic' | 'whimsical';
    detailLevel: 'brief' | 'standard' | 'vivid';
    useAiNarrative: boolean;    // 与 aiStore.enabled 联动（此处为默认偏好）
  };
  // 存档
  save: {
    autoSave: boolean;
    backupOnSave: boolean;
    maxBackups: number;
  };
  // 内容模式（SFW/NSFW 隔离，只影响提示词与生成，不影响程序判定）
  contentMode: ContentMode;
  // 通知
  notify: {
    sound: boolean;
    onBattle: boolean;
    onWeek: boolean;
    onRecruit: boolean;
  };
  // 音效与朗读
  sound: {
    masterVolume: number;      // 0~1
    bgmEnabled: boolean;
    sfxEnabled: boolean;
    ttsEnabled: boolean;       // 事件朗读
    ttsRate: number;           // 0.5~2
  };
  // 难度档位
  difficulty: {
    mode: 'relaxed' | 'standard' | 'brutal';
    damageMultiplier: number;  // 敌方伤害倍率
    stressMultiplier: number;  // 压力倍率
    enemyBias: number;         // 遭遇规模偏置（-1~1）
    deathPenalty: 'none' | 'light' | 'full';  // 死亡惩罚
  };
  // 怪癖规则
  quirk: {
    maxQuirks: number;         // 怪癖上限
    lockableQuirks: number;    // 可锁定数量
    diseaseChance: number;     // 疾病概率偏置
  };
  // DLC / 模组
  dlc: {
    crimsonCourt: boolean;
    colorOfMadness: boolean;
    butcherCircus: boolean;
  };
  // 提示词组装
  prompt: {
    budgetLimit: number;       // 单次叙事 token 预算
    showTraces: boolean;       // 调试台记录 Trace
    loreBudget: number;        // 世界书注入预算
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'zh',
  titleFlicker: true,
  compactMode: false,
  combat: {
    enableCriticals: true,
    enableStress: true,
    enableDeathsDoor: true,
    enableTorchEffects: true,
    showHitChance: true,
  },
  dungeon: {
    torchStart: 75,
    torchDrainPerStep: 4,
    encounterDensity: 1,
    curioDensity: 1,
    allowCamping: true,
  },
  narrative: {
    style: 'dark',
    detailLevel: 'standard',
    useAiNarrative: false,
  },
  save: {
    autoSave: true,
    backupOnSave: true,
    maxBackups: 10,
  },
  contentMode: 'sfw',
  notify: {
    sound: true,
    onBattle: true,
    onWeek: true,
    onRecruit: true,
  },
  sound: {
    masterVolume: 0.7,
    bgmEnabled: true,
    sfxEnabled: true,
    ttsEnabled: false,
    ttsRate: 1,
  },
  difficulty: {
    mode: 'standard',
    damageMultiplier: 1,
    stressMultiplier: 1,
    enemyBias: 0,
    deathPenalty: 'full',
  },
  quirk: {
    maxQuirks: 6,
    lockableQuirks: 2,
    diseaseChance: 0,
  },
  dlc: {
    crimsonCourt: true,
    colorOfMadness: true,
    butcherCircus: false,
  },
  prompt: {
    budgetLimit: 3000,
    showTraces: true,
    loreBudget: 1200,
  },
};

interface ConfigStore {
  settings: AppSettings;
  setSettings: (patch: Partial<AppSettings>) => void;
  setSection: <K extends keyof AppSettings>(key: K, patch: Partial<AppSettings[K]>) => void;
  resetAll: () => void;
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      setSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      setSection: (key, patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            [key]: { ...(s.settings[key] as object), ...(patch as object) },
          } as AppSettings,
        })),

      resetAll: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'dd-app-settings',
      version: 1,
    }
  )
);

import { create } from 'zustand';
import {
  DEFAULT_APP_CONFIG,
  applyTheme,
  loadSavedTheme,
  saveTheme,
  type AppConfig,
  type ThemeName,
} from '@ui/types';
import * as idb from '@db/indexeddb';

/**
 * configStore · 全局配置状态库
 * 对齐 fanren-remake 的 configStore 模式:
 *  - 配置(8AI 端点/玩家名/预设绑定)持久化到 IndexedDB
 *  - 主题持久化到 localStorage
 */
export const APP_CONFIG_KV_KEY = '__app_config__';

interface ConfigState {
  config: AppConfig;
  theme: ThemeName;
  /** 配置加载完成(IndexedDB 异步) */
  loaded: boolean;
  /** 设置配置(内部,不自动持久化) */
  setConfig: (next: AppConfig) => void;
  /** 更新配置并持久化 */
  updateConfig: (next: AppConfig) => void;
  /** 切换主题(应用 + 持久化) */
  setTheme: (theme: ThemeName) => void;
  /** 从 IndexedDB 加载配置(启动时调用一次) */
  loadConfig: () => Promise<void>;
  /** 持久化当前配置到 IndexedDB */
  persistConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: DEFAULT_APP_CONFIG,
  theme: 'sakura',
  loaded: false,

  setConfig: (next) => set({ config: next }),

  updateConfig: (next) => {
    set({ config: next });
    void get().persistConfig();
  },

  setTheme: (theme) => {
    applyTheme(theme);
    saveTheme(theme);
    set({ theme });
  },

  loadConfig: async () => {
    try {
      const saved = await idb.kvGet<AppConfig>(APP_CONFIG_KV_KEY);
      const theme = loadSavedTheme();
      applyTheme(theme);
      set({
        config: saved ?? DEFAULT_APP_CONFIG,
        theme,
        loaded: true,
      });
    } catch (e) {
      console.warn('[configStore] 加载配置失败,使用默认配置:', e);
      const theme = loadSavedTheme();
      applyTheme(theme);
      set({ theme, loaded: true });
    }
  },

  persistConfig: async () => {
    try {
      await idb.kvSet(APP_CONFIG_KV_KEY, get().config);
    } catch (e) {
      console.warn('[configStore] 持久化配置失败:', e);
    }
  },
}));

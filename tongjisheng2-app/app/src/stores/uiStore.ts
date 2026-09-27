import { create } from 'zustand';

/**
 * uiStore · 界面状态库
 * 对齐 fanren-remake 的 historyUiStore / toastStore 模式:
 *  - 视图模式(game=视觉小说游戏模式 / dev=开发者模式)
 *  - 当前游戏面板(路由化前的面板切换;P0-3 页面化后逐渐被路由取代)
 */
export type ViewMode = 'game' | 'dev';

export type GamePanel =
  | 'status'
  | 'npc'
  | 'hscene'
  | 'combat'
  | 'multiView'
  | 'achievement'
  | 'replay'
  | 'conflict'
  | 'resistance'
  | 'phone'
  | 'shop'
  | 'computer'
  | 'presetEditor'
  | 'presetSwitch'
  | 'rpg'
  | 'save'
  | 'config'
  | 'workshop'
  | 'debug'
  | null;

interface UiState {
  viewMode: ViewMode;
  gamePanel: GamePanel;
  /** 面板标题(由 App 渲染区块维护,存入 store 便于页面化后复用) */
  panelTitle: string;
  setViewMode: (mode: ViewMode) => void;
  setGamePanel: (panel: GamePanel) => void;
  setPanelTitle: (title: string) => void;
  /** 打开面板(自动切到游戏模式) */
  openPanel: (panel: Exclude<GamePanel, null>) => void;
}

const VIEW_MODE_KEY = '__app_view_mode__';

function loadViewMode(): ViewMode {
  if (typeof localStorage === 'undefined') return 'game';
  const saved = localStorage.getItem(VIEW_MODE_KEY);
  return saved === 'dev' ? 'dev' : 'game';
}

export const useUiStore = create<UiState>((set) => ({
  viewMode: loadViewMode(),
  gamePanel: null,
  panelTitle: '',

  setViewMode: (mode) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    }
    set((state) => ({
      viewMode: mode,
      // 切到游戏模式时关闭面板(保持原行为)
      gamePanel: mode === 'game' ? null : state.gamePanel,
    }));
  },

  setGamePanel: (panel) => set({ gamePanel: panel }),

  setPanelTitle: (title) => set({ panelTitle: title }),

  openPanel: (panel) => set({ viewMode: 'game', gamePanel: panel }),
}));

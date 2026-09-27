import { create } from 'zustand';
import type { InstalledMod } from '@runtime/mod/mod-types';

/**
 * modStore · MOD 管理状态库
 * 对齐 fanren-remake 的 customContentStore 模式
 */
interface ModState {
  mods: InstalledMod[];
  activeModId: string | null;
  setMods: (mods: InstalledMod[]) => void;
  setActiveModId: (id: string | null) => void;
}

export const useModStore = create<ModState>((set) => ({
  mods: [],
  activeModId: null,
  setMods: (mods) => set({ mods }),
  setActiveModId: (activeModId) => set({ activeModId }),
}));

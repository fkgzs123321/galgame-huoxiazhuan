// ============================================================
// Mod 状态管理 — Zustand Store
// 管理 Mod 扫描、启用/禁用以及合并后的 Mod 数据
// ============================================================
import { create } from 'zustand';
import { scanMods, loadModData, collectEnabledModData } from '@/gateway/modLoader';
import type { ModInfo, ModData } from '@/types';

interface ModStore {
  // 已扫描到的所有 Mod
  mods: ModInfo[];
  // 当前启用的 Mod ID 列表
  activeMods: string[];
  // 合并后的启用 Mod 数据（供 ddLoader 消费）
  modData: ModData;
  // 每个 Mod 的原始数据（key 为 Mod path）
  modRawData: Record<string, ModData>;
  loading: boolean;
  modLog: string[];

  // 操作
  loadMods: () => Promise<void>;      // 从 public/mods 扫描加载
  enableMod: (id: string) => void;
  disableMod: (id: string) => void;
  getModData: () => ModData;          // 获取合并后的数据
  clearModLog: () => void;
}

// 追加日志（最多保留 100 条）
function pushLog(logs: string[], entry: string): string[] {
  return [...logs, `[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] ${entry}`].slice(-100);
}

export const useModStore = create<ModStore>((set, get) => ({
  mods: [],
  activeMods: [],
  modData: {},
  modRawData: {},
  loading: false,
  modLog: [],

  loadMods: async () => {
    set({ loading: true });
    const logs = [...get().modLog];
    const nextLogs = pushLog(logs, '正在扫描 Mod 目录…');

    try {
      const found = await scanMods();
      const rawData: Record<string, ModData> = {};

      // 逐个加载每个 Mod 的数据
      for (const mod of found) {
        const data = await loadModData(mod);
        rawData[mod.path] = data;
      }

      // 保留之前已启用的 Mod（若仍存在）
      const activeMods = get().activeMods.filter((id) =>
        found.some((m) => m.path === id || m.id === id)
      );

      // 重新计算合并数据
      const enabledData = found
        .filter((m) => activeMods.includes(m.path))
        .map((m) => rawData[m.path] ?? {});
      const merged = collectEnabledModData(enabledData);

      set({
        mods: found,
        modRawData: rawData,
        activeMods,
        modData: merged,
        modLog: pushLog(nextLogs, `扫描完成，发现 ${found.length} 个 Mod`),
        loading: false,
      });
    } catch (err) {
      set({
        modLog: pushLog(nextLogs, `扫描失败：${err instanceof Error ? err.message : String(err)}`),
        loading: false,
      });
    }
  },

  enableMod: (id) => {
    if (get().activeMods.includes(id)) return;
    const activeMods = [...get().activeMods, id];
    // 重新合并
    const mods = get().mods;
    const rawData = get().modRawData;
    const enabledData = mods.filter((m) => activeMods.includes(m.path)).map((m) => rawData[m.path] ?? {});
    set({
      activeMods,
      modData: collectEnabledModData(enabledData),
      modLog: pushLog(get().modLog, `已启用 Mod「${id}」`),
    });
  },

  disableMod: (id) => {
    if (!get().activeMods.includes(id)) return;
    const activeMods = get().activeMods.filter((x) => x !== id);
    const mods = get().mods;
    const rawData = get().modRawData;
    const enabledData = mods.filter((m) => activeMods.includes(m.path)).map((m) => rawData[m.path] ?? {});
    set({
      activeMods,
      modData: collectEnabledModData(enabledData),
      modLog: pushLog(get().modLog, `已停用 Mod「${id}」`),
    });
  },

  getModData: () => get().modData,

  clearModLog: () => set({ modLog: [] }),
}));
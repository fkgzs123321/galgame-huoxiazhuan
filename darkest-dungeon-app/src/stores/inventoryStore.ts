// ============================================================
// 饰品背包与补给品状态管理 — Zustand Store (持久化)
// ============================================================
// 管理未装备的饰品库存、补给品库存、英雄饰品装备/卸下、出售。
// 与 gameStore 协作：装备/卸下通过 gameStore.updateHero 修改英雄实例。
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrinketEntry, ProvisionItem } from '@/types';
import { useGameStore } from '@/stores/gameStore';
import {
  type TrinketBuff,
  parseTrinketBuffs,
  getSellPrice,
  getTrinketClassRequirements,
  getTrinketEntryById,
} from '@/gateway/trinketSystem';

interface InventoryStore {
  // ---- 背包数据 ----
  trinketInventory: TrinketEntry[];      // 未装备的饰品
  provisionInventory: ProvisionItem[];   // 补给品库存

  // ---- 饰品操作 ----
  addTrinket: (trinket: TrinketEntry) => void;
  removeTrinket: (trinketId: string) => void;

  // 英雄装备/卸下饰品
  equipTrinket: (heroUid: string, trinketId: string, slot: 1 | 2) => EquipResult;
  unequipTrinket: (heroUid: string, slot: 1 | 2) => void;

  // ---- 补给品 ----
  addProvision: (provision: ProvisionItem) => void;
  useProvision: (provisionId: string) => void;

  // ---- 出售 ----
  sellTrinket: (trinketId: string) => boolean;

  // ---- 查询 ----
  getTrinketById: (id: string) => TrinketEntry | undefined;
  getTrinketBuffs: (trinketId: string) => TrinketBuff[];
}

// 装备结果
export interface EquipResult {
  success: boolean;
  reason?: string;
}

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      trinketInventory: [],
      provisionInventory: [],

      // ---- 添加饰品到背包 ----
      addTrinket: (trinket) =>
        set((s) => ({
          trinketInventory: [...s.trinketInventory, trinket],
        })),

      // ---- 从背包移除饰品 ----
      removeTrinket: (trinketId) =>
        set((s) => ({
          trinketInventory: s.trinketInventory.filter((t) => t.id !== trinketId),
        })),

      // ---- 装备饰品到英雄 ----
      equipTrinket: (heroUid, trinketId, slot) => {
        const state = get();
        const gameStore = useGameStore.getState();

        const hero = gameStore.roster.find((h) => h.uid === heroUid);
        if (!hero) {
          return { success: false, reason: '未找到英雄' };
        }

        // 检查饰品是否在背包中
        const trinket = state.trinketInventory.find((t) => t.id === trinketId);
        if (!trinket) {
          return { success: false, reason: '饰品不在背包中' };
        }

        // 检查职业限制
        const classReqs = getTrinketClassRequirements(trinket);
        if (classReqs.length > 0 && !classReqs.includes(hero.classId)) {
          return { success: false, reason: '该饰品不适用于此职业' };
        }

        // 检查冲突：同类饰品不能同时装备两个
        const otherSlot = slot === 1 ? 2 : 1;
        const otherTrinketId = otherSlot === 1 ? hero.trinket1 : hero.trinket2;
        if (otherTrinketId === trinketId) {
          return { success: false, reason: '同类饰品只能装备一个' };
        }

        // 如果目标槽位已有饰品，先卸下（放回背包）
        const currentSlotTrinketId = slot === 1 ? hero.trinket1 : hero.trinket2;
        let returnedTrinket: TrinketEntry | null = null;
        if (currentSlotTrinketId) {
          // 从缓存或数据库获取被替换的饰品数据
          returnedTrinket =
            state.trinketInventory.find((t) => t.id === currentSlotTrinketId) ??
            getTrinketEntryById(currentSlotTrinketId) ??
            null;
          // 如果都找不到，构造一个最小条目
          if (!returnedTrinket) {
            returnedTrinket = {
              id: currentSlotTrinketId,
              buffs: [],
              heroClassRequirements: [],
              rarity: 'common',
              price: 0,
              limit: 0,
              originDungeon: '',
            };
          }
        }

        // 从背包中移除新装备的饰品
        let newInventory = state.trinketInventory.filter((t) => t.id !== trinketId);

        // 将被替换的饰品放回背包
        if (returnedTrinket) {
          newInventory = [...newInventory, returnedTrinket];
        }

        // 更新英雄装备
        const updates: Partial<{ trinket1: string | null; trinket2: string | null }> = {};
        if (slot === 1) {
          updates.trinket1 = trinketId;
        } else {
          updates.trinket2 = trinketId;
        }
        gameStore.updateHero(heroUid, updates);

        set({ trinketInventory: newInventory });
        return { success: true };
      },

      // ---- 卸下英雄的饰品 ----
      unequipTrinket: (heroUid, slot) => {
        const state = get();
        const gameStore = useGameStore.getState();

        const hero = gameStore.roster.find((h) => h.uid === heroUid);
        if (!hero) return;

        const currentTrinketId = slot === 1 ? hero.trinket1 : hero.trinket2;
        if (!currentTrinketId) return;

        // 获取被卸下的饰品数据
        let trinket: TrinketEntry | undefined =
          state.trinketInventory.find((t) => t.id === currentTrinketId) ??
          getTrinketEntryById(currentTrinketId);

        // 如果都找不到，构造一个最小条目
        if (!trinket) {
          trinket = {
            id: currentTrinketId,
            buffs: [],
            heroClassRequirements: [],
            rarity: 'common',
            price: 0,
            limit: 0,
            originDungeon: '',
          };
        }

        // 放回背包
        set((s) => ({
          trinketInventory: [...s.trinketInventory, trinket!],
        }));

        // 清空英雄槽位
        const updates: Partial<{ trinket1: string | null; trinket2: string | null }> = {};
        if (slot === 1) {
          updates.trinket1 = null;
        } else {
          updates.trinket2 = null;
        }
        gameStore.updateHero(heroUid, updates);
      },

      // ---- 补给品 ----
      addProvision: (provision) =>
        set((s) => {
          const existing = s.provisionInventory.find((p) => p.id === provision.id);
          if (existing) {
            return {
              provisionInventory: s.provisionInventory.map((p) =>
                p.id === provision.id
                  ? { ...p, count: p.count + provision.count }
                  : p
              ),
            };
          }
          return { provisionInventory: [...s.provisionInventory, provision] };
        }),

      useProvision: (provisionId) =>
        set((s) => ({
          provisionInventory: s.provisionInventory
            .map((p) =>
              p.id === provisionId ? { ...p, count: p.count - 1 } : p
            )
            .filter((p) => p.count > 0),
        })),

      // ---- 出售饰品（返回原价 50% 的金币） ----
      sellTrinket: (trinketId) => {
        const state = get();
        const trinket = state.trinketInventory.find((t) => t.id === trinketId);
        if (!trinket) return false;

        const sellPrice = getSellPrice(trinket);
        useGameStore.getState().addGold(sellPrice);

        set((s) => ({
          trinketInventory: s.trinketInventory.filter((t) => t.id !== trinketId),
        }));
        return true;
      },

      // ---- 查询 ----
      getTrinketById: (id) => get().trinketInventory.find((t) => t.id === id),

      getTrinketBuffs: (trinketId) => {
        const trinket =
          get().trinketInventory.find((t) => t.id === trinketId) ??
          getTrinketEntryById(trinketId);
        if (!trinket) return [];
        const buffs = Array.isArray(trinket.buffs) ? trinket.buffs : [];
        return parseTrinketBuffs(buffs);
      },
    }),
    {
      name: 'dd-inventory',
      version: 1,
    }
  )
);

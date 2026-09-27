// 世界书存储 — 条目 CRUD 与注入开关（对齐凡人 WorldbookManagerPage 的运行时）
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genId } from '@/utils/id';

export type WbTrigger = 'keyword' | 'always' | 'tag';

export interface WorldbookEntry {
  id: string;
  title: string;
  content: string;
  triggerType: WbTrigger;
  keywords: string[];      // keyword 触发词
  constant: boolean;       // 常驻注入
  enabled: boolean;
  order: number;
  budget: number;          // 估算 token 预算（-1 = 自动）
  lastHitAt?: number;
  hitCount: number;
  source: 'builtin' | 'user' | 'mod';
}

interface WorldbookStore {
  entries: WorldbookEntry[];
  loreEnabled: boolean;
  budgetLimit: number;          // 单次注入预算（token）
  addEntry: (partial?: Partial<WorldbookEntry>) => WorldbookEntry;
  updateEntry: (id: string, patch: Partial<WorldbookEntry>) => void;
  removeEntry: (id: string) => void;
  setEnabled: (id: string, enabled: boolean) => void;
  setLoreEnabled: (v: boolean) => void;
  setBudgetLimit: (n: number) => void;
  // 选择管线：给定关键词命中候选，返回按权重排序的注入条目
  selectEntries: (keywords: string[], budget?: number) => WorldbookEntry[];
  recordHit: (id: string) => void;
}

export const useWorldbookStore = create<WorldbookStore>()(
  persist(
    (set, get) => ({
      entries: [],
      loreEnabled: true,
      budgetLimit: 2000,

      addEntry: (partial) => {
        const entry: WorldbookEntry = {
          id: genId('wb'),
          title: '新条目',
          content: '',
          triggerType: 'keyword',
          keywords: [],
          constant: false,
          enabled: true,
          order: get().entries.length,
          budget: -1,
          hitCount: 0,
          source: 'user',
          ...partial,
        };
        set((s) => ({ entries: [...s.entries, entry] }));
        return entry;
      },

      updateEntry: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      removeEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      setEnabled: (id, enabled) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, enabled } : e)),
        })),

      setLoreEnabled: (v) => set({ loreEnabled: v }),
      setBudgetLimit: (n) => set({ budgetLimit: n }),

      selectEntries: (keywords, budget) => {
        const { entries, loreEnabled, budgetLimit } = get();
        if (!loreEnabled) return [];
        const cap = budget ?? budgetLimit;
        const kw = new Set(keywords.map((k) => k.toLowerCase()));
        const hits = entries
          .filter((e) => e.enabled)
          .map((e) => {
            const matched = e.triggerType === 'always'
              ? 1
              : e.keywords.filter((k) => kw.has(k.toLowerCase())).length;
            return { entry: e, score: matched };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => (b.entry.constant ? 1 : 0) - (a.entry.constant ? 1 : 0) || b.score - a.score || a.entry.order - b.entry.order);
        // 预算裁剪
        const out: WorldbookEntry[] = [];
        let used = 0;
        for (const { entry } of hits) {
          const est = entry.budget > 0 ? entry.budget : Math.ceil(entry.content.length / 2);
          if (used + est > cap && out.length > 0) break;
          used += est;
          out.push(entry);
        }
        return out;
      },

      recordHit: (id) =>
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === id ? { ...e, hitCount: e.hitCount + 1, lastHitAt: Date.now() } : e
          ),
        })),
    }),
    {
      name: 'dd-worldbook',
      version: 1,
    }
  )
);

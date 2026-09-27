// 编年史存储 — 每周大事记录（对齐凡人 TimelinePage 的底座）
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { genId } from '@/utils/id';

export interface ChronicleEntry {
  id: string;
  week: number;
  time: number;          // 真实时间戳
  category: 'week' | 'battle' | 'event' | 'hero' | 'quest' | 'system';
  title: string;
  detail?: string;
  meta?: Record<string, unknown>;
}

interface TimelineStore {
  entries: ChronicleEntry[];
  add: (entry: Omit<ChronicleEntry, 'id' | 'time'>) => void;
  remove: (id: string) => void;
  clear: () => void;
  byWeek: (week: number) => ChronicleEntry[];
}

const MAX_ENTRIES = 1000;

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set, get) => ({
      entries: [],

      add: (entry) => {
        const item: ChronicleEntry = { ...entry, id: genId('chr'), time: Date.now() };
        const entries = [...get().entries, item];
        if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
        set({ entries });
      },

      remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      clear: () => set({ entries: [] }),

      byWeek: (week) => get().entries.filter((e) => e.week === week),
    }),
    {
      name: 'dd-chronicle',
      version: 1,
    }
  )
);

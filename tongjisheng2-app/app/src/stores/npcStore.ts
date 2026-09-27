import { create } from 'zustand';
import type { NpcActionResult } from '@runtime/npc/action-runner';
import type { TimeSlot } from '@content/npc/schedule-data';

/**
 * npcStore · NPC 自然行动状态库
 */
interface NpcState {
  ready: boolean;
  lastAction: NpcActionResult | undefined;
  dayCount: number;
  timeSlot: TimeSlot;
  runLoading: boolean;
  message: { type: 'ok' | 'fail' | 'info'; text: string } | null;
  setReady: (ready: boolean) => void;
  setLastAction: (action: NpcActionResult | undefined) => void;
  setDayCount: (day: number) => void;
  setTimeSlot: (slot: TimeSlot) => void;
  setRunLoading: (loading: boolean) => void;
  setMessage: (msg: { type: 'ok' | 'fail' | 'info'; text: string } | null) => void;
}

export const useNpcStore = create<NpcState>((set) => ({
  ready: false,
  lastAction: undefined,
  dayCount: 1,
  timeSlot: '早',
  runLoading: false,
  message: null,

  setReady: (ready) => set({ ready }),
  setLastAction: (lastAction) => set({ lastAction }),
  setDayCount: (dayCount) => set({ dayCount }),
  setTimeSlot: (timeSlot) => set({ timeSlot }),
  setRunLoading: (runLoading) => set({ runLoading }),
  setMessage: (message) => set({ message }),
}));

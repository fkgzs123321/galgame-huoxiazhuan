// ============================================================
// 流式叙事状态 — 战斗/地牢两个槽位，单飞队列
//
//  - 同一槽位同时只允许一个生成请求（防请求重叠/乱序）
//  - 生成期间新触发的事件会记录为 pending，当前请求结束后自动接续
//  - 完成时通过 commit 回调把最终文本提交进对应日志（由调用方提供）
//  - AI 失败/被跳过只影响叙事，绝不阻塞玩法流程
// ============================================================

import { create } from 'zustand';
import { useAiStore } from '@/stores/aiStore';
import { requestNarrative } from '@/gateway/narrative';
import { AiError } from '@/gateway/aiGateway';

export type NarrativeSlot = 'combat' | 'dungeon';

interface SlotState {
  generating: boolean;   // 当前是否在生成
  text: string;          // 流式累积文本
  error: string | null;  // 最近一次失败原因
  pending: number;       // 生成期间新到触发的计数
}

export interface PendingNarrative {
  userPrompt: string;
  commit: (text: string) => void;
}

interface NarrativeStore {
  combat: SlotState;
  dungeon: SlotState;
  startNarrative: (slot: NarrativeSlot, userPrompt: string, commit: (text: string) => void) => void;
  skipNarrative: (slot: NarrativeSlot) => void;
  clearSlot: (slot: NarrativeSlot) => void;
  reset: () => void;
}

const emptySlot = (): SlotState => ({ generating: false, text: '', error: null, pending: 0 });

// 槽位内部运行器（模块级闭包，不在 store 里存 AbortController）
const runners: Record<
  NarrativeSlot,
  { controller: AbortController | null; pendingPrompt: PendingNarrative | null }
> = {
  combat: { controller: null, pendingPrompt: null },
  dungeon: { controller: null, pendingPrompt: null },
};

async function runSlot(slot: NarrativeSlot, prompt: PendingNarrative) {
  const config = useAiStore.getState().config;
  const controller = new AbortController();
  runners[slot].controller = controller;

  useNarrativeStore.setState((s) => ({
    [slot]: { ...s[slot], generating: true, text: '', error: null },
  }));

  try {
    const text = await requestNarrative(config, prompt.userPrompt, {
      signal: controller.signal,
      onChunk: (delta) => {
        useNarrativeStore.setState((s) => ({
          [slot]: { ...s[slot], text: s[slot].text + delta },
        }));
      },
    });

    // 完成：提交到日志（仅当请求未被取消/替换）
    if (runners[slot].controller === controller) {
      if (text.length > 0) {
        prompt.commit(text);
      }
      // 保留文本供面板持续显示（下一次生成开始时会被清空）
      useNarrativeStore.setState((s) => ({
        [slot]: { ...s[slot], generating: false, error: null },
      }));
    }
  } catch (err) {
    if (runners[slot].controller === controller) {
      const message =
        err instanceof AiError ? err.message : err instanceof Error ? err.message : String(err);
      useNarrativeStore.setState((s) => ({
        [slot]: { ...s[slot], generating: false, error: message },
      }));
    }
  } finally {
    if (runners[slot].controller === controller) {
      runners[slot].controller = null;

      // 生成期间有新的触发 → 接续最新一条
      const pending = runners[slot].pendingPrompt;
      runners[slot].pendingPrompt = null;
      useNarrativeStore.setState((s) => ({
        [slot]: { ...s[slot], pending: 0 },
      }));
      if (pending) {
        runSlot(slot, pending);
      }
    }
  }
}

export const useNarrativeStore = create<NarrativeStore>((set, get) => ({
  combat: emptySlot(),
  dungeon: emptySlot(),

  startNarrative: (slot, userPrompt, commit) => {
    // 主开关关闭时不触发（调用方也可以提前判断，这里双保险）
    if (!useAiStore.getState().config.enabled) return;

    const state = get()[slot];
    if (state.generating) {
      // 单飞：只保留最新一次触发
      runners[slot].pendingPrompt = { userPrompt, commit };
      set({ [slot]: { ...state, pending: state.pending + 1 } });
      return;
    }

    // 立即清掉上一轮残留的流式文本
    set({ [slot]: { ...state, text: '', error: null } });
    runSlot(slot, { userPrompt, commit });
  },

  skipNarrative: (slot) => {
    const runner = runners[slot];
    if (runner.controller) {
      runner.controller.abort();
      runner.controller = null;
      runner.pendingPrompt = null;
    }
    set((s) => ({
      [slot]: { ...s[slot], generating: false, text: '', error: null, pending: 0 },
    }));
  },

  clearSlot: (slot) => set(() => ({ [slot]: emptySlot() })),

  reset: () => set({ combat: emptySlot(), dungeon: emptySlot() }),
}));

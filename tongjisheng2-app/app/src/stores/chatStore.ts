import { create } from 'zustand';
import type { ChatMessage, MainChatStatus, VariableUpdateEvent } from '@ui/types';

/**
 * chatStore · 主聊天状态库
 * 对齐 fanren-remake 的模式:聊天消息/生成状态/最近变量更新集中管理
 */
interface ChatState {
  messages: ChatMessage[];
  status: MainChatStatus;
  error: string | undefined;
  lastVariableUpdate: VariableUpdateEvent | undefined;
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  appendMessage: (msg: ChatMessage) => void;
  updateMessage: (index: number, patch: Partial<ChatMessage>) => void;
  setStatus: (status: MainChatStatus) => void;
  setError: (error: string | undefined) => void;
  setLastVariableUpdate: (evt: VariableUpdateEvent | undefined) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  status: 'idle',
  error: undefined,
  lastVariableUpdate: undefined,

  setMessages: (messages) =>
    set((state) => ({
      messages: typeof messages === 'function' ? messages(state.messages) : messages,
    })),

  appendMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  updateMessage: (index, patch) =>
    set((state) => ({
      messages: state.messages.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    })),

  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setLastVariableUpdate: (lastVariableUpdate) => set({ lastVariableUpdate }),

  reset: () => set({ messages: [], status: 'idle', error: undefined, lastVariableUpdate: undefined }),
}));

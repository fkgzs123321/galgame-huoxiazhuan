import { create } from 'zustand';

/**
 * toastStore · 全局通知状态库
 * 对齐 fanren-remake 的 toastStore;与 @ui/base/Toast 的 useToast 配合:
 *  - 本 store 持有通知列表,ToastProvider 渲染
 *  - 纯函数式调用:toastStore.getState().success('...')
 */
export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastState {
  items: ToastItem[];
  show: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  dismiss: (id: number) => void;
}

let toastSeq = 1;

export const useToastStore = create<ToastState>((set, get) => {
  const dismiss = (id: number) => set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
  const show = (message: string, type: ToastType = 'info', duration = 3200) => {
    const id = toastSeq++;
    set((s) => ({ items: [...s.items.slice(-4), { id, type, message, duration }] }));
    if (duration > 0) {
      window.setTimeout(() => dismiss(id), duration);
    }
  };
  return {
    items: [],
    show,
    success: (m, d) => show(m, 'success', d),
    warning: (m, d) => show(m, 'warning', d),
    error: (m, d) => show(m, 'error', d),
    info: (m, d) => show(m, 'info', d),
    dismiss,
  };
});

/** 便捷引用:在非组件代码中调用 */
export const toastStore = useToastStore.getState;

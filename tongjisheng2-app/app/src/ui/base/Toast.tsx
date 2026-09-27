import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: React.ReactNode;
  duration: number;
}

interface ToastApi {
  show: (message: React.ReactNode, type?: ToastType, duration?: number) => void;
  success: (message: React.ReactNode, duration?: number) => void;
  warning: (message: React.ReactNode, duration?: number) => void;
  error: (message: React.ReactNode, duration?: number) => void;
  info: (message: React.ReactNode, duration?: number) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: '💬',
};

let toastSeq = 1;

/** Toast Provider:全局通知 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: React.ReactNode, type: ToastType = 'info', duration = 3200) => {
      const id = toastSeq++;
      setItems((prev) => [...prev.slice(-4), { id, type, message, duration }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m, d) => show(m, 'success', d),
      warning: (m, d) => show(m, 'warning', d),
      error: (m, d) => show(m, 'error', d),
      info: (m, d) => show(m, 'info', d),
      dismiss,
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="th-toast-viewport">
        {items.map((t) => (
          <div key={t.id} className={`th-toast th-toast--${t.type}`} onClick={() => dismiss(t.id)}>
            <span className="th-toast__icon">{TOAST_ICONS[t.type]}</span>
            <span style={{ flex: 1, lineHeight: 1.5 }}>{t.message}</span>
            <button className="th-toast__close" aria-label="关闭">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** 使用全局 Toast */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // 未包裹 Provider 时退化为 console 输出,避免崩溃
    const fallback: ToastApi = {
      show: (m, t = 'info') => console.info(`[toast:${t}]`, m),
      success: (m) => console.info('[toast:success]', m),
      warning: (m) => console.warn('[toast:warning]', m),
      error: (m) => console.error('[toast:error]', m),
      info: (m) => console.info('[toast:info]', m),
      dismiss: () => {},
    };
    return fallback;
  }
  return ctx;
}

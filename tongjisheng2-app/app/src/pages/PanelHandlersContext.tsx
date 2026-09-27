import { createContext, useContext } from 'react';
import type { AppConfig, IdentityOption } from '@ui/types';

/**
 * PanelHandlersContext · 面板页回调桥
 * 路由页面需要访问 App 容器持有的业务回调(聊天/身份/存档)。
 * 对齐凡人架构:页面通过 context 消费容器服务,而非直接传 props 链。
 */

export interface PanelHandlers {
  /** 身份确认(写 stat_data + Kernel + mock 开场) */
  onIdentityConfirm: (opt: IdentityOption) => void;
  /** 配置变更 */
  onConfigChange: (next: AppConfig) => void;
  /** 回放:加载指定 revision */
  onLoadRevision: (hash: string) => Promise<void>;
  // ── 存档(SaveRecovery) ──
  onSave: (label: string) => Promise<void>;
  onLoad: (hash: string) => Promise<void>;
  onDelete: (hash: string) => Promise<void>;
  onExport: (hash: string) => Promise<void>;
  onImport: (file: File) => Promise<void>;
  onRecover: () => Promise<void>;
  onRetry: () => Promise<void>;
  onRollback: () => Promise<void>;
  /** 关闭面板(返回主游戏) */
  onClose: () => void;
}

const PanelHandlersContext = createContext<PanelHandlers | null>(null);

export function PanelHandlersProvider({
  value,
  children,
}: {
  value: PanelHandlers;
  children: React.ReactNode;
}) {
  return (
    <PanelHandlersContext.Provider value={value}>{children}</PanelHandlersContext.Provider>
  );
}

export function usePanelHandlers(): PanelHandlers {
  const ctx = useContext(PanelHandlersContext);
  if (!ctx) {
    throw new Error('usePanelHandlers 必须在 PanelHandlersProvider 内使用');
  }
  return ctx;
}

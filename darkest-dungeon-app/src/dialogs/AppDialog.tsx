// 通用模态对话框基件（遮罩/标题/关闭/ESC/点击遮罩关闭）
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

interface AppDialogProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  width?: string;          // 如 'max-w-lg'
  closeOnOverlay?: boolean;
}

export function AppDialog({ open, title, onClose, children, footer, width = 'max-w-lg', closeOnOverlay = true }: AppDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)' }}
      onClick={closeOnOverlay ? onClose : undefined}
    >
      <div
        className={clsx('dd-panel w-full', width)}
        style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dd-panel-header shrink-0">
          <span>{title}</span>
          <button
            onClick={onClose}
            className="text-dd-textDim hover:text-dd-gold transition-colors text-sm px-1"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
          {children}
        </div>
        {footer && <div className="px-4 pb-4 pt-1 shrink-0 border-t border-dd-gold/10">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

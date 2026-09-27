import React, { useEffect } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: ModalSize;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** 点击遮罩关闭(默认 true) */
  closeOnOverlay?: boolean;
  /** ESC 关闭(默认 true) */
  closeOnEsc?: boolean;
  width?: number | string;
}

/** 模态框:对齐 shadcn/ui Dialog,支持 sm/md/lg/xl 尺寸 */
export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  footer,
  children,
  closeOnOverlay = true,
  closeOnEsc = true,
  width,
}: ModalProps) {
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;

  return (
    <div
      className="th-modal-overlay"
      onClick={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`th-modal th-modal--${size}`}
        style={width !== undefined ? { maxWidth: width } : undefined}
        role="dialog"
        aria-modal="true"
      >
        {title !== undefined && (
          <div className="th-modal__header">
            <h3 className="th-modal__title">{title}</h3>
            <button className="th-modal__close" onClick={onClose} aria-label="关闭" title="关闭">
              ✕
            </button>
          </div>
        )}
        <div className="th-modal__body">{children}</div>
        {footer !== undefined && <div className="th-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

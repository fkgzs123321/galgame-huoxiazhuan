import React from 'react';
import { Modal, Button } from '@ui/base';

/**
 * ConfirmDialog · 通用确认对话框
 * 对齐 fanren-remake 的 dialogs 层:替代 window.confirm 的受控确认框。
 */

export interface ConfirmDialogProps {
  open: boolean;
  title?: React.ReactNode;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = '请确认',
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary'}
            onClick={() => {
              onConfirm();
              onCancel();
            }}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div style={{ lineHeight: 1.7, fontSize: 13, color: 'var(--c-text)', whiteSpace: 'pre-wrap' }}>
        {message}
      </div>
    </Modal>
  );
}

/** Promise 化确认:await confirmAsync('确定?') → boolean */
export function confirmAsync(options: {
  title?: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'primary' | 'warning';
}): Promise<boolean> {
  return new Promise((resolve) => {
    const holder = document.createElement('div');
    holder.id = '__th-confirm-host__';
    document.body.appendChild(holder);
    // 简单实现:挂一个内联渲染(由挂载方负责卸载)
    // 实际使用中通过 React 渲染 ConfirmDialog 并 resolve
    resolve(true); // 占位,推荐使用受控组件形式
    holder.remove();
    void options;
  });
}

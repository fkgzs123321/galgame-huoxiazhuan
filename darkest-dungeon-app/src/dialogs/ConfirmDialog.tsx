// 确认对话框（危险操作统一入口）
import { AppDialog } from './AppDialog';
import { Button } from '@/ui/Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, message, confirmText = '确认', cancelText = '取消',
  danger = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <AppDialog
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>{cancelText}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmText}</Button>
        </div>
      }
    >
      <div className="text-sm text-dd-textMuted leading-relaxed">{message}</div>
    </AppDialog>
  );
}

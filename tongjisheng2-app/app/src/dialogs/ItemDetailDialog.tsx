import React from 'react';
import { Modal, Button } from '@ui/base';

/**
 * ItemDetailDialog · 物品详情对话框
 * 从 MultiViewPanel 内联弹窗抽取,对齐 dialogs 层。
 */

export interface ItemDetailData {
  name: string;
  category?: string;
  count: number;
  desc?: string;
}

export interface ItemDetailDialogProps {
  open: boolean;
  data: ItemDetailData | null;
  onClose: () => void;
}

export function ItemDetailDialog({ open, data, onClose }: ItemDetailDialogProps) {
  if (!data) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={data.name}
      size="sm"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          关闭
        </Button>
      }
    >
      <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 8 }}>
        {data.category || '未分类'} · 数量 × {data.count}
      </div>
      <div style={{ fontSize: 12, color: 'var(--c-text)', lineHeight: 1.6 }}>
        {data.desc || '暂无描述'}
      </div>
    </Modal>
  );
}

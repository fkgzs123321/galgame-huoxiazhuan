import React from 'react';
import { Modal, Button } from '@ui/base';

/**
 * CgViewerDialog · CG 查看器对话框
 * 从 MultiViewPanel 内联弹窗抽取,对齐 dialogs 层。
 */

export interface CgViewData {
  title: string;
  type: string;
  typeLabel: string;
  heroineName: string;
  description: string;
  unlockCondition: string;
  unlockedAtTurn: number | null | undefined;
  placeholderGradient: string;
  artUrl?: string | null;
}

export interface CgViewerDialogProps {
  open: boolean;
  data: CgViewData | null;
  onClose: () => void;
}

const TYPE_EMOJI: Record<string, string> = {
  'h-first': '💕',
  event: '✨',
  portrait: '🌸',
  default: '♡',
};

export function CgViewerDialog({ open, data, onClose }: CgViewerDialogProps) {
  if (!data) return null;
  return (
    <Modal open={open} onClose={onClose} title={data.title} size="md" footer={null}>
      <div
        style={{
          height: 240,
          background: data.placeholderGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        {data.artUrl ? (
          <img
            src={data.artUrl}
            alt={data.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span
            style={{
              fontSize: 56,
              color: 'rgba(255,255,255,0.85)',
              textShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}
          >
            {TYPE_EMOJI[data.type] ?? TYPE_EMOJI.default}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 8 }}>
        {data.typeLabel} · {data.heroineName}
      </div>
      <div style={{ fontSize: 12, color: 'var(--c-text)', lineHeight: 1.6, marginBottom: 8 }}>
        {data.description}
      </div>
      <div style={{ fontSize: 10, color: 'var(--c-text-soft)' }}>解锁条件:{data.unlockCondition}</div>
      {data.unlockedAtTurn != null && (
        <div style={{ fontSize: 10, color: 'var(--c-success)', marginTop: 4 }}>
          ✓ 解锁于第 {data.unlockedAtTurn} 回合
        </div>
      )}
      <div style={{ marginTop: 14, textAlign: 'right' }}>
        <Button variant="secondary" size="sm" onClick={onClose}>
          关闭
        </Button>
      </div>
    </Modal>
  );
}

import React from 'react';
import { Modal, Button } from '@ui/base';

/**
 * AchievementDetailDialog · 成就详情对话框
 * 从 AchievementPanel 内联弹窗抽取,对齐 dialogs 层。
 */

export interface AchievementDetailData {
  title: string;
  icon: string;
  rarity: string;
  rarityLabel: string;
  rarityColor: string;
  type: string;
  typeLabel: string;
  typeIcon: string;
  description: string;
  unlockCondition: string;
  reward: {
    inheritPoints?: number;
    unlockFlags?: string[];
  };
  unlocked: boolean;
  unlockRecord?: {
    playthrough: number;
    dayInGame: number;
    turnCount: number;
    unlockedAt: number;
  };
}

export interface AchievementDetailDialogProps {
  open: boolean;
  data: AchievementDetailData | null;
  onClose: () => void;
}

export function AchievementDetailDialog({ open, data, onClose }: AchievementDetailDialogProps) {
  if (!data) return null;
  const { rarityColor } = data;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={data.unlocked ? data.title : '???'}
      size="sm"
      footer={
        <Button variant="secondary" onClick={onClose} block>
          关闭
        </Button>
      }
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
          paddingBottom: 12,
          borderBottom: '1px solid var(--c-border-soft)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${rarityColor}33 0%, transparent 100%)`,
            border: `1px solid ${rarityColor}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            filter: data.unlocked ? 'none' : 'grayscale(1)',
          }}
        >
          {data.unlocked ? data.icon : '🔒'}
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--font-display)', color: 'var(--c-text)' }}>
            {data.unlocked ? data.title : '???'}
          </h4>
          <div style={{ display: 'flex', gap: 6, marginTop: 4, fontSize: 10 }}>
            <span style={{ padding: '1px 6px', borderRadius: 4, background: `${rarityColor}22`, color: rarityColor }}>
              {data.rarityLabel}
            </span>
            <span style={{ padding: '1px 6px', borderRadius: 4, background: 'var(--c-overlay)', color: 'var(--c-text-muted)' }}>
              {data.typeIcon} {data.typeLabel}
            </span>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--c-text)', lineHeight: 1.6, marginBottom: 8 }}>
        {data.description}
      </div>

      <div
        style={{
          padding: 8,
          background: 'var(--c-bg)',
          borderRadius: 6,
          fontSize: 11,
          color: 'var(--c-text-muted)',
          marginBottom: 12,
        }}
      >
        <strong style={{ color: 'var(--c-text)' }}>解锁条件:</strong> {data.unlockCondition}
      </div>

      {data.reward.inheritPoints && (
        <div
          style={{
            padding: 8,
            background: 'var(--c-primary-glow)',
            borderRadius: 6,
            fontSize: 11,
            color: 'var(--c-primary)',
            marginBottom: 12,
          }}
        >
          🎁 奖励:+{data.reward.inheritPoints} 继承点数
          {data.reward.unlockFlags && data.reward.unlockFlags.length > 0 && (
            <span style={{ color: 'var(--c-text-muted)', marginLeft: 8 }}>
              · 解锁标记:{data.reward.unlockFlags.join(', ')}
            </span>
          )}
        </div>
      )}

      {data.unlocked && data.unlockRecord && (
        <div
          style={{
            padding: 8,
            background: 'rgba(236, 64, 122, 0.11)',
            borderRadius: 6,
            fontSize: 10,
            color: 'var(--c-success)',
            marginBottom: 12,
          }}
        >
          ✓ 解锁于:周目 {data.unlockRecord.playthrough} · 第 {data.unlockRecord.dayInGame} 天 · 第{' '}
          {data.unlockRecord.turnCount} 回合
          <br />
          <span style={{ color: 'var(--c-text-muted)' }}>
            {new Date(data.unlockRecord.unlockedAt).toLocaleString('zh-CN')}
          </span>
        </div>
      )}
    </Modal>
  );
}

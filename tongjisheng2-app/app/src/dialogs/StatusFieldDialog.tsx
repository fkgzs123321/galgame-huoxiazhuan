import React from 'react';
import { Modal } from '@ui/base';

/**
 * StatusFieldDialog · 状态字段详情对话框
 * 从 StatusBar 内联弹窗抽取,对齐 dialogs 层。
 */

export interface StatusFieldDetail {
  category: string;
  categoryLabel: string;
  name: string;
  path: string;
  value: unknown;
  type: string;
  enumValues?: string[];
  min?: number;
  max?: number;
  round?: boolean;
  prefault?: unknown;
  writable?: boolean;
  description?: string;
  updatedAt?: string;
}

export interface StatusFieldDialogProps {
  open: boolean;
  detail: StatusFieldDetail | null;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '4px 0',
        fontSize: 12,
      }}
    >
      <span style={{ color: 'var(--c-text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--c-text)', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

export function StatusFieldDialog({ open, detail, onClose }: StatusFieldDialogProps) {
  return (
    <Modal
      open={open && !!detail}
      onClose={onClose}
      title={detail ? `${detail.categoryLabel} · ${detail.name}` : ''}
      size="md"
      footer={
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '8px 20px',
            background: 'var(--c-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          关闭
        </button>
      }
    >
      {detail && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <code style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{detail.path}</code>
          <DetailRow label="当前值" value={formatValue(detail.value)} />
          <DetailRow label="字段类型" value={detail.type} />
          {detail.type === 'enum' && detail.enumValues && (
            <DetailRow label="可选值" value={detail.enumValues.join(' / ')} />
          )}
          {detail.type === 'number' && (
            <>
              <DetailRow label="范围" value={`${detail.min ?? '—'} ~ ${detail.max ?? '—'}`} />
              <DetailRow label="四舍五入" value={detail.round ? '是' : '否'} />
            </>
          )}
          <DetailRow label="默认值(prefault)" value={formatValue(detail.prefault)} />
          <DetailRow
            label="AI 可写"
            value={detail.writable === false ? '否(只读/脚本维护)' : '是'}
          />
          {detail.description && <DetailRow label="说明" value={detail.description} />}
          {detail.updatedAt && <DetailRow label="更新时间" value={detail.updatedAt} />}

          <section
            style={{
              padding: 10,
              background: 'var(--c-bg)',
              border: '1px solid var(--c-border)',
              borderRadius: 4,
              fontSize: 11,
              color: 'var(--c-text-muted)',
              marginTop: 4,
            }}
          >
            <strong style={{ color: 'var(--c-text)' }}>原始值(JSON):</strong>
            <pre
              style={{
                margin: '6px 0 0',
                padding: 6,
                background: 'var(--c-overlay)',
                borderRadius: 3,
                fontSize: 11,
                color: 'var(--c-text)',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {JSON.stringify(detail.value, null, 2)}
            </pre>
          </section>
        </div>
      )}
    </Modal>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

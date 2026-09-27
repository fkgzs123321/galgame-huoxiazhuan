// 设置面板基件 — 分节容器（对齐凡人 settings 模块化）
import type { ReactNode } from 'react';
import { Panel, PanelHeader } from '@/ui/Panel';

export function SettingsSection({ title, extra, children, className }: {
  title: ReactNode; extra?: ReactNode; children?: ReactNode; className?: string;
}) {
  return (
    <Panel className={className}>
      <PanelHeader title={title} extra={extra} />
      <div className="p-4 space-y-3">{children}</div>
    </Panel>
  );
}

export function SettingRow({ label, hint, children }: {
  label: string; hint?: string; children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-dd-gold/5 last:border-0">
      <div className="min-w-0">
        <div className="text-xs tracking-wider text-dd-text">{label}</div>
        {hint && <div className="text-[10px] text-dd-textDim mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

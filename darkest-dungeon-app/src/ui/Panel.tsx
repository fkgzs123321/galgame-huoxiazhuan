// DD 主题 UI 基件 — 面板与区块
import type { ReactNode } from 'react';
import clsx from 'clsx';

export function Panel({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={clsx('dd-panel', className)}>{children}</div>;
}

export function PanelHeader({ title, extra, className }: { title: ReactNode; extra?: ReactNode; className?: string }) {
  return (
    <div className={clsx('dd-panel-header', className)}>
      <span>{title}</span>
      {extra ? <span className="text-[10px] normal-case tracking-normal text-dd-gold">{extra}</span> : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={clsx('dd-divider', className)} />;
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('text-dd-gold text-sm tracking-widest mb-2 dd-title', className)}>{children}</div>;
}

export function EmptyState({ text = '暂无内容' }: { text?: string }) {
  return (
    <div className="py-8 text-center text-dd-textDim text-sm italic tracking-wider">{text}</div>
  );
}

export function LoadingSpinner({ text = '加载中…' }: { text?: string }) {
  return (
    <div className="py-8 text-center">
      <div className="inline-block w-5 h-5 border-2 border-dd-gold border-t-transparent rounded-full animate-spin" />
      <div className="text-dd-textDim text-xs mt-2 tracking-wider">{text}</div>
    </div>
  );
}

export function FlickerTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx('dd-title dd-anim-flicker', className)}>{children}</span>;
}

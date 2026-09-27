import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

/** 空状态:对齐 shadcn/ui 空态模式 */
export function EmptyState({ icon, title, description, action, style }: EmptyStateProps) {
  return (
    <div className="th-empty" style={style}>
      {icon !== undefined && <div className="th-empty__icon">{icon}</div>}
      {title !== undefined && <div className="th-empty__title">{title}</div>}
      {description !== undefined && <div className="th-empty__desc">{description}</div>}
      {action !== undefined && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}

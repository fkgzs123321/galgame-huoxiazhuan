import React, { useMemo } from 'react';

export interface TabsProps {
  tabs: { key: string; label: React.ReactNode; disabled?: boolean; badge?: React.ReactNode }[];
  active: string;
  onChange?: (key: string) => void;
  className?: string;
}

/** 标签页:对齐 shadcn/ui Tabs */
export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={`th-tabs ${className ?? ''}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          className={`th-tabs__item ${active === tab.key ? 'th-tabs__item--active' : ''}`}
          disabled={tab.disabled}
          onClick={() => onChange?.(tab.key)}
        >
          {tab.label}
          {tab.badge !== undefined && (
            <span style={{ marginLeft: 6 }}>{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** 简单的受控 Tab 面板(内部状态) */
export function useTabs(initial: string) {
  const [active, setActive] = React.useState(initial);
  return useMemo(() => ({ active, setActive }), [active]);
}

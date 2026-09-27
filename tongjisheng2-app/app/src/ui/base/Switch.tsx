import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange?: (next: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
}

/** 开关:对齐 shadcn/ui Switch */
export function Switch({ checked, onChange, label, disabled, className, title }: SwitchProps) {
  const cls = [
    'th-switch',
    checked ? 'th-switch--checked' : '',
    className ?? '',
  ].filter(Boolean).join(' ');
  return (
    <label className={cls} title={title}>
      <span className="th-switch__track">
        <span className="th-switch__thumb" />
      </span>
      {label !== undefined && <span className="th-switch__label">{label}</span>}
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        style={{ display: 'none' }}
      />
    </label>
  );
}

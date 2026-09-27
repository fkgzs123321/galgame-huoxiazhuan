import React from 'react';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  placeholder?: string;
}

/** 下拉选择:对齐 shadcn/ui Select */
export function Select({ options, placeholder, className, value, ...rest }: SelectProps) {
  const cls = ['th-select', className ?? ''].filter(Boolean).join(' ');
  return (
    <select className={cls} value={value} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
}

/** 基础按钮:对齐 shadcn/ui 变体体系,基于 --c-* 主题变量 */
export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    'th-btn',
    `th-btn--${variant}`,
    `th-btn--${size}`,
    block ? 'th-btn--block' : '',
    className ?? '',
  ].filter(Boolean).join(' ');
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading && <span className="th-spinner th-spinner--sm" aria-hidden />}
      {children}
    </button>
  );
}

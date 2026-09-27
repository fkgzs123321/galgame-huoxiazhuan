// DD 主题 UI 基件 — 按钮
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export type BtnVariant = 'default' | 'primary' | 'danger' | 'ghost' | 'gold';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}

const variantClass: Record<BtnVariant, string> = {
  default: 'dd-btn',
  primary: 'dd-btn dd-btn-primary',
  danger: 'dd-btn dd-btn-danger',
  ghost: 'dd-btn dd-btn-ghost',
  gold: 'dd-btn dd-btn-gold',
};

const sizeClass = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-3 py-1.5',
  lg: 'text-base px-5 py-2.5',
};

export function Button({ variant = 'default', size = 'md', className, children, ...rest }: Props) {
  return (
    <button className={clsx(variantClass[variant], sizeClass[size], className)} {...rest}>
      {children}
    </button>
  );
}

import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/** 徽章:对齐 shadcn/ui Badge */
export function Badge({ variant = 'default', className, children, ...rest }: BadgeProps) {
  return (
    <span className={`th-badge th-badge--${variant} ${className ?? ''}`} {...rest}>
      {children}
    </span>
  );
}

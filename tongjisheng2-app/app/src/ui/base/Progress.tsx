import React from 'react';

export interface ProgressProps {
  value: number; // 0-100
  size?: 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
}

/** 进度条 */
export function Progress({ value, size = 'md', className, style }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={`th-progress th-progress--${size} ${className ?? ''}`} style={style} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className="th-progress__fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}

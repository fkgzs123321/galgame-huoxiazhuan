import React from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

/** 旋转加载图标 */
export function Spinner({ size = 'md', style }: SpinnerProps) {
  return <span className={`th-spinner th-spinner--${size}`} style={style} aria-label="加载中" />;
}

export interface LoadingProps {
  text?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

/** 全块加载态 */
export function Loading({ text = '加载中…', size = 'md', style }: LoadingProps) {
  return (
    <div className="th-loading" style={style}>
      <Spinner size={size} />
      <span>{text}</span>
    </div>
  );
}

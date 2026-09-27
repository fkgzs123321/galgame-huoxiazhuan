import React from 'react';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: number | string;
  children: React.ReactNode;
}

/** 滚动区域:统一滚动条样式 */
export function ScrollArea({ maxHeight, className, style, children, ...rest }: ScrollAreaProps) {
  return (
    <div
      className={`th-scroll ${className ?? ''}`}
      style={{ ...(maxHeight !== undefined ? { maxHeight } : undefined), ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

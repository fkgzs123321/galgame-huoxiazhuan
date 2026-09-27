import React from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  /** 对齐方式:上(默认)/下/左/右 */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

/** 悬停提示 */
export function Tooltip({ content, children, style, placement = 'top' }: TooltipProps) {
  const posStyle: React.CSSProperties | undefined =
    placement === 'bottom'
      ? { top: 'calc(100% + 6px)', bottom: 'auto' }
      : placement === 'left'
        ? { right: 'calc(100% + 6px)', left: 'auto', bottom: 'auto', top: '50%', transform: 'translateY(-50%)' }
        : placement === 'right'
          ? { left: 'calc(100% + 6px)', right: 'auto', bottom: 'auto', top: '50%', transform: 'translateY(-50%)' }
          : undefined;
  return (
    <span className="th-tooltip-wrap" style={style}>
      {children}
      <span className="th-tooltip" style={posStyle}>
        {content}
      </span>
    </span>
  );
}

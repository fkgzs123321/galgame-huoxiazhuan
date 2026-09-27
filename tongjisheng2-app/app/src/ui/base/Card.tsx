import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  flat?: boolean;
}

/** 卡片容器:对齐 shadcn/ui Card,基于 --c-* 主题变量 */
export function Card({ hover, flat, className, style, children, ...rest }: CardProps) {
  const cls = ['th-card', hover ? 'th-card--hover' : '', flat ? 'th-card--flat' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} style={style} {...rest}>
      {children}
    </div>
  );
}

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  extra?: React.ReactNode;
}

export function CardHeader({ title, extra, className, children, ...rest }: CardHeaderProps) {
  return (
    <div className={`th-card__header ${className ?? ''}`} {...rest}>
      {title !== undefined ? <h3 className="th-card__title">{title}</h3> : children}
      {extra}
    </div>
  );
}

export function CardTitle({ className, children, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`th-card__title ${className ?? ''}`} {...rest}>
      {children}
    </h3>
  );
}

export function CardBody({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`th-card__body ${className ?? ''}`} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`th-card__footer ${className ?? ''}`} {...rest}>
      {children}
    </div>
  );
}

import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  error?: boolean;
  invalid?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/** 文本输入:对齐 shadcn/ui Input */
export function Input({ error, invalid, size = 'md', className, ...rest }: InputProps) {
  const cls = [
    'th-input',
    `th-input--${size}`,
    error || invalid ? 'th-input--error' : '',
    className ?? '',
  ].filter(Boolean).join(' ');
  return <input className={cls} {...rest} />;
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

/** 多行文本输入 */
export function Textarea({ error, className, ...rest }: TextareaProps) {
  const cls = ['th-input', error ? 'th-input--error' : '', className ?? ''].filter(Boolean).join(' ');
  return <textarea className={cls} {...rest} />;
}

export interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/** 表单字段包装:label + hint + error */
export function Field({ label, hint, error, children, style }: FieldProps) {
  return (
    <div className="th-field" style={style}>
      {label !== undefined && <label className="th-field__label">{label}</label>}
      {children}
      {error ? (
        <span className="th-field__error">{error}</span>
      ) : hint ? (
        <span className="th-field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

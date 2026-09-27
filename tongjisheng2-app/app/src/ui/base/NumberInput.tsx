import React from 'react';

export interface NumberInputProps {
  value: number;
  onChange?: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

/** 数字输入(带步进按钮):对齐凡人 DeferredNumberInput */
export function NumberInput({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  disabled,
  className,
  style,
  title,
}: NumberInputProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className={`th-number ${className ?? ''}`} style={style} title={title}>
      <button
        type="button"
        className="th-number__btn"
        disabled={disabled || value <= min}
        onClick={() => onChange?.(clamp(value - step))}
      >
        −
      </button>
      <input
        className="th-number__input"
        type="number"
        value={value}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange?.(clamp(n));
        }}
      />
      <button
        type="button"
        className="th-number__btn"
        disabled={disabled || value >= max}
        onClick={() => onChange?.(clamp(value + step))}
      >
        +
      </button>
    </div>
  );
}

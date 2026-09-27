// DD 主题 UI 基件 — 选项卡 / 开关 / 输入
import { useState, type ReactNode } from 'react';
import clsx from 'clsx';

export interface TabItem {
  key: string;
  label: ReactNode;
  content: ReactNode;
}

export function Tabs({ items, activeKey, onChange }: { items: TabItem[]; activeKey?: string; onChange?: (k: string) => void }) {
  const [inner, setInner] = useState(activeKey ?? items[0]?.key ?? '');
  const active = activeKey ?? inner;
  return (
    <div>
      <div className="flex gap-1 border-b border-dd-gold/20 mb-3">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => { setInner(it.key); onChange?.(it.key); }}
            className={clsx(
              'px-3 py-1.5 text-xs tracking-widest transition-colors border-b-2',
              active === it.key
                ? 'text-dd-gold border-dd-gold'
                : 'text-dd-textMuted border-transparent hover:text-dd-text'
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
      <div>{items.find((it) => it.key === active)?.content}</div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean;
}) {
  return (
    <label className={clsx('flex items-center gap-2 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          'w-9 h-5 rounded-full transition-colors relative border',
          checked ? 'bg-dd-gold/30 border-dd-gold' : 'bg-black/40 border-dd-textMuted/40'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all',
            checked ? 'left-[18px] bg-dd-gold' : 'left-0.5 bg-dd-textMuted'
          )}
        />
      </button>
      {label && <span className="text-xs tracking-wider text-dd-textMuted">{label}</span>}
    </label>
  );
}

export function TextInput({ value, onChange, placeholder, className, ...rest }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={clsx(
        'bg-black/30 border border-dd-gold/25 text-sm px-2 py-1 outline-none',
        'focus:border-dd-gold/60 placeholder:text-dd-textDim', className
      )}
      {...rest}
    />
  );
}

export function SelectInput({ value, onChange, options, className }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={clsx('bg-black/40 border border-dd-gold/25 text-sm px-2 py-1 outline-none text-dd-text', className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#1a1410]">{o.label}</option>
      ))}
    </select>
  );
}

export function NumberInput({ value, onChange, min, max, step = 1, className }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className={clsx('bg-black/30 border border-dd-gold/25 text-sm px-2 py-1 outline-none text-dd-text', className)}
    />
  );
}

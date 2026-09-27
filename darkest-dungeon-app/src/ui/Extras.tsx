// DD 主题 UI 基件 — Toast 通知 / 环形进度 / 悬浮提示 / 多行输入
import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';

// ---------- Toast 通知 ----------

export interface ToastItem {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'error';
}

let toastSeq = 0;
const listeners = new Set<(items: ToastItem[]) => void>();
let toasts: ToastItem[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const l of listeners) l(toasts);
}

export function toast(text: string, tone: ToastItem['tone'] = 'info', duration = 3000) {
  const id = `toast_${Date.now()}_${toastSeq++}`;
  toasts = [...toasts, { id, text, tone }];
  emit();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    toasts = [];
    emit();
  }, duration);
}

export function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    listeners.add(setItems);
    return () => { listeners.delete(setItems); };
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] space-y-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'px-4 py-2 text-xs tracking-widest border rounded-sm shadow-lg',
            'bg-[#14100c]/95 backdrop-blur',
            t.tone === 'success' && 'border-emerald-400/40 text-emerald-300',
            t.tone === 'error' && 'border-red-400/40 text-red-300',
            t.tone === 'info' && 'border-dd-gold/40 text-dd-gold'
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

// ---------- 环形进度 ----------

export function ProgressRing({ value, max, size = 40, stroke = 4, color = '#c8a038', label }: {
  value: number; max: number; size?: number; stroke?: number; color?: string; label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[10px] font-mono text-dd-text">{label ?? `${Math.round(pct * 100)}%`}</span>
    </div>
  );
}

// ---------- 悬浮提示 ----------

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 w-max max-w-56 px-2 py-1 text-[10px] leading-relaxed tracking-wider bg-[#1a1410] border border-dd-gold/30 text-dd-textMuted rounded shadow-lg pointer-events-none">
          {content}
        </span>
      )}
    </span>
  );
}

// ---------- 多行输入 ----------

export function TextArea({ value, onChange, rows = 4, placeholder, className }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={clsx(
        'w-full bg-black/30 border border-dd-gold/25 text-sm px-2 py-1.5 outline-none',
        'focus:border-dd-gold/60 placeholder:text-dd-textDim', className
      )}
    />
  );
}

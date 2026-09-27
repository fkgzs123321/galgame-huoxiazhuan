// DD 主题 UI 基件 — 数值条（HP/压力/进度）
interface StatBarProps {
  label?: string;
  value: number;
  max: number;
  color?: string;        // 条颜色
  bg?: string;           // 背景色
  height?: number;       // 像素
  showText?: boolean;
  dangerBelow?: number;  // 低于该比例变红
}

export function StatBar({
  label, value, max, color = '#c8a038', bg = 'rgba(255,255,255,0.08)',
  height = 8, showText = false, dangerBelow,
}: StatBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const danger = dangerBelow !== undefined && pct < dangerBelow;
  const barColor = danger ? '#b3412f' : color;
  return (
    <div className="w-full">
      {(label || showText) && (
        <div className="flex justify-between text-[10px] tracking-wider text-dd-textMuted mb-0.5">
          <span>{label}</span>
          {showText && <span>{Math.round(value)}/{Math.round(max)}</span>}
        </div>
      )}
      <div className="w-full rounded-sm overflow-hidden" style={{ background: bg, height }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

// 单格属性显示
export function StatField({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'bad' | 'normal' }) {
  const color = tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-red-400' : 'text-dd-text';
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] tracking-widest text-dd-textDim">{label}</span>
      <span className={`text-xs font-semibold ${color}`}>{value}</span>
    </div>
  );
}

// 徽章
export function Badge({ children, tone = 'gold' }: { children: React.ReactNode; tone?: 'gold' | 'red' | 'green' | 'gray' }) {
  const map = {
    gold: 'text-dd-gold border-dd-gold/40',
    red: 'text-red-400 border-red-400/40',
    green: 'text-emerald-400 border-emerald-400/40',
    gray: 'text-dd-textMuted border-dd-textMuted/40',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] tracking-wider border rounded-sm ${map[tone]}`}>
      {children}
    </span>
  );
}

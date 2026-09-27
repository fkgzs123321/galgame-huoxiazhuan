// 游戏内时间工具
export const WEEK_DAYS = 7;

// 游戏内日期：从周数推算（起始于某年）
export interface GameDate {
  year: number;
  week: number;
}

export function weekToDate(week: number): GameDate {
  return { year: Math.floor(week / 52) + 1, week: (week % 52) + 1 };
}

// 周数 → 中文显示：第 1 年 第 3 周
export function fmtGameDate(week: number): string {
  const { year, week: w } = weekToDate(week);
  return `第 ${year} 年 · 第 ${w} 周`;
}

// 周 → 季节（暗黑地牢氛围用）
export function seasonOfWeek(week: number): string {
  const w = (week % 52) + 1;
  if (w <= 13) return '春';
  if (w <= 26) return '夏';
  if (w <= 39) return '秋';
  return '冬';
}

// 相对时间（日志中心用）：'3 分钟前'
export function fmtRelative(ts: number, now = Date.now()): string {
  const diff = now - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}

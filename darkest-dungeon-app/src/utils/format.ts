// 格式化工具

// 百分比显示：0.85 → '85%'
export function fmtPct(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || isNaN(v)) return '-';
  return `${(v * 100).toFixed(digits)}%`;
}

// 带符号百分比：0.85 → '+85%'，-0.3 → '-30%'
export function fmtSignedPct(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || isNaN(v)) return '-';
  const n = v * 100;
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

// 金币显示：1234 → '1,234'
export function fmtGold(v: number): string {
  return Math.round(v).toLocaleString('zh-CN');
}

// 伤害范围：6~12
export function fmtDmg(min: number, max: number): string {
  return `${Math.round(min)}~${Math.round(max)}`;
}

// 时长：周数
export function fmtWeek(week: number): string {
  return `第 ${week} 周`;
}

// 火把亮度分级
export function torchLevel(torch: number): { name: string; color: string } {
  if (torch >= 75) return { name: '光明', color: '#f5c542' };
  if (torch >= 50) return { name: '明亮', color: '#d9a521' };
  if (torch >= 25) return { name: '昏暗', color: '#9a7b2f' };
  return { name: '黑暗', color: '#5a4a2f' };
}

// 压力状态中文
export function stressStateName(s: string | null | undefined): string {
  switch (s) {
    case 'calm': return '镇定';
    case 'stressed': return '紧张';
    case 'afflicted': return '崩溃';
    case 'virtuous': return '美德';
    case 'heartattack': return '心脏病发';
    default: return '镇定';
  }
}

// 抗压等级名称
export function resolveLevelName(level: number): string {
  const names = ['新兵', '老兵', '冠军', '队长', '大师', '传说'];
  return names[level] ?? `LV${level}`;
}

// 站位掩码 → 位置数组：21 → [2,1]，'34' → [3,4]，'@1234' 表示我方全体
export function launchPositions(mask: number | string | undefined): number[] {
  if (mask === undefined || mask === null || mask === '') return [];
  const s = String(mask);
  return [...s].map((c) => parseInt(c)).filter((n) => !isNaN(n));
}

// 目标掩码 → 位置数组：'12' → [1,2]，'~123' 表示敌方 1/2/3
export function targetPositions(mask: string | undefined): number[] {
  if (!mask) return [];
  const s = mask.startsWith('~') || mask.startsWith('@') ? mask.slice(1) : mask;
  return [...s].map((c) => parseInt(c)).filter((n) => !isNaN(n));
}

// 敌我标识：目标字符串是否打敌方
export function isEnemyTarget(mask: string | undefined): boolean {
  return !!mask && (mask.startsWith('~') || /^\d+$/.test(mask || ''));
}

// 深拷贝（存档/快照用）
export function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

// 唯一化
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

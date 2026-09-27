import { 性格档位, 心相档位, 阴阳档位, 门派阶段 } from '../../schema';

/**
 * 分档工具。
 *
 * ★ 单一数据源：档位名一律从 schema.ts 导出，前端与 EJS 世界书条目共用同一张表。
 *   原作把十档描述抄了两份（EJS 一份、game-config 一份），靠注释约定一致，
 *   无机制防漂移 —— 这里不重蹈。
 */

/** 按 0~100 取 N 档，返回档位名 */
export function 取档(v: number, 表: readonly string[]): string {
  if (!表.length) return '';
  const i = Math.min(表.length - 1, Math.max(0, Math.floor((Number(v) / 100) * 表.length)));
  return 表[i];
}

/** 六项性格的档位名 */
export function 性格名(项: keyof typeof 性格档位, v: number): string {
  return 取档(v, 性格档位[项]);
}

/** 心相三档 */
export function 心相名(v: number): string {
  return 取档(v, 心相档位);
}

/** 阴阳五档 */
export function 阴阳名(v: number): string {
  return 取档(v, 阴阳档位);
}

/** 门派发展六阶段 */
export function 门派阶段名(n: number) {
  const i = Math.max(0, Math.min(门派阶段.length - 1, Number(n) - 1));
  return 门派阶段[i];
}

/** 好感度 → 词 */
export function 好感名(v: number): string {
  const n = Number(v);
  if (n >= 80) return '生死之交';
  if (n >= 50) return '交心';
  if (n >= 20) return '相熟';
  if (n >= 0) return '相识';
  if (n >= -30) return '冷淡';
  if (n >= -60) return '敌视';
  return '不共戴天';
}

/** 品质 → 颜色变量 */
export const 品质色: Record<string, string> = {
  凡: 'var(--q-fan)',
  良: 'var(--q-liang)',
  优: 'var(--q-you)',
  珍: 'var(--q-zhen)',
  绝: 'var(--q-jue)',
};

/** 资源条（0~上限）百分比 */
export function 资源百分(当前: number, 上限: number): number {
  const m = Number(上限) || 1;
  return Math.max(0, Math.min(100, (Number(当前) / m) * 100));
}

// 随机/概率工具
import { genId } from './id.ts';

// [0,1) 均匀随机
export function rand(): number {
  return Math.random();
}

// [min,max] 整数
export function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

// 概率判定：p=0.3 → 30% 返回 true
export function chance(p: number): boolean {
  return rand() < p;
}

// 加权随机抽取：{id, weight}[] → 返回元素或 null
export interface Weighted<T> {
  value: T;
  weight: number;
}

export function weightedPick<T>(items: Weighted<T>[]): T | null {
  const total = items.reduce((s, i) => s + Math.max(0, i.weight), 0);
  if (total <= 0) return null;
  let r = rand() * total;
  for (const item of items) {
    r -= Math.max(0, item.weight);
    if (r <= 0) return item.value;
  }
  return items.length ? items[items.length - 1].value : null;
}

// 从数组随机取 n 个（不重复）
export function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  }
  return out;
}

// 洗牌（返回新数组）
export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// 范围钳制
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// 伤害范围随机（min/max 可为小数）
export function rollRange(min: number, max: number): number {
  return min + rand() * (max - min);
}

// 百分数判定字符串（'85%' → 0.85），非法返回 fallback
export function parsePct(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.endsWith('%')) return parseFloat(s) / 100;
    const n = Number(s);
    return isNaN(n) ? fallback : n;
  }
  return fallback;
}

// 战斗用的新 uid（前缀固定，便于 Trace 追踪）
export function battleUid(): string {
  return genId('btl');
}

// zod 数值契约 — 百分比/范围/站位掩码归一（对齐凡人 numericSchemas）
import { z } from 'zod';

// 百分比：'85%' 或 0.85 → 0.85
export const pctSchema = z.union([z.number(), z.string()]).transform((v) => {
  if (typeof v === 'number') return v;
  const s = v.trim();
  if (s.endsWith('%')) return parseFloat(s) / 100;
  const n = Number(s);
  return isNaN(n) ? 0 : n;
});

// 可选百分比
export const pctOptional = pctSchema.optional().default(0);

// 非负整数
export const nonNegInt = z.number().int().nonnegative();

// 伤害范围 [min,max]
export const dmgRangeSchema = z.object({
  dmg_min: z.number().optional(),
  dmg_max: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

// 站位掩码：21 / '34' / '@1234' / '~12'
export const positionMaskSchema = z.union([z.number(), z.string()]).transform((v) => String(v));

// 0~100 的整数（火把/压力百分比）
export const pct100Schema = z.number().min(0).max(100);

// 宽松数字（可空）
export const nullableNumber = z.number().nullable().optional();

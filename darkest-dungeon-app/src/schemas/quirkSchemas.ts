// zod 怪癖/疾病契约 — 校验 quirk_library 与疾病数据
import { z } from 'zod';

export const quirkSchema = z.object({
  id: z.string(),
  is_positive: z.boolean().default(false),
  is_disease: z.boolean().default(false),
  classification: z.string().optional(),
  random_chance: z.number().optional(),
  incompatible_quirks: z.array(z.string()).default([]),
  buffs: z.array(z.string()).default([]),
  show_explicit_buff_description: z.boolean().optional(),
  can_modify_in_activity: z.boolean().optional(),
}).passthrough();

export const quirkLibrarySchema = z.object({
  quirks: z.array(quirkSchema),
}).passthrough();

export const diseaseSchema = quirkSchema.extend({
  is_disease: z.boolean(),
});

// 从怪癖库中抽取疾病
export function extractDiseases(lib: unknown): z.infer<typeof diseaseSchema>[] {
  const parsed = quirkLibrarySchema.safeParse(lib);
  if (!parsed.success) return [];
  return parsed.data.quirks.filter((q) => q.is_disease);
}

import { z } from 'zod';

/**
 * appConfigSchemas · 应用配置数据契约
 * 对齐 fanren-remake 的 schemas 层:
 *  - 配置(8AI 端点/玩家名)的持久化校验
 *  - 与 ui/types.ts 的 AppConfig 对齐,防止 IndexedDB 脏数据
 */

const aiEndpointSchema = z.object({
  profileId: z.string(),
  baseURL: z.string(),
  apiKey: z.string(),
  model: z.string(),
  presetName: z.string(),
});

export const appConfigSchema = z.object({
  playerName: z.string(),
  endpoints: z.array(aiEndpointSchema),
  lastPresetName: z.string(),
  identitySelected: z.boolean(),
  selectedIdentity: z.string(),
  updatedAt: z.number(),
});

export type AppConfigContract = z.infer<typeof appConfigSchema>;

/** 校验并修复配置(缺失字段补默认) */
export function coerceAppConfig(raw: unknown, fallback: AppConfigContract): AppConfigContract {
  const parsed = appConfigSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  // 部分兼容:字段缺失时合并默认
  if (raw && typeof raw === 'object') {
    return { ...fallback, ...(raw as Partial<AppConfigContract>) };
  }
  return fallback;
}

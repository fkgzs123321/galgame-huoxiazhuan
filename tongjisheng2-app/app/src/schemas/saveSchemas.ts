import { z } from 'zod';

/**
 * saveSchemas · 存档导出数据契约
 * 对齐 fanren-remake 的 schemas 层:
 *  - 导出包结构(版本 + saves 映射)
 *  - 导入时校验版本与结构,防止损坏存档
 */

export const archivePackageSchema = z.object({
  version: z.number(),
  saves: z.record(z.string(), z.string()),
});

export type ArchivePackageContract = z.infer<typeof archivePackageSchema>;

/** 当前存档导出包版本(与 gateway/archiveService 对齐) */
export const ARCHIVE_PACKAGE_VERSION = 1;

/** 校验导出包结构 */
export function parseArchivePackage(json: string): {
  ok: boolean;
  data?: ArchivePackageContract;
  error?: string;
} {
  try {
    const raw = JSON.parse(json);
    const parsed = archivePackageSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: `存档包结构无效: ${parsed.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}` };
    }
    return { ok: true, data: parsed.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

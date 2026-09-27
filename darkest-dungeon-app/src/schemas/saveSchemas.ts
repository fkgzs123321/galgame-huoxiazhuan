// zod 存档契约 — 统一存档快照（对齐 kernel saveManager 的 Save Contract）
import { z } from 'zod';
import { heroInstanceSchema } from './heroSchemas.ts';

// Command 收据
export const commandReceiptSchema = z.object({
  commandId: z.string(),
  commandType: z.string(),
  appliedAt: z.number(),
  revision: z.number(),
});

// 正式状态快照（当前阶段覆盖的字段；其余由 gameStore 各切片提供）
export const saveSnapshotSchema = z.object({
  schemaVersion: z.number().int(),
  revision: z.number().int(),
  createdAt: z.number(),
  fingerprint: z.string(),
  state: z.object({
    game: z.record(z.string(), z.unknown()).default({}),
    roster: z.array(heroInstanceSchema).default([]),
    town: z.record(z.string(), z.unknown()).default({}),
    inventory: z.record(z.string(), z.unknown()).default({}),
    dungeon: z.record(z.string(), z.unknown()).nullable().default(null),
    quests: z.record(z.string(), z.unknown()).default({}),
    week: z.record(z.string(), z.unknown()).default({}),
    kernel: z.record(z.string(), z.unknown()).default({}),
  }),
  receipts: z.array(commandReceiptSchema).default([]),
  backups: z.array(z.object({ id: z.string(), at: z.number(), reason: z.string() })).default([]),
});

export type SaveSnapshot = z.infer<typeof saveSnapshotSchema>;

// 校验并归一存档；失败返回错误信息
export function validateSave(raw: unknown): { ok: true; data: SaveSnapshot } | { ok: false; error: string } {
  const result = saveSnapshotSchema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, error: z.prettifyError(result.error) };
}

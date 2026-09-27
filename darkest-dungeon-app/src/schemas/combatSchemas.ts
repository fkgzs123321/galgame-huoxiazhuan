// zod 战斗契约 — 技能/效果/战斗快照
import { z } from 'zod';
import { pctSchema } from './numericSchemas.ts';

export const effectRefSchema = z.object({
  name: z.string(),
  target: z.string().optional(),
  chance: pctSchema.optional(),
  duration: z.number().optional(),
  heal: z.union([z.number(), z.string()]).optional(),
  bleed: z.number().optional(),
  blight: z.number().optional(),
  stun: z.number().optional(),
  mark: z.boolean().optional(),
  buff: z.union([z.number(), z.string()]).optional(),
  debuff: z.union([z.number(), z.string()]).optional(),
}).passthrough();

// 战斗单位快照（战斗日志/Trace 用）
export const combatUnitSchema = z.object({
  uid: z.string(),
  classId: z.string(),
  position: z.number().int().min(1).max(4),
  currentHp: z.number(),
  maxHp: z.number(),
  stress: z.number().default(0),
  isStunned: z.boolean().default(false),
  isBleeding: z.boolean().default(false),
  isPoisoned: z.boolean().default(false),
  buffs: z.array(z.string()).default([]),
  side: z.enum(['hero', 'monster']),
});

// 行动记录
export const combatActionSchema = z.object({
  actorUid: z.string(),
  skillId: z.string(),
  targets: z.array(z.string()),
  hit: z.boolean(),
  crit: z.boolean().default(false),
  damage: z.number().default(0),
  stressDamage: z.number().default(0),
  log: z.array(z.string()).default([]),
}).passthrough();

export const combatRoundSchema = z.object({
  round: z.number().int(),
  actions: z.array(combatActionSchema),
  endState: z.array(combatUnitSchema).optional(),
});

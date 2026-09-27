// zod 英雄契约 — 数据文件与运行时实例校验
import { z } from 'zod';
import { pctSchema } from './numericSchemas.ts';

export const heroSkillEntrySchema = z.object({
  id: z.string(),
  level: z.number().int().min(0).max(4),
  type: z.string().optional(),
  atk: pctSchema.optional(),
  dmg: pctSchema.optional(),
  crit: pctSchema.optional(),
  heal: z.union([z.string(), z.number()]).optional(),
  launch: z.union([z.number(), z.string()]).optional(),
  target: z.string().optional(),
  target_raw: z.string().optional(),
  launch_raw: z.string().optional(),
  effects: z.array(z.string()).optional(),
  is_move: z.boolean().optional(),
  is_stall_invalidating: z.union([z.boolean(), z.string()]).optional(),
  per_battle_limit: z.number().optional(),
  per_turn_limit: z.number().optional(),
}).passthrough();

export const heroWeaponSchema = z.object({
  name: z.string(),
  atk: pctSchema.optional(),
  dmg_min: z.number().optional(),
  dmg_max: z.number().optional(),
  crit: pctSchema.optional(),
  spd: z.number().optional(),
  upgradeRequirementCode: z.number().optional(),
}).passthrough();

export const heroArmourSchema = z.object({
  name: z.string(),
  def: pctSchema.optional(),
  prot: z.number().optional(),
  hp: z.number().optional(),
  spd: z.number().optional(),
  upgradeRequirementCode: z.number().optional(),
}).passthrough();

export const heroDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  resistances: z.record(z.string(), z.number()).default({}),
  skills: z.array(heroSkillEntrySchema).default([]),
  camping_skills: z.array(z.object({ id: z.string() }).passthrough()).default([]),
  weapons: z.array(heroWeaponSchema).default([]),
  armour: z.array(heroArmourSchema).default([]),
  tags: z.array(z.string()).default([]),
  maxHp: z.array(z.number()).default([]),
  dodge: z.array(z.number()).default([]),
  crit: z.array(z.number()).default([]),
  dmg: z.array(z.object({ min: z.number(), max: z.number() })).default([]),
  spd: z.array(z.number()).default([]),
  skill_selection: z.record(z.string(), z.unknown()).nullable().optional(),
  generation: z.record(z.string(), z.unknown()).nullable().optional(),
  deaths_door: z.record(z.string(), z.unknown()).nullable().optional(),
}).passthrough();

export const heroDataListSchema = z.array(heroDataSchema);

// 英雄运行时实例（HeroInstance 的校验子集）
export const heroInstanceSchema = z.object({
  uid: z.string(),
  classId: z.string(),
  name: z.string(),
  resolveLevel: z.number().int().min(0).max(6).default(0),
  currentHp: z.number(),
  maxHp: z.number(),
  stress: z.number().min(0).max(200).default(0),
  quirks: z.array(z.string()).default([]),
  diseases: z.array(z.string()).default([]),
  trinket1: z.string().nullable().default(null),
  trinket2: z.string().nullable().default(null),
  skills: z.array(z.string()).default([]),
  campingSkills: z.array(z.string()).default([]),
  weaponLevel: z.number().int().min(0).max(4).default(0),
  armorLevel: z.number().int().min(0).max(4).default(0),
  missingUntilWeek: z.number().nullable().default(null),
  activityLocked: z.boolean().default(false),
  affliction: z.string().nullable().optional(),
  virtue: z.string().nullable().optional(),
  isDeathsDoor: z.boolean().optional(),
  deathsDoorCount: z.number().optional(),
  stressState: z.enum(['calm', 'stressed', 'afflicted', 'virtuous', 'heartattack']).optional(),
}).passthrough();

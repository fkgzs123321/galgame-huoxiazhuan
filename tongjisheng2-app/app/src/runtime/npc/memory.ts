/**
 * NPC 记忆系统(阶段2 步骤5)
 *
 * 职责:
 *  - 记录 NPC 与玩家的历次互动(基于历史+Memory)
 *  - 记录 NPC 与其他 NPC 的互动(关系网事件历史)
 *  - 影响 NPC 后续行动(如女角A记得玩家曾拒绝她→后续回避玩家)
 *
 * 设计:
 *  - 记忆存储在 IndexedDB(独立 ObjectStore: npc_memory)
 *  - 每条记忆含:女角ID/类型/内容/时间戳/影响
 *  - 不修改 stat_data,只提供查询和写入
 */

import * as idb from '../../db/indexeddb';

// ───────────────────────────────────────────────────────────
//  记忆类型
// ───────────────────────────────────────────────────────────

export type MemoryType =
  | 'player_interaction' // 与玩家互动
  | 'npc_interaction' // 与其他 NPC 互动
  | 'plot_event' // 剧情事件
  | 'relationship_change' // 关系变化
  | 'jealousy_event' // 嫉妒事件
  | 'rejection' // 被拒绝
  | 'kindness'; // 受到善意

export interface NpcMemoryEntry {
  /** 记忆 ID */
  id: string;
  /** 女角 ID */
  heroineId: number;
  /** 记忆类型 */
  type: MemoryType;
  /** 记忆内容 */
  content: string;
  /** 游戏内天数 */
  dayCount: number;
  /** 时间戳 */
  timestamp: number;
  /** 关联女角 ID(如 NPC 互动的对方) */
  relatedHeroineId?: number;
  /** 影响(如"后续回避玩家"/"好感+5") */
  impact?: string;
  /** 影响权重(0-100,越高影响越大) */
  weight?: number;
}

// ───────────────────────────────────────────────────────────
//  IndexedDB 接口(npc_memory store)
// ───────────────────────────────────────────────────────────

const MEMORY_STORE = 'npc_memory';

/**
 * 写入一条 NPC 记忆
 */
export async function recordMemory(entry: Omit<NpcMemoryEntry, 'id' | 'timestamp'>): Promise<string> {
  const id = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const full: NpcMemoryEntry = {
    ...entry,
    id,
    timestamp: Date.now(),
  };
  await idb.kvSet(`${MEMORY_STORE}:${id}`, full);
  return id;
}

/**
 * 查询某女角的所有记忆(按时间倒序)
 */
export async function getHeroineMemories(heroineId: number): Promise<NpcMemoryEntry[]> {
  // IndexedDB 简化:遍历 npc_memory: 前缀
  const all = await idb.kvList<NpcMemoryEntry>(MEMORY_STORE);
  return all
    .filter((m) => m.heroineId === heroineId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * 查询某女角最近 N 条记忆
 */
export async function getRecentMemories(heroineId: number, limit: number = 5): Promise<NpcMemoryEntry[]> {
  const all = await getHeroineMemories(heroineId);
  return all.slice(0, limit);
}

/**
 * 查询某女角特定类型的记忆
 */
export async function getMemoriesByType(heroineId: number, type: MemoryType): Promise<NpcMemoryEntry[]> {
  const all = await getHeroineMemories(heroineId);
  return all.filter((m) => m.type === type);
}

/**
 * 清除某女角的所有记忆(新周目/重置用)
 */
export async function clearHeroineMemories(heroineId: number): Promise<void> {
  const all = await getHeroineMemories(heroineId);
  for (const m of all) {
    await idb.kvDelete(`${MEMORY_STORE}:${m.id}`);
  }
}

/**
 * 清除所有 NPC 记忆(完全重置用)
 */
export async function clearAllMemories(): Promise<void> {
  const all = await idb.kvList<NpcMemoryEntry>(MEMORY_STORE);
  for (const m of all) {
    await idb.kvDelete(`${MEMORY_STORE}:${m.id}`);
  }
}

// ───────────────────────────────────────────────────────────
//  记忆影响计算
// ───────────────────────────────────────────────────────────

/**
 * 根据记忆计算 NPC 对玩家的态度修正
 *  - 被拒绝记忆 → 回避玩家(行动修正)
 *  - 善意记忆 → 主动接近玩家
 *  - 剧情事件 → 影响独立剧情推进
 *
 * @returns 态度修正值(-100 到 100,负=回避,正=接近)
 */
export function computeAttitudeModifier(memories: NpcMemoryEntry[]): number {
  let modifier = 0;
  for (const m of memories) {
    const weight = m.weight ?? 50;
    switch (m.type) {
      case 'rejection':
        modifier -= weight * 0.5;
        break;
      case 'kindness':
        modifier += weight * 0.3;
        break;
      case 'player_interaction':
        modifier += weight * 0.1;
        break;
      case 'jealousy_event':
        modifier -= weight * 0.2;
        break;
    }
  }
  return Math.max(-100, Math.min(100, Math.round(modifier)));
}

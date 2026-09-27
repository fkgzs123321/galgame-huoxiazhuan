/**
 * NPC 运行时统一导出(阶段2)
 */

export { ScheduleEngine, scheduleEngine } from './schedule-engine';
export type { ScheduleQuery, ScheduleEntry } from './schedule-engine';

export { RelationshipGraph, relationshipGraph } from './relationship-graph';
export type { RelationQueryResult } from './relationship-graph';

export { PlotTrigger, plotTrigger } from './plot-trigger';
export type { PlotNode, PlotStage, TriggerContext, TriggerResult } from './plot-trigger';

export {
  recordMemory,
  getHeroineMemories,
  getRecentMemories,
  getMemoriesByType,
  clearHeroineMemories,
  clearAllMemories,
  computeAttitudeModifier,
} from './memory';
export type { NpcMemoryEntry, MemoryType } from './memory';

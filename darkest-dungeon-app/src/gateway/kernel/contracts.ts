import type {
  BuildingState,
  GamePhase,
  HeroInstance,
  ProvisionItem,
  Quest,
  TrinketEntry,
} from '../../types/index.ts';

// ---- 正式状态快照 ----

export interface FormalGameState {
  week: number;
  phase: GamePhase;
  gold: number;
  heirlooms: {
    bust: number;
    portrait: number;
    deed: number;
    crest: number;
  };
  questsFinished: number;
  highestDungeonLevel: number;
  roster: HeroInstance[];
  selectedHeroUid: string | null;
}

export interface FormalTownState {
  stagecoachHeroes: HeroInstance[];
  nomadWagonTrinkets: TrinketEntry[];
  nomadWagonProvisions: ProvisionItem[];
  buildingData: Record<string, BuildingState>;
}

export interface FormalInventoryState {
  trinketInventory: TrinketEntry[];
  provisionInventory: ProvisionItem[];
}

export interface FormalQuestState {
  availableQuests: Quest[];
  activeQuest: Quest | null;
  lastRefreshWeek: number;
  rewardLog: string[];
}

export interface FormalState {
  game: FormalGameState;
  town: FormalTownState;
  inventory: FormalInventoryState;
  quest: FormalQuestState;
}

// ---- Command 契约 ----

export interface CommandEnvelope<P = unknown> {
  commandId: string;
  type: string;
  payload: P;
  actor: string;
  source: string;
  expectedRevision: number;
  issuedAt: string;
}

export interface CommandReceipt {
  commandId: string;
  type: string;
  fingerprint: string;
  baseRevision: number;
  nextRevision: number;
  status: 'committed';
  summary: string;
  committedAt: string;
  saveId: string;
}

export interface CommandContext {
  state: FormalState;
  revision: number;
}

export type CommandOutcome =
  | { status: 'ok'; nextState: FormalState; summary: string }
  | { status: 'rejected'; reason: string };

export type CommandHandler<P = unknown> = (
  ctx: CommandContext,
  payload: P
) => CommandOutcome;

export type KernelResultCode =
  | 'ok'
  | 'already_committed'
  | 'revision_conflict'
  | 'protocol_conflict'
  | 'unknown_command'
  | 'handler_rejected'
  | 'save_failed'
  | 'kernel_not_ready'
  | 'unknown';

export interface KernelResult {
  status: 'committed' | 'already_committed' | 'rejected' | 'error';
  code: KernelResultCode;
  reason?: string;
  baseRevision: number;
  nextRevision: number;
  receipt?: CommandReceipt;
  summary?: string;
  saveAck?: SaveAckLevel;
  durationMs: number;
}

// ---- 存档契约 ----

export type SaveAckLevel = 'memory-visible' | 'write-ack' | 'atomic-readback-ack';

export type SaveWriteResult =
  | { ok: true; ack: SaveAckLevel }
  | {
      ok: false;
      code: 'cas_conflict' | 'readback_failed' | 'storage_error';
      reason: string;
    };

export interface SaveFile {
  schemaVersion: 1;
  saveId: string;
  contentPackId: string;
  contentVersion: string;
  revision: number;
  state: FormalState;
  commandReceipts: CommandReceipt[];
  updatedAt: string;
  integrity: string;
}

export type SaveLoadStatus = 'ok' | 'missing' | 'backup_restored' | 'corrupt';

export interface SaveLoadResult {
  status: SaveLoadStatus;
  file: SaveFile | null;
  error?: string;
  preservedMain?: string | null;
  preservedBackup?: string | null;
}

// ---- 端口 ----

export interface StatePort {
  capture(): FormalState;
  apply(state: FormalState): void;
}

export interface SavePort {
  build(
    state: FormalState,
    nextRevision: number,
    receipts: CommandReceipt[],
    saveId: string
  ): SaveFile;
  write(file: SaveFile, expectedRevision: number): SaveWriteResult;
  read(): SaveLoadResult;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

import { create } from 'zustand';
import type {
  CommandReceipt,
  KernelResult,
  SaveAckLevel,
} from '@/gateway/kernel/contracts';

export type KernelSaveStatus =
  | 'uninitialized'
  | 'initialized'
  | 'loaded'
  | 'backup_restored'
  | 'corrupt'
  | 'saved'
  | 'save_failed'
  | 'load_failed';

interface KernelStoreState {
  revision: number;
  commandCount: number;
  saveStatus: KernelSaveStatus;
  saveAck: SaveAckLevel | 'read-ack' | null;
  canWrite: boolean;
  message: string | null;
  lastTrace: KernelResult | null;
  lastReceipt: CommandReceipt | null;
}

interface KernelStore extends KernelStoreState {
  setStatus: (patch: Partial<KernelStoreState>) => void;
}

export const useKernelStore = create<KernelStore>((set) => ({
  revision: 0,
  commandCount: 0,
  saveStatus: 'uninitialized',
  saveAck: null,
  canWrite: false,
  message: null,
  lastTrace: null,
  lastReceipt: null,
  setStatus: (patch) => set(patch),
}));

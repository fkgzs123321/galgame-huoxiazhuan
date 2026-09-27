import { create } from 'zustand';
import type { RecoveryReport, ConsistencyCheck, FailureReport } from '@runtime/recovery';

/**
 * saveStore · 存档与恢复状态库
 * 对齐 fanren-remake 的 archiveStore 模式
 */
interface SaveState {
  /** Kernel 实例引用(引擎层,不入持久化) */
  kernelRef: { current: import('@runtime/kernel').Kernel | null };
  ready: boolean;
  recoveryReport: RecoveryReport | null;
  consistency: ConsistencyCheck | null;
  failureReport: FailureReport | null;
  message: { type: 'ok' | 'fail' | 'info'; text: string } | null;
  setKernel: (kernel: import('@runtime/kernel').Kernel | null) => void;
  setReady: (ready: boolean) => void;
  setRecoveryReport: (r: RecoveryReport | null) => void;
  setConsistency: (c: ConsistencyCheck | null) => void;
  setFailureReport: (f: FailureReport | null) => void;
  setMessage: (msg: { type: 'ok' | 'fail' | 'info'; text: string } | null) => void;
}

export const useSaveStore = create<SaveState>((set) => ({
  kernelRef: { current: null },
  ready: false,
  recoveryReport: null,
  consistency: null,
  failureReport: null,
  message: null,

  setKernel: (kernel) => set({ kernelRef: { current: kernel } }),
  setReady: (ready) => set({ ready }),
  setRecoveryReport: (recoveryReport) => set({ recoveryReport }),
  setConsistency: (consistency) => set({ consistency }),
  setFailureReport: (failureReport) => set({ failureReport }),
  setMessage: (message) => set({ message }),
}));

// 存档传输 Worker 客户端 — 惰性创建 Worker，带超时与降级
import type { ArchiveWorkerResponse } from './saveArchive.worker';

let worker: Worker | null = null;
let seq = 0;

interface Pending {
  resolve: (r: ArchiveWorkerResponse) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<number, Pending>();

function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./saveArchive.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<ArchiveWorkerResponse>) => {
      const s = e.data.__seq;
      if (s !== undefined && pending.has(s)) {
        const p = pending.get(s)!;
        pending.delete(s);
        clearTimeout(p.timer);
        p.resolve(e.data);
      }
    };
    worker.onerror = () => {
      worker?.terminate();
      worker = null;
      for (const [, p] of pending) {
        clearTimeout(p.timer);
        p.resolve({ ok: false, error: 'worker-error' });
      }
      pending.clear();
    };
    return worker;
  } catch {
    return null; // Worker 不可用（如 file:// 环境）→ 降级为本地计算
  }
}

function call(type: 'compress' | 'verify' | 'checksum', data?: string, timeoutMs = 5000): Promise<ArchiveWorkerResponse> {
  const w = getWorker();
  if (!w) {
    // 降级：主线程直接处理
    try {
      if (type === 'verify' && data) {
        const parsed = JSON.parse(data);
        return Promise.resolve({ ok: !!parsed && typeof parsed === 'object', result: 'ok' });
      }
      if (type === 'checksum' && data) {
        let hash = 0x811c9dc5;
        for (let i = 0; i < data.length; i++) {
          hash ^= data.charCodeAt(i);
          hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        return Promise.resolve({ ok: true, result: hash.toString(16).padStart(8, '0') });
      }
      if (type === 'compress' && data) {
        return Promise.resolve({ ok: true, result: data.replace(/\s+/g, '') });
      }
      return Promise.resolve({ ok: false, error: 'no-data' });
    } catch (err) {
      return Promise.resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return new Promise((resolve) => {
    const id = seq++;
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ ok: false, error: 'timeout' });
    }, timeoutMs);
    pending.set(id, { resolve, timer });
    w.postMessage({ type, data, __seq: id } as never);
  });
}

export const archiveWorkerClient = {
  compress: (data: string) => call('compress', data),
  verify: (data: string) => call('verify', data),
  checksum: (data: string) => call('checksum', data),
};

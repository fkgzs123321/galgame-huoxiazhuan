import { saveCas } from '@db/save-cas';
import { recovery } from '@runtime/recovery';
import type { Kernel } from '@runtime/kernel';
import type { PackRequest, UnpackRequest, WorkerResponse } from '@workers/archiveExport.worker';

/**
 * archiveService · 存档服务(网关层)
 * 对齐 fanren-remake 的 archiveZipTransfer + persistenceV2:
 *  - 存档导出(JSON / 批量打包,Worker 线程内完成)
 *  - 存档导入(校验 + 去重 + 回滚保护)
 *  - 版本迁移引导(检测 schema 版本差异,跨版本提示)
 */

export interface ArchiveExportResult {
  ok: boolean;
  fileName?: string;
  sizeBytes?: number;
  error?: string;
}

export interface ArchiveImportResult {
  ok: boolean;
  hash?: string;
  count?: number;
  error?: string;
}

export interface ArchiveSummary {
  total: number;
  latest?: { hash: string; label: string; savedAt: number; turnCount: number };
}

export interface MigrationCheck {
  /** 存档包内版本 */
  savedVersion: number;
  /** 当前应用版本 */
  currentVersion: number;
  /** 是否需要迁移 */
  needsMigration: boolean;
  /** 迁移说明 */
  message: string;
}

/** 当前存档 schema 版本(与 content/mvu/schema.ts 对齐,变更时递增) */
export const ARCHIVE_SCHEMA_VERSION = 1;

// ───────────────────────────────────────────────────────────
//  Worker 管理
// ───────────────────────────────────────────────────────────

let workerInstance: Worker | null = null;

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!workerInstance) {
    try {
      workerInstance = new Worker(
        new URL('@workers/archiveExport.worker.ts', import.meta.url),
        { type: 'module' },
      );
    } catch {
      // Worker 不可用时降级主线程打包
      workerInstance = null;
    }
  }
  return workerInstance;
}

function callWorker<T extends PackRequest | UnpackRequest>(
  msg: T,
  timeoutMs = 15000,
): Promise<WorkerResponse> {
  return new Promise((resolve) => {
    const worker = getWorker();
    if (!worker) {
      // 降级:主线程模拟(与 worker 相同逻辑)
      resolve(simulateInMainThread(msg));
      return;
    }
    const timer = window.setTimeout(() => {
      worker.removeEventListener('message', onMsg);
      resolve({ ok: false, error: '打包超时' });
    }, timeoutMs);
    const onMsg = (e: MessageEvent<WorkerResponse>) => {
      window.clearTimeout(timer);
      worker.removeEventListener('message', onMsg);
      resolve(e.data);
    };
    worker.addEventListener('message', onMsg);
    worker.postMessage(msg);
  });
}

/** 主线程降级实现(Worker 不可用/超时) */
function simulateInMainThread(msg: PackRequest | UnpackRequest): WorkerResponse {
  try {
    if (msg.type === 'pack') {
      const pkg = { version: msg.schemaVersion, exportedAt: Date.now(), saves: msg.saves };
      const blob = new Blob([JSON.stringify(pkg)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      return { ok: true, result: url };
    }
    if (msg.type === 'unpack') {
      const pkg = JSON.parse(msg.text) as { version: number; saves: Record<string, string> };
      if (!pkg || typeof pkg.version !== 'number' || !pkg.saves) {
        return { ok: false, error: '存档包格式无效' };
      }
      return { ok: true, result: { version: pkg.version, saves: pkg.saves } };
    }
    return { ok: false, error: '未知消息类型' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ───────────────────────────────────────────────────────────
//  导出
// ───────────────────────────────────────────────────────────

/** 导出单个存档为 JSON 并触发浏览器下载 */
export async function exportSaveAsFile(hash: string): Promise<ArchiveExportResult> {
  try {
    const json = await saveCas.exportSave(hash);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dosokyosei2-save-${hash.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { ok: true, fileName: a.download, sizeBytes: blob.size };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 导出全部存档为批量包(Worker 内打包) */
export async function exportAllSavesZip(): Promise<ArchiveExportResult> {
  try {
    const entries = await listAllSaves();
    if (entries.length === 0) return { ok: false, error: '暂无存档可导出' };
    const payload: Record<string, string> = {};
    for (const e of entries) {
      payload[e.hash] = await saveCas.exportSave(e.hash);
    }
    const resp = await callWorker({
      type: 'pack',
      saves: payload,
      fileName: `dosokyosei2-archive-${Date.now()}.json`,
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
    });
    if (!resp.ok || typeof resp.result !== 'string') {
      return { ok: false, error: resp.error ?? '打包失败' };
    }
    const blobUrl = resp.result as string;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `dosokyosei2-archive-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    return { ok: true, fileName: a.download };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 从 File 导入单个存档 */
export async function importSaveFromFile(file: File): Promise<ArchiveImportResult> {
  try {
    const text = await file.text();
    const r = await saveCas.importSave(text);
    if (!r.ok) return { ok: false, error: r.error ?? '导入失败' };
    return { ok: true, hash: r.hash };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 从批量包导入全部存档(Worker 解包 + 逐个写入) */
export async function importAllSavesFromFile(file: File): Promise<ArchiveImportResult> {
  try {
    const text = await file.text();
    const resp = await callWorker({ type: 'unpack', text });
    if (!resp.ok || typeof resp.result === 'string' || !resp.result) {
      return { ok: false, error: resp.error ?? '解包失败' };
    }
    const { saves } = resp.result;
    const hashes = Object.keys(saves);
    if (hashes.length === 0) return { ok: false, error: '包内无存档' };
    let imported = 0;
    for (const h of hashes) {
      const r = await saveCas.importSave(saves[h]);
      if (r.ok) imported++;
    }
    return { ok: true, hash: hashes[0], count: imported };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ───────────────────────────────────────────────────────────
//  总览 / 迁移
// ───────────────────────────────────────────────────────────

/** 存档总览(供存档页顶部统计) */
export async function getArchiveSummary(): Promise<ArchiveSummary> {
  const entries = await listAllSaves();
  const latest = entries[0];
  return {
    total: entries.length,
    latest: latest
      ? {
          hash: latest.hash,
          label: latest.label,
          savedAt: latest.savedAt,
          turnCount: latest.turnCount,
        }
      : undefined,
  };
}

/** 检查存档包版本是否需要迁移 */
export function checkMigration(savedVersion?: number): MigrationCheck {
  const current = ARCHIVE_SCHEMA_VERSION;
  const v = savedVersion ?? 0;
  return {
    savedVersion: v,
    currentVersion: current,
    needsMigration: v < current,
    message:
      v < current
        ? `存档版本 ${v} 低于当前版本 ${current},导入后可能部分新字段缺失(将由 zod prefault 自动填充默认值)`
        : '版本一致,可直接使用',
  };
}

/** 检测旧档是否需要迁移(单参数兼容旧调用) */
export function needsMigration(savedVersion?: number): boolean {
  return checkMigration(savedVersion).needsMigration;
}

interface SaveMetaEntry {
  hash: string;
  label: string;
  savedAt: number;
  turnCount: number;
}

/** 列出全部存档(按时间倒序) */
async function listAllSaves(): Promise<SaveMetaEntry[]> {
  try {
    const { openDB } = await import('@db/indexeddb');
    const db = await openDB();
    const tx = db.transaction('saves', 'readonly');
    const store = tx.objectStore('saves');
    const all = (await new Promise<unknown[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as unknown[]);
      req.onerror = () => reject(req.error);
    })) as Array<{
      hash?: string;
      label?: string;
      savedAt?: number;
      turnCount?: number;
      statData?: { 时间?: { 天数?: number } };
    }>;
    return all
      .map((s) => ({
        hash: s.hash ?? '',
        label: s.label ?? '未命名',
        savedAt: s.savedAt ?? 0,
        turnCount: s.turnCount ?? Number((s.statData?.时间 as { 天数?: number } | undefined)?.天数 ?? 0),
      }))
      .filter((s) => s.hash)
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

/** 恢复:从最新 revision 恢复一致性(供 SaveRecovery 面板) */
export async function recoverKernel(kernel: Kernel) {
  const report = await recovery.recoverFromLatest(kernel);
  const consistency = await recovery.verifyConsistency(kernel);
  return { report, consistency };
}

/** 回滚到 base revision */
export async function rollbackKernel(kernel: Kernel) {
  await kernel.init();
  const report = await recovery.recoverFromLatest(kernel);
  const consistency = await recovery.verifyConsistency(kernel);
  return { report, consistency };
}

// 存档服务 — 导出/导入/备份/迁移（对接 kernel saveManager + IndexedDB 备份池）
// 对齐凡人 archiveService：存档 zip 传输与备份

import { db } from '@/db';
import { genId } from '@/utils/id';
import { logHub } from '@/stores/logStore';
import { traceHub } from '@/utils/trace';

export interface SaveBackupRecord {
  id: string;
  at: number;
  reason: string;
  revision: number;
  content: string;      // 序列化存档文本
}

export interface ArchiveResult {
  ok: boolean;
  message: string;
  fileName?: string;
  backupId?: string;
}

// 导出当前存档为可下载文件（JSON）
export function downloadSaveFile(content: string, fileName?: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName ?? `darkest-dungeon-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 读取用户选择的存档文件（浏览器 File）
export function readSaveFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });
}

// 创建手动备份（IndexedDB）
export async function createBackup(content: string, reason: string, revision: number): Promise<ArchiveResult> {
  try {
    const record: SaveBackupRecord = {
      id: genId('bak'),
      at: Date.now(),
      reason,
      revision,
      content,
    };
    await db.put('backups', record);
    // 限制备份数量
    const all = await db.getAll<SaveBackupRecord>('backups');
    const max = 30;
    if (all.length > max) {
      const sorted = all.sort((a, b) => a.at - b.at);
      for (const old of sorted.slice(0, all.length - max)) {
        await db.del('backups', old.id).catch(() => {});
      }
    }
    logHub.info(`已创建备份「${reason}」revision ${revision}`);
    traceHub.push('save', `备份创建 ${reason}`, { meta: { revision, backupId: record.id } });
    return { ok: true, message: '备份已创建', backupId: record.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logHub.error(`备份失败：${msg}`);
    return { ok: false, message: `备份失败：${msg}` };
  }
}

// 列出所有备份
export async function listBackups(): Promise<SaveBackupRecord[]> {
  const all = await db.getAll<SaveBackupRecord>('backups').catch(() => []);
  return all.sort((a, b) => b.at - a.at);
}

// 删除备份
export async function deleteBackup(id: string): Promise<void> {
  await db.del('backups', id).catch(() => {});
}

// 恢复备份（返回其内容，由调用方决定是否写回主档）
export async function getBackupContent(id: string): Promise<string | null> {
  const rec = await db.get<SaveBackupRecord>('backups', id).catch(() => null);
  return rec?.content ?? null;
}

// 从 JSON 文本解析存档并做基础校验（复用 kernel 校验器）
export async function importSaveFromText(
  text: string,
  parse: (t: string) => { ok: true; file: unknown } | { ok: false; reason: string }
): Promise<ArchiveResult> {
  const result = parse(text);
  if (!result.ok) {
    logHub.error(`导入存档失败：${result.reason}`);
    return { ok: false, message: `导入失败：${result.reason}` };
  }
  logHub.info('存档导入校验通过');
  traceHub.push('save', '存档导入校验通过', { meta: { size: text.length } });
  return { ok: true, message: '存档校验通过，可写入' };
}

// 平台/浏览器导出支持检测
export function canExport(): boolean {
  return typeof URL !== 'undefined' && typeof Blob !== 'undefined';
}

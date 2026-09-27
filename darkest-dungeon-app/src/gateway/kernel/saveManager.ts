import type {
  SaveFile,
  SaveLoadResult,
  SavePort,
  SaveWriteResult,
  StorageLike,
} from './contracts.ts';
import { stableStringify } from './commandKernel.ts';

export interface SaveManagerOptions {
  saveKey?: string;
  backupKey?: string;
  contentPackId?: string;
  contentVersion?: string;
}

function checksumText(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function computeIntegrity(
  file: Omit<SaveFile, 'integrity'>
): string {
  return checksumText(
    stableStringify({
      schemaVersion: file.schemaVersion,
      saveId: file.saveId,
      contentPackId: file.contentPackId,
      contentVersion: file.contentVersion,
      revision: file.revision,
      state: file.state,
      commandReceipts: file.commandReceipts,
      updatedAt: file.updatedAt,
    })
  );
}

export function verifySaveFile(file: SaveFile): boolean {
  return computeIntegrity(file) === file.integrity;
}

function parseAndVerify(raw: string): SaveFile | null {
  try {
    const parsed = JSON.parse(raw) as SaveFile;
    return verifySaveFile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function serializeSaveFile(file: SaveFile): string {
  return JSON.stringify(file, null, 2);
}

export function parseSaveFile(
  text: string
): { ok: true; file: SaveFile } | { ok: false; reason: string } {
  try {
    const parsed = JSON.parse(text) as SaveFile;
    if (!verifySaveFile(parsed)) {
      return { ok: false, reason: '存档校验和不匹配' };
    }
    return { ok: true, file: parsed };
  } catch {
    return { ok: false, reason: '存档不是有效的 JSON' };
  }
}

export function createSavePort(
  storage: StorageLike,
  options: SaveManagerOptions = {}
): SavePort {
  const saveKey = options.saveKey ?? 'dd-save-v3';
  const backupKey = options.backupKey ?? 'dd-save-v3.bak';
  const contentPackId = options.contentPackId ?? 'darkest-dungeon-app';
  const contentVersion = options.contentVersion ?? '0.1.0';

  return {
    build(state, nextRevision, receipts, saveId): SaveFile {
      const base: Omit<SaveFile, 'integrity'> = {
        schemaVersion: 1,
        saveId,
        contentPackId,
        contentVersion,
        revision: nextRevision,
        state,
        commandReceipts: receipts,
        updatedAt: new Date().toISOString(),
      };
      return { ...base, integrity: computeIntegrity(base) };
    },

    write(file: SaveFile, expectedRevision: number): SaveWriteResult {
      try {
        if (!verifySaveFile(file)) {
          return {
            ok: false,
            code: 'storage_error',
            reason: '待写入存档校验失败',
          };
        }

        const existingRaw = storage.getItem(saveKey);
        let existingRevision: number | null = null;
        if (existingRaw != null) {
          try {
            const parsed = JSON.parse(existingRaw) as Partial<SaveFile>;
            existingRevision =
              typeof parsed.revision === 'number' ? parsed.revision : null;
          } catch {
            existingRevision = null;
          }
          if (existingRevision === null) {
            return {
              ok: false,
              code: 'storage_error',
              reason: '现有存档无法解析，拒绝覆盖',
            };
          }
        } else if (expectedRevision !== 0) {
          return {
            ok: false,
            code: 'cas_conflict',
            reason: `无现有存档，但期望修订为 ${expectedRevision}`,
          };
        }

        if (existingRevision !== null && existingRevision !== expectedRevision) {
          return {
            ok: false,
            code: 'cas_conflict',
            reason: `现有修订 ${existingRevision} 与期望修订 ${expectedRevision} 冲突`,
          };
        }

        if (existingRaw != null) {
          storage.setItem(backupKey, existingRaw);
        }

        const json = JSON.stringify(file);
        storage.setItem(saveKey, json);

        const readBack = storage.getItem(saveKey);
        if (readBack !== json || !parseAndVerify(readBack ?? '')) {
          return {
            ok: false,
            code: 'readback_failed',
            reason: '写入后读回校验失败',
          };
        }

        return { ok: true, ack: 'atomic-readback-ack' };
      } catch (err) {
        return {
          ok: false,
          code: 'storage_error',
          reason: err instanceof Error ? err.message : String(err),
        };
      }
    },

    read(): SaveLoadResult {
      const mainRaw = storage.getItem(saveKey);
      const backupRaw = storage.getItem(backupKey);

      if (mainRaw != null) {
        const main = parseAndVerify(mainRaw);
        if (main) {
          return {
            status: 'ok',
            file: main,
            preservedMain: mainRaw,
            preservedBackup: backupRaw,
          };
        }

        const backup = backupRaw != null ? parseAndVerify(backupRaw) : null;
        if (backup) {
          return {
            status: 'backup_restored',
            file: backup,
            error: '主档校验失败，已恢复备份',
            preservedMain: mainRaw,
            preservedBackup: backupRaw,
          };
        }

        return {
          status: 'corrupt',
          file: null,
          error: '主档与备份均无法验证',
          preservedMain: mainRaw,
          preservedBackup: backupRaw,
        };
      }

      const backup = backupRaw != null ? parseAndVerify(backupRaw) : null;
      if (backup) {
        return {
          status: 'backup_restored',
          file: backup,
          error: '主档缺失，已恢复备份',
          preservedMain: null,
          preservedBackup: backupRaw,
        };
      }

      return {
        status: 'missing',
        file: null,
        preservedMain: null,
        preservedBackup: backupRaw,
      };
    },
  };
}

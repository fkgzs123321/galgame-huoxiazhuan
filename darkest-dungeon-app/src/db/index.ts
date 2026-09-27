// IndexedDB 数据层 — 存档快照 / 备份 / 日志 / 媒体
// 对齐 fanren-remake 的 db 单入口层；无第三方依赖

const DB_NAME = 'darkest-dungeon-app';
const DB_VERSION = 1;

export type DdStoreName = 'saves' | 'backups' | 'logs' | 'media';

const STORES: { name: DdStoreName; key: string }[] = [
  { name: 'saves', key: 'key' },      // 当前存档快照（key = slot 名）
  { name: 'backups', key: 'id' },     // 自动/手动备份
  { name: 'logs', key: 'id' },        // 日志中心持久化
  { name: 'media', key: 'id' },       // 生图/媒体资源
];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s.name)) {
          db.createObjectStore(s.name, { keyPath: s.key });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: DdStoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export const db = {
  async put<T>(store: DdStoreName, value: T): Promise<IDBValidKey> {
    return tx(store, 'readwrite', (s) => s.put(value as never) as IDBRequest<IDBValidKey>);
  },
  async get<T>(store: DdStoreName, key: string): Promise<T | undefined> {
    return tx(store, 'readonly', (s) => s.get(key) as IDBRequest<T>);
  },
  async getAll<T>(store: DdStoreName): Promise<T[]> {
    return tx(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
  },
  async del(store: DdStoreName, key: string): Promise<void> {
    await tx(store, 'readwrite', (s) => s.delete(key) as IDBRequest<undefined>);
  },
  async clear(store: DdStoreName): Promise<void> {
    await tx(store, 'readwrite', (s) => s.clear() as IDBRequest<undefined>);
  },
  async count(store: DdStoreName): Promise<number> {
    return tx(store, 'readonly', (s) => s.count() as IDBRequest<number>);
  },
};

// 存储能力探测（隐私/诊断用）
export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && !!indexedDB.open;
  } catch {
    return false;
  }
}

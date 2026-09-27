/**
 * IndexedDB 封装层(Host Foundation 步骤2)
 *
 * 职责:
 *  - ObjectStore 定义与版本化迁移
 *  - 通用 CRUD(put/get/delete/getAll/clear)
 *  - CAS 内容寻址(sha256)用于 save_revisions
 *  - 原子写入(单事务多 store)
 *  - revision 版本化(父哈希链)
 *
 * ObjectStore 清单:
 *  - kv              : 通用键值(配置/指针/当前 revision id)
 *  - revisions       : CAS revision 存储(keyPath=hash,index=parent_hash/ts/scope)
 *  - chat_sheets     : SP 数据库表(keyPath=[table_name,row_id],index=table_name)
 *  - npc_state       : NPC 动态状态缓存(keyPath=name)
 *  - blobs           : 大二进制资源(可选,阶段3启用)
 *
 * 失败语义:
 *  - 写入失败(配额/冲突): 抛出 IndexedDBError,上层降级到内存缓存
 *  - 读取失败(找不到): 返回 null(不抛)
 */

const DB_NAME = 'dosokyosei2-app';
const DB_VERSION = 1;

/** ObjectStore 名称常量 */
export const STORE = {
  KV: 'kv',
  REVISIONS: 'revisions',
  CHAT_SHEETS: 'chat_sheets',
  NPC_STATE: 'npc_state',
  BLOBS: 'blobs',
} as const;

export type StoreName = (typeof STORE)[keyof typeof STORE];

/** 自定义错误类型 */
export class IndexedDBError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'IndexedDBError';
  }
}

/** KV 表行 */
export interface KVRow<T = unknown> {
  key: string;
  value: T;
  updatedAt: number;
}

/** Revision 行(CAS) */
export interface RevisionRow {
  /** 内容寻址哈希 sha256(JSON(content)) */
  hash: string;
  /** 父 revision 哈希(初始为 null) */
  parentHash: string | null;
  /** 创建时间戳 */
  ts: number;
  /** 作用域:save/chat/auto/branch */
  scope: 'save' | 'chat' | 'auto' | 'branch';
  /** 存档标签(可选) */
  label?: string;
  /** 状态负载(stat_data 快照) */
  content: unknown;
}

/** chatSheets 行 */
export interface ChatSheetRow {
  table_name: string;
  row_id: string | number;
  data: Record<string, unknown>;
  updatedAt: number;
}

/** NPC 状态行 */
export interface NpcStateRow {
  name: string;
  data: Record<string, unknown>;
  updatedAt: number;
}

/** createRevision 参数（复用给测试覆盖） */
export interface CreateRevisionParams {
  content: unknown;
  parentHash?: string | null;
  scope?: RevisionRow['scope'];
  label?: string;
}

type KvSetFn = (key: string, value: unknown) => Promise<void>;
type CreateRevisionFn = (params: CreateRevisionParams) => Promise<RevisionRow>;

/** 测试覆盖（供失败恢复演练注入 IDB 故障，不进入生产调用链） */
let idbTestOverrides: { kvSet?: KvSetFn; createRevision?: CreateRevisionFn } | null = null;

/** 安装/清除 IndexedDB 测试覆盖 */
export function __setIdbTestOverrides(
  overrides: { kvSet?: KvSetFn; createRevision?: CreateRevisionFn } | null,
): void {
  idbTestOverrides = overrides;
}

// ───────────────────────────────────────────────────────────
//  DB 打开与版本化
// ───────────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

/** 打开(并按需升级)数据库 */
export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new IndexedDBError('当前环境不支持 IndexedDB'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE.KV)) {
        db.createObjectStore(STORE.KV, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE.REVISIONS)) {
        const os = db.createObjectStore(STORE.REVISIONS, { keyPath: 'hash' });
        os.createIndex('parent_hash', 'parentHash', { unique: false });
        os.createIndex('ts', 'ts', { unique: false });
        os.createIndex('scope', 'scope', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.CHAT_SHEETS)) {
        const os = db.createObjectStore(STORE.CHAT_SHEETS, {
          keyPath: ['table_name', 'row_id'],
        });
        os.createIndex('table_name', 'table_name', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.NPC_STATE)) {
        const os = db.createObjectStore(STORE.NPC_STATE, { keyPath: 'name' });
        os.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.BLOBS)) {
        db.createObjectStore(STORE.BLOBS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(new IndexedDBError('打开数据库失败', req.error));
    req.onblocked = () =>
      reject(new IndexedDBError('打开数据库被阻塞(其他标签页占用)'));
  });
  return dbPromise;
}

// ───────────────────────────────────────────────────────────
//  通用辅助
// ───────────────────────────────────────────────────────────

/** 包装 IDBRequest 为 Promise */
function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(new IndexedDBError(`IDBRequest 失败: ${req.error?.message}`, req.error));
  });
}

/** 包装 IDBTransaction 完成 */
function txToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(new IndexedDBError(`事务失败: ${tx.error?.message}`, tx.error));
    tx.onabort = () => reject(new IndexedDBError('事务被中止', tx.error));
  });
}

/** 计算 sha256 哈希(浏览器原生 WebCrypto) */
export async function sha256(content: unknown): Promise<string> {
  const text = JSON.stringify(content);
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

// ───────────────────────────────────────────────────────────
//  KV 通用键值
// ───────────────────────────────────────────────────────────

export async function kvGet<T = unknown>(key: string): Promise<T | null> {
  const db = await openDB();
  const tx = db.transaction(STORE.KV, 'readonly');
  const row = await reqToPromise<KVRow<T> | undefined>(
    tx.objectStore(STORE.KV).get(key),
  );
  return row ? row.value : null;
}

export async function kvSet<T = unknown>(key: string, value: T): Promise<void> {
  if (idbTestOverrides?.kvSet) {
    return idbTestOverrides.kvSet(key, value);
  }
  const db = await openDB();
  const tx = db.transaction(STORE.KV, 'readwrite');
  const row: KVRow<T> = { key, value, updatedAt: Date.now() };
  tx.objectStore(STORE.KV).put(row);
  await txToPromise(tx);
}

export async function kvDelete(key: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE.KV, 'readwrite');
  tx.objectStore(STORE.KV).delete(key);
  await txToPromise(tx);
}

export async function kvKeys(prefix?: string): Promise<string[]> {
  const db = await openDB();
  const tx = db.transaction(STORE.KV, 'readonly');
  const store = tx.objectStore(STORE.KV);
  // 阶段4:用 key range 前缀查询,避免 getAll 内存过滤
  if (prefix) {
    const range = IDBKeyRange.bound(prefix, prefix + '\uffff', false, false);
    const rows = await reqToPromise<KVRow[]>(store.getAll(range));
    return rows.map((r) => r.key);
  }
  const all = await reqToPromise<KVRow[]>(store.getAll());
  return all.map((r) => r.key);
}

/** 列出指定前缀的所有 KV 值(阶段2 NPC 记忆用) */
export async function kvList<T = unknown>(prefix: string): Promise<T[]> {
  const db = await openDB();
  const tx = db.transaction(STORE.KV, 'readonly');
  const store = tx.objectStore(STORE.KV);
  // 阶段4:用 key range 前缀查询,避免 getAll 内存过滤
  const range = IDBKeyRange.bound(prefix, prefix + '\uffff', false, false);
  const rows = await reqToPromise<KVRow<T>[]>(store.getAll(range));
  return rows.map((r) => r.value);
}

// ───────────────────────────────────────────────────────────
//  Revision CAS
// ───────────────────────────────────────────────────────────

/**
 * 创建新 revision(原子写入)
 *  - 自动计算 hash
 *  - 校验父哈希存在(若 parentHash 非空)
 *  - 返回新 revision 行
 */
export async function createRevision(params: CreateRevisionParams): Promise<RevisionRow> {
  if (idbTestOverrides?.createRevision) {
    return idbTestOverrides.createRevision(params);
  }
  const { content, parentHash = null, scope = 'chat', label } = params;
  const hash = await sha256({ content, parentHash, scope });
  const db = await openDB();
  // 校验父 revision(若指定)
  if (parentHash) {
    const parent = await getRevision(parentHash);
    if (!parent) {
      throw new IndexedDBError(`父 revision 不存在: ${parentHash}`);
    }
  }
  // 检查是否已存在(同哈希直接返回,实现去重)
  const tx = db.transaction(STORE.REVISIONS, 'readwrite');
  const existing = await reqToPromise<RevisionRow | undefined>(
    tx.objectStore(STORE.REVISIONS).get(hash),
  );
  if (existing) {
    await txToPromise(tx);
    return existing;
  }
  const row: RevisionRow = {
    hash,
    parentHash,
    ts: Date.now(),
    scope,
    label,
    content,
  };
  tx.objectStore(STORE.REVISIONS).put(row);
  await txToPromise(tx);
  return row;
}

/** 按 hash 获取 revision */
export async function getRevision(hash: string): Promise<RevisionRow | null> {
  const db = await openDB();
  const tx = db.transaction(STORE.REVISIONS, 'readonly');
  const row = await reqToPromise<RevisionRow | undefined>(
    tx.objectStore(STORE.REVISIONS).get(hash),
  );
  return row ?? null;
}

/** 列出指定 scope 的 revision(按 ts 降序) */
export async function listRevisions(
  scope?: RevisionRow['scope'],
  limit = 50,
): Promise<RevisionRow[]> {
  const db = await openDB();
  const tx = db.transaction(STORE.REVISIONS, 'readonly');
  // 阶段4:用 scope 索引 + key range 查询,避免 getAll 内存过滤
  if (scope) {
    const idx = tx.objectStore(STORE.REVISIONS).index('scope');
    const rows = await reqToPromise<RevisionRow[]>(idx.getAll(scope));
    return rows.sort((a, b) => b.ts - a.ts).slice(0, limit);
  }
  // 无 scope 时用 ts 索引倒序(避免 getAll 后排序)
  const tsIdx = tx.objectStore(STORE.REVISIONS).index('ts');
  const all = await reqToPromise<RevisionRow[]>(tsIdx.getAll());
  return all.reverse().slice(0, limit);
}

/** 沿父哈希链回溯(从给定 hash 到根) */
export async function traceRevisionChain(hash: string): Promise<RevisionRow[]> {
  const chain: RevisionRow[] = [];
  let cur: RevisionRow | null = await getRevision(hash);
  while (cur) {
    chain.push(cur);
    if (!cur.parentHash) break;
    cur = await getRevision(cur.parentHash);
  }
  return chain;
}

// ───────────────────────────────────────────────────────────
//  ChatSheets(SP 数据库表)
// ───────────────────────────────────────────────────────────

export async function sheetUpsert(row: ChatSheetRow): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE.CHAT_SHEETS, 'readwrite');
  tx.objectStore(STORE.CHAT_SHEETS).put({ ...row, updatedAt: Date.now() });
  await txToPromise(tx);
}

export async function sheetGet(
  tableName: string,
  rowId: string | number,
): Promise<ChatSheetRow | null> {
  const db = await openDB();
  const tx = db.transaction(STORE.CHAT_SHEETS, 'readonly');
  const row = await reqToPromise<ChatSheetRow | undefined>(
    tx.objectStore(STORE.CHAT_SHEETS).get([tableName, rowId]),
  );
  return row ?? null;
}

export async function sheetList(tableName: string): Promise<ChatSheetRow[]> {
  const db = await openDB();
  const tx = db.transaction(STORE.CHAT_SHEETS, 'readonly');
  const idx = tx.objectStore(STORE.CHAT_SHEETS).index('table_name');
  return reqToPromise<ChatSheetRow[]>(idx.getAll(tableName));
}

export async function sheetDelete(
  tableName: string,
  rowId: string | number,
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE.CHAT_SHEETS, 'readwrite');
  tx.objectStore(STORE.CHAT_SHEETS).delete([tableName, rowId]);
  await txToPromise(tx);
}

export async function sheetClear(tableName?: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE.CHAT_SHEETS, 'readwrite');
  if (tableName) {
    const idx = tx.objectStore(STORE.CHAT_SHEETS).index('table_name');
    const rows = await reqToPromise<ChatSheetRow[]>(idx.getAll(tableName));
    for (const r of rows) {
      tx.objectStore(STORE.CHAT_SHEETS).delete([r.table_name, r.row_id]);
    }
  } else {
    tx.objectStore(STORE.CHAT_SHEETS).clear();
  }
  await txToPromise(tx);
}

// ───────────────────────────────────────────────────────────
//  批量操作(阶段4:IndexedDB 性能调优)
// ───────────────────────────────────────────────────────────

/**
 * 批量 upsert chatSheets(单事务,性能优化)
 * - 用于预设导入(264 条目)、世界书批量写入(190 条目)等场景
 * - 相比逐行 sheetUpsert,性能提升 10-50x(单事务 vs N 事务)
 */
export async function sheetBatchUpsert(rows: ChatSheetRow[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await openDB();
  const tx = db.transaction(STORE.CHAT_SHEETS, 'readwrite');
  const store = tx.objectStore(STORE.CHAT_SHEETS);
  const now = Date.now();
  for (const row of rows) {
    store.put({ ...row, updatedAt: now });
  }
  await txToPromise(tx);
}

/**
 * 批量 upsert KV(单事务)
 * - 用于配置批量保存、多个指针同时更新等场景
 */
export async function kvBatchSet<T = unknown>(
  entries: Array<{ key: string; value: T }>,
): Promise<void> {
  if (entries.length === 0) return;
  const db = await openDB();
  const tx = db.transaction(STORE.KV, 'readwrite');
  const store = tx.objectStore(STORE.KV);
  const now = Date.now();
  for (const { key, value } of entries) {
    const row: KVRow<T> = { key, value, updatedAt: now };
    store.put(row);
  }
  await txToPromise(tx);
}

/**
 * 批量 upsert NPC 状态(单事务)
 */
export async function npcBatchSet(
  entries: Array<{ name: string; data: Record<string, unknown> }>,
): Promise<void> {
  if (entries.length === 0) return;
  const db = await openDB();
  const tx = db.transaction(STORE.NPC_STATE, 'readwrite');
  const store = tx.objectStore(STORE.NPC_STATE);
  const now = Date.now();
  for (const { name, data } of entries) {
    store.put({ name, data, updatedAt: now });
  }
  await txToPromise(tx);
}

/**
 * 批量创建 revision(单事务,用于存档分支批量创建)
 * - 注意:hash 仍逐个计算(依赖父哈希链)
 */
export async function createRevisionBatch(
  items: Array<{
    content: unknown;
    parentHash?: string | null;
    scope?: RevisionRow['scope'];
    label?: string;
  }>,
): Promise<RevisionRow[]> {
  if (items.length === 0) return [];
  const results: RevisionRow[] = [];
  // hash 必须逐个计算(依赖父哈希链),但写入可批量
  const rows: RevisionRow[] = [];
  for (const item of items) {
    const { content, parentHash = null, scope = 'chat', label } = item;
    const hash = await sha256({ content, parentHash, scope });
    rows.push({ hash, parentHash, ts: Date.now(), scope, label, content });
  }
  const db = await openDB();
  const tx = db.transaction(STORE.REVISIONS, 'readwrite');
  const store = tx.objectStore(STORE.REVISIONS);
  // 先批量查重
  const existing: Record<string, RevisionRow | undefined> = {};
  for (const row of rows) {
    const found = await reqToPromise<RevisionRow | undefined>(store.get(row.hash));
    if (found) {
      existing[row.hash] = found;
    } else {
      store.put(row);
    }
  }
  await txToPromise(tx);
  for (const row of rows) {
    results.push(existing[row.hash] ?? row);
  }
  return results;
}

// ───────────────────────────────────────────────────────────
//  NPC 状态
// ───────────────────────────────────────────────────────────

export async function npcSet(name: string, data: Record<string, unknown>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE.NPC_STATE, 'readwrite');
  tx.objectStore(STORE.NPC_STATE).put({ name, data, updatedAt: Date.now() });
  await txToPromise(tx);
}

export async function npcGet(name: string): Promise<NpcStateRow | null> {
  const db = await openDB();
  const tx = db.transaction(STORE.NPC_STATE, 'readonly');
  const row = await reqToPromise<NpcStateRow | undefined>(
    tx.objectStore(STORE.NPC_STATE).get(name),
  );
  return row ?? null;
}

export async function npcList(): Promise<NpcStateRow[]> {
  const db = await openDB();
  const tx = db.transaction(STORE.NPC_STATE, 'readonly');
  return reqToPromise<NpcStateRow[]>(tx.objectStore(STORE.NPC_STATE).getAll());
}

// ───────────────────────────────────────────────────────────
//  原子多 store 事务
// ───────────────────────────────────────────────────────────

/**
 * 在单事务中执行多 store 操作(原子)
 *  - 调用方通过 callback 拿到 tx,自行 put/delete
 *  - callback 返回值会被忽略,Promise 在 tx.oncomplete 后 resolve
 */
export async function atomic(
  storeNames: StoreName[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => void,
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeNames as string[], mode);
  fn(tx);
  await txToPromise(tx);
}

/** 清空所有 store(开发期调试用) */
export async function wipeAll(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(
    [STORE.KV, STORE.REVISIONS, STORE.CHAT_SHEETS, STORE.NPC_STATE, STORE.BLOBS],
    'readwrite',
  );
  tx.objectStore(STORE.KV).clear();
  tx.objectStore(STORE.REVISIONS).clear();
  tx.objectStore(STORE.CHAT_SHEETS).clear();
  tx.objectStore(STORE.NPC_STATE).clear();
  tx.objectStore(STORE.BLOBS).clear();
  await txToPromise(tx);
}

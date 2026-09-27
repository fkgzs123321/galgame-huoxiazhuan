/**
 * SQL 执行器集成测试(内存 IndexedDB mock)
 * 验证 executeSqlStatements:INSERT(含子查询 auto row_id / ? 占位)/ UPDATE / DELETE / DDL 忽略 / 分号字符串
 */
import { executeSqlStatements } from '../src/runtime/sql-executor';

// ───────────────────────────────────────────
//  最小内存 IndexedDB mock(仅支撑 sql-executor 所用 API)
// ───────────────────────────────────────────
class MockIDBRequest {
  result: unknown = undefined;
  error: unknown = null;
  handlers: { onsuccess: (() => void) | null; onerror: (() => void) | null } = { onsuccess: null, onerror: null };
  get onsuccess() {
    return this.handlers.onsuccess;
  }
  set onsuccess(fn) {
    this.handlers.onsuccess = fn;
    if (fn) queueMicrotask(fn);
  }
  get onerror() {
    return this.handlers.onerror;
  }
  set onerror(fn) {
    this.handlers.onerror = fn;
  }
}

class MockStore {
  rows = new Map<string, unknown>();
  indexes: Record<string, (row: unknown) => unknown> = {};

  constructor(public name: string) {}

  put(row: unknown): void {
    const key = this.keyOf(row);
    this.rows.set(JSON.stringify(key), row);
  }
  delete(key: unknown): void {
    this.rows.delete(JSON.stringify(key));
  }
  get(key: unknown): MockIDBRequest {
    const req = new MockIDBRequest();
    req.result = this.rows.get(JSON.stringify(key)) ?? undefined;
    return req;
  }
  getAll(): MockIDBRequest {
    const req = new MockIDBRequest();
    req.result = Array.from(this.rows.values());
    return req;
  }
  clear(): void {
    this.rows.clear();
  }
  index(name: string) {
    return {
      getAll: (value?: unknown): MockIDBRequest => {
        const req = new MockIDBRequest();
        const all = this.getAll().result as Array<{ [k: string]: unknown }>;
        if (value === undefined) {
          req.result = all;
          return req;
        }
        const keyFn = this.indexes[name];
        req.result = all.filter((r) => keyFn && keyFn(r) === value);
        return req;
      },
    };
  }
  private keyOf(row: any): unknown {
    if (this.name === 'chat_sheets') return [row.table_name, row.row_id];
    if (this.name === 'kv') return row.key;
    if (this.name === 'revisions') return row.hash;
    if (this.name === 'npc_state') return row.name;
    return row.key;
  }
}

class MockTx {
  handlers: { oncomplete: (() => void) | null; onerror: (() => void) | null; onabort: (() => void) | null } = {
    oncomplete: null,
    onerror: null,
    onabort: null,
  };
  constructor(public db: MockDB) {}
  objectStore(name: string): MockStore {
    return this.db.stores.get(name)!;
  }
  get oncomplete() {
    return this.handlers.oncomplete;
  }
  set oncomplete(fn) {
    this.handlers.oncomplete = fn;
    if (fn) queueMicrotask(fn);
  }
  get onerror() {
    return this.handlers.onerror;
  }
  set onerror(fn) {
    this.handlers.onerror = fn;
  }
  get onabort() {
    return this.handlers.onabort;
  }
  set onabort(fn) {
    this.handlers.onabort = fn;
  }
}

class MockDB {
  objectStoreNames = { contains: (name: string) => this.stores.has(name) };
  constructor(public stores: Map<string, MockStore>) {}
  createObjectStore(name: string): MockStore {
    const store = new MockStore(name);
    this.stores.set(name, store);
    return store;
  }
  transaction(names: string | string[], mode: string): MockTx {
    return new MockTx(this);
  }
}

const stores = new Map<string, MockStore>();
stores.set('kv', new MockStore('kv'));
stores.set('revisions', new MockStore('revisions'));
stores.set('chat_sheets', new MockStore('chat_sheets'));
stores.set('npc_state', new MockStore('npc_state'));
stores.set('blobs', new MockStore('blobs'));
const chatSheetsStore = stores.get('chat_sheets')!;
chatSheetsStore.indexes['table_name'] = (row: any) => row.table_name;
const db = new MockDB(stores);

(globalThis as any).indexedDB = {
  open: (_name: string, _version: number) => {
    const req = new MockIDBRequest();
    req.result = db;
    queueMicrotask(() => req.handlers.onsuccess?.());
    return req;
  },
};
(globalThis as any).IDBKeyRange = {
  bound: (lower: unknown, upper: unknown) => ({ lower, upper }),
};

const chatSheets = stores.get('chat_sheets')!;

// ───────────────────────────────────────────
//  测试
// ───────────────────────────────────────────
let pass = 0;
let fail = 0;
function assert(cond: boolean, name: string, detail = '') {
  if (cond) {
    pass++;
    console.log(`OK   | ${name}`);
  } else {
    fail++;
    console.log(`FAIL | ${name} ${detail}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 1. INSERT 显式 row_id + NULL + 字符串
let r = await executeSqlStatements([
  "INSERT INTO global_state (row_id, current_location, current_minor_region, current_major_region, prev_scene_time, elapsed_time, cur_time) VALUES (1, '御苑', '新宿区', '东京都', NULL, '0分钟', '2024-04-01 09:00')",
]);
assert(r.length === 1 && r[0].ok, 'INSERT 显式 row_id 成功', JSON.stringify(r[0]));
const gs = chatSheets.get(['global_state', 1]).result as any;
assert(gs && gs.data.current_location === '御苑' && gs.data.prev_scene_time === null, 'INSERT 数据/列正确', JSON.stringify(gs?.data));

// 2. INSERT 子查询 auto row_id
r = await executeSqlStatements([
  "INSERT INTO world_map_points (row_id, location_name, minor_region, major_region, location_type, environment_desc, importance, exploration_status) VALUES ((SELECT COALESCE(MAX(row_id), 0) + 1 FROM world_map_points), '新宿车站', '新宿区', '东京都', '交通', '繁忙', '普通', '已探索')",
  "INSERT INTO world_map_points (row_id, location_name, minor_region, major_region, location_type, environment_desc, importance, exploration_status) VALUES ((SELECT COALESCE(MAX(row_id), 0) + 1 FROM world_map_points), '御苑', '新宿区', '东京都', '野外', '公园', '重要', '部分探索')",
]);
assert(r.length === 2 && r.every((x) => x.ok), 'INSERT 子查询 auto row_id 成功');
const wm1 = chatSheets.get(['world_map_points', 1]).result as any;
const wm2 = chatSheets.get(['world_map_points', 2]).result as any;
assert(wm1 && wm1.data.location_name === '新宿车站' && wm2 && wm2.data.location_name === '御苑', 'auto row_id 递增 1→2');

// 3. UPDATE WHERE row_id
r = await executeSqlStatements([
  "UPDATE global_state SET cur_time = '08:30', elapsed_time = '30分钟' WHERE row_id = 1",
]);
assert(r.length === 1 && r[0].ok && r[0].affected === 1, 'UPDATE 按 row_id 成功');
assert((chatSheets.get(['global_state', 1]).result as any).data.cur_time === '08:30', 'UPDATE 字段生效');

// 4. UPDATE 按非主键列(中文值)
r = await executeSqlStatements([
  "UPDATE world_map_points SET exploration_status = '已探索' WHERE location_name = '御苑'",
]);
assert(r.length === 1 && r[0].ok && r[0].affected === 1, 'UPDATE 按字符串列成功');
assert((chatSheets.get(['world_map_points', 2]).result as any).data.exploration_status === '已探索', 'UPDATE 中文值生效');

// 5. UPDATE 含分号字符串
r = await executeSqlStatements([
  "UPDATE global_state SET flags_text = 'bad_ending_报警;结局:主角被带走' WHERE row_id = 1",
]);
assert(r.length === 1 && r[0].ok, 'UPDATE 字符串含分号不截断', JSON.stringify(r));
assert((chatSheets.get(['global_state', 1]).result as any).data.flags_text === 'bad_ending_报警;结局:主角被带走', '分号字符串完整保存');

// 6. INSERT ? 占位 row_id
r = await executeSqlStatements([
  "INSERT INTO chronicle (row_id, code_index, time_span, summary, chronicle_text) VALUES (?, 'bad_ending_001', '12-22', 'BAD END', '主角被带走')",
]);
assert(r.length === 1 && r[0].ok && r[0].rowId === 1, 'INSERT ? 占位 auto row_id', JSON.stringify(r[0]));

// 7. DELETE WHERE + IN
await executeSqlStatements([
  "INSERT INTO inventory (row_id, item_name, item_type, quantity, quality, description) VALUES (1, '旧书', '道具', 1, '普通', '旧书')",
  "INSERT INTO inventory (row_id, item_name, item_type, quantity, quality, description) VALUES (2, '巧克力', '礼物', 1, '优秀', '巧克力')",
]);
r = await executeSqlStatements([
  "DELETE FROM inventory WHERE quality IN ('普通','优秀') AND item_name = '旧书'",
]);
assert(r.length === 1 && r[0].ok && r[0].affected === 1, 'DELETE WHERE IN+AND 成功');
assert(chatSheets.get(['inventory', 1]).result === undefined && chatSheets.get(['inventory', 2]).result !== undefined, 'DELETE 只删匹配行');

// 8. DDL 忽略
r = await executeSqlStatements(['CREATE TABLE IF NOT EXISTS global_state (row_id INTEGER PRIMARY KEY)']);
assert(r.length === 1 && r[0].ok && r[0].type === 'IGNORED', 'CREATE TABLE 忽略');

// 9. 非法 SQL 单条失败不阻塞
r = await executeSqlStatements([
  'GARBAGE SQL',
  "UPDATE world_map_points SET exploration_status = '已探索' WHERE location_name = '新宿车站'",
]);
assert(r.length === 2 && r[0].ok === false && r[1].ok === true, '非法语句跳过,后续正常执行');

// 10. 批量(join 重新分割)
r = await executeSqlStatements([
  "UPDATE global_state SET cur_time = '09:00' WHERE row_id = 1",
  "UPDATE world_map_points SET location_type = '交通枢纽' WHERE location_name = '新宿车站'",
]);
assert(r.length === 2 && r.every((x) => x.ok), '多条语句批量执行');
assert((chatSheets.get(['world_map_points', 1]).result as any).data.location_type === '交通枢纽', '批量第二条生效');

// 11. UPDATE row_id 变更(删旧建新)
r = await executeSqlStatements([
  "INSERT INTO factions (row_id, faction_name, description) VALUES (1, '学生会', '学生组织')",
  "UPDATE factions SET row_id = 9 WHERE faction_name = '学生会'",
]);
const f9 = chatSheets.get(['factions', 9]).result as any;
assert(r.length === 2 && r.every((x) => x.ok) && f9 && chatSheets.get(['factions', 1]).result === undefined, 'UPDATE row_id 迁移');

await sleep(10);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);

/**
 * SPV chatSheets SQL 执行器(阶段2:UpdateTable 真实执行)
 *
 * 职责:
 *  - 把变量AI 的 <UpdateTable> SQL 语句(INSERT/UPDATE/DELETE)解析并执行到 IndexedDB chat_sheets store
 *  - 支持 SQLite 风格子查询:INSERT ... VALUES ((SELECT COALESCE(MAX(row_id), 0) + 1 FROM table), ...)
 *  - 支持 ? 占位符(INSERT 的 row_id 自动分配)
 *  - 支持 WHERE 等值/IS NULL/IS NOT NULL/IN/<>/AND 组合
 *  - 忽略 CREATE TABLE / DROP 等 DDL(表格结构由模板预建)
 *  - 单条失败不阻塞后续语句(与 Kernel 失败语义一致:跳过该条 + 记录错误)
 *
 * 失败语义:
 *  - 解析失败 → 返回 UNKNOWN 结果,不执行
 *  - 执行失败(IndexedDB 错误) → 返回 ok=false + error,不污染其他语句
 */

import * as idb from '../db/indexeddb';

/** 单条 SQL 执行结果 */
export interface SqlExecResult {
  /** 原始语句 */
  statement: string;
  /** 是否成功(解析失败/执行失败 = false) */
  ok: boolean;
  type: 'INSERT' | 'UPDATE' | 'DELETE' | 'IGNORED' | 'UNKNOWN';
  /** 目标表名(UNKNOWN/IGNORED 时为空) */
  table?: string;
  /** INSERT 生成或使用的 row_id */
  rowId?: string | number;
  /** 受影响行数(INSERT=1) */
  affected: number;
  /** 错误信息(若有) */
  error?: string;
}

/** WHERE 条件节点 */
interface WhereCond {
  col: string;
  op: 'eq' | 'ne' | 'is-null' | 'is-not-null' | 'in';
  value?: unknown;
  values?: unknown[];
}

/** 解析后的 SQL 语句 */
interface ParsedSql {
  type: 'INSERT' | 'UPDATE' | 'DELETE' | 'IGNORED' | 'UNKNOWN';
  table?: string;
  columns?: string[];
  /** VALUES 字面量(含 {auto:true} 标记的自动分配值) */
  values?: Array<unknown | { auto: true }>;
  /** SET 赋值对 */
  sets?: Array<{ col: string; value: unknown | { auto: true } }>;
  where?: WhereCond[];
}

/**
 * 智能分号分割(引号/注释感知)
 *  - 单引号字符串内的分号不分割
 *  - -- 行注释 与 /* 块注释 *​/ 内不分割
 *  - 空语句(纯空白/纯注释)丢弃
 */
export function splitSqlStatements(text: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inStr = false;
  let inLineComment = false;
  let inBlockComment = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      else {
        i++;
        continue;
      }
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (inStr) {
      current += ch;
      if (ch === "'") {
        // '' 转义
        if (next === "'") {
          current += next;
          i += 2;
          continue;
        }
        inStr = false;
      }
      i++;
      continue;
    }

    // 不在字符串中
    if (ch === "'") {
      inStr = true;
      current += ch;
      i++;
      continue;
    }
    if (ch === '-' && next === '-') {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (ch === ';') {
      const trimmed = current.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  // 末尾残留(无分号结尾)
  const trimmed = current.trim();
  if (trimmed.length > 0) statements.push(trimmed);

  return statements;
}

// ───────────────────────────────────────────────────────────
//  词法/语法解析
// ───────────────────────────────────────────────────────────

/** 去除注释(保留字符串字面量)后的纯 SQL */
function stripComments(sql: string): string {
  let out = '';
  let inStr = false;
  let inLineComment = false;
  let inBlockComment = false;
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        out += ' ';
      }
      i++;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (inStr) {
      out += ch;
      if (ch === "'" && next === "'") {
        out += next;
        i += 2;
        continue;
      }
      if (ch === "'") inStr = false;
      i++;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      out += ch;
      i++;
      continue;
    }
    if (ch === '-' && next === '-') {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }

  return out;
}

/** 提取括号内顶层内容(忽略嵌套) */
function extractParens(input: string, startIndex: number): { content: string; endIndex: number } {
  let depth = 0;
  let inStr = false;
  for (let i = startIndex; i < input.length; i++) {
    const ch = input[i];
    if (inStr) {
      if (ch === "'") {
        if (input[i + 1] === "'") i++;
        else inStr = false;
      }
      continue;
    }
    if (ch === "'") {
      inStr = true;
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        return { content: input.slice(startIndex + 1, i), endIndex: i };
      }
    }
  }
  return { content: '', endIndex: -1 };
}

/** 顶层逗号/关键字分割(忽略括号内与字符串内) */
function splitTopLevel(input: string, sep = ','): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inStr = false;
  let current = '';
  const sepLen = sep.length;
  let i = 0;
  const n = input.length;

  const matchesSep = (idx: number): boolean => {
    if (sepLen === 0) return false;
    for (let k = 0; k < sepLen; k++) {
      const a = input[idx + k];
      const b = sep[k];
      if (a === undefined) return false;
      // 大小写不敏感比较(ASCII)
      if (a.toLowerCase() !== b.toLowerCase()) return false;
    }
    return true;
  };

  while (i < n) {
    const ch = input[i];
    if (inStr) {
      current += ch;
      if (ch === "'") {
        if (input[i + 1] === "'") {
          current += input[i + 1];
          i += 2;
          continue;
        }
        inStr = false;
      }
      i++;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      current += ch;
      i++;
      continue;
    }
    if (ch === '(') {
      depth++;
      current += ch;
      i++;
      continue;
    }
    if (ch === ')') {
      depth--;
      current += ch;
      i++;
      continue;
    }
    if (depth === 0 && matchesSep(i)) {
      parts.push(current.trim());
      current = '';
      i += sepLen;
      continue;
    }
    current += ch;
    i++;
  }
  if (current.trim().length > 0) parts.push(current.trim());
  return parts;
}

/** 解析字面量值:字符串/数字/NULL/?/子查询(MAX+1) */
function parseLiteral(raw: string): unknown | { auto: true } {
  const v = raw.trim();
  if (v === '') return { auto: true };
  if (v === 'NULL' || v === 'null' || v === 'Null') return null;

  // ? 占位符 → 自动分配(row_id)
  if (v === '?') return { auto: true };

  // 子查询:(SELECT COALESCE(MAX(col), 0) + N FROM table)
  // 或 (SELECT MAX(col) FROM table) / (SELECT COALESCE(MAX(col),0) FROM table)
  const subquery = v.match(
    /^\(\s*SELECT\s+COALESCE\s*\(\s*MAX\s*\(\s*([A-Za-z0-9_]+)\s*\)\s*,\s*0\s*\)\s*(?:\+\s*(\d+))?\s*FROM\s+([A-Za-z0-9_]+)\s*\)$/i,
  );
  if (subquery) {
    return { auto: true };
  }
  const subquerySimple = v.match(
    /^\(\s*SELECT\s+MAX\s*\(\s*([A-Za-z0-9_]+)\s*\)\s*FROM\s+([A-Za-z0-9_]+)\s*\)$/i,
  );
  if (subquerySimple) {
    return { auto: true };
  }

  // 单引号字符串(支持 '' 转义为 ')
  if (v.startsWith("'")) {
    const endQuote = v.lastIndexOf("'");
    if (endQuote > 0) {
      return v.slice(1, endQuote).replace(/''/g, "'");
    }
    return v.slice(1).replace(/''/g, "'");
  }

  // 数字
  if (/^-?\d+(\.\d+)?$/.test(v)) {
    return Number(v);
  }

  // 未知 → 按字符串处理(保留原样)
  return v;
}

/** 解析 WHERE 子句(支持 eq/ne/is null/is not null/in + AND 连接) */
function parseWhere(raw: string | undefined): WhereCond[] | undefined {
  if (!raw) return undefined;
  const condParts = splitTopLevel(raw, 'AND');
  const conditions: WhereCond[] = [];
  for (let part of condParts) {
    part = part.trim();
    if (part.length === 0) continue;

    const inMatch = part.match(/^([A-Za-z0-9_\u4e00-\u9fff]+)\s+IN\s*\((.*)\)$/is);
    if (inMatch) {
      const values = splitTopLevel(inMatch[2]).map((v) => parseLiteral(v));
      conditions.push({ col: inMatch[1], op: 'in', values });
      continue;
    }

    const isNullMatch = part.match(/^([A-Za-z0-9_\u4e00-\u9fff]+)\s+IS\s+NOT\s+NULL$/i);
    if (isNullMatch) {
      conditions.push({ col: isNullMatch[1], op: 'is-not-null' });
      continue;
    }

    const isNullMatch2 = part.match(/^([A-Za-z0-9_\u4e00-\u9fff]+)\s+IS\s+NULL$/i);
    if (isNullMatch2) {
      conditions.push({ col: isNullMatch2[1], op: 'is-null' });
      continue;
    }

    const neMatch = part.match(/^([A-Za-z0-9_\u4e00-\u9fff]+)\s*(?:<>|!=)\s*(.+)$/is);
    if (neMatch) {
      conditions.push({ col: neMatch[1], op: 'ne', value: parseLiteral(neMatch[2]) });
      continue;
    }

    const eqMatch = part.match(/^([A-Za-z0-9_\u4e00-\u9fff]+)\s*=\s*(.+)$/is);
    if (eqMatch) {
      conditions.push({ col: eqMatch[1], op: 'eq', value: parseLiteral(eqMatch[2]) });
      continue;
    }

    // 无法识别的条件 → 忽略(宽松)
  }
  return conditions.length > 0 ? conditions : undefined;
}

/** 解析单条 SQL 语句 */
export function parseSqlStatement(sql: string): ParsedSql {
  const clean = stripComments(sql).trim();
  if (clean.length === 0) return { type: 'UNKNOWN' };

  const upper = clean.toUpperCase();

  // DDL:CREATE/DROP/ALTER → IGNORED(模板已建表)
  if (/^(CREATE|DROP|ALTER|PRAGMA|VACUUM)\b/.test(upper)) {
    return { type: 'IGNORED' };
  }

  // INSERT INTO table (cols) VALUES (...)
  const insertMatch = clean.match(/^INSERT\s+INTO\s+([A-Za-z0-9_]+)\s*\(([\s\S]*?)\)\s*VALUES\s*\((.*)\)\s*$/is);
  if (insertMatch) {
    const columns = splitTopLevel(insertMatch[2]).map((c) => c.trim());
    const valueParts = splitTopLevel(insertMatch[3]);
    const values = valueParts.map((v) => parseLiteral(v));
    // 列数与值数不一致时,按值顺序猜测列名(列数>值数时剩余 auto)
    while (columns.length > values.length) {
      values.push({ auto: true });
    }
    return {
      type: 'INSERT',
      table: insertMatch[1],
      columns,
      values: values.slice(0, columns.length),
    };
  }

  // UPDATE table SET col = val, ... [WHERE ...]
  const updateMatch = clean.match(
    /^UPDATE\s+([A-Za-z0-9_]+)\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/is,
  );
  if (updateMatch) {
    const setParts = splitTopLevel(updateMatch[2]);
    const sets: Array<{ col: string; value: unknown | { auto: true } }> = [];
    for (const sp of setParts) {
      const eqIdx = findTopLevelEq(sp);
      if (eqIdx < 0) continue;
      const col = sp.slice(0, eqIdx).trim();
      const rawVal = sp.slice(eqIdx + 1).trim();
      sets.push({ col, value: parseLiteral(rawVal) });
    }
    return {
      type: 'UPDATE',
      table: updateMatch[1],
      sets,
      where: parseWhere(updateMatch[3]),
    };
  }

  // DELETE FROM table [WHERE ...]
  const deleteMatch = clean.match(
    /^DELETE\s+FROM\s+([A-Za-z0-9_]+)(?:\s+WHERE\s+([\s\S]+))?$/is,
  );
  if (deleteMatch) {
    return {
      type: 'DELETE',
      table: deleteMatch[1],
      where: parseWhere(deleteMatch[2]),
    };
  }

  return { type: 'UNKNOWN' };
}

/** 找到顶层(括号外/字符串外)的等号位置 */
function findTopLevelEq(input: string): number {
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inStr) {
      if (ch === "'") {
        if (input[i + 1] === "'") i++;
        else inStr = false;
      }
      continue;
    }
    if (ch === "'") {
      inStr = true;
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === '=' && depth === 0) return i;
  }
  return -1;
}

// ───────────────────────────────────────────────────────────
//  执行
// ───────────────────────────────────────────────────────────

/** 判断行是否满足 WHERE 条件 */
function rowMatches(
  row: Pick<idb.ChatSheetRow, 'row_id' | 'data'>,
  where: WhereCond[] | undefined,
): boolean {
  if (!where || where.length === 0) return true;
  for (const cond of where) {
    const actual = cond.col === 'row_id' ? row.row_id : row.data?.[cond.col];
    switch (cond.op) {
      case 'eq':
        if (actual === null || actual === undefined) return false;
        if (String(actual) !== String(cond.value)) return false;
        break;
      case 'ne':
        if (actual !== null && actual !== undefined && String(actual) === String(cond.value)) {
          return false;
        }
        break;
      case 'is-null':
        if (actual !== null && actual !== undefined) return false;
        break;
      case 'is-not-null':
        if (actual === null || actual === undefined) return false;
        break;
      case 'in': {
        const vals = (cond.values ?? []).map((v) => String(v));
        if (!vals.includes(String(actual))) return false;
        break;
      }
    }
  }
  return true;
}

/** 计算自动分配值(INSERT 的 row_id):MAX(row_id)+1 */
async function computeAutoRowId(table: string, colName: string, offset = 1): Promise<number> {
  const rows = await idb.sheetList(table);
  let max = 0;
  for (const r of rows) {
    const v = colName === 'row_id' ? r.row_id : r.data?.[colName];
    const num = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(num) && num > max) max = num;
  }
  return max + offset;
}

/**
 * 执行 SQL 语句列表
 *  - 单条失败不阻塞后续(与 Kernel 失败语义一致)
 *  - 返回逐条结果(含错误信息,供 trace 记录)
 */
export async function executeSqlStatements(sqls: string[]): Promise<SqlExecResult[]> {
  const results: SqlExecResult[] = [];

  // 语句可能被 parseAiOutput 按分号朴素分割而截断(字符串内含分号时),
  // 这里重新智能分割,保证字符串字面量完整
  const joined = sqls.join(';');
  const statements = splitSqlStatements(joined);

  for (const rawStmt of statements) {
    const parsed = parseSqlStatement(rawStmt);
    const base: SqlExecResult = {
      statement: rawStmt,
      ok: true,
      type: parsed.type,
      affected: 0,
    };

    try {
      switch (parsed.type) {
        case 'IGNORED':
          results.push(base);
          break;

        case 'UNKNOWN': {
          results.push({
            ...base,
            ok: false,
            error: `无法解析的 SQL(仅支持 INSERT/UPDATE/DELETE): ${rawStmt.slice(0, 80)}`,
          });
          break;
        }

        case 'INSERT': {
          if (!parsed.table || !parsed.columns) {
            results.push({ ...base, ok: false, error: 'INSERT 解析缺少表名/列名' });
            break;
          }
          // 计算各列值(处理 auto 占位)
          const data: Record<string, unknown> = {};
          let rowId: string | number | undefined;
          for (let i = 0; i < parsed.columns.length; i++) {
            const col = parsed.columns[i];
            const v = parsed.values?.[i];
            if (v && typeof v === 'object' && 'auto' in v) {
              if (col === 'row_id') {
                rowId = await computeAutoRowId(parsed.table, col);
              } else {
                continue; // 非主键列无自动分配语义,跳过
              }
            } else {
              data[col] = v;
            }
          }
          // 未显式指定 row_id 且列中没有 → 自动分配
          if (rowId === undefined && !parsed.columns.includes('row_id')) {
            rowId = await computeAutoRowId(parsed.table, 'row_id');
          }
          if (rowId === undefined || rowId === null) {
            rowId = await computeAutoRowId(parsed.table, 'row_id');
          }
          data['row_id'] = rowId;
          await idb.sheetUpsert({ table_name: parsed.table, row_id: rowId, data, updatedAt: Date.now() });
          results.push({ ...base, table: parsed.table, rowId, affected: 1 });
          break;
        }

        case 'UPDATE': {
          if (!parsed.table) {
            results.push({ ...base, ok: false, error: 'UPDATE 解析缺少表名' });
            break;
          }
          const rows = await idb.sheetList(parsed.table);
          let affected = 0;
          const newRows: Array<{ oldRowId: string | number; newRow: idb.ChatSheetRow }> = [];
          for (const row of rows) {
            if (!rowMatches(row, parsed.where)) continue;
            // 应用 SET
            const newData = { ...row.data };
            let newRowId = row.row_id;
            for (const set of parsed.sets ?? []) {
              if (set.value && typeof set.value === 'object' && 'auto' in set.value) continue;
              if (set.col === 'row_id') {
                newRowId = set.value as string | number;
              } else {
                newData[set.col] = set.value;
              }
            }
            newRows.push({
              oldRowId: row.row_id,
              newRow: { table_name: parsed.table, row_id: newRowId, data: newData, updatedAt: Date.now() },
            });
            affected++;
          }
          // 写入:row_id 变化则删旧建新,否则直接 upsert
          for (const { oldRowId, newRow } of newRows) {
            if (String(oldRowId) !== String(newRow.row_id)) {
              await idb.sheetDelete(parsed.table, oldRowId);
            }
            await idb.sheetUpsert(newRow);
          }
          results.push({ ...base, table: parsed.table, affected });
          break;
        }

        case 'DELETE': {
          if (!parsed.table) {
            results.push({ ...base, ok: false, error: 'DELETE 解析缺少表名' });
            break;
          }
          const rows = await idb.sheetList(parsed.table);
          let affected = 0;
          for (const row of rows) {
            if (!rowMatches(row, parsed.where)) continue;
            await idb.sheetDelete(parsed.table, row.row_id);
            affected++;
          }
          results.push({ ...base, table: parsed.table, affected });
          break;
        }
      }
    } catch (e) {
      results.push({
        ...base,
        ok: false,
        error: `SQL 执行失败: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  return results;
}

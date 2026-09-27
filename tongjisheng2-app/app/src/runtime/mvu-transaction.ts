/**
 * MVU 事务(步骤4)
 *
 * 职责:
 *  - 解析变量 AI 输出:提取 <UpdateVariable>/<Analysis>/<JSONPatch>/<UpdateTable> 块
 *  - 规范化 JSONPatch op:
 *      delta → replace(用当前值 + delta 计算)
 *      insert → add
 *      move → 拒绝(本应用暂不支持)
 *      path /主角/魅力 → 主角.魅力(给 MvuRuntime 用)
 *  - 用 SchemaRegistry 校验每个 op(路径存在 + 值类型/范围/枚举)
 *  - 应用通过校验的 op 到 MvuRuntime
 *  - 整体 safeParse 收尾(确保最终 stat_data 仍符合 schema)
 *
 * 不做:
 *  - SQL 执行(UpdateTable 块仅提取,由步骤6 的 SP 数据库层处理)
 *  - LCG 骰子判定(由步骤5 Turn Kernel 处理)
 *  - 隐藏/触发器重置(脚本字段 AI 禁写,由 Kernel 维护)
 */

import { MvuRuntime, type PatchOp } from './mvu-runtime';
import { schemaRegistry, type FieldInfo } from './schema-loader';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

/** AI 输出的原始 op(RFC 6902 + 本卡扩展 delta/insert) */
export interface RawOp {
  op: 'replace' | 'add' | 'remove' | 'delta' | 'insert' | 'move' | string;
  path: string;
  value?: unknown;
  from?: string;
}

/** 规范化后的 op(只保留 add/replace/remove) */
export interface NormalizedOp {
  /** 规范化后的 op(只 add/replace/remove) */
  op: 'add' | 'replace' | 'remove';
  /** 点路径,如 '主角.魅力'(已去掉前导 / 和 stat_data 前缀) */
  path: string;
  /** 规范化后的值(经 schema transform 后) */
  value?: unknown;
  /** 原始 op(用于 trace) */
  rawOp: string;
  /** 原始路径(用于 trace) */
  rawPath: string;
  /** 是否是新字段(schema 中不存在) */
  isNewField: boolean;
}

/** 解析 AI 输出的结果 */
export interface ParsedAiOutput {
  /** 是否找到 <UpdateVariable> 块 */
  hasUpdateVariable: boolean;
  /** Analysis 文本 */
  analysis: string;
  /** 是否找到 <JSONPatch> 块 */
  hasJsonPatch: boolean;
  /** 原始 JSONPatch 文本 */
  jsonPatchRaw: string;
  /** 解析+规范化后的 ops */
  ops: NormalizedOp[];
  /** 是否找到 <UpdateTable> 块 */
  hasUpdateTable: boolean;
  /** SQL 语句列表 */
  sqlStatements: string[];
  /** 解析过程中的错误(不阻塞应用,但记 trace) */
  parseErrors: string[];
}

/** 单个 op 的校验结果 */
export interface OpValidation {
  op: NormalizedOp;
  ok: boolean;
  error?: string;
  fieldInfo?: FieldInfo;
}

/** 事务应用结果 */
export interface TransactionResult {
  /** 是否整体成功(所有 op 都通过校验并应用) */
  ok: boolean;
  /** 通过校验的 op 数 */
  appliedCount: number;
  /** 被拒绝的 op 数 */
  rejectedCount: number;
  /** 每个op的校验详情 */
  validations: OpValidation[];
  /** 应用前的 stat_data 快照 */
  before: Record<string, unknown>;
  /** 应用后的 stat_data 快照(若整体 safeParse 通过) */
  after: Record<string, unknown>;
  /** 整体 safeParse 错误(若有) */
  fullParseErrors: string[];
  /** Analysis 文本(便于 UI 展示) */
  analysis: string;
  /** SQL 语句(传递给 SP 数据库层) */
  sqlStatements: string[];
}

// ───────────────────────────────────────────────────────────
//  解析 AI 输出
// ───────────────────────────────────────────────────────────

/**
 * 从 AI 回复中提取 <UpdateVariable>/<Analysis>/<JSONPatch>/<UpdateTable> 块
 *
 * 容错策略:
 *  - 标签大小写不敏感
 *  - 允许标签前后有空白
 *  - JSONPatch 块内允许多行 JSON
 *  - UpdateTable 块内允许多行 SQL(分号分隔)
 */
export function parseAiOutput(text: string): ParsedAiOutput {
  const result: ParsedAiOutput = {
    hasUpdateVariable: false,
    analysis: '',
    hasJsonPatch: false,
    jsonPatchRaw: '',
    ops: [],
    hasUpdateTable: false,
    sqlStatements: [],
    parseErrors: [],
  };

  if (!text || typeof text !== 'string') {
    return result;
  }

  // 1. 提取 <UpdateVariable>...</UpdateVariable>
  const uvMatch = text.match(/<UpdateVariable>\s*([\s\S]*?)\s*<\/UpdateVariable>/i);
  if (uvMatch) {
    result.hasUpdateVariable = true;
    const uvContent = uvMatch[1];

    // 1a. 提取 <Analysis>...</Analysis>
    const analysisMatch = uvContent.match(/<Analysis>\s*([\s\S]*?)\s*<\/Analysis>/i);
    if (analysisMatch) {
      result.analysis = analysisMatch[1].trim();
    }

    // 1b. 提取 <JSONPatch>...</JSONPatch>
    const jpMatch = uvContent.match(/<JSONPatch>\s*([\s\S]*?)\s*<\/JSONPatch>/i);
    if (jpMatch) {
      result.hasJsonPatch = true;
      result.jsonPatchRaw = jpMatch[1].trim();
      // 解析 JSON
      try {
        const rawOps = JSON.parse(result.jsonPatchRaw) as RawOp[];
        if (!Array.isArray(rawOps)) {
          result.parseErrors.push('JSONPatch 内容不是数组');
        } else {
          // 规范化每个 op(不在此处校验,只规范化)
          // delta 需要 currentSnapshot,延迟到 apply 阶段处理
          for (const raw of rawOps) {
            const normalized = normalizeOpShape(raw);
            if (normalized) {
              result.ops.push(normalized);
            } else {
              result.parseErrors.push(`无法规范化的 op: ${JSON.stringify(raw).slice(0, 200)}`);
            }
          }
        }
      } catch (e) {
        result.parseErrors.push(
          `JSONPatch 解析失败: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  // 2. 提取 <UpdateTable>...</UpdateTable>
  const utMatch = text.match(/<UpdateTable>\s*([\s\S]*?)\s*<\/UpdateTable>/i);
  if (utMatch) {
    result.hasUpdateTable = true;
    const utContent = utMatch[1].trim();
    // 按分号分割 SQL 语句(简单分割,不解析 SQL 语法)
    result.sqlStatements = utContent
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  return result;
}

/**
 * 规范化 op 的形状(不校验值,只转换 op 类型)
 *  - delta/insert/move 需要额外处理,这里只做 shape 检查
 *  - path 规范化:去掉前导 /,把 / 分隔符转为 . 分隔
 *
 * 注意:delta op 的值转换(需要当前值)延迟到 apply 阶段
 */
function normalizeOpShape(raw: RawOp): NormalizedOp | null {
  if (!raw || typeof raw !== 'object') return null;
  const { op, path, value, from } = raw;
  if (!op || !path || typeof path !== 'string') return null;

  // 路径规范化:/主角/魅力 → 主角.魅力
  // 也支持 stat_data/主角/魅力 → 主角.魅力(去掉 stat_data 前缀)
  let normalizedPath = path;
  if (normalizedPath.startsWith('/')) normalizedPath = normalizedPath.slice(1);
  if (normalizedPath.startsWith('stat_data/')) {
    normalizedPath = normalizedPath.slice('stat_data/'.length);
  }
  // 把 / 转为 .
  normalizedPath = normalizedPath.replace(/\//g, '.');
  // 处理数组索引(如 剧情已触发事件/- → 剧情已触发事件.-)
  // 保留原样,由 MvuRuntime 处理

  const isNewField = !schemaRegistry.hasPath(normalizedPath);

  // op 规范化:
  //  - replace/add/remove 直接保留
  //  - delta 延迟到 apply 阶段(需要当前值)
  //  - insert → add
  //  - move → 拒绝(返回 null)
  let normalizedOp: 'add' | 'replace' | 'remove' | 'delta';
  if (op === 'replace' || op === 'add' || op === 'remove') {
    normalizedOp = op;
  } else if (op === 'delta') {
    normalizedOp = 'delta';
  } else if (op === 'insert') {
    normalizedOp = 'add';
  } else if (op === 'move') {
    return null; // 不支持
  } else {
    return null;
  }

  return {
    op: normalizedOp as 'add' | 'replace' | 'remove',
    path: normalizedPath,
    value,
    rawOp: op,
    rawPath: path,
    isNewField,
  };
}

// ───────────────────────────────────────────────────────────
//  事务应用
// ───────────────────────────────────────────────────────────

/**
 * MVU 事务应用器
 *
 * 用法:
 *   const tx = new MvuTransaction(mvuRuntime);
 *   const parsed = MvuTransaction.parseAiOutput(aiText);
 *   const result = tx.apply(parsed);
 *   if (result.ok) { console.log('应用成功', result.after); }
 */
export class MvuTransaction {
  constructor(private mvu: MvuRuntime) {}

  /**
   * 应用解析后的 AI 输出到 MVU 运行时
   *
   * 步骤:
   *  1. 快照 before
   *  2. 逐 op:
   *     a. 若是 delta,用当前值 + delta 计算新值,转为 replace
   *     b. 用 SchemaRegistry.validateOp 校验路径 + 值
   *     c. 通过则收集,失败则记 rejectedCount
   *  3. 把通过的 op 批量 applyPatch 到 MvuRuntime
   *  4. 整体 safeParse 校验
   *  5. 若 safeParse 失败,回滚到 before 并返回错误
   *  6. 返回 TransactionResult
   */
  apply(parsed: ParsedAiOutput): TransactionResult {
    const before = this.mvu.snapshot();
    const validations: OpValidation[] = [];
    const validOps: PatchOp[] = [];
    let appliedCount = 0;
    let rejectedCount = 0;

    for (const op of parsed.ops) {
      // 处理 delta:用当前值 + delta 计算新值
      let opToValidate: NormalizedOp = op;
      if (op.rawOp === 'delta') {
        const currentValue = this.mvu.getvar(op.path);
        if (typeof currentValue !== 'number' || typeof op.value !== 'number') {
          validations.push({
            op,
            ok: false,
            error: `delta 需要当前值和 delta 值都是数字(path=${op.path}, current=${typeof currentValue}, delta=${typeof op.value})`,
          });
          rejectedCount++;
          continue;
        }
        const newValue = currentValue + op.value;
        opToValidate = { ...op, op: 'replace', value: newValue };
      }

      // 校验
      const fieldInfo = schemaRegistry.getField(opToValidate.path);
      const v = schemaRegistry.validateOp({
        op: opToValidate.op,
        path: opToValidate.path,
        value: opToValidate.value,
      });

      if (!v.ok) {
        validations.push({
          op: opToValidate,
          ok: false,
          error: v.error,
          fieldInfo,
        });
        rejectedCount++;
        continue;
      }

      // 通过校验,收集
      const patchOp: PatchOp =
        opToValidate.op === 'remove'
          ? { op: 'remove', path: opToValidate.path }
          : { op: opToValidate.op, path: opToValidate.path, value: v.normalizedValue };
      validOps.push(patchOp);
      validations.push({
        op: opToValidate,
        ok: true,
        fieldInfo,
      });
      appliedCount++;
    }

    // 批量应用
    if (validOps.length > 0) {
      const r = this.mvu.applyPatch(validOps);
      if (!r.ok) {
        // applyPatch 内部失败(应该不会发生,因为已逐 op 校验)
        return {
          ok: false,
          appliedCount: 0,
          rejectedCount,
          validations,
          before,
          after: before,
          fullParseErrors: r.errors,
          analysis: parsed.analysis,
          sqlStatements: parsed.sqlStatements,
        };
      }
    }

    const after = this.mvu.snapshot();

    // 整体 safeParse
    const full = schemaRegistry.safeParseFull(after);
    if (!full.ok) {
      // 回滚
      this.mvu.replace(before);
      return {
        ok: false,
        appliedCount: 0,
        rejectedCount,
        validations,
        before,
        after: before,
        fullParseErrors: full.errors ?? [],
        analysis: parsed.analysis,
        sqlStatements: parsed.sqlStatements,
      };
    }

    // safeParse 通过,用 transform 后的数据替换
    this.mvu.replace(full.data as Record<string, unknown>);

    return {
      ok: true,
      appliedCount,
      rejectedCount,
      validations,
      before,
      after: this.mvu.snapshot(),
      fullParseErrors: [],
      analysis: parsed.analysis,
      sqlStatements: parsed.sqlStatements,
    };
  }

  /** 静态方法:解析 + 应用一站式 */
  static parseAndApply(mvu: MvuRuntime, aiText: string): TransactionResult {
    const parsed = parseAiOutput(aiText);
    return new MvuTransaction(mvu).apply(parsed);
  }
}

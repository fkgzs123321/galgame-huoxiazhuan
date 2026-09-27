/**
 * Schema 加载器(步骤4)
 *
 * 职责:
 *  - 把 schema.ts(原卡 tavern-cards 约定:z/_ 全局,无 import)编译为运行时 Zod schema
 *  - 提供 .prefault() 兼容(tavern-cards 约定 = .default().catch() 组合)
 *  - 提供 _ 工具(clamp/cloneDeep/toNumber/uniq,与 mvu-runtime 对齐)
 *  - 暴露 SchemaRegistry:路径查询 + 单字段校验 + 单 op 校验 + 整体 safeParse
 *
 * 设计:
 *  - 通过 Vite ?raw 把 schema.ts 当文本读入
 *  - 去掉 `export`/`export type` 行,剩余是合法 JS 表达式
 *  - 用 new Function('z','_', src + ';return Schema;') 在受控作用域内求值
 *  - 求值结果是一个 ZodObject,直接用其 safeParse 做整对象校验
 *  - 同时递归遍历 schema 内部 shape,建立 path→ZodType 映射,用于按路径单字段校验
 */

import { z } from 'zod';
// Vite ?raw 把文件当字符串读入(不做 TS 转译)
import schemaSource from '../content/mvu/schema.ts?raw';

// ───────────────────────────────────────────────────────────
//  .prefault() 兼容(tavern-cards 约定)
// ───────────────────────────────────────────────────────────
// Zod 4 原生 .prefault() 行为:输入 undefined 或解析失败时返回 prefault 值
// 若该版本 Zod 未提供,补丁 ZodType.prototype.prefault = .default(v).catch(v)
(function patchPrefault() {
  const ZodTypeCtor = (z as unknown as { ZodType?: new () => unknown }).ZodType;
  if (!ZodTypeCtor) return;
  const proto = ZodTypeCtor.prototype as Record<string, unknown>;
  if (typeof proto.prefault === 'function') return;
  proto.prefault = function prefault(this: unknown, val: unknown) {
    const self = this as { default?: (v: unknown) => unknown; catch?: (v: unknown) => unknown };
    const withDefault = typeof self.default === 'function' ? self.default(val) : self;
    const withCatch =
      typeof (withDefault as { catch?: (v: unknown) => unknown }).catch === 'function'
        ? (withDefault as { catch: (v: unknown) => unknown }).catch(val)
        : withDefault;
    return withCatch;
  };
})();

// ───────────────────────────────────────────────────────────
//  _ 工具(与 mvu-runtime 对齐,不导出避免与 mvu-runtime._ 冲突)
// ───────────────────────────────────────────────────────────
const _ = {
  clamp(v: number, min: number, max: number): number {
    if (Number.isNaN(v)) return min;
    return Math.min(Math.max(v, min), max);
  },
  cloneDeep<T>(v: T): T {
    if (v === null || v === undefined) return v;
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(v);
      } catch {
        /* 降级 */
      }
    }
    return JSON.parse(JSON.stringify(v)) as T;
  },
  toNumber(v: unknown): number {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  },
  uniq<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
  },
};

// ───────────────────────────────────────────────────────────
//  求值 schema.ts → Zod schema 实例
// ───────────────────────────────────────────────────────────

function evaluateSchema(): z.ZodType {
  // 1. 去掉 `export const Schema = ` → `const Schema =`
  // 2. 去掉 `export type Schema = ...` 整行
  const cleaned = schemaSource
    .replace(/^[ \t]*export\s+const\s+Schema\s*=/m, 'const Schema =')
    .replace(/^[ \t]*export\s+type\s+Schema.*$/gm, '');

  // 用 Function 构造器在受控作用域求值(只暴露 z 和 _)
  // 类型用 any 避免参数名 z 与 import z 的循环引用
  // eslint-disable-next-line no-new-func, @typescript-eslint/no-explicit-any
  const factory = new Function('z', '_', `${cleaned}\nreturn Schema;`) as (
    zArg: unknown,
    _Arg: unknown,
  ) => unknown;

  try {
    const result = factory(z, _);
    return result as z.ZodType;
  } catch (e) {
    console.error('[schema-loader] 求值 schema.ts 失败:', e);
    throw new Error(
      `schema-loader: 无法编译 schema.ts — ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

export const schema: z.ZodType = evaluateSchema();

// ───────────────────────────────────────────────────────────
//  类型(用于 inspect 方法,避免 inline 复杂泛型)
// ───────────────────────────────────────────────────────────

/** Zod 内部 def 的兼容视图(Zod 3 用 _def.typeName,Zod 4 用 _zodDef.type) */
interface ZodDefView {
  type?: string;
  typeName?: string;
  innerType?: z.ZodType;
  defaultValue?: unknown;
  checks?: Array<{
    type?: string;
    kind?: string;
    values?: string[];
    minimum?: number;
    maximum?: number;
  }>;
  shape?: Record<string, z.ZodType>;
  valueType?: z.ZodType;
  values?: string[];
}

/** 从 ZodType 上取 def(Zod 3/4 兼容) */
function getZodDef(t: z.ZodType): ZodDefView | undefined {
  const anyT = t as unknown as { _zodDef?: ZodDefView; _def?: ZodDefView };
  return anyT._zodDef ?? anyT._def;
}

// ───────────────────────────────────────────────────────────
//  SchemaRegistry:路径查询 + 单字段校验 + 单 op 校验
// ───────────────────────────────────────────────────────────

export type FieldType = 'number' | 'string' | 'enum' | 'boolean' | 'object' | 'record' | 'unknown';

export interface FieldInfo {
  /** 点路径,如 '主角.魅力' */
  path: string;
  /** 字段类型 */
  type: FieldType;
  /** enum 取值(仅 type='enum' 时) */
  enumValues?: string[];
  /** 数值范围(仅 type='number' 时) */
  min?: number;
  max?: number;
  /** 是否四舍五入(仅 type='number' 时) */
  round?: boolean;
  /** prefault 默认值 */
  prefault?: unknown;
  /** 是否是 AI 可写字段(true=可写,false=只读/脚本维护) */
  writable?: boolean;
}

/**
 * 路径 → ZodType 映射,递归遍历 schema.shape 构建
 *
 * 注:ZodEffects(transform) 会包裹底层 ZodType,需要 unwrap
 */
export class SchemaRegistry {
  /** 路径 → FieldInfo */
  private fields = new Map<string, FieldInfo>();
  /** 路径 → ZodType(用于单字段 safeParse) */
  private types = new Map<string, z.ZodType>();
  /** 顶层 ZodType */
  readonly root: z.ZodType;

  constructor(root: z.ZodType) {
    this.root = root;
    this.buildIndex('', root);
  }

  /** 是否存在该路径 */
  hasPath(path: string): boolean {
    return this.fields.has(path);
  }

  /** 取字段信息 */
  getField(path: string): FieldInfo | undefined {
    return this.fields.get(path);
  }

  /** 取所有已索引字段(用于 UI 展示) */
  allFields(): FieldInfo[] {
    return Array.from(this.fields.values());
  }

  /** 取顶层命名空间键(不含 '.',步骤8 一致性校验用) */
  getTopLevelKeys(): string[] {
    const keys: string[] = [];
    for (const path of this.fields.keys()) {
      if (!path.includes('.')) keys.push(path);
    }
    return keys;
  }

  /**
   * 单字段校验:用 schema 的 ZodType.safeParse 校验值
   * 返回 {ok, value, error}
   *  - ok=true 时 value 是经过 transform(如 clamp/round)后的值
   *  - ok=false 时 error 是 Zod 错误信息
   */
  validateValue(path: string, value: unknown): { ok: boolean; value?: unknown; error?: string } {
    const t = this.types.get(path);
    if (!t) {
      return { ok: false, error: `路径未在 schema 中定义: ${path}` };
    }
    const r = t.safeParse(value);
    if (r.success) {
      return { ok: true, value: r.data };
    }
    return {
      ok: false,
      error: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  }

  /**
   * 校验单个 JSONPatch op(路径 + 值)
   *  - remove: 路径存在即可
   *  - add/replace: 路径 + 值校验
   */
  validateOp(op: {
    op: string;
    path: string;
    value?: unknown;
  }): { ok: boolean; error?: string; normalizedValue?: unknown } {
    if (!op || typeof op !== 'object') {
      return { ok: false, error: 'op 不是对象' };
    }
    if (!op.op || !op.path) {
      return { ok: false, error: 'op/path 缺失' };
    }
    if (op.op === 'remove') {
      if (!this.hasPath(op.path)) {
        return { ok: false, error: `remove 路径不存在: ${op.path}` };
      }
      return { ok: true };
    }
    if (op.op === 'add' || op.op === 'replace') {
      // 路径不存在时,可能是 add 新字段(允许,但不做值校验)
      if (!this.hasPath(op.path)) {
        // 检查是否是 record 子路径(如 女角.鸣泽唯.好感度)
        const parentPath = op.path.split('.').slice(0, -1).join('.');
        const parent = this.fields.get(parentPath);
        if (parent && parent.type === 'record') {
          // record 子路径,允许 add,不校验值(record 内部字段动态)
          return { ok: true, normalizedValue: op.value };
        }
        // 完全新字段,允许但记 trace(不报错,让 Kernel 决定是否接受)
        return { ok: true, normalizedValue: op.value };
      }
      // 路径存在,校验值
      const r = this.validateValue(op.path, op.value);
      if (!r.ok) {
        return { ok: false, error: r.error, normalizedValue: op.value };
      }
      return { ok: true, normalizedValue: r.value };
    }
    return { ok: false, error: `不支持的 op: ${op.op}` };
  }

  /**
   * 整体校验:用 root schema.safeParse 校验完整 stat_data
   *  - 成功时返回经过所有 transform 的数据
   *  - 失败时返回错误列表
   */
  safeParseFull(data: unknown): { ok: boolean; data?: unknown; errors?: string[] } {
    const r = this.root.safeParse(data);
    if (r.success) {
      return { ok: true, data: r.data };
    }
    return {
      ok: false,
      errors: r.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    };
  }

  // ───────────────────────────────────────────────────────────
  //  内部:递归构建 path → ZodType 映射
  // ───────────────────────────────────────────────────────────

  private buildIndex(prefix: string, t: z.ZodType): void {
    const info = this.inspect(t);
    if (info.type === 'object' && info.shape) {
      // 记录对象本身
      if (prefix) {
        this.fields.set(prefix, {
          path: prefix,
          type: 'object',
          writable: false,
        });
        this.types.set(prefix, t);
      }
      // 递归子字段
      for (const [key, child] of Object.entries(info.shape)) {
        const childPath = prefix ? `${prefix}.${key}` : key;
        this.buildIndex(childPath, child as z.ZodType);
      }
      return;
    }
    if (info.type === 'record' && info.valueType) {
      // record:索引 record 本身,不递归动态键
      this.fields.set(prefix, {
        path: prefix,
        type: 'record',
        writable: true,
      });
      this.types.set(prefix, t);
      return;
    }
    // 叶子字段
    this.fields.set(prefix, {
      path: prefix,
      type: info.type,
      enumValues: info.enumValues,
      min: info.min,
      max: info.max,
      round: info.round,
      prefault: info.prefault,
      writable: !prefix.startsWith('_'),
    });
    this.types.set(prefix, t);
  }

  /**
   * 探测 ZodType 的元信息
   *  - unwrap ZodDefault/ZodCatch/ZodEffects/ZodOptional/ZodNullable
   *  - 提取 enum/number range/transform hint
   */
  private inspect(t: z.ZodType): {
    type: FieldType;
    enumValues?: string[];
    min?: number;
    max?: number;
    round?: boolean;
    prefault?: unknown;
    shape?: Record<string, z.ZodType>;
    valueType?: z.ZodType;
  } {
    // Unwrap 链:ZodDefault → ZodCatch → ZodEffects → ZodOptional → ZodNullable → 核心
    let cur: z.ZodType = t;
    let prefault: unknown;

    for (let i = 0; i < 8; i++) {
      const def = getZodDef(cur);
      if (!def) break;
      const typeName = def.type ?? def.typeName;
      if (typeName === 'prefault' || typeName === 'ZodPrefault') {
        if (prefault === undefined) prefault = def.defaultValue;
        if (def.innerType) {
          cur = def.innerType;
          continue;
        }
      }
      if (typeName === 'default' || typeName === 'ZodDefault') {
        if (prefault === undefined) prefault = def.defaultValue;
        if (def.innerType) {
          cur = def.innerType;
          continue;
        }
      }
      if (typeName === 'catch' || typeName === 'ZodCatch') {
        if (def.innerType) {
          cur = def.innerType;
          continue;
        }
      }
      if (typeName === 'effects' || typeName === 'ZodEffects') {
        if (def.innerType) {
          cur = def.innerType;
          continue;
        }
      }
      if (
        typeName === 'optional' ||
        typeName === 'ZodOptional' ||
        typeName === 'nullable' ||
        typeName === 'ZodNullable'
      ) {
        if (def.innerType) {
          cur = def.innerType;
          continue;
        }
      }
      break;
    }

    // 识别核心类型
    const def = getZodDef(cur);
    const coreType = def?.type ?? def?.typeName ?? '';

    // ZodObject
    if (coreType === 'object' || coreType === 'ZodObject') {
      return { type: 'object', shape: def?.shape, prefault };
    }
    // ZodRecord
    if (coreType === 'record' || coreType === 'ZodRecord') {
      return { type: 'record', valueType: def?.valueType, prefault };
    }
    // ZodEnum
    if (coreType === 'enum' || coreType === 'ZodEnum') {
      return { type: 'enum', enumValues: def?.values ?? [], prefault };
    }
    // ZodBoolean
    if (coreType === 'boolean' || coreType === 'ZodBoolean') {
      return { type: 'boolean', prefault };
    }
    // ZodNumber
    if (coreType === 'number' || coreType === 'ZodNumber') {
      const checks = def?.checks ?? [];
      let min: number | undefined;
      let max: number | undefined;
      for (const c of checks) {
        const ck = c.type ?? c.kind;
        if (ck === 'min' || ck === 'greater_equal' || ck === 'minimum') {
          min = c.minimum;
        }
        if (ck === 'max' || ck === 'less_equal' || ck === 'maximum') {
          max = c.maximum;
        }
      }
      return { type: 'number', min, max, round: true, prefault };
    }
    // ZodString
    if (coreType === 'string' || coreType === 'ZodString') {
      return { type: 'string', prefault };
    }
    return { type: 'unknown', prefault };
  }
}

// 单例
export const schemaRegistry = new SchemaRegistry(schema);

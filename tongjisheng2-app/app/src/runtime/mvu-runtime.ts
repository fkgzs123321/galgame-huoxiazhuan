/**
 * MVU 变量运行时(Host Foundation 步骤2)
 *
 * 职责:
 *  - 提供 getvar/setvar 给 EJS 模板使用(原卡 MVU API)
 *  - 路径导航:stat_data.主角.魅力 → stat_data.主角.魅力
 *  - JSONPatch RFC 6902 applyPatch(add/replace/remove)
 *  - 不做 Zod 校验(由步骤4的 mvu-transaction 负责)
 *
 * 设计:
 *  - stat_data 是一个普通 JS 对象,在内存中维护
 *  - 每个回合开始时由 Kernel 从 IndexedDB revision 恢复
 *  - getvar/setvar 操作内存副本,不直接写 IndexedDB(由 Kernel 落盘)
 *  - JSONPatch 操作返回新对象(不可变),便于 CAS 哈希
 */

/** getvar/setvar 选项 */
export interface VarOptions {
  /** 作用域(ST 兼容字段,本应用只有 local) */
  scope?: 'local' | 'global';
  /** 默认值(路径不存在时返回) */
  defaults?: unknown;
}

/** JSONPatch 操作符(RFC 6902 子集) */
export type PatchOp =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'remove'; path: string };

/** JSONPatch 应用结果 */
export interface PatchResult<T> {
  /** 应用后的新对象(不可变) */
  result: T;
  /** 是否成功应用所有 op */
  ok: boolean;
  /** 错误列表(若 ok=false) */
  errors: string[];
}

/**
 * 深克隆(跨浏览器兼容)
 * - 优先使用原生 structuredClone(Chrome≥98 / Firefox≥94 / Safari≥15.4)
 * - 旧浏览器降级到 JSON.parse(JSON.stringify())(不支持函数/Date/Map 等,但 stat_data 是纯数据)
 */
export function deepClone<T>(v: T): T {
  if (v === null || v === undefined) return v;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(v);
    } catch {
      /* 降级 */
    }
  }
  return JSON.parse(JSON.stringify(v)) as T;
}

/**
 * MVU 变量运行时
 *  - 每个实例持有一个 stat_data 内存副本
 *  - 提供 EJS 上下文所需的 getvar/setvar 函数
 *  - 提供 JSONPatch 应用工具
 */
export class MvuRuntime {
  /** 当前 stat_data(可变,供 EJS 读写) */
  private statData: Record<string, unknown>;

  constructor(initial?: Record<string, unknown>) {
    this.statData = initial ? deepClone(initial) : {};
  }

  /** 获取当前 stat_data(只读视图,修改不影响内部状态) */
  snapshot(): Record<string, unknown> {
    return deepClone(this.statData);
  }

  /** 直接替换 stat_data(Kernel 落盘后用) */
  replace(next: Record<string, unknown>): void {
    this.statData = deepClone(next);
  }

  /** 直接浅合并(Kernel 用) */
  merge(patch: Record<string, unknown>): void {
    this.statData = { ...this.statData, ...patch };
  }

  // ─────────────────────────────────────────────────────────
  //  getvar/setvar(ST MVU 兼容)
  // ─────────────────────────────────────────────────────────

  /**
   * 读取变量
   *  - path 形如 'stat_data.主角.魅力' 或 '主角.魅力'(自动补 stat_data 前缀)
   *  - 路径不存在时返回 options.defaults
   */
  getvar(path: string, options?: VarOptions): unknown {
    const fullPath = normalizeVarPath(path);
    const value = getByPath(this.statData, fullPath);
    if (value === undefined) {
      return options?.defaults;
    }
    return value;
  }

  /**
   * 写入变量(写内存副本,不落盘)
   *  - path 形如 'stat_data.主角.玩家身份' 或 '主角.玩家身份'
   *  - 自动创建中间对象
   */
  setvar(path: string, value: unknown, _options?: VarOptions): void {
    const fullPath = normalizeVarPath(path);
    setByPath(this.statData, fullPath, value);
  }

  /** 全局变量(本应用暂不支持,返回 defaults) */
  getGlobalVar(_key: string, options?: VarOptions): unknown {
    return options?.defaults;
  }

  /** 全局变量设置(本应用暂不支持,no-op) */
  setGlobalVar(_key: string, _value: unknown): void {
    /* no-op */
  }

  // ─────────────────────────────────────────────────────────
  //  JSONPatch 应用
  // ─────────────────────────────────────────────────────────

  /**
   * 应用 JSONPatch 到当前 stat_data
   *  - 返回新对象(不修改内部状态)
   *  - 任何 op 失败时,该 op 被跳过,errors 记录详情
   *  - 全部 op 处理完后,若 ok=true 才替换内部状态
   */
  applyPatch(ops: PatchOp[]): PatchResult<Record<string, unknown>> {
    const errors: string[] = [];
    let next = deepClone(this.statData);
    let ok = true;
    for (const op of ops) {
      try {
        const fullPath = normalizeVarPath(op.path);
        if (op.op === 'add' || op.op === 'replace') {
          setByPath(next, fullPath, op.value);
        } else if (op.op === 'remove') {
          deleteByPath(next, fullPath);
        }
      } catch (e) {
        ok = false;
        errors.push(
          `${op.op} ${op.path}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    if (ok) {
      this.statData = next;
    }
    return { result: deepClone(next), ok, errors };
  }

  /**
   * 静态版本:对任意对象应用 JSONPatch,不依赖实例
   */
  static applyPatchTo<T extends Record<string, unknown>>(
    target: T,
    ops: PatchOp[],
  ): PatchResult<T> {
    const errors: string[] = [];
    let next = deepClone(target) as T;
    let ok = true;
    for (const op of ops) {
      try {
        const fullPath = normalizeVarPath(op.path);
        if (op.op === 'add' || op.op === 'replace') {
          setByPath(next, fullPath, op.value);
        } else if (op.op === 'remove') {
          deleteByPath(next, fullPath);
        }
      } catch (e) {
        ok = false;
        errors.push(
          `${op.op} ${op.path}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    return { result: next, ok, errors };
  }
}

// ───────────────────────────────────────────────────────────
//  路径辅助
// ───────────────────────────────────────────────────────────

/** 规范化变量路径:补 stat_data 前缀 */
function normalizeVarPath(path: string): string {
  if (!path) return '';
  // 已带 stat_data. 前缀,直接返回
  if (path.startsWith('stat_data.')) return path.slice('stat_data.'.length);
  if (path === 'stat_data') return '';
  // 否则视为相对路径,补前缀(原卡 EJS 同时使用两种风格)
  return path;
}

/** 按点路径读取(getByPath(obj, 'a.b.c')) */
function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cur: unknown = obj;
  for (const seg of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/** 按点路径写入(setByPath(obj, 'a.b.c', v)),自动创建中间对象 */
function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  if (!path) {
    throw new Error('setByPath: 路径为空');
  }
  const segs = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i];
    if (cur[seg] == null || typeof cur[seg] !== 'object') {
      cur[seg] = {};
    }
    cur = cur[seg] as Record<string, unknown>;
  }
  cur[segs[segs.length - 1]] = value;
}

/** 按点路径删除 */
function deleteByPath(obj: Record<string, unknown>, path: string): void {
  if (!path) {
    throw new Error('deleteByPath: 路径为空');
  }
  const segs = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i];
    if (cur[seg] == null || typeof cur[seg] !== 'object') return;
    cur = cur[seg] as Record<string, unknown>;
  }
  delete cur[segs[segs.length - 1]];
}

// ───────────────────────────────────────────────────────────
//  lodash-like 工具(供 EJS 上下文使用)
// ───────────────────────────────────────────────────────────

export const _ = {
  /** 数值钳制 */
  clamp(v: number, min: number, max: number): number {
    if (Number.isNaN(v)) return min;
    return Math.min(Math.max(v, min), max);
  },
  /** 深克隆(跨浏览器兼容) */
  cloneDeep<T>(v: T): T {
    return deepClone(v);
  },
  /** 安全 Number 转换(失败返回 0) */
  toNumber(v: unknown): number {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  },
  /** 字符串数组去重 */
  uniq(arr: unknown[]): unknown[] {
    return Array.from(new Set(arr));
  },
};

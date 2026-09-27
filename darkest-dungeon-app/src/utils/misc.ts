// 通用数据工具：深合并 / 校验 / 迁移辅助

// 深合并（浅层数组直接替换）
export function deepMerge<T>(base: T, patch: Partial<T>): T {
  if (Array.isArray(base) || Array.isArray(patch)) {
    return (patch ?? base) as T;
  }
  if (typeof base === 'object' && base !== null && typeof patch === 'object' && patch !== null) {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
      out[k] = deepMerge(out[k], v as never);
    }
    return out as T;
  }
  return (patch ?? base) as T;
}

// 数值归一：'40%' → 0.4
export function normalizePct(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.endsWith('%')) return parseFloat(s) / 100;
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// 校验对象是否含指定字段（返回缺失字段列表）
export function missingFields(obj: unknown, fields: string[]): string[] {
  if (!obj || typeof obj !== 'object') return fields;
  const o = obj as Record<string, unknown>;
  return fields.filter((f) => o[f] === undefined || o[f] === null);
}

// 安全 JSON 解析
export function safeParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

// 文件名安全化
export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

// 防抖
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// 节流
export function throttle<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let last = 0;
  return (...args: A) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
}

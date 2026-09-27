// Trace 记录：Prompt/Lore/响应追踪（供 LLM 调试台与日志中心使用）

export type TraceKind = 'prompt' | 'lore' | 'response' | 'command' | 'save' | 'error' | 'event';

export interface TraceEntry {
  id: string;
  kind: TraceKind;
  time: number;
  label: string;        // 简短描述
  detail?: string;      // 详细内容（Prompt 文本/响应原文）
  meta?: Record<string, unknown>;
  durationMs?: number;
}

export type TraceListener = (entry: TraceEntry) => void;

class TraceHub {
  private entries: TraceEntry[] = [];
  private listeners: TraceListener[] = [];
  private maxEntries = 500;
  private seq = 0;

  push(kind: TraceKind, label: string, opts?: { detail?: string; meta?: Record<string, unknown>; durationMs?: number }): TraceEntry {
    const entry: TraceEntry = {
      id: `tr_${Date.now().toString(36)}_${(this.seq++).toString(36)}`,
      kind,
      time: Date.now(),
      label,
      detail: opts?.detail,
      meta: opts?.meta,
      durationMs: opts?.durationMs,
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    for (const l of this.listeners) {
      try { l(entry); } catch { /* 忽略监听器错误 */ }
    }
    return entry;
  }

  subscribe(listener: TraceListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  all(): TraceEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }

  // 便捷方法
  prompt(label: string, detail?: string, meta?: Record<string, unknown>, durationMs?: number) {
    return this.push('prompt', label, { detail, meta, durationMs });
  }
  lore(label: string, meta?: Record<string, unknown>) {
    return this.push('lore', label, { meta });
  }
  response(label: string, detail?: string, meta?: Record<string, unknown>, durationMs?: number) {
    return this.push('response', label, { detail, meta, durationMs });
  }
  error(label: string, detail?: string) {
    return this.push('error', label, { detail });
  }
}

export const traceHub = new TraceHub();

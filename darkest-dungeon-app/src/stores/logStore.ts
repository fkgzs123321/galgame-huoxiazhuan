// 日志中心数据层 — 运行时事件日志（IndexedDB 持久化 + 内存缓冲）
import { db } from '@/db';
import { genId } from '@/utils/id';

export type LogLevel = 'info' | 'warn' | 'error' | 'battle' | 'narrative' | 'system';

export interface LogEntry {
  id: string;
  time: number;
  level: LogLevel;
  text: string;
  detail?: string;
  meta?: Record<string, unknown>;
}

const MAX_MEMORY = 300;

class LogHub {
  private memory: LogEntry[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    // 启动时从 IndexedDB 恢复最近日志
    void db.getAll<LogEntry>('logs').then((all) => {
      if (all.length) {
        this.memory = all.slice(-MAX_MEMORY);
        this.notify();
      }
    }).catch(() => { /* 忽略 DB 不可用 */ });
  }

  push(level: LogLevel, text: string, opts?: { detail?: string; meta?: Record<string, unknown> }): LogEntry {
    const entry: LogEntry = {
      id: genId('log'),
      time: Date.now(),
      level,
      text,
      detail: opts?.detail,
      meta: opts?.meta,
    };
    this.memory.push(entry);
    if (this.memory.length > MAX_MEMORY) this.memory.shift();
    this.notify();
    // 异步持久化（不阻塞）
    void db.put('logs', entry).catch(() => {});
    return entry;
  }

  info(text: string, opts?: { detail?: string; meta?: Record<string, unknown> }) { return this.push('info', text, opts); }
  warn(text: string, opts?: { detail?: string; meta?: Record<string, unknown> }) { return this.push('warn', text, opts); }
  error(text: string, opts?: { detail?: string; meta?: Record<string, unknown> }) { return this.push('error', text, opts); }
  battle(text: string, opts?: { detail?: string; meta?: Record<string, unknown> }) { return this.push('battle', text, opts); }
  narrative(text: string, opts?: { detail?: string; meta?: Record<string, unknown> }) { return this.push('narrative', text, opts); }

  entries(): LogEntry[] {
    return [...this.memory];
  }

  subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((f) => f !== fn); };
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }

  async clearPersisted(): Promise<void> {
    this.memory = [];
    this.notify();
    await db.clear('logs').catch(() => {});
  }
}

export const logHub = new LogHub();

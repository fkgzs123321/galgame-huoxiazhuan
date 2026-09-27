/**
 * EJS 引擎封装(Host Foundation 步骤2)
 *
 * 职责:
 *  - 渲染原卡 EJS 模板(支持 <% %> / <%= %> / <%- %> / <%_ %> 四种标准标签)
 *  - 自动剥离 @@generate_before 等装饰器
 *  - 静态 getwi 调用自动展开(源码级内联,共享 var 作用域)
 *  - 动态 getwi 调用(async 模式 + 运行时 getwi 加载)
 *  - 注入运行时上下文:getvar/setvar/getwi/_/PLAYER_IDENTITIES 等
 *  - 错误处理:渲染失败时返回结构化错误,不抛异常中断整轮
 *
 * 依赖:
 *  - npm ejs 包(标准 EJS 实现)
 *  - MvuRuntime(getvar/setvar)
 *  - GetwiLoader(getwi 路径解析与展开)
 */

import ejs from 'ejs';
import { getwiLoader, stripDecorators } from './getwi-loader';
import { MvuRuntime, _ } from './mvu-runtime';

/** 渲染选项 */
export interface RenderOptions {
  /** 文件名(用于错误定位) */
  filename?: string;
  /** 是否启用 getwi 预展开(默认 true) */
  expandGetwi?: boolean;
  /** 额外上下文变量 */
  extra?: Record<string, unknown>;
  /** 是否捕获错误而非抛出(默认 true) */
  catchErrors?: boolean;
}

/** 渲染结果 */
export interface RenderResult {
  /** 渲染输出(成功时) */
  output: string;
  /** 是否成功 */
  ok: boolean;
  /** 错误信息(失败时) */
  error?: string;
  /** 错误堆栈(失败时) */
  stack?: string;
  /** 渲染调用追踪(getwi 展开路径) */
  trace?: string[];
  /** 缺失的 getwi 条目 */
  missing?: string[];
  /** 是否命中缓存(阶段4) */
  cacheHit?: boolean;
}

// ───────────────────────────────────────────────────────────
//  编译缓存(阶段4:EJS 预处理缓存优化)
// ───────────────────────────────────────────────────────────

interface CachedTemplate {
  /** 编译后的渲染函数 */
  fn: (locals: Record<string, unknown>) => Promise<string> | string;
  /** 预处理后的源码(剥离装饰器+展开 getwi 后) */
  processedSource: string;
  /** 编译时间戳 */
  compiledAt: number;
  /** 命中次数 */
  hitCount: number;
}

/** 缓存统计 */
export interface CacheStats {
  /** 缓存条目数 */
  size: number;
  /** 总渲染次数 */
  totalRenders: number;
  /** 缓存命中次数 */
  hits: number;
  /** 缓存未命中次数(新编译) */
  misses: number;
  /** 命中率(0-1) */
  hitRate: number;
  /** 各缓存条目的命中详情 */
  entries: Array<{ key: string; hitCount: number; compiledAt: number }>;
}

/** 全局编译缓存(按源码 hash 索引) */
const compileCache = new Map<string, CachedTemplate>();
let totalRenders = 0;
let cacheHits = 0;
let cacheMisses = 0;

/** 计算源码的简单 hash(用于缓存键) */
function hashSource(source: string): string {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${source.length}`;
}

/** 获取缓存统计 */
export function getCacheStats(): CacheStats {
  return {
    size: compileCache.size,
    totalRenders,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: totalRenders > 0 ? cacheHits / totalRenders : 0,
    entries: Array.from(compileCache.entries()).map(([key, v]) => ({
      key,
      hitCount: v.hitCount,
      compiledAt: v.compiledAt,
    })),
  };
}

/** 清空缓存 */
export function clearCache(): void {
  compileCache.clear();
  totalRenders = 0;
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * EJS 引擎
 *  - 每个 EjsEngine 实例持有一个 MvuRuntime(供 EJS 上下文使用)
 *  - 同一回合内多次 render() 共享同一 stat_data 视图
 */
export class EjsEngine {
  constructor(private mvu: MvuRuntime) {}

  /**
   * 渲染 EJS 模板
   *  - 自动剥离装饰器 + 展开 getwi 调用
   *  - 注入 getvar/setvar/getwi/_ 等运行时上下文
   *  - 阶段4:编译结果缓存(按源码 hash),避免重复编译
   *  - 失败时返回 RenderResult.ok=false(默认不抛)
   */
  async render(source: string, options: RenderOptions = {}): Promise<RenderResult> {
    const {
      filename = '<inline>',
      expandGetwi = true,
      extra = {},
      catchErrors = true,
    } = options;

    const trace: string[] = [];
    const missing = getwiLoader.getMissing();
    totalRenders++;

    try {
      // 阶段4:计算缓存键(原始源码 hash,在预处理前)
      const cacheKey = hashSource(source);
      const cached = compileCache.get(cacheKey);

      let fn: (locals: Record<string, unknown>) => Promise<string> | string;
      let processedSource: string;

      if (cached) {
        // 命中缓存:跳过 strip/expand/compile
        cacheHits++;
        cached.hitCount++;
        fn = cached.fn;
        processedSource = cached.processedSource;
        trace.push(`cache-hit:${filename}`);
      } else {
        // 未命中:执行完整预处理 + 编译
        cacheMisses++;
        let processed = source;

        // 1. 剥离装饰器
        processed = stripDecorators(processed);
        trace.push(`strip-decorators:${filename}`);

        // 2. 展开 getwi 调用(源码级内联)
        if (expandGetwi) {
          processed = getwiLoader.expand(processed);
          trace.push(`expand-getwi:${filename}`);
        }

        // 3. 编译模板(只编译一次,后续直接调用 fn)
        fn = ejs.compile(processed, {
          // 浏览器环境没有 Node path；ejs 只在有 filename 时才调用 path.extname。
          // 错误定位改由外层 trace/__line 提供，这里不传 filename。
          filename: undefined,
          async: true,
          _with: true,
          debug: false,
          compileDebug: false,
          escape: (s: string) => s,
        }) as unknown as (locals: Record<string, unknown>) => Promise<string> | string;
        processedSource = processed;

        // 存入缓存
        compileCache.set(cacheKey, {
          fn,
          processedSource,
          compiledAt: Date.now(),
          hitCount: 0,
        });
        trace.push(`cache-miss-compile:${filename}`);
      }

      // 4. 注入运行时上下文(每次都构建,因 mvu 快照可能变化)
      const context = this.buildContext(extra);
      trace.push(`build-context:${filename}`);

      // 5. 执行渲染
      const output = await fn(context);

      const finalMissing = getwiLoader.getMissing().filter((m) => !missing.includes(m));

      return {
        output,
        ok: true,
        trace,
        missing: finalMissing,
        cacheHit: cached !== undefined,
      };
    } catch (e) {
      if (!catchErrors) throw e;
      const err = e as Error;
      return {
        output: '',
        ok: false,
        error: `${err.name}: ${err.message}`,
        stack: err.stack,
        trace,
        missing: getwiLoader.getMissing().filter((m) => !missing.includes(m)),
        cacheHit: false,
      };
    }
  }

  /**
   * 按 entryKey 加载并渲染(便捷方法)
   *  - 从 contentLoader 取条目
   *  - 调用 render()
   */
  async renderByEntryKey(entryKey: string, options: Omit<RenderOptions, 'filename'> = {}): Promise<RenderResult> {
    const entry = (await import('@content/content-loader')).contentLoader.getByEntryKey(entryKey);
    if (!entry) {
      return {
        output: '',
        ok: false,
        error: `条目未找到: ${entryKey}`,
      };
    }
    return this.render(entry.content, {
      ...options,
      filename: entry.targetPath,
    });
  }

  /**
   * 构建渲染上下文
   *  - 注入 MVU API + lodash-like 工具 + getwi 运行时(占位)
   *  - 注入原卡常用的全局变量占位(PLAYER_IDENTITIES 等,由 EJS 内 var 声明覆盖)
   */
  private buildContext(extra: Record<string, unknown>): Record<string, unknown> {
    const mvu = this.mvu;
    return {
      // MVU 变量 API
      getvar: (path: string, opts?: unknown) => mvu.getvar(path, opts as never),
      setvar: (path: string, value: unknown, opts?: unknown) =>
        mvu.setvar(path, value, opts as never),
      getGlobalVar: (key: string, opts?: unknown) => mvu.getGlobalVar(key, opts as never),
      setGlobalVar: (key: string, value: unknown) => mvu.setGlobalVar(key, value),

      // getwi 运行时(静态调用已预展开;动态路径在此真实加载并继续展开)
      getwi: (path: string) => getwiLoader.runtimeGetwi(path),

      // lodash-like 工具
      _,

      // 常用全局占位(EJS 内 var 声明会覆盖)
      PLAYER_IDENTITIES: undefined,
      DIFFICULTY_MODIFIERS: undefined,
      DIFFICULTY_STRICTNESS: undefined,

      // ST 宏占位(由步骤6 Prompt 组装器替换)
      user: '{{user}}',
      char: '{{char}}',

      // 输出工具
      JSON,
      console: {
        log: (...args: unknown[]) => console.log('[EJS]', ...args),
        warn: (...args: unknown[]) => console.warn('[EJS]', ...args),
        error: (...args: unknown[]) => console.error('[EJS]', ...args),
      },

      // 额外上下文
      ...extra,
    };
  }
}

// ───────────────────────────────────────────────────────────
//  辅助:从源码快速预估 token(用于 Trace)
// ───────────────────────────────────────────────────────────

/** 粗略 token 估算(中日英混合,1 token ≈ 2-3 字符) */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // 中文 1 字 ≈ 1 token,英文 4 字符 ≈ 1 token
  let cjk = 0;
  let other = 0;
  for (const ch of text) {
    if (/[\u4e00-\u9fff\u3040-\u30ff]/.test(ch)) cjk++;
    else other++;
  }
  return cjk + Math.ceil(other / 4);
}

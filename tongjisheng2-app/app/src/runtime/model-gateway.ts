/**
 * Model Gateway(步骤6)
 *
 * 职责:
 *  - OpenAI 兼容协议调用(POST /v1/chat/completions)
 *  - 流式(主聊天AI,SSE 解析)+ 非流式(变量AI)
 *  - 2AI 并行调用(Promise.all + 超时降级)
 *  - 重试(maxRetries 次,指数退避)
 *  - sampler 参数从预设读取
 *  - 调用 trace(每次调用的 endpoint/model/sampler/duration/tokens)
 *
 * 不做:
 *  - Prompt 组装(由 PromptAssembler 负责)
 *  - 输出解析(由 MvuTransaction 负责)
 *  - Key 持久化(由 ConfigPage + IndexedDB 负责)
 *
 * 参考:
 *  - stage-roadmap.md 步骤6 Model Gateway 要求
 *  - OpenAI ChatCompletion API 规格
 */

import type { AiProfile } from '../ai/profiles';
import type { PresetProfile, PresetSampler } from './preset/types';
import type { ChatMessage } from './prompt-assembly';
import { traceBus } from './trace-bus';

// ───────────────────────────────────────────────────────────
//  类型
// ───────────────────────────────────────────────────────────

/** Gateway 调用请求 */
export interface GatewayRequest {
  profile: AiProfile;
  preset: PresetProfile;
  messages: ChatMessage[];
  /** 自定义 sampler 覆盖(优先于预设) */
  samplerOverride?: Partial<PresetSampler>;
  /** 请求 id(用于 trace) */
  requestId?: string;
  /** 当前回合 ID(阶段4:用于 traceBus 关联,可选) */
  turnId?: string;
}

/** Gateway 调用结果 */
export interface GatewayResult {
  ok: boolean;
  /** 完整文本(流式累计 / 非流式完整) */
  text: string;
  /** finish_reason(stop/length/content_filter) */
  finishReason?: string;
  /** usage(token 计数) */
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  /** 调用 trace */
  trace: GatewayTrace[];
  /** 错误(失败时) */
  error?: string;
  /** 耗时(ms) */
  elapsedMs: number;
  /** 重试次数 */
  retryCount: number;
  /** 请求 id */
  requestId: string;
  /** 是否经由本地代理转发(dev 模式 CORS 兜底) */
  proxied?: boolean;
}

export interface GatewayTrace {
  step: string;
  detail: string;
  timestamp: number;
}

/** 流式 chunk 回调 */
export type StreamCallback = (chunk: string, fullText: string) => void;

/** 并行调用性能指标(阶段4:8AI 并行延迟优化) */
export interface ParallelMetrics {
  /** 总请求数 */
  totalRequests: number;
  /** 已完成数(含成功/失败/超时/中止) */
  completed: number;
  /** 成功数 */
  succeeded: number;
  /** 失败数(含解析失败) */
  failed: number;
  /** 预算超时数 */
  timedOut: number;
  /** 早退中止数 */
  aborted: number;
  /** 各请求延迟(ms) */
  latencies: number[];
  /** p50 延迟(ms) */
  p50Ms: number;
  /** p95 延迟(ms) */
  p95Ms: number;
  /** 最大延迟(ms) */
  maxMs: number;
  /** 总耗时(ms) */
  totalElapsedMs: number;
  /** 是否在预算内 */
  withinBudget: boolean;
}

// ───────────────────────────────────────────────────────────
//  ModelGateway 类
// ───────────────────────────────────────────────────────────

export class ModelGateway {
  /** 调用单个 AI(流式或非流式,由 profile.outputProtocol.stream 决定) */
  async invoke(
    req: GatewayRequest,
    onStream?: StreamCallback,
  ): Promise<GatewayResult> {
    const requestId = req.requestId ?? `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const trace: GatewayTrace[] = [];
    const startedAt = Date.now();

    const { profile, preset, messages } = req;
    const endpoint = profile.endpoint;

    // 端点校验
    if (!endpoint.baseURL || !endpoint.apiKey || !endpoint.model) {
      return {
        ok: false,
        text: '',
        trace: [
          {
            step: 'endpoint-missing',
            detail: `端点未配置(profile=${profile.id}): baseURL=${!!endpoint.baseURL} apiKey=${!!endpoint.apiKey} model=${!!endpoint.model}`,
            timestamp: startedAt,
          },
        ],
        error: 'AI 端点未配置(需要 baseURL/apiKey/model)',
        elapsedMs: Date.now() - startedAt,
        retryCount: 0,
        requestId,
      };
    }

    const stream = profile.outputProtocol.stream;
    trace.push({
      step: 'invoke-start',
      detail: `profile=${profile.id} model=${endpoint.model} stream=${stream} messages=${messages.length}`,
      timestamp: startedAt,
    });

    // 合并 sampler(预设 + override)
    const sampler = { ...preset.sampler, ...req.samplerOverride };

    // 重试循环(最后一轮失败时,dev 模式自动降级本地代理绕过 CORS)
    let lastError: string | undefined;
    let retryCount = 0;
    let result: GatewayResult | undefined;
    let proxiedRequest = false;
    for (let attempt = 0; attempt <= profile.maxRetries + 1; attempt++) {
      // 到达最后一轮且可走代理时,切换请求目标为本地代理
      const useProxy = canUseLocalProxy() && attempt === profile.maxRetries + 1;
      if (useProxy && !proxiedRequest) {
        const proxiedReq: GatewayRequest = {
          ...req,
          profile: {
            ...req.profile,
            endpoint: {
              ...req.profile.endpoint,
              baseURL: proxyChatUrl(req.profile.endpoint.baseURL),
            },
          },
        };
        proxiedRequest = true;
        trace.push({
          step: 'proxy-fallback',
          detail: `直连失败,尝试本地代理转发(${req.profile.endpoint.baseURL})`,
          timestamp: Date.now(),
        });
        try {
          result = stream
            ? await this.invokeStream(proxiedReq, sampler, onStream, trace, requestId)
            : await this.invokeNonStream(proxiedReq, sampler, trace, requestId);
          result.elapsedMs = Date.now() - startedAt;
          result.retryCount = retryCount;
          result.proxied = true;
          break;
        } catch (e2) {
          lastError = e2 instanceof Error ? e2.message : String(e2);
          result = {
            ok: false,
            text: '',
            trace,
            error: `直连与本地代理均失败: ${lastError}`,
            elapsedMs: Date.now() - startedAt,
            retryCount,
            requestId,
          };
          break;
        }
      }
      try {
        result = stream
          ? await this.invokeStream(req, sampler, onStream, trace, requestId)
          : await this.invokeNonStream(req, sampler, trace, requestId);
        result.elapsedMs = Date.now() - startedAt;
        result.retryCount = retryCount;
        break;
      } catch (e) {
        retryCount = attempt;
        lastError = e instanceof Error ? e.message : String(e);
        trace.push({
          step: `invoke-error-attempt-${attempt + 1}`,
          detail: ` attempt ${attempt + 1}/${profile.maxRetries + 1} 失败: ${lastError}`,
          timestamp: Date.now(),
        });

        // 最后一次失败(且未尝试代理),返回错误
        if (attempt >= profile.maxRetries && !canUseLocalProxy()) {
          result = {
            ok: false,
            text: '',
            trace,
            error: `重试 ${retryCount + 1} 次后仍失败: ${lastError}`,
            elapsedMs: Date.now() - startedAt,
            retryCount,
            requestId,
          };
          break;
        }

        // 指数退避(1s, 2s, 4s, ...)
        const backoffMs = 1000 * Math.pow(2, attempt);
        await sleep(backoffMs);
      }
    }

    // 阶段4:推送 trace 到 traceBus
    if (result) {
      try {
        if (req.turnId) {
          traceBus.append(
            req.turnId,
            'gatewayLatency',
            `invoke-${profile.id}`,
            `${profile.id} 调用 ${result.ok ? '✓' : '✗'} ${result.elapsedMs}ms model=${endpoint.model} tokens=${result.usage?.total_tokens ?? '?'}`,
            {
              profileId: profile.id,
              model: endpoint.model,
              ok: result.ok,
              elapsedMs: result.elapsedMs,
              retryCount: result.retryCount,
              usage: result.usage,
              finishReason: result.finishReason,
              error: result.error,
            },
          );
        }
      } catch {
        // traceBus 失败不影响 gateway
      }
    }

    // 阶段5:token 统计与费用估算(供 LLM 调试台/费用面板)
    if (result) {
      try {
        const { recordTokenUsage, estimateCost, estimateTextTokens } = await import(
          '@gateway/modelLibrary'
        );
        const promptTokens = result.usage?.prompt_tokens;
        const completionTokens = result.usage?.completion_tokens;
        const estimated =
          (promptTokens ?? 0) + (completionTokens ?? 0) ||
          estimateTextTokens(result.text) + 200 /* 系统提示词近似 */;
        recordTokenUsage({
          ts: Date.now(),
          profileId: profile.id,
          model: endpoint.model,
          promptTokens,
          completionTokens,
          estimatedTokens: estimated,
          elapsedMs: result.elapsedMs,
          ok: result.ok,
          costYuan: estimateCost(endpoint.model, promptTokens, completionTokens),
        });
      } catch {
        // 统计失败不影响 gateway
      }
    }

    return result!;
  }

  /** 并行调用 2AI(主聊天AI + 变量AI) */
  async invokeParallel(
    mainReq: GatewayRequest,
    varReq: GatewayRequest,
    onMainStream?: StreamCallback,
  ): Promise<{ main: GatewayResult; var: GatewayResult }> {
    const [main, varRes] = await Promise.all([
      this.invoke(mainReq, onMainStream),
      this.invoke(varReq),
    ]);
    return { main, var: varRes };
  }

  /**
   * 并行调用 N 个 AI(阶段3 步骤1)
   *  - 用于 8AI 全并行调用场景
   *  - 每个请求可有自己的 onStream 回调(通过 onStreamMap 传入)
   *  - 返回结果按 profileId 索引
   *  - 某个 AI 失败不影响其他 AI(各自独立重试)
   */
  async invokeMany(
    requests: Array<{ req: GatewayRequest; onStream?: StreamCallback }>,
  ): Promise<Record<string, GatewayResult>> {
    const entries = requests.map(async ({ req, onStream }) => {
      const result = await this.invoke(req, onStream);
      return [req.profile.id, result] as const;
    });
    const results = await Promise.all(entries);
    return Object.fromEntries(results);
  }

  /**
   * 带预算的并行调用(阶段4:8AI 并行延迟优化)
   *
   * 增强点:
   *  1. 并发限制器(Promise pool):避免一次性触发 8 个请求导致端点 429
   *  2. 回合级总预算超时(默认 15s):超时后未完成的请求走降级结果
   *  3. 部分结果返回:某个请求失败/超时不影响其他,返回所有结果(含失败/超时)
   *  4. 性能指标采集:p50/p95/max/total,便于验证 < 15s/轮
   *  5. 早退回调(可选):主聊天AI 失败时可选择中止后续触发型AI
   *
   * @param requests 请求列表
   * @param options 预算选项
   * @returns 按 profileId 索引的结果 + 性能指标
   */
  async invokeManyWithBudget(
    requests: Array<{ req: GatewayRequest; onStream?: StreamCallback }>,
    options?: {
      /** 最大并发数(默认 4,避免端点速率限制) */
      maxConcurrency?: number;
      /** 回合级总预算(ms,默认 15000) */
      totalBudgetMs?: number;
      /** 早退回调:返回 true 则中止未开始的请求 */
      shouldAbort?: (completed: Record<string, GatewayResult>, total: number) => boolean;
    },
  ): Promise<{
    results: Record<string, GatewayResult>;
    metrics: ParallelMetrics;
  }> {
    const maxConcurrency = Math.max(1, options?.maxConcurrency ?? 4);
    const totalBudgetMs = Math.max(1000, options?.totalBudgetMs ?? 15000);
    const shouldAbort = options?.shouldAbort;

    const turnStartedAt = Date.now();
    const metrics: ParallelMetrics = {
      totalRequests: requests.length,
      completed: 0,
      succeeded: 0,
      failed: 0,
      timedOut: 0,
      aborted: 0,
      latencies: [],
      p50Ms: 0,
      p95Ms: 0,
      maxMs: 0,
      totalElapsedMs: 0,
      withinBudget: true,
    };

    const results: Record<string, GatewayResult> = {};
    let aborted = false;

    // 并发池实现
    const queue = requests.map((r, idx) => ({ ...r, idx }));
    const executing = new Set<Promise<void>>();

    while (queue.length > 0 && !aborted) {
      // 检查总预算
      const elapsedSoFar = Date.now() - turnStartedAt;
      if (elapsedSoFar > totalBudgetMs) {
        metrics.withinBudget = false;
        // 剩余请求全部标记为超时降级
        for (const item of queue) {
          const profileId = item.req.profile.id;
          results[profileId] = this.buildBudgetExceededResult(item.req, totalBudgetMs);
          metrics.timedOut++;
          metrics.completed++;
        }
        break;
      }

      // 检查早退
      if (shouldAbort && Object.keys(results).length > 0) {
        if (shouldAbort(results, requests.length)) {
          aborted = true;
          for (const item of queue) {
            const profileId = item.req.profile.id;
            results[profileId] = this.buildAbortedResult(item.req);
            metrics.aborted++;
            metrics.completed++;
          }
          break;
        }
      }

      // 填充并发池
      while (executing.size < maxConcurrency && queue.length > 0 && !aborted) {
        const item = queue.shift()!;
        const profileId = item.req.profile.id;
        const reqStartedAt = Date.now();

        const p = (async () => {
          try {
            const remainingBudget = totalBudgetMs - (Date.now() - turnStartedAt);
            if (remainingBudget <= 0) {
              results[profileId] = this.buildBudgetExceededResult(item.req, totalBudgetMs);
              metrics.timedOut++;
              return;
            }

            // 用剩余预算和 profile.timeoutMs 的较小值作为本请求超时
            const originalTimeout = item.req.profile.timeoutMs;
            const effectiveTimeout = Math.min(originalTimeout, remainingBudget);
            const reqWithBudget: GatewayRequest = {
              ...item.req,
              profile: { ...item.req.profile, timeoutMs: effectiveTimeout },
            };

            const result = await this.invoke(reqWithBudget, item.onStream);
            const lat = Date.now() - reqStartedAt;
            metrics.latencies.push(lat);
            if (lat > metrics.maxMs) metrics.maxMs = lat;
            results[profileId] = result;
            if (result.ok) {
              metrics.succeeded++;
            } else {
              metrics.failed++;
            }
          } catch (e) {
            const lat = Date.now() - reqStartedAt;
            metrics.latencies.push(lat);
            if (lat > metrics.maxMs) metrics.maxMs = lat;
            results[profileId] = {
              ok: false,
              text: '',
              trace: [],
              error: `invokeManyWithBudget 异常: ${e instanceof Error ? e.message : String(e)}`,
              elapsedMs: lat,
              retryCount: 0,
              requestId: item.req.requestId ?? `req-budget-${profileId}-${Date.now()}`,
            };
            metrics.failed++;
          } finally {
            metrics.completed++;
          }
        })();

        executing.add(p);
        p.finally(() => executing.delete(p));
      }

      // 等待至少一个完成
      if (executing.size > 0) {
        await Promise.race(executing);
      }
    }

    // 等待所有进行中的请求完成
    if (executing.size > 0) {
      await Promise.allSettled(Array.from(executing));
    }

    // 计算统计
    metrics.totalElapsedMs = Date.now() - turnStartedAt;
    metrics.withinBudget = metrics.withinBudget && metrics.totalElapsedMs <= totalBudgetMs;
    if (metrics.latencies.length > 0) {
      const sorted = [...metrics.latencies].sort((a, b) => a - b);
      metrics.p50Ms = sorted[Math.floor(sorted.length * 0.5)];
      metrics.p95Ms = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    }

    return { results, metrics };
  }

  /** 构建预算超时降级结果 */
  private buildBudgetExceededResult(req: GatewayRequest, budgetMs: number): GatewayResult {
    return {
      ok: false,
      text: '',
      trace: [
        {
          step: 'budget-exceeded',
          detail: `回合总预算 ${budgetMs}ms 超时,降级返回`,
          timestamp: Date.now(),
        },
      ],
      error: `回合总预算 ${budgetMs}ms 超时`,
      elapsedMs: 0,
      retryCount: 0,
      requestId: req.requestId ?? `req-budget-${req.profile.id}-${Date.now()}`,
    };
  }

  /** 构建早退中止结果 */
  private buildAbortedResult(req: GatewayRequest): GatewayResult {
    return {
      ok: false,
      text: '',
      trace: [
        {
          step: 'aborted-by-early-exit',
          detail: `主聊天AI 失败,触发早退中止`,
          timestamp: Date.now(),
        },
      ],
      error: '早退中止(主聊天AI 失败)',
      elapsedMs: 0,
      retryCount: 0,
      requestId: req.requestId ?? `req-aborted-${req.profile.id}-${Date.now()}`,
    };
  }

  // ─────────────────────────────────────────────────────────
  //  非流式调用
  // ─────────────────────────────────────────────────────────

  private async invokeNonStream(
    req: GatewayRequest,
    sampler: PresetSampler,
    trace: GatewayTrace[],
    requestId: string,
  ): Promise<GatewayResult> {
    const { profile, preset, messages } = req;
    const url = buildUrl(profile.endpoint.baseURL);

    const body = {
      model: profile.endpoint.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      temperature: sampler.temperature,
      top_p: sampler.topP,
      max_tokens: preset.context.maxTokens,
      frequency_penalty: sampler.frequencyPenalty,
      presence_penalty: sampler.presencePenalty,
      seed: sampler.seed,
    };

    trace.push({
      step: 'http-request',
      detail: `POST ${url} model=${body.model} max_tokens=${body.max_tokens}`,
      timestamp: Date.now(),
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), profile.timeoutMs);

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(profile.endpoint.apiKey, profile.endpoint.baseURL),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 200)}`);
      }

      const data = (await resp.json()) as OpenAiChatResponse;
      const text = data.choices?.[0]?.message?.content ?? '';

      trace.push({
        step: 'http-response',
        detail: `finish=${data.choices?.[0]?.finish_reason} tokens=${data.usage?.total_tokens ?? '?'}`,
        timestamp: Date.now(),
      });

      return {
        ok: true,
        text,
        finishReason: data.choices?.[0]?.finish_reason,
        usage: data.usage,
        trace,
        elapsedMs: 0,
        retryCount: 0,
        requestId,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  流式调用(SSE)
  // ─────────────────────────────────────────────────────────

  private async invokeStream(
    req: GatewayRequest,
    sampler: PresetSampler,
    onStream: StreamCallback | undefined,
    trace: GatewayTrace[],
    requestId: string,
  ): Promise<GatewayResult> {
    const { profile, preset, messages } = req;
    const url = buildUrl(profile.endpoint.baseURL);

    const body = {
      model: profile.endpoint.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: sampler.temperature,
      top_p: sampler.topP,
      max_tokens: preset.context.maxTokens,
      frequency_penalty: sampler.frequencyPenalty,
      presence_penalty: sampler.presencePenalty,
      seed: sampler.seed,
    };

    trace.push({
      step: 'http-request-stream',
      detail: `POST ${url} model=${body.model} stream=true`,
      timestamp: Date.now(),
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), profile.timeoutMs);

    let fullText = '';
    let finishReason: string | undefined;

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { ...buildHeaders(profile.endpoint.apiKey, profile.endpoint.baseURL), Accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 200)}`);
      }

      if (!resp.body) {
        throw new Error('响应体为空(无 SSE 流)');
      }

      // 解析 SSE 流
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // 按 \n\n 分割事件
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const evt of events) {
          const lines = evt.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              continue;
            }
            try {
              const chunk = JSON.parse(data) as OpenAiStreamChunk;
              const delta = chunk.choices?.[0]?.delta?.content ?? '';
              if (delta) {
                fullText += delta;
                onStream?.(delta, fullText);
              }
              if (chunk.choices?.[0]?.finish_reason) {
                finishReason = chunk.choices[0].finish_reason;
              }
            } catch {
              // 跳过无法解析的 chunk
            }
          }
        }
      }

      trace.push({
        step: 'stream-complete',
        detail: `finish=${finishReason ?? '?'} chars=${fullText.length}`,
        timestamp: Date.now(),
      });

      return {
        ok: true,
        text: fullText,
        finishReason,
        trace,
        elapsedMs: 0,
        retryCount: 0,
        requestId,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// ───────────────────────────────────────────────────────────
//  辅助
// ───────────────────────────────────────────────────────────

function buildUrl(baseURL: string): string {
  const base = baseURL.replace(/\/+$/, '');
  // 已含完整路径直接返回
  if (base.endsWith('/chat/completions')) return base;
  if (base.endsWith('/v1')) return `${base}/chat/completions`;
  if (base.endsWith('/v1/')) return `${base}chat/completions`;
  // 以其他后缀结尾(如 /v1/ 已处理;或 zen/go/v1)且不含 v1 → 补 /v1
  if (base.endsWith('/v1')) return `${base}/chat/completions`;
  // 避免重复 /v1:base 已含 /v1 时不再追加
  const hasV1 = /\/v1\/?$/.test(base) || base.includes('/v1/');
  return hasV1 ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
}

function buildHeaders(apiKey: string, baseURL?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // 协议自适应:Anthropic 用 x-api-key(对齐凡人 EndpointLibrary)
  if (baseURL) {
    try {
      if (new URL(baseURL.trim()).hostname.toLowerCase() === 'api.anthropic.com') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        return headers;
      }
    } catch {
      // 忽略 URL 解析失败
    }
  }
  headers['Authorization'] = `Bearer ${apiKey}`;
  return headers;
}

/** dev 模式可用本地代理(vite /llm-proxy)绕过端点 CORS 限制 */
function canUseLocalProxy(): boolean {
  return typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;
}

/** 把 chat/completions 目标 URL 转为本地代理地址 */
function proxyChatUrl(baseURL: string): string {
  const url = buildUrl(baseURL);
  return `/llm-proxy?url=${encodeURIComponent(url)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ───────────────────────────────────────────────────────────
//  OpenAI 响应类型
// ───────────────────────────────────────────────────────────

interface OpenAiChatResponse {
  id?: string;
  choices?: Array<{
    message?: { role: string; content: string };
    finish_reason?: string;
    index?: number;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface OpenAiStreamChunk {
  id?: string;
  choices?: Array<{
    delta?: { role?: string; content?: string };
    finish_reason?: string | null;
    index?: number;
  }>;
}

// ───────────────────────────────────────────────────────────
//  单例
// ───────────────────────────────────────────────────────────

export const modelGateway = new ModelGateway();

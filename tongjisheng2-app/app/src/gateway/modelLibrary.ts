import { modelGateway, type GatewayTrace } from '@runtime/model-gateway';
import { estimateTokens } from '@runtime/ejs-engine';
import { traceBus } from '@runtime/trace-bus';

/**
 * modelLibrary · 模型库服务(网关层)
 * 对齐 fanren-remake 的 EndpointLibrary + EndpointStep + LLMDebugPage:
 *  - 拉取 OpenAI 兼容端点 /v1/models 列表(带缓存)
 *  - 连通性测试(轻量 /models 探测)
 *  - token 统计(累计 prompt/completion/估算,含费用估算)
 *  - 调用历史(从 traceBus 聚合,供 LLM 调试台展示)
 */

// ───────────────────────────────────────────────────────────
//  模型列表
// ───────────────────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  owned_by?: string;
  created?: number;
}

export interface ModelListResult {
  ok: boolean;
  models: ModelInfo[];
  provider?: string;
  error?: string;
}

/** 模型列表缓存:key = baseURL|apiKey 指纹 */
const modelCache = new Map<string, { ts: number; models: ModelInfo[] }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟

function cacheKey(baseURL: string, apiKey: string): string {
  return `${baseURL}|${apiKey.slice(-6)}`;
}

/**
 * 端点路径规范化(对齐凡人 apiEndpointUrl)
 *  - 去掉尾部斜杠
 *  - 若 baseURL 已以 /models、/chat/completions 等结尾,去掉该后缀再拼(防重复)
 *  - 拼接 `${base}${endpoint}`
 */
const KNOWN_SUFFIXES = ['/chat/completions', '/responses', '/models', '/embeddings'];

export function normalizeEndpointUrl(baseURL: string, endpoint: string): string {
  const base = baseURL.trim().replace(/\/+$/, '');
  if (!base) return endpoint;
  const lower = base.toLowerCase();
  for (const s of KNOWN_SUFFIXES) {
    if (lower.endsWith(s)) {
      return base.slice(0, -s.length) + endpoint;
    }
  }
  return base + endpoint;
}

/** 判断是否 Anthropic 协议端点(对齐凡人:api.anthropic.com 用 x-api-key) */
export function isAnthropicEndpoint(baseURL: string): boolean {
  try {
    return new URL(baseURL.trim()).hostname.toLowerCase() === 'api.anthropic.com';
  } catch {
    return false;
  }
}

/**
 * 是否走本地代理(dev 模式 CORS 兜底)
 *  - dev(import.meta.env.DEV)时,若直连失败可自动降级到 /llm-proxy 转发
 *  - 生产环境无代理,返回 false
 */
export function canUseLocalProxy(): boolean {
  return typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;
}

/** 通过本地代理转发请求(dev 模式绕过端点 CORS 限制) */
export function proxyUrl(target: string): string {
  return `/llm-proxy?url=${encodeURIComponent(target)}`;
}

/**
 * 拉取模型列表(对齐凡人 EndpointLibrary._e)
 *  - URL 规范化:自动补 /models、去重尾部
 *  - 协议自适应:Anthropic 用 x-api-key,其余 OpenAI 兼容用 Bearer
 *  - 失败区分 CORS/超时/连接,给出可操作诊断
 */
export async function listModels(
  baseURL: string,
  apiKey: string,
  force = false,
): Promise<ModelListResult> {
  const base = baseURL.trim().replace(/\/+$/, '');
  if (!base || !apiKey) return { ok: false, models: [], error: '请先填写完整的接口地址和 API Key' };

  const key = cacheKey(base, apiKey);
  const cached = modelCache.get(key);
  if (!force && cached && Date.now() - cached.ts < CACHE_TTL) {
    return { ok: true, models: cached.models };
  }

  const url = normalizeEndpointUrl(base, '/models');
  // 请求函数:直连或走代理
  const doFetch = async (targetUrl: string): Promise<Response> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (isAnthropicEndpoint(base)) {
      headers['x-api-key'] = apiKey.trim();
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }
    return fetch(targetUrl, { headers, signal: AbortSignal.timeout(15000), mode: 'cors' });
  };
  const parseModels = async (res: Response) => {
    const data = (await res.json()) as { data?: ModelInfo[]; object?: string };
    const models = (data.data ?? []).filter((m) => m.id).map((m) => ({
      id: m.id,
      owned_by: m.owned_by,
      created: m.created,
    }));
    modelCache.set(key, { ts: Date.now(), models });
    return models;
  };
  try {
    // 1. 直连
    const res = await doFetch(url);
    if (!res.ok) {
      return {
        ok: false,
        models: [],
        error: `HTTP ${res.status}:${res.statusText || '拉取失败'}(当前接口没有返回任何模型。请检查接口地址是否正确,或确认该服务支持标准的模型列表查询。你仍可手动输入模型名。)`,
      };
    }
    return { ok: true, models: await parseModels(res) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isCors = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS') || msg.includes('load failed');
    // 2. dev 模式 CORS 被拦 → 尝试本地代理
    if (isCors && canUseLocalProxy()) {
      try {
        const proxied = await doFetch(proxyUrl(url));
        if (proxied.ok) {
          return { ok: true, models: await parseModels(proxied), provider: 'local-proxy' };
        }
      } catch {
        // 代理也失败,落到下方诊断
      }
    }
    const isTimeout = msg.includes('Timeout') || msg.includes('timed out') || msg.includes('Abort');
    return {
      ok: false,
      models: [],
      error: isCors
        ? `跨域(CORS)被拦截:该端点未返回 Access-Control-Allow-Origin 头,浏览器无法直接访问${canUseLocalProxy() ? '(本地代理转发也失败)' : ''}。可换用支持 CORS 的端点,或忽略拉取直接手动填写模型名。`
        : isTimeout
          ? `请求超时:端点响应超过 15s(检查网络/代理后重试)。仍可手动输入模型名。`
          : `连接失败:${msg}(检查网络/代理;端点需可被浏览器直连)。仍可手动输入模型名。`,
    };
  }
}

/**
 * 内置模型参考表(对齐凡人 EndpointLibrary 的内置模型列表 + 常用模型)
 *  - 拉取失败/不支持 /models 时兜底
 *  - opencode.ai/zen/go 端点实测 25 模型已收录主要项
 */
export const COMMON_MODELS: ModelInfo[] = [
  { id: 'deepseek-v4-pro', owned_by: 'opencode' },
  { id: 'deepseek-v4-flash', owned_by: 'opencode' },
  { id: 'deepseek-chat', owned_by: 'deepseek' },
  { id: 'deepseek-reasoner', owned_by: 'deepseek' },
  { id: 'glm-5.2', owned_by: 'opencode' },
  { id: 'glm-5.1', owned_by: 'opencode' },
  { id: 'glm-5', owned_by: 'opencode' },
  { id: 'kimi-k3', owned_by: 'opencode' },
  { id: 'kimi-k2.7-code', owned_by: 'opencode' },
  { id: 'kimi-k2.6', owned_by: 'opencode' },
  { id: 'qwen3.7-max', owned_by: 'opencode' },
  { id: 'qwen3.6-plus', owned_by: 'opencode' },
  { id: 'minimax-m3', owned_by: 'opencode' },
  { id: 'minimax-m2.7', owned_by: 'opencode' },
  { id: 'mimo-v2.5-pro', owned_by: 'opencode' },
  { id: 'mimo-v2-omni', owned_by: 'opencode' },
  { id: 'hy3', owned_by: 'opencode' },
  { id: 'grok-4.5', owned_by: 'opencode' },
  { id: 'gpt-5.6-luna', owned_by: 'opencode' },
  { id: 'qwen-plus', owned_by: 'aliyun' },
  { id: 'qwen-turbo', owned_by: 'aliyun' },
  { id: 'moonshot-v1-8k', owned_by: 'moonshot' },
  { id: 'gpt-4o-mini', owned_by: 'openai' },
  { id: 'gpt-4.1', owned_by: 'openai' },
];

/** 手动输入模型的特殊标记(对齐凡人 __manual-model__) */
export const MANUAL_MODEL_MARK = '__manual-model__';

/**
 * 拉取模型列表(失败时回退内置模型表,保证流程可继续)
 *  - 成功:返回端点真实模型
 *  - 失败/空:返回内置常用表,error 字段保留诊断信息(UI 提示可手动输入)
 */
export async function listModelsWithFallback(
  baseURL: string,
  apiKey: string,
  force = false,
): Promise<ModelListResult> {
  const r = await listModels(baseURL, apiKey, force);
  if (r.ok && r.models.length > 0) {
    // 合并去重(端点模型 + 内置表中不在端点里的)
    const seen = new Set(r.models.map((m) => m.id));
    const extra = COMMON_MODELS.filter((m) => !seen.has(m.id));
    return { ok: true, models: [...r.models, ...extra] };
  }
  // 回退:内置模型表(流程不阻塞,UI 展示 error 提示)
  return {
    ok: true,
    models: [...COMMON_MODELS],
    error: r.error,
  };
}

/** 连通性测试:拉一次模型列表即视为连通 */
export async function testConnection(
  baseURL: string,
  apiKey: string,
): Promise<{ ok: boolean; detail?: string; error?: string }> {
  const r = await listModels(baseURL, apiKey, true);
  if (r.ok) {
    return { ok: true, detail: `连通成功,发现 ${r.models.length} 个模型` };
  }
  return { ok: false, error: r.error };
}

// ───────────────────────────────────────────────────────────
//  Token 统计与费用估算
// ───────────────────────────────────────────────────────────

export interface TokenUsageRecord {
  /** 时间戳 */
  ts: number;
  /** profile id(main-chat / var-update / opening …) */
  profileId: string;
  /** 模型名 */
  model: string;
  /** 实际 usage(来自 API 响应) */
  promptTokens?: number;
  completionTokens?: number;
  /** 估算 token(API 未返回 usage 时用) */
  estimatedTokens: number;
  /** 耗时 ms */
  elapsedMs: number;
  /** 是否成功 */
  ok: boolean;
  /** 估算费用(¥,按模型费率) */
  costYuan?: number;
}

export interface TokenStats {
  totalCalls: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalEstimatedTokens: number;
  totalCostYuan: number;
  byProfile: Record<string, { calls: number; tokens: number; costYuan: number }>;
}

/** 模型费率表(¥/1K tokens;prompt/completion 分开;未知模型用默认值) */
const MODEL_RATES: Record<string, { in: number; out: number }> = {
  'deepseek-chat': { in: 0.002, out: 0.006 },
  'deepseek-reasoner': { in: 0.004, out: 0.016 },
  'gpt-4o': { in: 0.0175, out: 0.07 },
  'gpt-4o-mini': { in: 0.0011, out: 0.0044 },
  'gpt-4.1': { in: 0.014, out: 0.056 },
  'qwen-plus': { in: 0.004, out: 0.012 },
  'qwen-turbo': { in: 0.002, out: 0.006 },
  'qwen-max': { in: 0.02, out: 0.06 },
  'moonshot-v1-8k': { in: 0.012, out: 0.012 },
  'moonshot-v1-32k': { in: 0.024, out: 0.024 },
  'glm-4': { in: 0.005, out: 0.005 },
  'glm-4-flash': { in: 0.0005, out: 0.0005 },
};
const DEFAULT_RATE = { in: 0.002, out: 0.006 };

/** 估算一次调用的费用(¥) */
export function estimateCost(
  model: string,
  promptTokens: number | undefined,
  completionTokens: number | undefined,
): number {
  const rate = MODEL_RATES[model] ?? DEFAULT_RATE;
  const p = promptTokens ?? 0;
  const c = completionTokens ?? 0;
  return (p / 1000) * rate.in + (c / 1000) * rate.out;
}

const usageRecords: TokenUsageRecord[] = [];
const MAX_RECORDS = 500;

/** 记录一次调用(由 gateway 或 trace 订阅调用) */
export function recordTokenUsage(record: TokenUsageRecord): void {
  usageRecords.push(record);
  if (usageRecords.length > MAX_RECORDS) usageRecords.shift();
}

/** 获取全部调用记录(新→旧) */
export function getTokenUsageRecords(): TokenUsageRecord[] {
  return [...usageRecords].reverse();
}

/** 聚合统计 */
export function getTokenStats(): TokenStats {
  const stats: TokenStats = {
    totalCalls: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalEstimatedTokens: 0,
    totalCostYuan: 0,
    byProfile: {},
  };
  for (const r of usageRecords) {
    stats.totalCalls++;
    stats.totalPromptTokens += r.promptTokens ?? 0;
    stats.totalCompletionTokens += r.completionTokens ?? 0;
    stats.totalEstimatedTokens += r.estimatedTokens;
    stats.totalCostYuan += r.costYuan ?? 0;
    const p = stats.byProfile[r.profileId] ?? { calls: 0, tokens: 0, costYuan: 0 };
    p.calls++;
    p.tokens += (r.promptTokens ?? 0) + (r.completionTokens ?? 0) || r.estimatedTokens;
    p.costYuan += r.costYuan ?? 0;
    stats.byProfile[r.profileId] = p;
  }
  return stats;
}

/** 清空统计(新周目/调试用) */
export function clearTokenStats(): void {
  usageRecords.length = 0;
}

/** 文本 token 估算(中文 1 字≈1 token;供组装后预览) */
export function estimateTextTokens(text: string): number {
  return estimateTokens(text);
}

// ───────────────────────────────────────────────────────────
//  调用历史(LLM 调试台数据源)
// ───────────────────────────────────────────────────────────

/** 从 traceBus 聚合最近的 AI 调用记录 */
export function getAiCallHistory(limit = 30): Array<{
  turnId: string;
  step: string;
  detail: string;
  ts: number;
}> {
  const turns = traceBus.recentTurns(limit);
  const calls: Array<{ turnId: string; step: string; detail: string; ts: number }> = [];
  for (const t of turns) {
    for (const e of t.entries) {
      if (e.category === 'aiCall' || e.category === 'gatewayLatency') {
        calls.push({ turnId: t.turnId, step: e.step, detail: e.detail, ts: e.timestamp });
      }
    }
  }
  return calls.sort((a, b) => b.ts - a.ts);
}

export type { GatewayTrace };

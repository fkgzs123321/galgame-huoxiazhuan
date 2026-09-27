// ============================================================
// AI 模型网关 — 统一 Port + OpenAI 兼容 / Anthropic 双适配器
//
// 职责边界：
//  - 只负责请求、流式、取消、超时、错误归一
//  - 不创作 Prompt（见 narrative.ts）、不提交剧情/状态
//  - 供应商差异全部隔离在适配器内
// ============================================================

import type { AiConfig } from '@/stores/aiStore';

export type AiErrorCode =
  | 'auth'              // 鉴权失败（401/403）
  | 'rate_limit'        // 限流（429）
  | 'timeout'           // 超时
  | 'cancel'            // 用户取消
  | 'network'           // 连接/网络错误
  | 'server'            // 上游服务错误（5xx）
  | 'bad_request'       // 请求参数被拒绝（400）
  | 'context_limit'     // 上下文超限
  | 'invalid_response'  // 响应无法解析
  | 'unknown';

export class AiError extends Error {
  code: AiErrorCode;
  retryable: boolean;

  constructor(code: AiErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.retryable = retryable;
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequestOptions {
  signal?: AbortSignal;
  onChunk?: (delta: string) => void;
}

export interface ChatRequestResult {
  text: string;
  finishReason: string | null;
  model: string | null;
}

// 归一化供应商错误 → AiError
function normalizeHttpError(status: number, body: string): AiError {
  let detail = '';
  try {
    const parsed = JSON.parse(body);
    detail = parsed?.error?.message ?? parsed?.message ?? '';
  } catch {
    detail = body.slice(0, 200);
  }

  switch (status) {
    case 401:
    case 403:
      return new AiError('auth', `API 鉴权失败（HTTP ${status}）${detail ? `：${detail}` : ''}`);
    case 429:
      return new AiError('rate_limit', `请求被限流（HTTP 429）${detail ? `：${detail}` : ''}`, true);
    case 400:
      return new AiError('bad_request', `请求被拒绝（HTTP 400）${detail ? `：${detail}` : ''}`);
    case 408:
      return new AiError('timeout', `请求超时（HTTP 408）`, true);
    case 413:
      return new AiError('context_limit', `上下文超出模型限制（HTTP 413）`);
    case 500:
    case 502:
    case 503:
    case 504:
      return new AiError('server', `上游服务错误（HTTP ${status}）`, true);
    default:
      return new AiError('unknown', `未知错误（HTTP ${status}）${detail ? `：${detail}` : ''}`);
  }
}

function networkError(err: unknown, timedOut = false): AiError {
  if (err instanceof AiError) return err;
  if (timedOut) return new AiError('timeout', `请求超时（超过设定时限），请检查网络或增大超时设置`, true);
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new AiError('cancel', '请求已取消');
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/timeout|timed ?out/i.test(msg)) {
    return new AiError('timeout', `连接超时：${msg}`, true);
  }
  // fetch TypeError 通常是网络不通/CORS/端点地址错误
  if (err instanceof TypeError || /failed to fetch/i.test(msg)) {
    return new AiError(
      'network',
      `无法连接到模型服务器：${msg}。
请检查：1) Base URL 是否正确（如 https://api.deepseek.com/v1） 2) 该地址网络可达 3) 服务端是否允许浏览器跨域（CORS）`,
      true
    );
  }
  return new AiError('network', `网络错误：${msg}`, true);
}

// 非流式请求（部分端点不支持 stream: true 时降级）
async function openAiChatNonStream(
  config: AiConfig,
  messages: ChatMessage[],
  endpoint: string
): Promise<ChatRequestResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel,
        messages,
        stream: false,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw networkError(err);
  }
  clearTimeout(timer);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw normalizeHttpError(res.status, body);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string | null }[];
    model?: string;
  };
  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) throw new AiError('invalid_response', '模型未返回任何内容');
  return { text, finishReason: data.choices?.[0]?.finish_reason ?? null, model: data.model ?? config.openaiModel };
}

// 获取模型列表（OpenAI 兼容 /models）
export async function listOpenAiModels(config: AiConfig): Promise<string[]> {
  const baseUrl = config.openaiBaseUrl.replace(/\/+$/, '');
  const endpoint = `${baseUrl}/models`;
  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${config.openaiApiKey}` },
  });
  if (!res.ok) throw new AiError('auth', `获取模型列表失败（HTTP ${res.status}）`);
  const data = (await res.json()) as { data?: { id: string }[] };
  return (data.data ?? []).map((m) => m.id).sort();
}

// ---------- SSE 流解析 ----------

interface SseParserCallbacks {
  onEvent: (eventName: string, data: string) => void;
}

// 逐块喂入 SSE 文本，跨 chunk 边界拼接 event 行
function createSseParser(cb: SseParserCallbacks) {
  let buffer = '';
  return (chunkText: string) => {
    buffer += chunkText;
    let idx: number;
    // SSE 事件以空行分隔
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const rawBlock = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let eventName = 'message';
      let data = '';
      for (const line of rawBlock.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) data += (data ? '\n' : '') + line.slice(5).trim();
      }
      if (data) cb.onEvent(eventName, data);
    }
    // 兼容 \r\n 结尾的块
    while ((idx = buffer.indexOf('\r\n\r\n')) !== -1) {
      const rawBlock = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 4);
      let eventName = 'message';
      let data = '';
      for (const line of rawBlock.split('\r\n')) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) data += (data ? '\n' : '') + line.slice(5).trim();
      }
      if (data) cb.onEvent(eventName, data);
    }
  };
}

async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (eventName: string, data: string) => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser({ onEvent });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parser(decoder.decode(value, { stream: true }));
  }
  parser(decoder.decode());
}

// ---------- OpenAI 兼容适配器 ----------

async function openAiChat(
  config: AiConfig,
  messages: ChatMessage[],
  opts: ChatRequestOptions
): Promise<ChatRequestResult> {
  const baseUrl = config.openaiBaseUrl.replace(/\/+$/, '');
  const endpoint = baseUrl.endsWith('/chat/completions')
    ? baseUrl
    : `${baseUrl}/chat/completions`;

  // 流式开关关闭时直接走非流式
  if (!config.stream) {
    return openAiChatNonStream(config, messages, endpoint);
  }

  const controller = new AbortController();
  let timedOut = false;
  const onOuterAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onOuterAbort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, config.timeoutMs);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel,
        messages,
        stream: true,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onOuterAbort);
    throw networkError(err, timedOut);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onOuterAbort);
    throw normalizeHttpError(res.status, body);
  }

  const model = config.openaiModel;
  let text = '';
  let finishReason: string | null = null;

  try {
    await readSseStream(res.body!, (eventName, data) => {
      if (data === '[DONE]') return;
      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        return; // 忽略无法解析的行
      }
      const delta = parsed?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta.length > 0) {
        text += delta;
        opts.onChunk?.(delta);
      }
      const reason = parsed?.choices?.[0]?.finish_reason;
      if (reason && reason !== 'null') finishReason = reason;
    });
  } catch (err) {
    // 流式解析失败（部分端点流式返回非 SSE）→ 降级非流式重试一次
    if (text.length === 0 && !(err instanceof AiError && err.code === 'cancel')) {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onOuterAbort);
      try {
        return await openAiChatNonStream(config, messages, endpoint);
      } catch {
        throw networkError(err, timedOut);
      }
    }
    throw networkError(err, timedOut);
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onOuterAbort);
  }

  if (!text && !finishReason) {
    throw new AiError('invalid_response', '模型未返回任何内容');
  }
  return { text, finishReason, model };
}

// ---------- Anthropic Messages 适配器 ----------

async function anthropicChat(
  config: AiConfig,
  messages: ChatMessage[],
  opts: ChatRequestOptions
): Promise<ChatRequestResult> {
  const baseUrl = config.anthropicBaseUrl.replace(/\/+$/, '');
  const endpoint = baseUrl.endsWith('/messages') ? baseUrl : `${baseUrl}/messages`;

  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const bodyMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onOuterAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new AiError('timeout', '请求超时', true)), config.timeoutMs);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.anthropicModel,
        system: system || undefined,
        messages: bodyMessages,
        stream: true,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onOuterAbort);
    throw networkError(err);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onOuterAbort);
    throw normalizeHttpError(res.status, body);
  }

  const model = config.anthropicModel;
  let text = '';
  let finishReason: string | null = null;

  try {
    await readSseStream(res.body!, (eventName, data) => {
      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        return;
      }
      if (eventName === 'content_block_delta' && parsed?.delta?.type === 'text_delta') {
        const delta = parsed.delta.text ?? '';
        if (delta.length > 0) {
          text += delta;
          opts.onChunk?.(delta);
        }
      }
      if (eventName === 'message_delta' && parsed?.delta?.stop_reason) {
        finishReason = parsed.delta.stop_reason;
      }
    });
  } catch (err) {
    throw networkError(err);
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onOuterAbort);
  }

  if (!text && !finishReason) {
    throw new AiError('invalid_response', '模型未返回任何内容');
  }
  return { text, finishReason, model };
}

// ---------- 统一 Port ----------

export function aiChat(
  config: AiConfig,
  messages: ChatMessage[],
  opts: ChatRequestOptions = {}
): Promise<ChatRequestResult> {
  if (config.provider === 'anthropic') {
    return anthropicChat(config, messages, opts);
  }
  return openAiChat(config, messages, opts);
}

// 连接测试：非流式小请求，仅验证鉴权与端点可用
export async function testAiConnection(config: AiConfig): Promise<{ ok: boolean; message: string }> {
  const probeMessages: ChatMessage[] = [
    { role: 'system', content: '你是一个连通性测试。只回复一个字：通' },
    { role: 'user', content: '测试' },
  ];
  try {
    const { timeoutMs } = config;
    const withTimeoutConfig = { ...config, timeoutMs: Math.min(timeoutMs, 10000) };
    const result = await aiChat(withTimeoutConfig, probeMessages, {});
    const ok = result.text.trim().length > 0;
    return {
      ok,
      message: ok
        ? `连接成功（模型：${result.model ?? '未知'}，返回 ${result.text.trim().slice(0, 20)}）`
        : '连接成功但模型未返回内容',
    };
  } catch (err) {
    if (err instanceof AiError) {
      return { ok: false, message: `连接失败：${err.message}` };
    }
    return { ok: false, message: `连接失败：${err instanceof Error ? err.message : String(err)}` };
  }
}

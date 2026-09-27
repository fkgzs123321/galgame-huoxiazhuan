// 肖像生图服务 — OpenAI 兼容 images API（可配置），失败降级为 SVG 占位
// 对齐凡人 avatarService/portraitStore

import { traceHub } from '@/utils/trace';
import { logHub } from '@/stores/logStore';

export interface PortraitOptions {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  size?: '256x256' | '512x512' | '1024x1024';
}

export interface PortraitResult {
  ok: boolean;
  dataUrl?: string;      // base64 图片
  error?: string;
}

// 生成 SVG 占位肖像（无 API 时的降级，风格贴合 DD 剪影）
export function svgPlaceholderPortrait(seedText: string, tone = '#c8a038'): string {
  const id = seedText.replace(/[^\w\u4e00-\u9fa5]/g, '').slice(0, 8) || 'hero';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#14100c"/>
  <circle cx="128" cy="96" r="42" fill="none" stroke="${tone}" stroke-width="3"/>
  <path d="M64 224 C64 168 96 144 128 144 C160 144 192 168 192 224" fill="none" stroke="${tone}" stroke-width="3"/>
  <line x1="128" y1="40" x2="128" y2="30" stroke="${tone}" stroke-width="3"/>
  <rect x="110" y="24" width="36" height="10" fill="${tone}"/>
  <text x="128" y="250" text-anchor="middle" fill="${tone}" font-size="14" font-family="serif">${id}</text>
  <rect x="0" y="252" width="256" height="4" fill="${tone}" opacity="0.4"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// 调用 OpenAI 兼容 images/generations 接口生成肖像
export async function generatePortrait(
  prompt: string,
  opts: PortraitOptions = {}
): Promise<PortraitResult> {
  const baseUrl = opts.baseUrl || 'https://api.openai.com/v1';
  const apiKey = opts.apiKey || '';
  const model = opts.model || 'dall-e-3';
  const size = opts.size || '512x512';

  if (!apiKey) {
    const fallback = svgPlaceholderPortrait(prompt);
    logHub.info('生图未配置 API，使用剪影占位');
    return { ok: true, dataUrl: fallback };
  }

  const started = Date.now();
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, prompt, size, n: 1, response_format: 'b64_json' }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`生图接口 ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('生图响应缺少 b64_json');
    traceHub.response('肖像生图成功', '', {
      meta: { model, size, durationMs: Date.now() - started },
    });
    return { ok: true, dataUrl: `data:image/png;base64,${b64}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logHub.error(`生图失败：${msg}`);
    traceHub.error('肖像生图失败', msg);
    return { ok: false, dataUrl: svgPlaceholderPortrait(prompt), error: msg };
  }
}

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import type { IncomingMessage } from 'node:http';

/**
 * LLM CORS 代理插件(dev 模式)
 * 部分 LLM 端点(如 opencode.ai)响应缺 CORS 头,浏览器直接 fetch 被拦截。
 * 此插件在 dev server 上提供 `/llm-proxy?url=<encoded>` 端点:
 *  - dev server 侧用 Node fetch 转发(无浏览器 CORS 限制)
 *  - 响应注入 Access-Control-Allow-Origin,浏览器端可正常读取
 * 生产部署需 Nginx 反代或使用支持 CORS 的端点。
 */
function llmProxyPlugin(): Plugin {
  return {
    name: 'llm-cors-proxy',
    configureServer(server) {
      server.middlewares.use('/llm-proxy', async (req, res) => {
        const raw = (req.url ?? '').split('?url=')[1];
        if (!raw) {
          res.writeHead(400).end('missing ?url=');
          return;
        }
        let target: URL;
        try {
          target = new URL(decodeURIComponent(raw));
        } catch {
          res.writeHead(400).end('invalid url');
          return;
        }
        if (target.protocol !== 'https:' && target.protocol !== 'http:') {
          res.writeHead(400).end('protocol not allowed');
          return;
        }
        // 透传请求头(Authorization / Content-Type / x-api-key …)
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(req.headers)) {
          if (['host', 'origin', 'connection', 'content-length'].includes(k)) continue;
          if (typeof v === 'string') headers[k] = v;
          else if (Array.isArray(v)) headers[k] = v.join(', ');
        }
        try {
          const method = req.method ?? 'GET';
          const bodyBuf = ['GET', 'HEAD'].includes(method) ? undefined : await readBody(req);
          const upstream = await fetch(target.toString(), {
            method,
            headers,
            body: bodyBuf,
          } as never);
          const body = Buffer.from(await upstream.arrayBuffer());
          const resHeaders: Record<string, string> = {};
          upstream.headers.forEach((v, k) => {
            const kk = k.toLowerCase();
            // 丢弃传输层头与压缩头(fetch 已自动解压,再透传 content-encoding 会导致客户端重复解压失败)
            if (['content-length', 'transfer-encoding', 'connection', 'keep-alive', 'content-encoding'].includes(kk)) return;
            resHeaders[k] = v;
          });
          resHeaders['access-control-allow-origin'] = '*';
          resHeaders['access-control-allow-headers'] = 'Content-Type, Authorization, x-api-key, anthropic-version';
          resHeaders['access-control-allow-methods'] = 'GET, POST, OPTIONS';
          res.writeHead(upstream.status, resHeaders);
          res.end(body);
        } catch (e) {
          console.error('[llm-proxy] error:', e instanceof Error ? e.message : String(e));
          res.writeHead(502).end(`proxy error: ${e instanceof Error ? e.message : String(e)}`);
        }
      });
    },
  };
}

/** 读取请求体(connect req 是可读流) */
function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => resolve(Buffer.alloc(0)));
  });
}

// https://vite.dev/config/
export default defineConfig({
  // 相对路径,使产物可部署到任意子路径(独立部署/Nginx 子目录/本地 file://)
  base: './',
  plugins: [react(), llmProxyPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': fileURLToPath(new URL('./src/content', import.meta.url)),
      '@runtime': fileURLToPath(new URL('./src/runtime', import.meta.url)),
      '@ai': fileURLToPath(new URL('./src/ai', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@db': fileURLToPath(new URL('./src/db', import.meta.url)),
      '@stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
      '@gateway': fileURLToPath(new URL('./src/gateway', import.meta.url)),
      '@prompts': fileURLToPath(new URL('./src/prompts', import.meta.url)),
      '@schemas': fileURLToPath(new URL('./src/schemas', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@settings': fileURLToPath(new URL('./src/settings', import.meta.url)),
      '@dialogs': fileURLToPath(new URL('./src/dialogs', import.meta.url)),
      '@workers': fileURLToPath(new URL('./src/workers', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // 允许读取原卡资产目录(用于内容扫描脚本开发期预览)
    fs: {
      allow: ['..'],
    },
  },
  // 原卡资产较大(世界书190条目),提高单文件大小限制
  build: {
    chunkSizeWarningLimit: 2000,
  },
});

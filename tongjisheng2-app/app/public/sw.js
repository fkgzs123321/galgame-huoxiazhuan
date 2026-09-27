/**
 * 同级生2 独立前端卡 - Service Worker
 *
 * 策略:
 *  - precache:app shell(HTML/JS/CSS/图标/manifest)
 *  - runtime cache:
 *    - 同源静态资源 -> stale-while-revalidate
 *    - 同源 HTML 导航 -> network-first,降级到缓存(离线可用)
 *    - 跨域 API 调用(OpenAI 兼容端点) -> 不缓存(直通网络)
 *  - 清理旧版本缓存(activate 阶段)
 *  - skipWaiting + clients.claim(快速上线新版本)
 *
 * 该文件为静态 SW,部署在 public/ 下,Vite 构建后位于 dist 根目录。
 * 通过 navigator.serviceWorker.register('./sw.js') 在 main.tsx 中注册。
 */

const SW_VERSION = 'dosokyosei2-sw-v1';
const APP_SHELL_CACHE = `${SW_VERSION}-shell`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;

// app shell 预缓存清单(相对路径,部署到子目录也能工作)
const APP_SHELL_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-maskable.svg',
];

// 不应被 SW 拦截的路径(直通网络)
const NEVER_CACHE = [
  /\/v1\/chat\/completions/, // OpenAI 兼容 API
  /\/api\//, // 任何 API 端点
  /^https:\/\/[^/]+\/v1\//, // 跨域 API 端点
];

// ───────────────────────────────────────────────────────────
//  Install:预缓存 app shell
// ───────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      // 使用 addAll 但容忍个别资源失败(如图标可能尚未生成)
      await Promise.all(
        APP_SHELL_URLS.map(async (url) => {
          try {
            await cache.add(url);
          } catch (e) {
            console.warn(`[SW] precache skip: ${url}`, e);
          }
        }),
      );
      // 跳过等待,新 SW 立即接管
      await self.skipWaiting();
    })(),
  );
});

// ───────────────────────────────────────────────────────────
//  Activate:清理旧缓存 + 接管客户端
// ───────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // 删除不属于当前版本的缓存
      await Promise.all(
        keys
          .filter((key) => !key.startsWith(SW_VERSION))
          .map((key) => caches.delete(key)),
      );
      // 接管所有客户端
      await self.clients.claim();
      console.info(`[SW] ${SW_VERSION} activated`);
    })(),
  );
});

// ───────────────────────────────────────────────────────────
//  Fetch:路由策略
// ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 仅处理 GET(其他方法直通)
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 跨域 API 直通(不缓存,不拦截)
  if (NEVER_CACHE.some((re) => re.test(url.pathname) || re.test(url.href))) {
    return;
  }

  // 同源导航请求(HTML) -> network-first,降级缓存
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirstHtml(req));
    return;
  }

  // 同源静态资源 -> stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // 其他跨域静态资源 -> 尝试缓存,失败回退网络
  event.respondWith(staleWhileRevalidate(req));
});

// ───────────────────────────────────────────────────────────
//  策略实现
// ───────────────────────────────────────────────────────────

/** HTML 导航:network-first,失败降级到缓存,再失败降级到 index.html */
async function networkFirstHtml(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const fresh = await fetch(req);
    // 成功则缓存一份
    if (fresh && fresh.ok) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (e) {
    // 离线:从缓存取
    const cached = await cache.match(req);
    if (cached) return cached;
    // 最终降级到 app shell
    const shell = await caches.match('./index.html');
    if (shell) return shell;
    throw e;
  }
}

/** 静态资源:stale-while-revalidate */
async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then((fresh) => {
      // 仅缓存有效响应(排除 opaque 错误响应等)
      if (fresh && (fresh.ok || fresh.type === 'opaque')) {
        cache.put(req, fresh.clone());
      }
      return fresh;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// ───────────────────────────────────────────────────────────
//  Message:支持手动 skipWaiting / 清理缓存
// ───────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        const clients = await self.clients.matchAll();
        clients.forEach((c) => c.postMessage({ type: 'CACHES_CLEARED' }));
      })(),
    );
  } else if (data.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'VERSION', version: SW_VERSION });
  }
});

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import './index.css';
import './responsive.css';
// UI 基件层样式(Button/Card/Modal/Tabs/Toast…)
import './ui/base/styles.css';

// PWA:注册 Service Worker(生产环境 + 安全上下文)
//  - 开发环境跳过,避免 SW 缓存干扰 HMR
//  - 仅在支持 serviceWorker 且为 secure context(https/localhost)时注册
if (
  'serviceWorker' in navigator &&
  window.isSecureContext &&
  import.meta.env.PROD
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then((reg) => {
        // 监听更新:新 SW 等待接管时,提示用户刷新
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 已有控制器,新版本等待激活 -> 通知用户
              console.info('[PWA] 新版本已下载,刷新页面以激活');
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker 注册失败:', err);
      });
  });

  // 接受新 SW 立即接管
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // 控制器已变更,可在此触发页面刷新提示
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        {/* App 内部 Routes 处理 / 与 /panel/:name(App 作为容器:header + 游戏/面板路由) */}
        <Route path="/*" element={<App />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
